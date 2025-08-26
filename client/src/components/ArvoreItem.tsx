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
    latitude: number;
    longitude: number;
    endereco?: string;
    observacao?: string;
    especieFinal?: string;
    especieConfiancaMedia?: number;
    fotos: ArvoreFoto[];
  };
  onUpdate: (index: number, updates: Partial<ArvoreItemProps['arvore']>) => void;
  onRemove: (index: number) => void;
  onIdentifySpecies?: (index: number) => void;
}

export function ArvoreItem({ 
  index, 
  arvore, 
  onUpdate, 
  onRemove,
  onIdentifySpecies
}: ArvoreItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(index > 0);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [showMap, setShowMap] = useState(false);

  const handleLocationFromGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onUpdate(index, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          // Abrir o mapa automaticamente após obter GPS
          setShowMap(true);
          toast({
            title: "Localização obtida",
            description: "Coordenadas atualizadas com sua localização atual"
          });
          // Fetch address for the new coordinates
          fetchAddressForCoordinates(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          toast({
            title: "Erro ao obter localização",
            description: "Verifique se você permitiu acesso à localização",
            variant: "destructive"
          });
        }
      );
    }
  };

  const handleMarkerDrag = (lat: number, lng: number) => {
    onUpdate(index, { latitude: lat, longitude: lng });
    fetchAddressForCoordinates(lat, lng);
  };

  const fetchAddressForCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        onUpdate(index, { endereco: data.endereco });
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
  };

  const handlePhotoUpload = () => {
    if (!newPhotoFile) return;
    
    // Simulate upload - in real app, upload to server first
    const photoUrl = URL.createObjectURL(newPhotoFile);
    const updatedFotos = [...arvore.fotos, { url: photoUrl }];
    onUpdate(index, { fotos: updatedFotos });
    setNewPhotoFile(null);
    
    toast({
      title: "Foto adicionada",
      description: "A foto foi adicionada à árvore"
    });
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
          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Latitude *</Label>
              <Input
                type="number"
                step="any"
                value={arvore.latitude}
                onChange={(e) => onUpdate(index, { latitude: parseFloat(e.target.value) })}
                data-testid={`input-latitude-${index}`}
              />
            </div>
            <div>
              <Label>Longitude *</Label>
              <Input
                type="number"
                step="any"
                value={arvore.longitude}
                onChange={(e) => onUpdate(index, { longitude: parseFloat(e.target.value) })}
                data-testid={`input-longitude-${index}`}
              />
            </div>
          </div>

          {/* GPS and Map buttons */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleLocationFromGPS}
              data-testid={`button-gps-${index}`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Usar GPS
            </Button>
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
                        value={arvore.latitude}
                        onChange={(e) => onUpdate(index, { latitude: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={arvore.longitude}
                        onChange={(e) => onUpdate(index, { longitude: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <MapComponent
                    height="400px"
                    center={[arvore.latitude, arvore.longitude]}
                    draggableMarker={{
                      lat: arvore.latitude,
                      lng: arvore.longitude,
                      onDrag: handleMarkerDrag,
                    }}
                  />
                  <p className="text-sm text-gray-600">
                    Arraste o marcador para ajustar a posição exata da árvore ou digite as coordenadas nos campos acima.
                  </p>
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowMap(false)}
                      data-testid={`button-close-map-${index}`}
                    >
                      Fechar
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
              value={arvore.observacao || ""}
              onChange={(e) => onUpdate(index, { observacao: e.target.value })}
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
              <Label>Espécie Final</Label>
              {onIdentifySpecies && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onIdentifySpecies(index)}
                  disabled={!canIdentifySpecies}
                  data-testid={`button-identify-species-${index}`}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Identificar IA
                </Button>
              )}
            </div>
            
            <Input
              value={arvore.especieFinal || ""}
              onChange={(e) => onUpdate(index, { especieFinal: e.target.value })}
              placeholder="Espécie identificada ou corrigida manualmente"
              data-testid={`input-especie-${index}`}
            />
            
            {arvore.especieConfiancaMedia && (
              <p className="text-sm text-gray-600">
                Confiança: {(arvore.especieConfiancaMedia * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}