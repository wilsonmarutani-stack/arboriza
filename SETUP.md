# 🚀 ArborInsight - Guia de Setup e Instalação

## 📋 Pré-requisitos

- **Node.js** versão 18 ou superior
- **npm** (incluído com Node.js)
- **PostgreSQL** (banco de dados)
- **Chave da OpenAI API** (para identificação de espécies)

## 🔧 Setup Inicial (Desenvolvimento)

### 1. Clone ou baixe o projeto
```bash
git clone <url-do-repositorio>
cd ArborInsight
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Configuração do Banco de Dados PostgreSQL
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_banco

# Chave da API OpenAI (obrigatória)
OPENAI_API_KEY=sk-sua_chave_openai_aqui

# Configurações de Sessão
SESSION_SECRET=sua_chave_secreta_aleatoria_aqui

# Configurações do Servidor
PORT=5000
NODE_ENV=development

# Configurações opcionais do Supabase (para armazenamento de fotos)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE=sua_service_role_key_aqui
```

### 4. Configure o banco de dados

Se as tabelas não existirem, execute:
```bash
npm run db:push
```

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

O aplicativo estará disponível em: **http://localhost:5000**

## 🌐 Acesso ao Sistema

- **Dashboard**: Estatísticas e visão geral
- **Nova Inspeção**: Formulário para criar inspeções de árvores
- **Mapa**: Visualização interativa das inspeções
- **Relatórios**: Exportação em CSV, PDF e KML

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run start` - Inicia servidor de produção
- `npm run check` - Verifica erros de TypeScript
- `npm run db:push` - Atualiza schema do banco de dados

## 🔑 Configurações Importantes

### OpenAI API Key
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova chave secreta
3. Cole no arquivo `.env` em `OPENAI_API_KEY`

### Banco de Dados
- **Neon**: Recomendado para produção
- **PostgreSQL local**: Para desenvolvimento
- **Replit Database**: Se usando Replit

### Variáveis Obrigatórias
- `DATABASE_URL` - Conexão com PostgreSQL
- `OPENAI_API_KEY` - Para identificação de espécies
- `SESSION_SECRET` - Para segurança de sessões

## 🐛 Troubleshooting

### Erro: "NODE_ENV não é reconhecido"
- **Windows**: Use `set NODE_ENV=development && comando`
- **Linux/Mac**: Use `NODE_ENV=development comando`

### Erro: "DATABASE_URL must be set"
- Verifique se o arquivo `.env` existe
- Confirme se a `DATABASE_URL` está correta
- Teste a conexão com o banco

### Erro: "Geolocalização não suportada"
- Use HTTPS em produção
- Permita localização no navegador
- Teste em navegador moderno

## 📱 Funcionalidades

### ✅ Funcionalidades Implementadas
- Sistema de inspeções com múltiplas árvores
- GPS para captura de coordenadas
- Identificação de espécies por IA (OpenAI)
- Mapa interativo com filtros
- Exportação em múltiplos formatos
- Upload e gerenciamento de fotos
- Sistema hierárquico (EA → Município → Alimentador)

### 🔄 Fluxo de Trabalho
1. **Criar inspeção** → Preencher dados básicos
2. **Usar GPS** → Capturar coordenadas automaticamente
3. **Adicionar árvores** → Múltiplas árvores por inspeção
4. **Upload de fotos** → Identificação automática por IA
5. **Salvar** → Dados sincronizados com banco
6. **Visualizar** → Dashboard e mapa atualizados

---

Para mais informações, consulte `DEPLOY.md` para instruções de produção.
