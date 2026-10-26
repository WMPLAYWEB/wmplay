@echo off
title Publicar no Cloudflare Pages (wmplay.pages.dev)
color 0B

echo ================================================================
echo     PUBLICANDO NO CLOUDFLARE PAGES (DOMINIO .PAGES.DEV)
echo ================================================================
echo.
echo Se for sua primeira vez, uma janela do navegador se abrira
echo para voce autorizar a Cloudflare (e 100%% gratis).
echo.

cd /d "C:\Users\Balcao\.gemini\antigravity\scratch\kodi-web"

npx wrangler pages deploy cloudflare-pages --project-name wmplay

echo.
echo ================================================================
echo Processo concluido! Verifique a URL gerada acima.
echo ================================================================
pause
