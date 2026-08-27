@echo off
title Image Assistant Backend
echo ============================================================
echo Starting Local Image Assistant Backend Server...
echo ============================================================
cd /d "%~dp0"

IF EXIST "%USERPROFILE%\.venv\Scripts\activate.bat" (
    call "%USERPROFILE%\.venv\Scripts\activate.bat"
) ELSE IF EXIST ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
) ELSE IF EXIST "venv\Scripts\activate.bat" (
    call "venv\Scripts\activate.bat"
)

python -m uvicorn src.image_analytics.api:app --host 127.0.0.1 --port 8000 --reload --reload-dir src
pause
