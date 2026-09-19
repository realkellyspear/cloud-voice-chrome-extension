#!/usr/bin/env bash
# CloudVoice Chrome — Linux/macOS setup script
set -e

cd "$(dirname "$0")"

echo "=== CloudVoice Chrome :: Backend Setup ==="

if [ ! -d ".venv" ]; then
    echo "[*] Creating virtual environment..."
    python3 -m venv .venv
fi

# shellcheck disable=1091
source .venv/bin/activate

echo "[*] Upgrading pip..."
pip install --upgrade pip

echo "[*] Installing dependencies..."
pip install -r requirements.txt

echo "[*] Done. Starting server on http://127.0.0.1:8001 ..."
python server.py