@echo off
title Local Image Assistant - Launch All
echo ============================================================
echo Starting Backend and Opening Frontend Interface...
echo ============================================================
cd /d "%~dp0"

start "Backend Server" cmd /k "run_backend.bat"
timeout /t 3 /nobreak >nul
start http://127.0.0.1:8000
