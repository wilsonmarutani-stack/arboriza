# 🚀 ArborInsight - Guia de Deploy em Produção

## 📦 Build para Produção

### 1. Preparação do Ambiente

Certifique-se de que todas as dependências estão instaladas:
```bash
npm install
```

### 2. Configuração de Produção

Crie/atualize o arquivo `.env` com configurações de produção:

```bash
# Banco de dados de produção
DATABASE_URL=postgresql://usuario:senha@host:5432/banco_producao

# APIs
OPENAI_API_KEY=sk-sua_chave_openai_producao

# Configurações de produção
NODE_ENV=production
PORT=5000
SESSION_SECRET=chave_super_secreta_e_longa_para_producao

# Supabase (opcional)
SUPABASE_URL=https://seu-projeto-prod.supabase.co
SUPABASE_SERVICE_ROLE=sua_service_role_key_producao
```

### 3. Gerar Build

```bash
npm run build
```

Este comando irá:
- Compilar o frontend (Vite)
- Compilar o backend (esbuild)
- Gerar arquivos otimizados na pasta `dist/`

### 4. Estrutura após Build

```
dist/
├── public/          # Frontend compilado
│   ├── index.html
│   ├── assets/      # CSS, JS minificados
│   └── ...
└── index.js         # Backend compilado
```

## 🌐 Deploy em Diferentes Plataformas

### 🔹 Deploy no Vercel

1. **Instalar Vercel CLI**:
```bash
npm install -g vercel
```

2. **Configurar vercel.json**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "dist/public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "dist/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. **Deploy**:
```bash
npm run build
vercel --prod
```

### 🔹 Deploy no Railway

1. **Conectar repositório** no Railway
2. **Configurar variáveis de ambiente** no painel
3. **Railway detecta automaticamente** o projeto Node.js
4. **Deploy automático** a cada push

### 🔹 Deploy no Render

1. **Conectar repositório** no Render
2. **Configurações**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: `Node`
3. **Adicionar variáveis de ambiente**
4. **Deploy automático**

### 🔹 Deploy no Heroku

1. **Instalar Heroku CLI**
2. **Criar aplicação**:
```bash
heroku create arborinsight-prod
```

3. **Configurar variáveis**:
```bash
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=sua_url_banco
heroku config:set OPENAI_API_KEY=sua_chave
```

4. **Deploy**:
```bash
git push heroku main
```

### 🔹 Deploy em VPS/Servidor Próprio

1. **Preparar servidor** (Ubuntu/CentOS):
```bash
# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gerenciamento de processo
npm install -g pm2
```

2. **Transferir arquivos**:
```bash
# Fazer upload dos arquivos do projeto
scp -r ./dist usuario@servidor:/var/www/arborinsight/
scp package.json usuario@servidor:/var/www/arborinsight/
scp .env usuario@servidor:/var/www/arborinsight/
```

3. **Instalar dependências de produção**:
```bash
cd /var/www/arborinsight
npm install --production
```

4. **Configurar PM2**:
```bash
# Criar ecosystem.config.js
module.exports = {
  apps: [{
    name: 'arborinsight',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

5. **Configurar Nginx** (opcional):
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🗄️ Configuração de Banco de Dados

### PostgreSQL em Produção

1. **Neon Database** (Recomendado):
   - Acesse: https://neon.tech
   - Crie novo projeto
   - Copie a connection string
   - Configure `DATABASE_URL`

2. **PostgreSQL tradicional**:
```bash
# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Criar banco e usuário
sudo -u postgres psql
CREATE DATABASE arborinsight_prod;
CREATE USER arborapp WITH PASSWORD 'senha_segura';
GRANT ALL PRIVILEGES ON DATABASE arborinsight_prod TO arborapp;
```

3. **Executar migrações**:
```bash
npm run db:push
```

## 🔒 Considerações de Segurança

### Variáveis de Ambiente
- ✅ Nunca commitar `.env` no repositório
- ✅ Usar chaves diferentes para produção
- ✅ `SESSION_SECRET` deve ser longo e aleatório
- ✅ Configurar HTTPS em produção

### Banco de Dados
- ✅ Usar SSL em produção (`?sslmode=require`)
- ✅ Backup automatizado
- ✅ Usuário com permissões limitadas
- ✅ Monitoramento de performance

### API Keys
- ✅ Monitorar uso da OpenAI API
- ✅ Configurar rate limiting
- ✅ Logs de segurança

## 📊 Monitoramento

### Logs de Aplicação
```bash
# PM2 logs
pm2 logs arborinsight

# Logs específicos
pm2 logs arborinsight --lines 100
```

### Métricas PM2
```bash
# Status dos processos
pm2 status

# Monitor em tempo real
pm2 monit

# Restart se necessário
pm2 restart arborinsight
```

### Health Check
Endpoint disponível em: `GET /api/health`

## 🔄 Atualizações

### Deploy de Nova Versão
```bash
# 1. Build local
npm run build

# 2. Upload para servidor
scp -r ./dist/* usuario@servidor:/var/www/arborinsight/dist/

# 3. Restart aplicação
pm2 restart arborinsight

# 4. Verificar logs
pm2 logs arborinsight --lines 50
```

### Rollback
```bash
# Voltar para versão anterior
pm2 restart arborinsight --update-env
```

## 📞 Suporte

Para problemas de produção:
1. Verificar logs: `pm2 logs`
2. Checar status: `pm2 status`
3. Verificar banco: conexão e queries
4. Monitorar APIs: OpenAI usage
5. Conferir SSL/HTTPS

---

**⚠️ Importante**: Sempre teste o build localmente antes de fazer deploy em produção!
