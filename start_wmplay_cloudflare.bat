@echo off
title WMPLAY - Servidor com Cloudflare Tunnel (Trafego Ilimitado)
color 0A

echo ================================================================
echo       WMPLAY - SERVIDOR COM TRAFEGO ILIMITADO CLOUDFLARE
echo ================================================================
echo.

cd /d "C:\Users\Balcao\.gemini\antigravity\scratch\kodi-web"

echo [1/2] Iniciando Servidor de Producao WMPLAY...
start /b cmd /c "npm run start -- -p 3000"

timeout /t 3 /nobreak >nul

echo [2/2] Conectando a Rede Global da Cloudflare...
echo.
echo ================================================================
echo SEU LINK PUBLICO CLOUDFLARE (HTTPS) APARECERA ABAIXO:
echo ================================================================
echo.

"C:\Users\Balcao\.gemini\antigravity\scratch\bin\cloudflared.exe" tunnel --url http://127.0.0.1:3000

pause
