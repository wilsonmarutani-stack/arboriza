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
    queryKey: ["/api/inspecoes", "limit", "5"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '5');
      const url = `/api/inspecoes?${params.toString()}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao carregar inspeções recentes");
      return resp.json();
    },
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
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-green-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Sistema de Arborização Urbana</h2>
            <p className="text-gray-600 mt-2 text-lg">Gestão inteligente de inspeções com IA</p>
          </div>
          <div className="mt-6 sm:mt-0 flex space-x-3">
            <Button variant="outline" onClick={onShowReports} data-testid="button-export" className="shadow-sm hover:shadow-md transition-all duration-200 border-gray-200">
              <FileText className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={onNewInspection} data-testid="button-nova-inspecao" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="w-4 h-4 mr-2" />
              Nova Inspeção
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros com visual melhorado */}
      <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow duration-200">
        <CardHeader className="bg-gray-50/50 rounded-t-lg">
          <CardTitle className="flex items-center text-gray-800">
            <Network className="w-5 h-5 mr-2 text-blue-600" />
            Filtros de Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Estação Avançada (EA)
              </label>
              <Select value={selectedEaId} onValueChange={setSelectedEaId}>
                <SelectTrigger data-testid="select-ea" className="shadow-sm border-gray-300 focus:border-green-500 focus:ring-green-500">
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
              <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Município
              </label>
              <Select value={selectedMunicipioId} onValueChange={setSelectedMunicipioId} disabled={selectedEaId === "all"}>
                <SelectTrigger data-testid="select-municipio" className="shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50">
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
                className="w-full shadow-sm hover:shadow-md transition-all duration-200 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards com visual aprimorado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-white to-blue-50/30 shadow-md hover:shadow-lg transition-all duration-300 border-0 ring-1 ring-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Network className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total de Inspeções</p>
                <p className="text-3xl font-bold text-gray-900 mt-1" data-testid="text-total-inspections">
                  {stats?.totalInspections || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-red-50/30 shadow-md hover:shadow-lg transition-all duration-300 border-0 ring-1 ring-red-100/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Alta Prioridade</p>
                <p className="text-3xl font-bold text-red-600 mt-1" data-testid="text-high-priority">
                  {stats?.highPriority || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-amber-50/30 shadow-md hover:shadow-lg transition-all duration-300 border-0 ring-1 ring-amber-100/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Média Prioridade</p>
                <p className="text-3xl font-bold text-amber-600 mt-1" data-testid="text-medium-priority">
                  {stats?.mediumPriority || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-green-50/30 shadow-md hover:shadow-lg transition-all duration-300 border-0 ring-1 ring-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Baixa Prioridade</p>
                <p className="text-3xl font-bold text-green-600 mt-1" data-testid="text-low-priority">
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
