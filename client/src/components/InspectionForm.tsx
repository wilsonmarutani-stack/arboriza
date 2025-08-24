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

const formSchema = insertInspecaoSchema.extend({
  foto: z.any().optional(),
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
  const [selectedOrgans, setSelectedOrgans] = useState<string[]>(["leaf", "flower", "fruit", "bark", "habit"]);
  const [coordinates, setCoordinates] = useState({
    lat: initialData?.lat || -23.2017,
    lng: initialData?.lng || -47.2911,
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
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      endereco: "",
      observacoes: "",
      especieFinal: "",
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
        if (key !== "foto" && value !== undefined && value !== null) {
          if (value instanceof Date) fd.append(key, value.toISOString());
          else fd.append(key, String(value));
        }
      });
      if (uploadedImageUrl) fd.append("fotoUrl", uploadedImageUrl);

      const resp = await fetch("/api/inspecoes", { method: "POST", body: fd });
      if (!resp.ok) throw new Error((await resp.json()).message || "Erro ao criar inspeção");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspecoes"] });
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

  // --------- IA (Pl@ntNet) ----------
  const identifySpecies = async () => {
    if (!uploadedImageUrl && !photoPreview) {
      toast({ title: "Erro", description: "Faça upload de uma foto primeiro", variant: "destructive" });
      return;
    }
    setIsIdentifying(true);
    try {
      const imageUrl = uploadedImageUrl || photoPreview!;
      const result = await identificarEspecie(imageUrl, selectedOrgans);
      setSpeciesResults(result);
      form.setValue("especieFinal", result.especie_sugerida);
      form.setValue("especieConfiancaMedia", result.confianca_media);
      toast({
        title: "Espécie identificada",
        description: `${result.especie_sugerida} com ${result.confianca_media?.toFixed(0) || 0}% via ${result.fonte || "IA"}`,
      });
    } catch (e) {
      console.error("Erro na identificação:", e);
      toast({
        title: "Erro na identificação",
        description: "Não foi possível identificar a espécie. Verifique sua conexão e tente novamente.",
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
    createInspectionMutation.mutate({ ...data, latitude: coordinates.lat, longitude: coordinates.lng });
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
              <div className="flex items-center justify-between">
                <CardTitle>Localização</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} data-testid="button-usar-gps">
                  <MapPin className="w-4 h-4 mr-2" />
                  Usar GPS
                </Button>
              </div>
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

                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          className="font-mono"
                          placeholder="-23.123456"
                          value={coordinates.lat}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setCoordinates((prev) => ({ ...prev, lat: value }));
                            field.onChange(value);
                          }}
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
                      <FormLabel>Longitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          className="font-mono"
                          placeholder="-47.654321"
                          value={coordinates.lng}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setCoordinates((prev) => ({ ...prev, lng: value }));
                            field.onChange(value);
                          }}
                          data-testid="input-longitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Interactive Map */}
              <div>
                <Label>Ajustar posição no mapa</Label>
                <MapComponent
                  height="320px"
                  center={[coordinates.lat, coordinates.lng]}
                  draggableMarker={{
                    lat: coordinates.lat,
                    lng: coordinates.lng,
                    onDrag: handleMarkerDrag,
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">Arraste o marcador para ajustar a posição exata da árvore</p>
              </div>

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Endereço será preenchido automaticamente"
                        value={address || field.value || ""}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          field.onChange(e.target.value);
                        }}
                        data-testid="input-endereco"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tree Information & Photo */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Árvore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plant Organs Selection for AI */}
              <div className="space-y-4">
                <Label className="text-lg font-medium">O que aparece na foto?</Label>
                <p className="text-sm text-gray-600">Selecione as partes da planta visíveis na foto para melhorar a identificação</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: "leaf", label: "Folha", emoji: "🍃" },
                    { id: "flower", label: "Flor", emoji: "🌸" },
                    { id: "fruit", label: "Fruto", emoji: "🍎" },
                    { id: "bark", label: "Casca", emoji: "🌳" },
                    { id: "habit", label: "Hábito", emoji: "🌲" },
                  ].map((organ) => (
                    <div key={organ.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={organ.id}
                        checked={selectedOrgans.includes(organ.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedOrgans((prev) => [...prev, organ.id]);
                          else setSelectedOrgans((prev) => prev.filter((o) => o !== organ.id));
                        }}
                        data-testid={`checkbox-organ-${organ.id}`}
                      />
                      <Label htmlFor={organ.id} className="flex items-center space-x-2 cursor-pointer">
                        <span className="text-lg">{organ.emoji}</span>
                        <span className="text-sm">{organ.label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <Label>Foto da Árvore *</Label>
                <div className="mt-2">
                  {photoPreview ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Preview da foto da árvore"
                          className="mx-auto rounded-lg shadow-sm max-h-64 object-cover w-full"
                          data-testid="img-photo-preview"
                        />
                      </div>
                      <div className="flex space-x-3 justify-center">
                        <Button type="button" onClick={identifySpecies} disabled={isIdentifying} data-testid="button-identificar-especie">
                          <Brain className="w-4 h-4 mr-2" />
                          {isIdentifying ? "Identificando..." : "Identificar Espécie (IA)"}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            setUploadedImageUrl(null);
                            setPhotoPreview(null);
                            setSpeciesResults(null);
                          }}
                          data-testid="button-remover-foto"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Photo Options Buttons */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            (input as any).capture = "environment";
                            input.onchange = handleCameraCapture as any;
                            input.click();
                          }}
                          className="h-20 border-2 border-dashed border-primary-300 hover:border-primary-400"
                          data-testid="button-camera-capture"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Camera className="w-8 h-8 text-primary-500" />
                            <span>Tirar Foto</span>
                          </div>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCameraOptions(true)}
                          className="h-20 border-2 border-dashed border-primary-300 hover:border-primary-400"
                          data-testid="button-file-upload"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span>Selecionar Arquivo</span>
                          </div>
                        </Button>
                      </div>

                      {/* File Uploader */}
                      {showCameraOptions && (
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonClassName="w-full bg-primary-50 hover:bg-primary-100 border-2 border-dashed border-primary-300 text-primary-700 p-8 rounded-lg transition-colors"
                          data-testid="object-uploader"
                        >
                          <div className="flex flex-col items-center space-y-4">
                            <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <div className="text-center">
                              <p className="text-lg font-medium">Clique para fazer upload da foto</p>
                              <p className="text-sm text-gray-600">ou arraste e solte aqui</p>
                              <p className="text-xs text-gray-500 mt-2">Máximo 10MB - JPG, PNG</p>
                            </div>
                          </div>
                        </ObjectUploader>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Species Identification Results */}
              {speciesResults && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Brain className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="font-semibold text-blue-900">Identificação por IA</h4>
                    <span className="ml-auto bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {speciesResults.confianca_media?.toFixed(0) || 0}% confiança média
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-blue-700">
                      Identificação de espécie by <strong>Pl@ntNet</strong>
                    </p>
                  </div>

                  <div className="space-y-3">
                    {speciesResults.candidatos.map((c, i) => (
                      <div
                        key={i}
                        className={`${i === 0 ? "bg-white border-2 border-green-200" : "bg-gray-50"} rounded-lg p-3 transition-all hover:bg-gray-100`}
                        data-testid={`species-candidate-${i}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{c.nome}</p>
                            {i === 0 && <p className="text-xs text-green-600 font-medium">Recomendação principal</p>}
                          </div>
                          <div className="text-right flex items-center space-x-3">
                            <div className="text-center">
                              <span className="text-sm font-medium text-green-600">{c.confianca?.toFixed(0) || 0}%</span>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${c.confianca || 0}%` }} />
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 text-sm" onClick={() => useSpeciesCandidate(c)} data-testid={`button-use-species-${i}`}>
                              Usar esta espécie
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="especieFinal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Espécie Final</FormLabel>
                    <FormControl>
                      <Input placeholder="Espécie identificada ou corrigida manualmente" {...field} value={field.value || ""} data-testid="input-especie-final" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

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

