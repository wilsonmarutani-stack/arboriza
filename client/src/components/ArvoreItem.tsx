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
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

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

  // Watch apenas para observação
  const obsWatch = form?.watch(`${fieldName}.${index}.observacao`);


  // Sincronizar coordenadas temporárias quando o mapa abre
  useEffect(() => {
    if (showMap) {
      const currentLat = form?.getValues(`${fieldName}.${index}.latitude`) ?? arvore.latitude;
      const currentLng = form?.getValues(`${fieldName}.${index}.longitude`) ?? arvore.longitude;
      setTempCoords({ lat: currentLat ?? Number.NaN, lng: currentLng ?? Number.NaN });
    }
  }, [showMap, form, fieldName, index, arvore.latitude, arvore.longitude]);

  async function fetchAddressForCoordinates(lat: number, lng: number) {
    try {
      const response = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        // Atualizar diretamente no formulário e forçar re-render
        if (form) {
          form.setValue(`${fieldName}.${index}.endereco`, data.endereco, { 
            shouldDirty: true, 
            shouldValidate: true,
            shouldTouch: true 
          });
          // Forçar re-render do campo de endereço
          form.trigger(`${fieldName}.${index}.endereco`);
          console.log(`[GPS] Endereço definido no formulário: ${data.endereco}`);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
  }
  // Registro de campos removido - agora feito no useEffect de inicialização

  // Controle de inicialização mais robusto
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<number>(0);
  
  useEffect(() => {
    if (!form || isInitialized) return;
    
    const latPath = `${fieldName}.${index}.latitude`;
    const lngPath = `${fieldName}.${index}.longitude`;
    const obsPath = `${fieldName}.${index}.observacao`;

    // Registrar os campos primeiro
    const endPath = `${fieldName}.${index}.endereco`;
    form.register(latPath);
    form.register(lngPath);
    form.register(obsPath);
    form.register(endPath);

    const currentLat = form.getValues(latPath);
    const currentLng = form.getValues(lngPath);
    const currentObs = form.getValues(obsPath);
    const currentEnd = form.getValues(endPath);

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
    if ((currentEnd === undefined || currentEnd === null || currentEnd === '') && arvore.endereco != null) {
      form.setValue(endPath, arvore.endereco, { shouldDirty: false, shouldValidate: false });
    }
    
    setIsInitialized(true);
  }, [form, fieldName, index, isInitialized]);

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
    const timestamp = Date.now();
    setLastGpsUpdate(timestamp);
    
    console.log(`[GPS] Aplicando coordenadas: ${lat}, ${lng} para árvore ${index}`);
    
    // Aplicar valores diretamente no formulário (igual ao cabeçalho que funciona)
    if (form) {
      const latPath = `${fieldName}.${index}.latitude`;
      const lngPath = `${fieldName}.${index}.longitude`;
      
      // Usar a mesma abordagem do cabeçalho que funciona
      form.setValue(latPath, lat, { shouldDirty: true, shouldValidate: true });
      form.setValue(lngPath, lng, { shouldDirty: true, shouldValidate: true });
      
      console.log(`[GPS] Valores definidos no formulário: ${latPath}=${lat}, ${lngPath}=${lng}`);
      console.log(`[GPS] Verificação - form.getValues('${latPath}'):`, form.getValues(latPath));
      console.log(`[GPS] Verificação - form.getValues('${lngPath}'):`, form.getValues(lngPath));
    }
    
    // NÃO chamar onUpdate imediatamente para evitar conflitos
    // Deixar o formulário ser a única fonte da verdade
    
    // Buscar endereço
    fetchAddressForCoordinates(lat, lng);
    
    // Mostrar mensagem de sucesso
    toast({ 
      title: successMessage, 
      description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` 
    });
    
    // NÃO chamar onUpdate para coordenadas GPS - deixar o formulário ser a fonte da verdade
    // O FieldArray.update() está sobrescrevendo os valores corretos!
  };


  const handleMarkerDrag = (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    // Não atualiza as coordenadas reais imediatamente para evitar re-renderização do dialog
  };

  const applyTempCoords = () => {
    const latToApply = Number.isFinite(tempCoords.lat) ? tempCoords.lat : undefined;
    const lngToApply = Number.isFinite(tempCoords.lng) ? tempCoords.lng : undefined;
    
    // Sincronizar com formulário
    if (latToApply !== undefined) {
      form?.setValue(`${fieldName}.${index}.latitude`, latToApply, { shouldDirty: true, shouldValidate: true });
    }
    if (lngToApply !== undefined) {
      form?.setValue(`${fieldName}.${index}.longitude`, lngToApply, { shouldDirty: true, shouldValidate: true });
    }
    
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
              <FormField
                control={form?.control}
                name={`${fieldName}.${index}.latitude`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ex: -23.550520"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : undefined;
                          field.onChange(value);
                          // Remover onUpdate imediato para evitar conflitos com FieldArray
                          console.log(`[Input] Latitude alterada manualmente: ${value}`);
                        }}
                        data-testid={`input-latitude-${index}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form?.control}
                name={`${fieldName}.${index}.longitude`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ex: -47.295757"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : undefined;
                          field.onChange(value);
                          // Remover onUpdate imediato para evitar conflitos com FieldArray
                          console.log(`[Input] Longitude alterada manualmente: ${value}`);
                        }}
                        data-testid={`input-longitude-${index}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form?.watch(`${fieldName}.${index}.latitude`) && form?.watch(`${fieldName}.${index}.longitude`) && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Coordenadas: {Number(form.watch(`${fieldName}.${index}.latitude`)).toFixed(6)}, {Number(form.watch(`${fieldName}.${index}.longitude`)).toFixed(6)}
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
          <FormField
            control={form?.control}
            name={`${fieldName}.${index}.endereco`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="Endereço será preenchido automaticamente"
                    data-testid={`input-endereco-${index}`}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      console.log(`[Input] Endereço alterado manualmente: ${e.target.value}`);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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