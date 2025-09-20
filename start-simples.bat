@echo off
echo ========================================
echo  ArborInsight - Sistema de Arborizacao
echo ========================================
echo.

echo Verificando arquivo .env...
if not exist .env (
    echo ERRO: Arquivo .env nao encontrado!
    echo Configure o arquivo .env com os dados do seu banco Replit.
    pause
    exit /b 1
)

echo ✅ Arquivo .env encontrado!
echo ✅ Banco de dados ja configurado e populado!
echo.

echo Iniciando servidor de desenvolvimento...
echo 🌐 O aplicativo estara disponivel em: http://localhost:5000
echo.
echo 💡 Pressione Ctrl+C para parar o servidor
echo.

npm run dev

