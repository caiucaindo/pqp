#!/usr/bin/env bash
set -e
echo "[desktop/build.sh] Building frontend and packaging"
source ../.venv/bin/activate
cd ../app
npm run build
cd ..
pyinstaller desktop/build.spec --noconfirm
echo "Build finished"
