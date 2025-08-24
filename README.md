# Sistema de Arborização Urbana

Sistema completo de gestão de inspeções de árvores urbanas com identificação de espécies por IA, mapeamento interativo e geração de relatórios para empresas de energia elétrica.

## 🌟 Funcionalidades Principais

### 📱 Interface Principal
- **Dashboard** com estatísticas em tempo real e ações rápidas
- **Navegação responsiva** para desktop e mobile
- **Interface em português** otimizada para trabalho de campo

### 🌳 Gestão de Inspeções
- **Formulário completo** com validação de dados obrigatórios
- **Upload de fotos** com suporte a câmera e armazenamento em nuvem
- **Captura de GPS** automática via navegador
- **Mapa interativo** com marcadores arrastáveis para ajuste de posição
- **Geocodificação reversa** automática para preenchimento de endereços

### 🤖 Identificação por IA
- **OpenAI Vision API (GPT-5)** para identificação precisa de espécies
- **Múltiplos candidatos** com níveis de confiança detalhados
- **Interface visual** com barras de progresso para confiança
- **Validação manual** e seleção de espécies alternativas

### 🗺️ Mapeamento Avançado
- **Leaflet** com OpenStreetMap para visualização
- **Cluster de marcadores** para performance otimizada
- **Filtros dinâmicos** por EA, município, alimentador e prioridade
- **Ícones personalizados** diferenciados por nível de prioridade
- **Popups informativos** com dados completos das inspeções

### 📊 Relatórios e Exportação
- **Export CSV** com todos os campos para análise
- **Export PDF** com layout profissional e logo da empresa
- **Export KML** para visualização no Google Earth
- **Filtros avançados** para relatórios customizados por período e região

### 🔧 Estrutura Técnica
- **Hierarquia organizacional**: EA → Municípios → Alimentadores → Subestações
- **Validação rigorosa**: Regex para códigos de alimentadores (XXX00)
- **Sistema de prioridades**: Alta, Média, Baixa com identificação visual
- **Coordenadas precisas** com edição manual via mapa

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript para type safety
- **Vite** para build rápido e HMR
- **TailwindCSS** para estilização responsiva
- **Shadcn/ui** para componentes acessíveis
- **React Hook Form** + Zod para validação robusta
- **TanStack Query** para gerenciamento de estado server-side
- **Leaflet** + React Leaflet para mapas interativos
- **Wouter** para roteamento client-side

### Backend
- **Node.js** + Express com TypeScript
- **Multer** para upload de arquivos local
- **Object Storage** (Replit) para armazenamento em nuvem
- **OpenAI API** para identificação de espécies via IA
- **Nominatim API** para geocodificação reversa
- **In-Memory Storage** com estrutura pronta para PostgreSQL
- **Export engines** para CSV, PDF e KML

### Infraestrutura
- **Replit** ready com configurações otimizadas
- **Environment variables** para chaves de API
- **CORS** e middleware de segurança
- **Error handling** robusto com mensagens em português

## ⚙️ Configuração e Instalação

### 1. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
