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

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ and check "Add Python to PATH".
    pause
    exit /b 1
)

echo Backend running at http://127.0.0.1:8000
python -m uvicorn src.image_analytics.api:app --host 127.0.0.1 --port 8000 --reload --reload-dir src
pause
