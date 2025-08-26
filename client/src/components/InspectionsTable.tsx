import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Filter, 
  FileText, 
  Download, 
  Plus, 
  Edit, 
  MapPin, 
  Trash2,
  ChevronLeft,
  ChevronRight 
} from "lucide-react";
import { InspecaoCompleta, type Ea, type Municipio } from "@shared/schema";

interface InspectionsTableProps {
  onNewInspection: () => void;
  onEditInspection?: (inspection: InspecaoCompleta) => void;
}

interface TableFilters {
  eaId?: string;
  municipioId?: string;
  prioridade?: string;
  dataInicio?: string;
  dataFim?: string;
  numeroNota?: string;
}

export function InspectionsTable({ onNewInspection, onEditInspection }: InspectionsTableProps) {
  const [filters, setFilters] = useState<TableFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchNota, setSearchNota] = useState("");
  const itemsPerPage = 10;

  // Fetch reference data
  const { data: eas } = useQuery<Ea[]>({ queryKey: ["/api/refs/eas"] });
  const { data: municipios } = useQuery<Municipio[]>({ queryKey: ["/api/refs/municipios"] });

  // Fetch inspections with filters
  const { data: inspections = [], isLoading } = useQuery<InspecaoCompleta[]>({
    queryKey: ["/api/inspecoes", { 
      ...filters, 
      limit: itemsPerPage, 
      offset: (currentPage - 1) * itemsPerPage 
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.eaId) params.append('ea_id', filters.eaId);
      if (filters.municipioId) params.append('municipio_id', filters.municipioId);
      if (filters.prioridade) params.append('prioridade', filters.prioridade);
      if (filters.dataInicio) params.append('data_inicio', filters.dataInicio);
      if (filters.dataFim) params.append('data_fim', filters.dataFim);
      if (filters.numeroNota) params.append('numeroNota', filters.numeroNota);
      params.append('limit', itemsPerPage.toString());
      params.append('offset', ((currentPage - 1) * itemsPerPage).toString());

      const url = `/api/inspecoes${params.toString() ? '?' + params.toString() : ''}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao carregar inspeções");
      return resp.json();
    },
  });

  // Export functions
  const handleExport = async (format: 'csv' | 'pdf' | 'kml') => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const url = `/api/export/${format}?${queryParams.toString()}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro na exportação');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const extensions = { csv: 'csv', pdf: 'pdf', kml: 'kml' };
      link.download = `inspecoes.${extensions[format]}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro na exportação:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "destructive";
      case "media": return "secondary";
      case "baixa": return "default";
      default: return "outline";
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

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(inspections.length / itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inspeções</h2>
          <p className="text-gray-600 mt-1">Gerencie todas as inspeções registradas</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="flex space-x-2">
            <Input
              placeholder="Buscar por número da nota..."
              value={searchNota}
              onChange={(e) => {
                setSearchNota(e.target.value);
                setFilters(prev => ({ ...prev, numeroNota: e.target.value || undefined }));
              }}
              className="w-64"
              data-testid="input-search-nota"
            />
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExport('csv')}
              data-testid="button-export-csv"
            >
              <FileText className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExport('pdf')}
              data-testid="button-export-pdf"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExport('kml')}
              data-testid="button-export-kml"
            >
              <MapPin className="w-4 h-4 mr-2" />
              KML
            </Button>
          </div>
          <Button onClick={onNewInspection} data-testid="button-nova-inspecao">
            <Plus className="w-4 h-4 mr-2" />
            Nova Inspeção
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-ea" className="text-sm font-medium text-gray-700 mb-2">
                  EA
                </Label>
                <Select 
                  value={filters.eaId || "all"} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, eaId: value === "all" ? undefined : value }))}
                >
                  <SelectTrigger data-testid="filter-ea">
                    <SelectValue placeholder="Todas as EAs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as EAs</SelectItem>
                    {eas?.map((ea) => (
                      <SelectItem key={ea.id} value={ea.id}>
                        {ea.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="filter-municipio" className="text-sm font-medium text-gray-700 mb-2">
                  Município
                </Label>
                <Select 
                  value={filters.municipioId || "all"} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, municipioId: value === "all" ? undefined : value }))}
                >
                  <SelectTrigger data-testid="filter-municipio">
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
                <Label htmlFor="filter-prioridade" className="text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </Label>
                <Select 
                  value={filters.prioridade || "all"} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, prioridade: value === "all" ? undefined : value }))}
                >
                  <SelectTrigger data-testid="filter-prioridade">
                    <SelectValue placeholder="Todas as prioridades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prioridades</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="filter-data" className="text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </Label>
                <Input 
                  type="date" 
                  value={filters.dataInicio || ""} 
                  onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value || undefined }))}
                  data-testid="filter-data-inicio"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-between">
              <Button 
                variant="ghost" 
                onClick={() => {
                  clearFilters();
                  setSearchNota("");
                }} 
                data-testid="button-limpar-filtros"
              >
                Limpar filtros
              </Button>
              <p className="text-sm text-gray-500">
                {inspections.length} registros encontrados
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando inspeções...</p>
            </div>
          ) : inspections.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma inspeção encontrada</p>
              <p className="text-sm text-gray-400 mt-2">
                {Object.keys(filters).some(key => filters[key as keyof TableFilters]) ? 'Tente ajustar os filtros ou limpar a busca' : 'Use o botão "Nova Inspeção" para criar a primeira inspeção'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número da Nota</TableHead>
                    <TableHead>Data/EA</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Espécie</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspecao) => (
                    <TableRow key={inspecao.id} className="hover:bg-gray-50" data-testid={`row-inspection-${inspecao.id}`}>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {inspecao.numeroNota}
                          </div>
                          {inspecao.numeroOperativo && (
                            <div className="text-xs text-gray-500 font-mono">
                              {inspecao.numeroOperativo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(inspecao.dataInspecao).toLocaleDateString("pt-BR")} {new Date(inspecao.dataInspecao).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-sm text-gray-500">{inspecao.ea.nome}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm text-gray-900">{inspecao.municipio.nome}/SP</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {inspecao.endereco || "Endereço não informado"}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {inspecao.latitude.toFixed(6)}, {inspecao.longitude.toFixed(6)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {inspecao.especieFinal || "Não identificada"}
                          </div>
                          {inspecao.especieConfiancaMedia && (
                            <div className="text-sm text-gray-500">
                              Confiança: {inspecao.especieConfiancaMedia.toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(inspecao.prioridade)}>
                          {getPriorityLabel(inspecao.prioridade)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onEditInspection?.(inspecao)}
                            data-testid={`button-edit-${inspecao.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-map-${inspecao.id}`}
                          >
                            <MapPin className="w-4 h-4" />
                          </Button>
                          {inspecao.fotoUrl && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(inspecao.fotoUrl!, '_blank')}
                              data-testid={`button-download-${inspecao.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-delete-${inspecao.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {inspections.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-mobile"
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-mobile"
                >
                  Próximo
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, inspections.length)}</span> de{' '}
                    <span className="font-medium">{inspections.length}</span> resultados
                  </p>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        data-testid={`button-page-${pageNumber}`}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
