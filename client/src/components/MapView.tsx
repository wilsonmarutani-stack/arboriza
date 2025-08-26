import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapComponent } from "./MapComponent";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Maximize, 
  Layers, 
  Navigation, 
  X,
  Network,
  Edit,
  Eye
} from "lucide-react";
import { InspecaoCompleta, type Ea, type Municipio } from "@shared/schema";

interface MapViewProps {
  onNewInspection: (coordinates?: { lat: number; lng: number }) => void;
  onEditInspection?: (inspection: InspecaoCompleta) => void;
}

interface MapFilters {
  eaId?: string;
  municipioId?: string;
  prioridade: {
    alta: boolean;
    media: boolean;
    baixa: boolean;
  };
  dataInicio?: string;
  dataFim?: string;
}

export function MapView({ onNewInspection, onEditInspection }: MapViewProps) {
  const [filters, setFilters] = useState<MapFilters>({
    prioridade: {
      alta: true,
      media: true,
      baixa: true
    }
  });
  const [selectedInspection, setSelectedInspection] = useState<InspecaoCompleta | null>(null);
  const DEFAULT_CENTER: [number, number] = [-23.2109, -47.2957];
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  // Fetch reference data
  const { data: eas } = useQuery<Ea[]>({ queryKey: ["/api/refs/eas"] });
  const { data: municipios } = useQuery<Municipio[]>({ queryKey: ["/api/refs/municipios"] });

  // Fetch all trees (arvores) for the map
  const { data: arvores = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/arvores"],
  });

  // Fetch inspections for filters reference
  const { data: inspections = [] } = useQuery<InspecaoCompleta[]>({
    queryKey: ["/api/inspecoes"],
  });

  // Filter trees based on priority checkboxes and other filters
  const filteredArvores = arvores.filter(arvore => {
    // Check priority filter
    const prioridadeMatch = filters.prioridade[arvore.inspecao?.prioridade as keyof typeof filters.prioridade];
    
    // Check EA filter
    const eaMatch = !filters.eaId || arvore.inspecao?.eaId === filters.eaId;
    
    // Check municipality filter  
    const municipioMatch = !filters.municipioId || arvore.inspecao?.municipioId === filters.municipioId;

    return prioridadeMatch && eaMatch && municipioMatch;
  });

  // Convert trees to map markers
  const mapMarkers = filteredArvores.map(arvore => ({
    id: arvore.id,
    lat: arvore.latitude,
    lng: arvore.longitude,
    priority: arvore.inspecao?.prioridade as "alta" | "media" | "baixa",
    popup: `
      <div class="p-2">
        <h4 class="font-semibold">${arvore.especieFinal || "Espécie não identificada"}</h4>
        <p class="text-sm text-gray-600">${arvore.municipio?.nome} - ${arvore.ea?.nome}</p>
        <p class="text-sm text-gray-500">${arvore.alimentador?.codigo}</p>
        <p class="text-sm text-gray-600">📍 ${arvore.endereco || 'Endereço não informado'}</p>
        <div class="mt-2">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            arvore.inspecao?.prioridade === 'alta' ? 'bg-red-100 text-red-800' :
            arvore.inspecao?.prioridade === 'media' ? 'bg-amber-100 text-amber-800' :
            'bg-green-100 text-green-800'
          }">
            ${arvore.inspecao?.prioridade === 'alta' ? 'Alta' : arvore.inspecao?.prioridade === 'media' ? 'Média' : 'Baixa'} Prioridade
          </span>
        </div>
      </div>
    `
  }));

  const clearFilters = () => {
    setFilters({
      prioridade: {
        alta: true,
        media: true,
        baixa: true
      },
      eaId: undefined,
      municipioId: undefined,
      dataInicio: undefined,
      dataFim: undefined
    });
  };

  const handleMapClick = (lat: number, lng: number) => {
    onNewInspection({ lat, lng });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "text-red-600 bg-red-100";
      case "media": return "text-amber-600 bg-amber-100";
      case "baixa": return "text-green-600 bg-green-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "alta": return "Alta";
      case "media": return "Média";
      case "baixa": return "Baixa";
      default: return priority;
    }
  };

  const currentStats = {
    total: filteredArvores.length,
    alta: filteredArvores.filter(a => a.inspecao?.prioridade === "alta").length,
    media: filteredArvores.filter(a => a.inspecao?.prioridade === "media").length,
    baixa: filteredArvores.filter(a => a.inspecao?.prioridade === "baixa").length,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Map Container */}
      <div className="flex-1">
        <Card className="overflow-hidden">
          <CardHeader className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle>Mapa de Inspeções</CardTitle>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" data-testid="button-current-location">
                  <Navigation className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" data-testid="button-toggle-layers">
                  <Layers className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" data-testid="button-fullscreen">
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <div className="relative">
            {isLoading ? (
              <div className="h-96 lg:h-[600px] flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <MapComponent
                height="600px"
                center={mapCenter}
                markers={mapMarkers}
                onMapClick={handleMapClick}
                data-testid="main-map"
              />
            )}
          </div>
        </Card>

        {/* Map Legend */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Legenda</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Alta Prioridade</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Média Prioridade</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Baixa Prioridade</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="lg:w-80 space-y-6">
        {/* Quick Add */}
        <Card>
          <CardContent className="p-4">
            <Button 
              className="w-full" 
              onClick={() => onNewInspection()}
              data-testid="button-adicionar-inspecao"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Inspeção
            </Button>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">EA</Label>
              <Select 
                value={filters.eaId || "all"} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, eaId: value === "all" ? undefined : value }))}
              >
                <SelectTrigger className="w-full" data-testid="filter-map-ea">
                  <SelectValue placeholder="Todas as EAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as EAs</SelectItem>
                  {eas?.map((ea) => (
                    <SelectItem key={ea.id} value={ea.id}>
                      {ea.nome} ({inspections.filter(i => i.eaId === ea.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Município</Label>
              <Select 
                value={filters.municipioId || "all"} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, municipioId: value === "all" ? undefined : value }))}
              >
                <SelectTrigger className="w-full" data-testid="filter-map-municipio">
                  <SelectValue placeholder="Todos os municípios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os municípios</SelectItem>
                  {municipios?.map((municipio) => (
                    <SelectItem key={municipio.id} value={municipio.id}>
                      {municipio.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Prioridade</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="alta-priority"
                    checked={filters.prioridade.alta}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        prioridade: { ...prev.prioridade, alta: checked as boolean }
                      }))
                    }
                    data-testid="checkbox-alta-prioridade"
                  />
                  <Label htmlFor="alta-priority" className="text-sm text-gray-600">
                    Alta ({currentStats.alta})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="media-priority"
                    checked={filters.prioridade.media}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        prioridade: { ...prev.prioridade, media: checked as boolean }
                      }))
                    }
                    data-testid="checkbox-media-prioridade"
                  />
                  <Label htmlFor="media-priority" className="text-sm text-gray-600">
                    Média ({currentStats.media})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="baixa-priority"
                    checked={filters.prioridade.baixa}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        prioridade: { ...prev.prioridade, baixa: checked as boolean }
                      }))
                    }
                    data-testid="checkbox-baixa-prioridade"
                  />
                  <Label htmlFor="baixa-priority" className="text-sm text-gray-600">
                    Baixa ({currentStats.baixa})
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Período</Label>
              <div className="space-y-2">
                <Input 
                  type="date" 
                  placeholder="Data inicial"
                  value={filters.dataInicio || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value || undefined }))}
                  data-testid="input-data-inicio-map"
                />
                <Input 
                  type="date" 
                  placeholder="Data final"
                  value={filters.dataFim || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value || undefined }))}
                  data-testid="input-data-fim-map"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={clearFilters}
                data-testid="button-limpar-filtros-mapa"
              >
                <X className="w-4 h-4 mr-2" />
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selected Point Details */}
        {selectedInspection && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Detalhes da Inspeção</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedInspection(null)}
                data-testid="button-close-details"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedInspection.fotoUrl && (
                <img 
                  src={selectedInspection.fotoUrl} 
                  alt="Foto da árvore inspecionada" 
                  className="w-full rounded-lg shadow-sm"
                  data-testid="img-selected-tree"
                />
              )}
              
              <div>
                <h4 className="font-semibold text-gray-900">
                  {selectedInspection.especieFinal || "Espécie não identificada"}
                </h4>
                {selectedInspection.especieConfiancaMedia && (
                  <p className="text-sm text-gray-600">
                    Confiança IA: {selectedInspection.especieConfiancaMedia.toFixed(0)}%
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Data</p>
                  <p className="font-medium">
                    {new Date(selectedInspection.dataInspecao).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">EA</p>
                  <p className="font-medium">{selectedInspection.ea.nome}</p>
                </div>
                <div>
                  <p className="text-gray-500">Município</p>
                  <p className="font-medium">{selectedInspection.municipio.nome}/SP</p>
                </div>
                <div>
                  <p className="text-gray-500">Alimentador</p>
                  <p className="font-medium font-mono">{selectedInspection.alimentador.codigo}</p>
                </div>
              </div>
              
              <div>
                <p className="text-gray-500 text-sm">Endereço</p>
                <p className="font-medium">
                  {selectedInspection.endereco || "Endereço não informado"}
                </p>
              </div>
              
              <div>
                <Badge variant={getPriorityColor(selectedInspection.prioridade) as any}>
                  {getPriorityLabel(selectedInspection.prioridade)} Prioridade
                </Badge>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button 
                  className="flex-1" 
                  size="sm"
                  onClick={() => onEditInspection?.(selectedInspection)}
                  data-testid="button-edit-selected"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  size="sm"
                  data-testid="button-view-more-selected"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Mais
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total visível</span>
                <span className="font-semibold text-gray-900" data-testid="text-total-visible">
                  {currentStats.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Alta prioridade</span>
                <span className="font-semibold text-red-600" data-testid="text-alta-visible">
                  {currentStats.alta}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-600">Média prioridade</span>
                <span className="font-semibold text-amber-600" data-testid="text-media-visible">
                  {currentStats.media}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Baixa prioridade</span>
                <span className="font-semibold text-green-600" data-testid="text-baixa-visible">
                  {currentStats.baixa}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
