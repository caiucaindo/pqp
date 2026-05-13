#!/bin/bash
# Build script for PDF Editor
# This script creates a standalone executable

set -e

echo "============================================"
echo "  PDF Editor - Build Process"
echo "============================================"
echo ""

# Activate venv
echo "[1/3] Activating virtual environment..."
source .venv/bin/activate || {
    echo "Error: Failed to activate venv"
    exit 1
}

# Build frontend
echo "[2/3] Building frontend..."
cd app
npm run build || {
    echo "Error: Frontend build failed"
    cd ..
    exit 1
}
cd ..

# Build executable with PyInstaller
echo "[3/3] Building executable with PyInstaller..."
pyinstaller build.spec --noconfirm --onefile || {
    echo "Error: PyInstaller build failed"
    exit 1
}

echo ""
echo "============================================"
echo "  Build Complete!"
echo "============================================"
echo ""
echo "Executable location: dist/PDF Editor"
echo ""
