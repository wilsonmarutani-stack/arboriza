@echo off
echo ========================================
echo  ArborInsight - Sistema de Arborizacao
echo ========================================
echo.

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Instale o Node.js 18+ em: https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js encontrado

echo.
echo [2/4] Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar dependencias
        pause
        exit /b 1
    )
) else (
    echo ✓ Dependencias ja instaladas
)

echo.
echo [3/4] Verificando arquivo .env...
if not exist .env (
    echo AVISO: Arquivo .env nao encontrado!
    echo.
    echo Configure o arquivo .env com:
    echo - DATABASE_URL (conexao PostgreSQL)
    echo - OPENAI_API_KEY (chave da OpenAI)
    echo - SESSION_SECRET (chave de sessao)
    echo.
    echo Consulte SETUP.md para detalhes
    echo.
    pause
)

echo.
echo [4/4] Iniciando servidor...
echo.
echo ✓ Servidor iniciando em: http://localhost:5000
echo ✓ Pressione Ctrl+C para parar
echo.

call npm run dev
