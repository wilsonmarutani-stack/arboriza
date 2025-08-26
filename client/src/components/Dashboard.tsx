import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, AlertTriangle, Clock, CheckCircle, Plus, Map, FileText } from "lucide-react";
import { InspecaoCompleta, Ea, Municipio } from "@shared/schema";
import { useState, useEffect } from "react";

interface DashboardStats {
  totalInspections: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  byMunicipality: { municipio: string; count: number }[];
}

interface DashboardProps {
  onNewInspection: () => void;
  onShowMap: () => void;
  onShowReports: () => void;
}

export function Dashboard({ onNewInspection, onShowMap, onShowReports }: DashboardProps) {
  const [selectedEaId, setSelectedEaId] = useState<string>("all");
  const [selectedMunicipioId, setSelectedMunicipioId] = useState<string>("all");

  const { data: eas } = useQuery<Ea[]>({ queryKey: ["/api/refs/eas"] });
  
  const { data: municipios } = useQuery<Municipio[]>({
    queryKey: ["/api/refs/municipios", selectedEaId],
    enabled: selectedEaId !== "all",
    queryFn: async () => {
      const url = `/api/refs/municipios?ea_id=${encodeURIComponent(selectedEaId)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao carregar municípios");
      return resp.json();
    },
  });

  // Reset município when EA changes
  useEffect(() => {
    setSelectedMunicipioId("all");
  }, [selectedEaId]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", selectedEaId, selectedMunicipioId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEaId !== "all") params.append('ea_id', selectedEaId);
      if (selectedMunicipioId !== "all") params.append('municipio_id', selectedMunicipioId);
      const url = `/api/dashboard/stats${params.toString() ? '?' + params.toString() : ''}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao carregar estatísticas");
      return resp.json();
    },
  });

  const { data: recentInspections, isLoading: inspectionsLoading } = useQuery<InspecaoCompleta[]>({
    queryKey: ["/api/inspecoes", { limit: 5 }],
  });

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

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Visão geral das inspeções de arborização urbana</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline" onClick={onShowReports} data-testid="button-export">
            <FileText className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={onNewInspection} data-testid="button-nova-inspecao">
            <Plus className="w-4 h-4 mr-2" />
            Nova Inspeção
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">EA</label>
              <Select value={selectedEaId} onValueChange={setSelectedEaId}>
                <SelectTrigger data-testid="select-ea">
                  <SelectValue placeholder="Todas as EAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as EAs</SelectItem>
                  {eas?.map((ea) => (
                    <SelectItem key={ea.id} value={ea.id}>{ea.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Município</label>
              <Select value={selectedMunicipioId} onValueChange={setSelectedMunicipioId} disabled={selectedEaId === "all"}>
                <SelectTrigger data-testid="select-municipio">
                  <SelectValue placeholder="Todos os municípios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os municípios</SelectItem>
                  {municipios?.map((municipio) => (
                    <SelectItem key={municipio.id} value={municipio.id}>{municipio.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => { setSelectedEaId("all"); setSelectedMunicipioId("all"); }}
                data-testid="button-limpar-filtros"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Network className="w-6 h-6 text-primary-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Inspeções</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-total-inspections">
                  {stats?.totalInspections || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Alta Prioridade</p>
                <p className="text-3xl font-bold text-red-600" data-testid="text-high-priority">
                  {stats?.highPriority || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Média Prioridade</p>
                <p className="text-3xl font-bold text-amber-600" data-testid="text-medium-priority">
                  {stats?.mediumPriority || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Baixa Prioridade</p>
                <p className="text-3xl font-bold text-green-600" data-testid="text-low-priority">
                  {stats?.lowPriority || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Inspections */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inspeções Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {inspectionsLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : recentInspections && recentInspections.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentInspections.map((inspecao) => (
                    <div key={inspecao.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" data-testid={`inspection-card-${inspecao.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Network className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900" data-testid={`text-species-${inspecao.id}`}>
                              {inspecao.especieFinal || "Espécie não identificada"}
                            </p>
                            <p className="text-sm text-gray-600" data-testid={`text-location-${inspecao.id}`}>
                              {inspecao.endereco || `${inspecao.municipio.nome}/SP`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(inspecao.dataInspecao).toLocaleDateString("pt-BR")} - {inspecao.ea.nome}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(inspecao.prioridade)}`}>
                            {getPriorityLabel(inspecao.prioridade)}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">{inspecao.alimentador.codigo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <Network className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma inspeção encontrada</p>
                </div>
              )}
              {recentInspections && recentInspections.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <Button 
                    variant="ghost" 
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    data-testid="button-ver-todas-inspecoes"
                  >
                    Ver todas as inspeções →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* By Municipality Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Por Município</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.byMunicipality && stats.byMunicipality.length > 0 ? (
                <div className="space-y-3">
                  {stats.byMunicipality.slice(0, 3).map((item, index) => {
                    const maxCount = stats.byMunicipality[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">{item.municipio}</span>
                          <span className="text-sm font-medium text-gray-900">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={onNewInspection}
                  className="w-full bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-600"
                  variant="outline"
                  data-testid="button-quick-nova-inspecao"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Inspeção
                </Button>
                
                <Button 
                  onClick={onShowMap}
                  variant="outline" 
                  className="w-full"
                  data-testid="button-visualizar-mapa"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Visualizar Mapa
                </Button>
                
                <Button 
                  onClick={onShowReports}
                  variant="outline" 
                  className="w-full"
                  data-testid="button-gerar-relatorio"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
