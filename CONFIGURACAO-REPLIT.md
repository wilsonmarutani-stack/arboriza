# 🚀 Configuração para Banco de Dados do Replit

## 📋 Passos para Configurar

### 1. Obter Dados de Conexão do Replit

No seu projeto Replit:
1. Vá para a aba **Database** (ícone de cilindro na barra lateral)
2. Clique em **Connect** ou **Connection Details**
3. Copie as informações de conexão PostgreSQL

### 2. Configurar o Arquivo `.env`

Abra o arquivo `.env` criado e substitua as seguintes variáveis:

```bash
# Substitua pela URL completa do seu banco Replit
DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@SEU_HOST:5432/SEU_BANCO

# Adicione sua chave da OpenAI (obrigatória para identificação de espécies)
OPENAI_API_KEY=sk-sua_chave_openai_aqui
```

### 3. Exemplo de DATABASE_URL do Replit

A URL geralmente tem este formato:
```
postgresql://username:password@db.railway.internal:5432/railway
```

Ou similar, dependendo do provedor usado pelo Replit.

### 4. Obter Chave da OpenAI (Obrigatória)

1. Acesse: https://platform.openai.com/api-keys
2. Faça login na sua conta OpenAI
3. Clique em "Create new secret key"
4. Copie a chave que começa com `sk-`
5. Cole no arquivo `.env`

### 5. Banco de Dados

✅ **As tabelas já estão criadas e populadas no seu banco Replit!**

Não é necessário executar `npm run db:push` pois as tabelas já existem.

### 6. Iniciar o Servidor

Agora você pode iniciar diretamente o servidor de desenvolvimento:

```bash
# Opção 1: Use o script automatizado (recomendado)
start.bat

# Opção 2: Comando manual
npm run dev
```

O aplicativo estará disponível em: http://localhost:5000

## 🔧 Variáveis Opcionais

- **SUPABASE_URL** e **SUPABASE_SERVICE_ROLE**: Apenas se quiser usar Supabase para armazenamento de fotos
- **SESSION_SECRET**: Pode manter o valor padrão ou criar uma string aleatória
- **PORT**: Porta do servidor (padrão: 5000)

## ❗ Problemas Comuns

1. **Erro de conexão com banco**: Verifique se a DATABASE_URL está correta
2. **Erro de permissões**: Certifique-se que o usuário do banco tem permissões para criar tabelas
3. **Erro da OpenAI**: Verifique se a chave API está correta e tem créditos disponíveis

## 📞 Próximos Passos

Após a configuração, você poderá:
- Criar inspeções de árvores
- Fazer upload de fotos
- Usar IA para identificar espécies
- Visualizar no mapa interativo
- Exportar relatórios em CSV, PDF e KML
