// src/components/InspectionForm.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MapComponent } from "./MapComponent";
import { ObjectUploader } from "./ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { insertInspecaoSchema, type Ea, type Municipio, type Alimentador, type Subestacao } from "@shared/schema";
import { identificarEspecie } from "@/services/ia";
import { X, Camera, Brain, Save, MapPin } from "lucide-react";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import type { UploadResult } from "@uppy/core";
import { ArvoresFieldArray } from "./ArvoresFieldArray";

interface SpeciesCandidate {
  nome: string;
  confianca: number;
}
interface SpeciesIdentificationResult {
  especie_sugerida: string;
  candidatos: SpeciesCandidate[];
  confianca_media: number;
  fonte?: string;
}

const arvoreSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  endereco: z.string().optional(),
  observacao: z.string().optional(),
  especieFinal: z.string().optional(),
  especieConfiancaMedia: z.number().optional(),
  fotos: z.array(z.object({
    id: z.string().optional(),
    url: z.string()
  })).default([])
});

const formSchema = insertInspecaoSchema.extend({
  foto: z.any().optional(),
  arvores: z.array(arvoreSchema).min(1, "Pelo menos uma árvore deve ser adicionada")
});
type FormData = z.infer<typeof formSchema>;

interface InspectionFormProps {
  onClose: () => void;
  initialData?: { lat?: number; lng?: number };
}

