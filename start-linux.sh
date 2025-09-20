#!/bin/bash

echo "========================================"
echo "  ArborInsight - Sistema de Arborização"
echo "========================================"
echo

echo "[1/4] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ ERRO: Node.js não encontrado!"
    echo "Instale o Node.js 18+ em: https://nodejs.org"
    exit 1
fi
echo "✅ Node.js encontrado: $(node --version)"

echo
echo "[2/4] Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ ERRO: Falha ao instalar dependências"
        exit 1
    fi
else
    echo "✅ Dependências já instaladas"
fi

echo
echo "[3/4] Verificando arquivo .env..."
if [ ! -f ".env" ]; then
    echo "⚠️  AVISO: Arquivo .env não encontrado!"
    echo
    echo "Configure o arquivo .env com:"
    echo "- DATABASE_URL (conexão PostgreSQL)"
    echo "- OPENAI_API_KEY (chave da OpenAI)"
    echo "- SESSION_SECRET (chave de sessão)"
    echo
    echo "Consulte SETUP.md para detalhes"
    echo
    read -p "Pressione Enter para continuar..."
fi

echo
echo "[4/4] Iniciando servidor..."
echo
echo "✅ Servidor iniciando em: http://localhost:5000"
echo "✅ Pressione Ctrl+C para parar"
echo

npm run dev
