@echo off
REM CloudVoice Chrome - Windows setup script
cd /d "%~dp0"

echo === CloudVoice Chrome :: Backend Setup ===

if not exist ".venv" (
    echo [*] Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo [*] Upgrading pip...
python -m pip install --upgrade pip

echo [*] Installing dependencies...
pip install -r requirements.txt

echo [*] Done. Starting server on http://127.0.0.1:8001 ...
python server.py
pause