export function InspectionForm({ onClose, initialData }: InspectionFormProps) {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [speciesResults, setSpeciesResults] = useState<SpeciesIdentificationResult | null>(null);
  const [coordinates, setCoordinates] = useState({
    lat: initialData?.lat,
    lng: initialData?.lng,
  });
  const [address, setAddress] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroNota: "",
      numeroOperativo: undefined,
      dataInspecao: new Date(),
      eaId: "",              // sem default "ea1"
      municipioId: "",
      prioridade: "baixa",
      latitude: coordinates.lat,  // Manter por compatibilidade com backend
      longitude: coordinates.lng, // Manter por compatibilidade com backend
      endereco: "",              // Manter por compatibilidade com backend
      observacoes: "",
      especieFinal: "",
      arvores: [{
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        endereco: "",
        observacao: "",
        especieFinal: "",
        especieConfiancaMedia: undefined,
        fotos: []
      }]
    },
  });

  // --------- Referências ----------
  const { data: eas } = useQuery<Ea[]>({ queryKey: ["/api/refs/eas"] });

  // pré-seleciona a primeira EA carregada (opcional)
  useEffect(() => {
    if (!form.getValues("eaId") && eas?.length) {
      form.setValue("eaId", eas[0].id);
    }
  }, [eas]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEaId = form.watch("eaId");

  // zera município ao trocar EA
  useEffect(() => {
    form.setValue("municipioId", "");
  }, [selectedEaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Municipios filtrados por EA – passa ea_id na URL
  const { data: municipios, isFetching: municipiosLoading } = useQuery<Municipio[]>({
    queryKey: ["/api/refs/municipios", selectedEaId],
    enabled: !!selectedEaId,
    queryFn: async () => {
      const url = `/api/refs/municipios?ea_id=${encodeURIComponent(selectedEaId!)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao carregar municípios");
      return resp.json();
    },
  });

  const { data: alimentadores } = useQuery<Alimentador[]>({ queryKey: ["/api/refs/alimentadores"] });
  const { data: subestacoes } = useQuery<Subestacao[]>({ queryKey: ["/api/refs/subestacoes"] });

  // --------- Mutação (criar inspeção) ----------
  const createInspectionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const fd = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "foto" && key !== "arvores" && value !== undefined && value !== null) {
          if (value instanceof Date) fd.append(key, value.toISOString());
          else fd.append(key, String(value));
        }
      });
      if (uploadedImageUrl) fd.append("fotoUrl", uploadedImageUrl);
      
      // Add trees as JSON string in 'items' field (expected by server)
      if (data.arvores && data.arvores.length > 0) {
        fd.append("items", JSON.stringify(data.arvores));
      }

      const resp = await fetch("/api/inspecoes", { method: "POST", body: fd });
      if (!resp.ok) throw new Error((await resp.json()).message || "Erro ao criar inspeção");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspecoes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/arvores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Sucesso", description: "Inspeção criada com sucesso!" });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao criar inspeção", variant: "destructive" });
    },
  });

  // --------- Geolocalização / geocoding ----------
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocalização não suportada", description: "Seu navegador não suporta geolocalização", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoordinates(newCoords);
        form.setValue("latitude", newCoords.lat);
        form.setValue("longitude", newCoords.lng);
        reverseGeocode(newCoords.lat, newCoords.lng);
        toast({ title: "Localização obtida", description: "Coordenadas atualizadas com sua localização atual" });
      },
      () => {
        toast({
          title: "Erro de localização",
          description: "Não foi possível obter sua localização. Verifique as permissões do navegador.",
          variant: "destructive",
        });
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      if (data.endereco) {
        setAddress(data.endereco);
        form.setValue("endereco", data.endereco);
        await autoFillMunicipality(data.endereco);
      }
    } catch (e) {
      console.error("Erro no geocoding:", e);
    }
  };

  const handleCameraCapture = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoPreview(result);
      toast({ title: "Foto capturada", description: "Use o botão 'Identificar Espécie' para análise." });
    };
    reader.readAsDataURL(file);
  };

  // tenta selecionar município com base no endereço
  const autoFillMunicipality = async (endereco: string) => {
    if (!municipios?.length) return;
    const addressLower = endereco.toLowerCase();
    const addressParts = endereco.split(",").map((p: string) => p.trim());

    let matching: Municipio | null = null;

    for (const m of municipios) {
      const name = m.nome.toLowerCase();
      if (addressLower.includes(name)) { matching = m; break; }
    }
    if (!matching) {
      outer: for (const part of addressParts) {
        const p = part.toLowerCase();
        for (const m of municipios) {
          const name = m.nome.toLowerCase();
          if (p.includes(name) || name.includes(p)) { matching = m; break outer; }
        }
      }
    }
    if (matching) {
      form.setValue("municipioId", matching.id);
      toast({ title: "Município identificado", description: `${matching.nome} selecionado automaticamente` });
    }
  };

  // --------- Upload objeto (replit object storage / supabase signed URL etc.) ----------
  const handleGetUploadParameters = async () => {
    const resp = await fetch("/api/objects/upload", { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!resp.ok) throw new Error("Erro ao obter URL de upload");
    const { uploadURL } = await resp.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!result.successful?.length) return;
    const imageUrl = result.successful[0].uploadURL as string | undefined;
    if (!imageUrl) return;

    setUploadedImageUrl(imageUrl);
    setPhotoPreview(imageUrl);

    try {
      await fetch("/api/tree-images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, inspecaoId: "temp" }),
      });
      toast({ title: "Upload concluído", description: "Foto da árvore enviada com sucesso!" });
    } catch (e) {
      console.error("Erro ao configurar política de acesso:", e);
    }
  };


  // Automatic species identification when photo is added
  const identifySpeciesAutomatically = async (index: number, photoUrl: string) => {
    setIsIdentifying(true);
    
    try {
      // Convert blob URL to a file that can be uploaded to server
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const file = new File([blob], `tree-${index}.jpg`, { type: 'image/jpeg' });
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload image to server first
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Falha no upload da imagem');
      }
      
      const uploadData = await uploadResponse.json();
      const serverImageUrl = uploadData.url;
      
      // Now identify species using the server URL
      const result = await identificarEspecie(serverImageUrl, []);
      
      // Update specific tree data using both form.setValue and direct update
      console.log("Resultado da identificação:", result);
      
      form.setValue(`arvores.${index}.especieFinal`, result.especie_sugerida);
      form.setValue(`arvores.${index}.especieConfiancaMedia`, result.confianca_media);
      
      // Also trigger the component update directly
      const arvores = form.getValues("arvores");
      const updatedArvore = {
        ...arvores[index],
        especieFinal: result.especie_sugerida,
        especieConfiancaMedia: result.confianca_media
      };
      
      // Update the arvores array
      const updatedArvores = [...arvores];
      updatedArvores[index] = updatedArvore;
      form.setValue("arvores", updatedArvores);
      
      console.log("Árvore atualizada:", updatedArvore);
      
      toast({
        title: "Espécie identificada",
        description: `Árvore ${index + 1}: ${result.especie_sugerida} com ${result.confianca_media?.toFixed(0) || 0}% de confiança`,
      });
    } catch (e) {
      console.error("Erro na identificação automática:", e);
      toast({
        title: "Identificação não realizada",
        description: "Você pode inserir a espécie manualmente no campo abaixo.",
        variant: "destructive",
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleMarkerDrag = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
    reverseGeocode(lat, lng);
  };

  const useSpeciesCandidate = (c: SpeciesCandidate) => {
    form.setValue("especieFinal", c.nome);
    form.setValue("especieConfiancaMedia", c.confianca);
    toast({ title: "Espécie selecionada", description: `${c.nome} selecionada como espécie final` });
  };

  const onSubmit = (data: FormData) => {
    if (uploadedImageUrl) data.fotoUrl = uploadedImageUrl;
    
    // Debug: Log what's being submitted
    console.log("=== SUBMIT DEBUG ===");
    console.log("Form data received:", data);
    console.log("Árvores data:", data.arvores);
    console.log("Form.getValues():", form.getValues());
    
    // Use coordinates from first tree for main inspection data (for compatibility)
    const firstTree = data.arvores[0];
    const inspectionData = {
      ...data,
      latitude: firstTree?.latitude || coordinates.lat || -23.2109,
      longitude: firstTree?.longitude || coordinates.lng || -47.2957,
      endereco: firstTree?.endereco || "",
      arvores: data.arvores
    };
    
    console.log("Final inspection data:", inspectionData);
    console.log("====================");
    
    createInspectionMutation.mutate(inspectionData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nova Inspeção</h2>
          <p className="text-gray-600 mt-1">Registre uma nova inspeção de árvore urbana</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-form">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="numeroNota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Nota *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 2024001" {...field} data-testid="input-numero-nota" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numeroOperativo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número Operativo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: OP-2024-001" {...field} value={field.value || ""} data-testid="input-numero-operativo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataInspecao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Inspeção *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-data-inspecao"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-prioridade">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[9999]" position="popper">
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="eaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EA (Estação Avançada) *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""} data-testid="select-ea">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a EA" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[9999]" position="popper">
                          {eas?.map((ea) => (
                            <SelectItem key={ea.id} value={ea.id}>
                              {ea.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="municipioId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Município *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={!selectedEaId || !municipios?.length || municipiosLoading}
                        data-testid="select-municipio"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={municipiosLoading ? "Carregando..." : "Selecione o município"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[9999]" position="popper">
                          {municipios?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alimentadorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alimentador *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""} data-testid="select-alimentador">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o alimentador" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[9999]" position="popper">
                          {alimentadores?.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.codigo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subestacaoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subestação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""} data-testid="select-subestacao">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a subestação" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[9999]" position="popper">
                          {subestacoes?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* GPS Coordinates Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Coordenadas GPS da Inspeção</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    data-testid="button-use-gps"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Usar GPS
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Ex: -23.550520"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            data-testid="input-latitude"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Ex: -47.295757"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            data-testid="input-longitude"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Endereço será preenchido automaticamente"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-endereco"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {coordinates.lat && coordinates.lng && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Coordenadas: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </p>
                    {address && (
                      <p className="text-sm text-green-700 mt-1">
                        📍 {address}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trees Field Array - Multiple trees per inspection */}
          <ArvoresFieldArray
            control={form.control}
            name="arvores"
            form={form}
            onPhotoAdded={(index, photoUrl) => {
              identifySpeciesAutomatically(index, photoUrl);
            }}
          />

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Descreva detalhes sobre a condição da árvore, interferências na rede elétrica, riscos identificados, necessidade de poda, etc."
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-observacoes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancelar">
              Cancelar
            </Button>
            <Button type="submit" disabled={createInspectionMutation.isPending} className="bg-primary-600 hover:bg-primary-700" data-testid="button-salvar-inspecao">
              <Save className="w-4 h-4 mr-2" />
              {createInspectionMutation.isPending ? "Salvando..." : "Salvar Inspeção"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

