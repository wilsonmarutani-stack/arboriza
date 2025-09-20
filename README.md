# 🌳 ArborInsight - Sistema de Arborização Urbana

Sistema completo de gestão de inspeções de árvores urbanas com identificação de espécies por IA, mapeamento interativo e geração de relatórios para empresas de energia elétrica.

## ✨ Funcionalidades Principais

### 📱 Interface Completa
- **Dashboard** com estatísticas em tempo real
- **Formulário de inspeção** com validação completa
- **Múltiplas árvores por inspeção** com coordenadas individuais
- **Interface responsiva** para desktop e mobile

### 🌍 Geolocalização Avançada
- **Captura GPS automática** via navegador
- **Mapa interativo** com ajuste fino de coordenadas
- **Geocodificação reversa** para preenchimento automático de endereços
- **Visualização em cluster** para performance otimizada

### 🤖 Inteligência Artificial
- **OpenAI Vision API (GPT-4)** para identificação de espécies
- **Múltiplos candidatos** com níveis de confiança
- **Interface visual** com barras de progresso
- **Validação manual** e seleção de alternativas

### 📊 Relatórios e Exportação
- **Export CSV** com todos os campos para análise
- **Export PDF** com layout profissional
- **Export KML** para visualização no Google Earth
- **Filtros avançados** por período, região e prioridade

### 🏗️ Estrutura Organizacional
- **Hierarquia completa**: EA → Municípios → Alimentadores → Subestações
- **Validação rigorosa** de códigos de alimentadores
- **Sistema de prioridades** com identificação visual
- **Gestão completa** de referências organizacionais

## 🚀 Tecnologias

### Frontend
- **React 18** + TypeScript
- **Vite** para build otimizado
- **TailwindCSS** + Shadcn/ui
- **React Hook Form** + Zod
- **TanStack Query** para estado server-side
- **Leaflet** para mapas interativos

### Backend
- **Node.js** + Express + TypeScript
- **Drizzle ORM** + PostgreSQL
- **OpenAI API** para IA
- **Multer** para upload de arquivos
- **Express sessions** para autenticação

### Infraestrutura
- **PostgreSQL** (Neon/Railway/local)
- **Object Storage** para fotos
- **Nominatim API** para geocodificação
- **CORS** e middleware de segurança

## 📋 Início Rápido

### 1. Setup Inicial
```bash
# Clone o projeto
git clone <url-do-repositorio>
cd ArborInsight

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações
```

### 2. Configuração Mínima (.env)
```bash
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
OPENAI_API_KEY=sk-sua_chave_openai_aqui
SESSION_SECRET=chave_secreta_aleatoria
PORT=5000
NODE_ENV=development
```

### 3. Inicialização
```bash
# Se necessário, criar tabelas do banco
npm run db:push

# Iniciar servidor de desenvolvimento
npm run dev
```

### 4. Acesso
Abra: **http://localhost:5000**

## 📚 Documentação

- **[SETUP.md](SETUP.md)** - Guia completo de instalação e configuração
- **[DEPLOY.md](DEPLOY.md)** - Deploy em produção (Vercel, Railway, VPS)

## 🔧 Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build para produção
npm run start    # Servidor de produção
npm run check    # Verificar TypeScript
npm run db:push  # Atualizar schema do banco
```

## 🌟 Características Técnicas

### ✅ Funcionalidades Implementadas
- [x] Sistema de inspeções com múltiplas árvores
- [x] GPS com correção de coordenadas
- [x] Identificação de espécies por IA
- [x] Mapa interativo com filtros
- [x] Upload e gerenciamento de fotos
- [x] Exportação em múltiplos formatos
- [x] Sistema hierárquico completo
- [x] Validação robusta de formulários
- [x] Interface responsiva
- [x] Autenticação e sessões

### 🔄 Fluxo de Trabalho
1. **Dashboard** → Visão geral das inspeções
2. **Nova Inspeção** → Preenchimento de dados básicos
3. **GPS/Mapa** → Captura de coordenadas precisas
4. **Árvores** → Adição de múltiplas árvores por inspeção
5. **Fotos** → Upload com identificação automática por IA
6. **Relatórios** → Visualização e exportação de dados

## 🏢 Casos de Uso

### Empresas de Energia Elétrica
- Inspeção de árvores próximas à rede elétrica
- Identificação de espécies para planejamento de poda
- Mapeamento de riscos por prioridade
- Relatórios para órgãos reguladores

### Prefeituras e Órgãos Ambientais
- Inventário de arborização urbana
- Planejamento de plantio e manejo
- Controle de espécies nativas/exóticas
- Dados para políticas públicas

### Empresas de Consultoria Ambiental
- Levantamentos técnicos especializados
- Laudos e relatórios profissionais
- Integração com sistemas GIS
- Documentação fotográfica completa

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma [issue](../../issues) no repositório
- Consulte a documentação em `SETUP.md` e `DEPLOY.md`
- Verifique os logs de erro no console do navegador

---

**Desenvolvido com ❤️ para gestão inteligente de arborização urbana**