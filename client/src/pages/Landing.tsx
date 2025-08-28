import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TreePine, MapPin, Brain, FileText, Shield, Activity } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-green-900/20 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-full shadow-lg">
              <TreePine className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Sistema de Arborização Urbana
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Plataforma completa para inspeção e gestão de árvores urbanas com tecnologia de ponta, 
            integração com IA e ferramentas avançadas para concessionárias de energia elétrica.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => window.location.href = '/api/login'}
          >
            <Shield className="mr-2 h-5 w-5" />
            Entrar no Sistema
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg w-fit mb-4">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-green-800 dark:text-green-300">Geolocalização Precisa</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Captura de coordenadas GPS com alta precisão, mapas interativos e ajuste fino de localização 
                para registro detalhado de cada árvore inspecionada.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg w-fit mb-4">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-blue-800 dark:text-blue-300">IA para Identificação</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Tecnologia de visão computacional com OpenAI GPT-Vision para identificação automática 
                de espécies de árvores com múltiplos candidatos e níveis de confiança.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-purple-800 dark:text-purple-300">Relatórios Avançados</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Exportação em múltiplos formatos: CSV para análise, PDF profissional para relatórios 
                e KML para integração com Google Earth e outros sistemas GIS.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg w-fit mb-4">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-orange-800 dark:text-orange-300">Dashboard Analítico</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Visualização em tempo real de estatísticas, distribuição por prioridade e municípios, 
                com filtros avançados para análise detalhada dos dados coletados.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg w-fit mb-4">
                <TreePine className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-red-800 dark:text-red-300">Gestão Hierárquica</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Organização estruturada por EA (Estações Avançadas), municípios, subestações e alimentadores 
                para controle completo da rede elétrica e arborização urbana.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg w-fit mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-indigo-800 dark:text-indigo-300">Acesso Controlado</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Sistema de autenticação seguro com controle de acesso restrito apenas para usuários 
                autorizados, garantindo a segurança dos dados sensíveis da concessionária.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 text-white shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">Pronto para transformar sua gestão de arborização urbana?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Acesse o sistema com suas credenciais autorizadas e comece a utilizar a plataforma mais avançada 
            para inspeção e gestão de árvores urbanas do setor elétrico.
          </p>
          <Button 
            size="lg" 
            variant="outline" 
            className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-green-600 font-semibold px-8 py-3 text-lg backdrop-blur-sm transition-all duration-300"
            onClick={() => window.location.href = '/api/login'}
          >
            Fazer Login
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 dark:text-gray-400">
          <p>© 2025 Sistema de Arborização Urbana - Tecnologia para Gestão Sustentável</p>
        </div>
      </div>
    </div>
  );
}