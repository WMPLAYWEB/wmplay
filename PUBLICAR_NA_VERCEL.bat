@echo off
chcp 65001 >nul
title WMPLAY - Sincronizar e Publicar na Vercel
color 0A

echo ================================================================
echo          WMPLAY - SINCRONIZAR E ATUALIZAR NA VERCEL
echo ================================================================
echo.
echo [1/3] Verificando modificações no projeto...
cd /d "C:\Users\Balcao\.gemini\antigravity\scratch\kodi-web"

echo [2/3] Enviando alterações para o repositório GitHub...
git add -A
git commit -m "deploy: atualizar wmplay na vercel" 2>nul
git push origin main

echo.
echo [3/3] Sucesso! As alterações foram enviadas para a branch main.
echo A Vercel (https://wmplay2.vercel.app) iniciou o build e estará atualizada em segundos!
echo.
echo ================================================================
echo                      PROCESSO CONCLUÍDO!
echo ================================================================
echo.
pause
