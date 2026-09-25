@echo off
REM ============================================================
REM  Hub de marketing — doble clic para arrancar.
REM
REM  Hace lo que harias a mano: comprueba que hay Node, instala
REM  dependencias la primera vez, arranca el hub y abre el
REM  navegador. La ventana se queda abierta porque el servidor
REM  corre ahi dentro: cerrarla apaga el hub.
REM ============================================================

cd /d "%~dp0"
title Hub de marketing

echo.
echo   Hub de marketing
echo   ----------------
echo.

REM --- Node instalado? ---
where node >nul 2>nul
if errorlevel 1 (
    echo   [X] No encuentro Node.js.
    echo.
    echo       Instalalo desde https://nodejs.org  ^(version 20 o superior^)
    echo       y vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

REM --- Primera vez: instalar dependencias ---
if not exist "node_modules\" (
    echo   Primera ejecucion: instalando dependencias.
    echo   Esto tarda un par de minutos, solo pasa una vez.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo   [X] Fallo la instalacion. Revisa el error de arriba.
        pause
        exit /b 1
    )
    echo.
)

REM --- Falta el .env? ---
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo   [!] He creado el archivo .env a partir de la plantilla.
        echo       Abrelo y pon tus claves antes de generar nada.
        echo.
    )
)

REM --- Arrancar y abrir el navegador ---
echo   Arrancando en http://localhost:4321
echo   Deja esta ventana abierta. Cierrala para apagar el hub.
echo.

start "" http://localhost:4321
call npm run hub

REM Si llega aqui es que el servidor se cerro: no cerrar sin que se lea el error
echo.
echo   El hub se ha detenido.
pause
