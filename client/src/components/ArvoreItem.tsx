import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Trash2, Upload, Brain, Map } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { MapComponent } from "./MapComponent";

interface ArvoreFoto {
  id?: string;
  url: string;
}

interface ArvoreItemProps {
  index: number;
  arvore: {
    latitude: number | undefined;
    longitude: number | undefined;
    endereco?: string;
    observacao?: string;
    especieFinal?: string;
    especieConfiancaMedia?: number;
    fotos: ArvoreFoto[];
  };
  onUpdate: (index: number, updates: Partial<ArvoreItemProps['arvore']>) => void;
  onRemove: (index: number) => void;
  onPhotoAdded?: (index: number, photoUrl: string) => void;
  form?: any; // React Hook Form instance
  fieldName?: string; // Field name prefix for form fields
  gpsCoords?: { lat: number; lng: number } | null;
}

export function ArvoreItem({ 
  index, 
  arvore, 
  onUpdate, 
  onRemove,
  onPhotoAdded,
  form,
  fieldName = "arvores",
  gpsCoords
}: ArvoreItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(index > 0);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [tempCoords, setTempCoords] = useState({ lat: arvore.latitude ?? Number.NaN, lng: arvore.longitude ?? Number.NaN });
  
  // Estado local para coordenadas para garantir controle total
  const [localLat, setLocalLat] = useState<number | undefined>(arvore.latitude);
  const [localLng, setLocalLng] = useState<number | undefined>(arvore.longitude);

  // Watch apenas para observação
  const obsWatch = form?.watch(`${fieldName}.${index}.observacao`);

  // Sincronizar estado local com props quando elas mudarem
  useEffect(() => {
    if (arvore.latitude !== localLat) {
      setLocalLat(arvore.latitude);
    }
    if (arvore.longitude !== localLng) {
      setLocalLng(arvore.longitude);
    }
  }, [arvore.latitude, arvore.longitude]);

  // Sincronizar coordenadas temporárias apenas quando o mapa abre pela primeira vez
  useEffect(() => {
    if (showMap) {
      setTempCoords({ lat: localLat ?? Number.NaN, lng: localLng ?? Number.NaN });
    }
  }, [showMap, localLat, localLng]);

  async function fetchAddressForCoordinates(lat: number, lng: number) {
    try {
      const response = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        onUpdate(index, { endereco: data.endereco });
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
  }
  // registra campos no RHF para setValue funcionarem
  useEffect(() => {
    if (!form) return;
    form.register(`${fieldName}.${index}.latitude`);
    form.register(`${fieldName}.${index}.longitude`);
    form.register(`${fieldName}.${index}.observacao`);
  }, [form, fieldName, index]);

  // hidrata o RHF com os valores atuais de 'arvore' apenas na inicialização
  useEffect(() => {
    if (!form) return;
    const latPath = `${fieldName}.${index}.latitude`;
    const lngPath = `${fieldName}.${index}.longitude`;
    const obsPath = `${fieldName}.${index}.observacao`;

    const currentLat = form.getValues(latPath);
    const currentLng = form.getValues(lngPath);
    const currentObs = form.getValues(obsPath);

    // Só hidrata se o campo do formulário está vazio/undefined E temos um valor no arvore
    if ((currentLat === undefined || currentLat === null || currentLat === '') && arvore.latitude != null) {
      form.setValue(latPath, arvore.latitude, { shouldDirty: false, shouldValidate: false });
    }
    if ((currentLng === undefined || currentLng === null || currentLng === '') && arvore.longitude != null) {
      form.setValue(lngPath, arvore.longitude, { shouldDirty: false, shouldValidate: false });
    }
    if ((currentObs === undefined || currentObs === null || currentObs === '') && arvore.observacao != null) {
      form.setValue(obsPath, arvore.observacao, { shouldDirty: false, shouldValidate: false });
    }
  }, [form, fieldName, index]);

  function useDebouncedEffect(fn: () => void, deps: any[], delay: number) {
    useEffect(() => {
      const id = setTimeout(fn, delay);
      return () => clearTimeout(id);
    }, deps);
  }

  useDebouncedEffect(() => {
    const updates: Partial<typeof arvore> = {};
    if (obsWatch !== undefined && obsWatch !== arvore.observacao) {
      updates.observacao = obsWatch;
    }
    if (Object.keys(updates).length) onUpdate(index, updates);
  }, [obsWatch], 250);


  
  const handleLocationFromGPS = () => {
    // 1) Preferir coordenadas do cabeçalho, se disponíveis
    if (gpsCoords && Number.isFinite(gpsCoords.lat) && Number.isFinite(gpsCoords.lng)) {
      const { lat, lng } = gpsCoords;
      applyCoordinates(lat, lng, "Coordenadas aplicadas");
      return;
    }

    // 2) Fallback: pegar do navigator.geolocation
    if (!navigator.geolocation) {
      toast({ title: "Geolocalização não suportada", description: "Seu navegador não suporta geolocalização", variant: "destructive" });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        applyCoordinates(lat, lng, "Localização obtida");
      },
      () => {
        toast({
          title: "Erro ao obter localização",
          description: "Permita o acesso à localização ou use o GPS do cabeçalho.",
          variant: "destructive",
        });
      }
    );
  };

  const applyCoordinates = (lat: number, lng: number, successMessage: string) => {
    // Atualizar estado local primeiro
    setLocalLat(lat);
    setLocalLng(lng);
    
    // Aplicar coordenadas no formulário
    if (form) {
      form.setValue(`${fieldName}.${index}.latitude`, lat, { shouldDirty: true, shouldValidate: true });
      form.setValue(`${fieldName}.${index}.longitude`, lng, { shouldDirty: true, shouldValidate: true });
    }
    
    // Atualizar estado do componente
    onUpdate(index, { latitude: lat, longitude: lng });
    
    // Buscar endereço
    fetchAddressForCoordinates(lat, lng);
    
    // Mostrar mensagem de sucesso
    toast({ 
      title: successMessage, 
      description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` 
    });
  };


  const handleMarkerDrag = (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    // Não atualiza as coordenadas reais imediatamente para evitar re-renderização do dialog
  };

  const applyTempCoords = () => {
    const latToApply = Number.isFinite(tempCoords.lat) ? tempCoords.lat : localLat;
    const lngToApply = Number.isFinite(tempCoords.lng) ? tempCoords.lng : localLng;
    
    // Atualizar estado local
    setLocalLat(latToApply);
    setLocalLng(lngToApply);
    
    // Sincronizar com formulário
    form?.setValue(`${fieldName}.${index}.latitude`, latToApply, { shouldDirty: true, shouldValidate: true });
    form?.setValue(`${fieldName}.${index}.longitude`, lngToApply, { shouldDirty: true, shouldValidate: true });
    
    // Atualizar estado do componente
    onUpdate(index, { latitude: latToApply, longitude: lngToApply });
    
    if (latToApply && lngToApply) {
      fetchAddressForCoordinates(latToApply, lngToApply);
    }

    setShowMap(false);
  };


  const handlePhotoUpload = async () => {
    if (!newPhotoFile) return;
    
    // Create a proper URL from the file for API calls
    const photoUrl = URL.createObjectURL(newPhotoFile);
    const updatedFotos = [...arvore.fotos, { url: photoUrl }];
    onUpdate(index, { fotos: updatedFotos });
    setNewPhotoFile(null);
    
    toast({
      title: "Foto adicionada",
      description: "Identificando espécie automaticamente..."
    });

    // Trigger automatic species identification
    if (onPhotoAdded) {
      onPhotoAdded(index, photoUrl);
    }
  };

  const removePhoto = (photoIndex: number) => {
    const updatedFotos = arvore.fotos.filter((_, i) => i !== photoIndex);
    onUpdate(index, { fotos: updatedFotos });
  };

  const canIdentifySpecies = arvore.fotos.length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Árvore {index + 1}</span>
            {arvore.especieFinal && (
              <span className="text-sm font-normal text-gray-600">
                - {arvore.especieFinal}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {arvore.fotos.length} foto(s)
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              data-testid={`button-remove-arvore-${index}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* GPS Coordinates Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Coordenadas GPS da Árvore</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLocationFromGPS}
                data-testid={`button-gps-${index}`}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Usar GPS
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Latitude *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Ex: -23.550520"
                  value={localLat || ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                    setLocalLat(value);
                    // Sincronizar com formulário e estado
                    if (form) {
                      form.setValue(`${fieldName}.${index}.latitude`, value, { shouldDirty: true, shouldValidate: true });
                    }
                    onUpdate(index, { latitude: value });
                  }}
                  data-testid={`input-latitude-${index}`}
                />
              </div>

              <div>
                <Label>Longitude *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Ex: -47.295757"
                  value={localLng || ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                    setLocalLng(value);
                    // Sincronizar com formulário e estado
                    if (form) {
                      form.setValue(`${fieldName}.${index}.longitude`, value, { shouldDirty: true, shouldValidate: true });
                    }
                    onUpdate(index, { longitude: value });
                  }}
                  data-testid={`input-longitude-${index}`}
                />
              </div>
            </div>

            {localLat && localLng && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Coordenadas: {Number(localLat).toFixed(6)}, {Number(localLng).toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Map button */}
          <div className="flex space-x-2">
            <Dialog open={showMap} onOpenChange={setShowMap}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  data-testid={`button-map-${index}`}
                >
                  <Map className="w-4 h-4 mr-2" />
                  Ajustar no mapa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Ajustar Posição da Árvore {index + 1}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={Number.isFinite(tempCoords.lat) ? tempCoords.lat : ""}
                        onChange={(e) => setTempCoords((c) => ({ ...c, lat: e.target.value === "" ? Number.NaN : Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={Number.isFinite(tempCoords.lng) ? tempCoords.lng : ""}
                        onChange={(e) => setTempCoords((c) => ({ ...c, lng: e.target.value === "" ? Number.NaN : Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <MapComponent
                    height="400px"
                    center={[
                      Number.isFinite(tempCoords.lat) ? tempCoords.lat : (arvore.latitude ?? -23.2109),
                      Number.isFinite(tempCoords.lng) ? tempCoords.lng : (arvore.longitude ?? -47.2957),
                    ]}
                    draggableMarker={{
                      lat: Number.isFinite(tempCoords.lat) ? tempCoords.lat : (arvore.latitude ?? -23.2109),
                      lng: Number.isFinite(tempCoords.lng) ? tempCoords.lng : (arvore.longitude ?? -47.2957),
                      onDrag: handleMarkerDrag,
                    }}
                  />
                  <p className="text-sm text-gray-600">
                    Arraste o marcador para ajustar a posição exata da árvore.
                  </p>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTempCoords({ lat: arvore.latitude ?? Number.NaN, lng: arvore.longitude ?? Number.NaN });
                        setShowMap(false);
                      }}
                      data-testid={`button-cancel-map-${index}`}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={applyTempCoords}
                      data-testid={`button-apply-map-${index}`}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>


          {/* Address */}
          <div>
            <Label>Endereço</Label>
            <Input
              value={arvore.endereco || ""}
              onChange={(e) => onUpdate(index, { endereco: e.target.value })}
              placeholder="Endereço será preenchido automaticamente"
              data-testid={`input-endereco-${index}`}
            />
          </div>

          {/* Observation */}
          <div>
            <Label>Observação</Label>
            <Textarea
              value={(form?.watch(`${fieldName}.${index}.observacao`) ?? arvore.observacao) ?? ""}
              onChange={(e) => {
                form?.setValue(`${fieldName}.${index}.observacao`, e.target.value, { shouldDirty: true });
              }}
              placeholder="Observações sobre esta árvore"
              data-testid={`textarea-observacao-${index}`}
            />
          </div>

          {/* Photos */}
          <div>
            <Label>Fotos da Árvore</Label>
            
            {arvore.fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {arvore.fotos.map((foto, photoIndex) => (
                  <div key={photoIndex} className="relative">
                    <img
                      src={foto.url}
                      alt={`Foto ${photoIndex + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 p-1"
                      onClick={() => removePhoto(photoIndex)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2 mt-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setNewPhotoFile(e.target.files?.[0] || null)}
                data-testid={`input-photo-${index}`}
              />
              <Button
                type="button"
                onClick={handlePhotoUpload}
                disabled={!newPhotoFile}
                data-testid={`button-upload-photo-${index}`}
              >
                <Upload className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Species identification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Espécie Identificada</Label>
            </div>
            
            <Input
              value={arvore.especieFinal || ""}
              onChange={(e) => onUpdate(index, { especieFinal: e.target.value })}
              placeholder="Espécie identificada ou corrigida manualmente"
              data-testid={`input-especie-${index}`}
            />
            
            {arvore.especieConfiancaMedia && (
              <p className="text-sm text-gray-600">
                Confiança: {arvore.especieConfiancaMedia.toFixed(0)}% (PlantNet)
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}