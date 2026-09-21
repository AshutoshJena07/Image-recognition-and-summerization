@echo off
title Image Assistant - Complete App
echo ============================================================
echo Starting Local Image Assistant (Backend + Frontend)...
echo ============================================================
cd /d "%~dp0"

start "Image Assistant Backend" cmd /k "%~dp0run_backend.bat"

echo Waiting for backend server to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Opening Web Interface in default browser...
start http://127.0.0.1:8000
