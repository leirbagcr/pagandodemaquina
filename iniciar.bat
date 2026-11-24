@echo off
cd /d "%~dp0"

rem Garante que o Node/npm sejam encontrados mesmo em terminais antigos.
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)

if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo.
        echo Falha ao instalar as dependencias. Confira se o Node.js esta instalado.
        pause
        exit /b 1
    )
)

echo Iniciando a API em http://localhost:3000 ...
node index.js
pause
