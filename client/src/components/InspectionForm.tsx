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
import { X, Camera, Brain, Save, MapPin, Check } from "lucide-react";
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
  initialData?: {
    lat?: number;
    lng?: number;
  };
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
    lng: initialData?.lng || -47.2911
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
      prioridade: "baixa",
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      endereco: "",
      observacoes: "",
      especieFinal: "",
    }
  });

  // Fetch reference data
  const { data: eas } = useQuery<Ea[]>({ queryKey: ["/api/refs/eas"] });
  const { data: municipios } = useQuery<Municipio[]>({ 
    queryKey: ["/api/refs/municipios", form.watch("eaId")],
    enabled: !!form.watch("eaId")
  });
  const { data: alimentadores } = useQuery<Alimentador[]>({ queryKey: ["/api/refs/alimentadores"] });
  const { data: subestacoes } = useQuery<Subestacao[]>({ queryKey: ["/api/refs/subestacoes"] });

  // Create inspection mutation
  const createInspectionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "foto" && value !== undefined && value !== null) {
          if (value instanceof Date) {
            formData.append(key, value.toISOString());
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // Add photo URL if uploaded via object storage
      if (uploadedImageUrl) {
        formData.append("fotoUrl", uploadedImageUrl);
      }

      const response = await fetch("/api/inspecoes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar inspeção");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspecoes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Inspeção criada com sucesso!",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar inspeção",
        variant: "destructive",
      });
    }
  });

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCoordinates(newCoords);
          form.setValue("latitude", newCoords.lat);
          form.setValue("longitude", newCoords.lng);
          reverseGeocode(newCoords.lat, newCoords.lng);
          
          toast({
            title: "Localização obtida",
            description: "Coordenadas atualizadas com sua localização atual",
          });
        },
        (error) => {
          toast({
            title: "Erro de localização",
            description: "Não foi possível obter sua localização. Verifique as permissões do navegador.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive",
      });
    }
  };

  // Reverse geocoding with municipality auto-fill
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      console.log('Starting reverse geocoding for coordinates:', { lat, lng });
      const response = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      
      console.log('Reverse geocoding response:', data);
      
      if (data.endereco) {
        setAddress(data.endereco);
        form.setValue("endereco", data.endereco);
        
        // Auto-fill municipality based on address
        console.log('Attempting to auto-fill municipality with:', data.endereco);
        await autoFillMunicipality(data.endereco);
      }
    } catch (error) {
      console.error("Erro no geocoding:", error);
    }
  };

  // Handle camera capture
  const handleCameraCapture = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        
        toast({
          title: "Foto capturada",
          description: "Foto capturada com sucesso! Use o botão 'Identificar Espécie' para análise.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-fill municipality based on geocoding result
  const autoFillMunicipality = async (endereco: string) => {
    console.log('AutoFill municipality called with:', endereco, 'Available municipios:', municipios);
    
    if (!municipios || municipios.length === 0) {
      console.log('No municipios available, will retry in 1 second');
      // Retry after municipios are loaded
      setTimeout(() => {
        if (municipios && municipios.length > 0) {
          autoFillMunicipality(endereco);
        }
      }, 1000);
      return;
    }
    
    // Extract city name from address (look for municipality names in the address)
    const addressLower = endereco.toLowerCase();
    const addressParts = endereco.split(',').map(part => part.trim());
    
    console.log('Address parts:', addressParts);
    
    // Try to match municipality names in different parts of the address
    let matchingMunicipio = null;
    
    // First try exact matches
    for (const municipio of municipios) {
      const municipioLower = municipio.nome.toLowerCase();
      if (addressLower.includes(municipioLower)) {
        matchingMunicipio = municipio;
        break;
      }
    }
    
    // If no exact match, try partial matches
    if (!matchingMunicipio) {
      for (const part of addressParts) {
        const partLower = part.toLowerCase();
        for (const municipio of municipios) {
          const municipioLower = municipio.nome.toLowerCase();
          if (partLower.includes(municipioLower) || municipioLower.includes(partLower)) {
            matchingMunicipio = municipio;
            break;
          }
        }
        if (matchingMunicipio) break;
      }
    }
    
    console.log('Matching municipio found:', matchingMunicipio);
    
    if (matchingMunicipio) {
      form.setValue("municipioId", matchingMunicipio.id);
      toast({
        title: "Município identificado",
        description: `${matchingMunicipio.nome} selecionado automaticamente com base na localização`,
      });
    } else {
      console.log('No matching municipio found for address:', endereco);
    }
  };

  // Handle object storage upload
  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao obter URL de upload");
      }

      const { uploadURL } = await response.json();
      
      return {
        method: "PUT" as const,
        url: uploadURL,
      };
    } catch (error) {
      console.error("Erro ao obter parâmetros de upload:", error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const imageUrl = uploadedFile.uploadURL;
      
      if (imageUrl) {
        setUploadedImageUrl(imageUrl);
        setPhotoPreview(imageUrl);

        // Save the uploaded image with ACL policy
        try {
          await fetch("/api/tree-images", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: imageUrl,
              inspecaoId: "temp" // Will be updated when inspection is created
            }),
          });

          toast({
            title: "Upload concluído",
            description: "Foto da árvore enviada com sucesso!",
          });
        } catch (error) {
          console.error("Erro ao configurar política de acesso:", error);
        }
      }
    }
  };

  // Identify species with PlantNet AI
  const identifySpecies = async () => {
    if (!uploadedImageUrl && !photoPreview) {
      toast({
        title: "Erro",
        description: "Faça upload de uma foto primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsIdentifying(true);

    try {
      const imageUrl = uploadedImageUrl || photoPreview;
      if (!imageUrl) {
        throw new Error("URL da imagem não disponível");
      }

      const result = await identificarEspecie(imageUrl, selectedOrgans);
      setSpeciesResults(result);
      
      // Set the suggested species in the form
      form.setValue("especieFinal", result.especie_sugerida);
      form.setValue("especieConfiancaMedia", result.confianca_media);

      toast({
        title: "Espécie identificada",
        description: `${result.especie_sugerida} identificada com ${result.confianca_media?.toFixed(0) || 0}% de confiança via ${result.fonte || 'IA'}`,
      });
    } catch (error) {
      console.error('Erro na identificação:', error);
      toast({
        title: "Erro na identificação",
        description: "Não foi possível identificar a espécie. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  // Handle map marker drag
  const handleMarkerDrag = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
    reverseGeocode(lat, lng);
  };

  // Use species candidate
  const useSpeciesCandidate = (candidate: SpeciesCandidate) => {
    form.setValue("especieFinal", candidate.nome);
    form.setValue("especieConfiancaMedia", candidate.confianca);
    
    toast({
      title: "Espécie selecionada",
      description: `${candidate.nome} selecionada como espécie final`,
    });
  };

  const onSubmit = (data: FormData) => {
    // Add the uploaded image URL
    if (uploadedImageUrl) {
      data.fotoUrl = uploadedImageUrl;
    }
    
    createInspectionMutation.mutate({
      ...data,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    });
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
                        value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-prioridade">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-ea">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a EA" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-municipio">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o município" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {municipios?.map((municipio) => (
                            <SelectItem key={municipio.id} value={municipio.id}>
                              {municipio.nome}
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
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-alimentador">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o alimentador" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {alimentadores?.map((alimentador) => (
                            <SelectItem key={alimentador.id} value={alimentador.id}>
                              {alimentador.codigo}
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
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-subestacao">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a subestação" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subestacoes?.map((subestacao) => (
                            <SelectItem key={subestacao.id} value={subestacao.id}>
                              {subestacao.nome}
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
                            setCoordinates(prev => ({ ...prev, lat: value }));
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
                            setCoordinates(prev => ({ ...prev, lng: value }));
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
                    onDrag: handleMarkerDrag
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
                    { id: "habit", label: "Hábito", emoji: "🌲" }
                  ].map((organ) => (
                    <div key={organ.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={organ.id}
                        checked={selectedOrgans.includes(organ.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrgans(prev => [...prev, organ.id]);
                          } else {
                            setSelectedOrgans(prev => prev.filter(o => o !== organ.id));
                          }
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
                        <Button 
                          type="button" 
                          onClick={identifySpecies} 
                          disabled={isIdentifying}
                          data-testid="button-identificar-especie"
                        >
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
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.capture = 'environment';
                            input.onchange = handleCameraCapture;
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
                          maxFileSize={10485760} // 10MB
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
                  
                  {/* PlantNet Credit */}
                  <div className="mb-3">
                    <p className="text-xs text-blue-700">Identificação de espécie by <strong>Pl@ntNet</strong></p>
                  </div>
                  
                  <div className="space-y-3">
                    {speciesResults.candidatos.map((candidato, index) => (
                      <div 
                        key={index} 
                        className={`${index === 0 ? 'bg-white border-2 border-green-200' : 'bg-gray-50'} rounded-lg p-3 transition-all hover:bg-gray-100`}
                        data-testid={`species-candidate-${index}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{candidato.nome}</p>
                            {index === 0 && (
                              <p className="text-xs text-green-600 font-medium">Recomendação principal</p>
                            )}
                          </div>
                          <div className="text-right flex items-center space-x-3">
                            <div className="text-center">
                              <span className="text-sm font-medium text-green-600">
                                {candidato.confianca?.toFixed(0) || 0}%
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full" 
                                  style={{ width: `${candidato.confianca || 0}%` }}
                                ></div>
                              </div>
                            </div>
                            <Button 
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-primary-600 hover:text-primary-700 text-sm"
                              onClick={() => useSpeciesCandidate(candidato)}
                              data-testid={`button-use-species-${index}`}
                            >
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
                      <Input 
                        placeholder="Espécie identificada ou corrigida manualmente" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-especie-final"
                      />
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
            <Button 
              type="submit" 
              disabled={createInspectionMutation.isPending}
              className="bg-primary-600 hover:bg-primary-700"
              data-testid="button-salvar-inspecao"
            >
              <Save className="w-4 h-4 mr-2" />
              {createInspectionMutation.isPending ? "Salvando..." : "Salvar Inspeção"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
