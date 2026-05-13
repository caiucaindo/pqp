# PDF Editor - Build & Deployment Guide

## Overview

The PDF Editor has been containerized with a Python FastAPI backend serving a React frontend as static files. This creates a single executable that can be distributed and run on any Windows system without dependencies.

## Architecture

```
PDF Editor (Standalone Executable)
├── Backend: FastAPI (Python)
└── Frontend: React (Static files)
    └── Bundled with: Vite
```

## Prerequisites

- Python 3.8+
- Node.js 16+ (for building)
- Virtual environment (`.venv`) already created and configured

## Build Instructions

### Option 1: PowerShell (Recommended for Windows)

```powershell
.\build.ps1
```

### Option 2: Command Prompt (CMD)

```cmd
build.bat
```

### Option 3: Bash (Linux/Mac)

```bash
chmod +x build.sh
./build.sh
```

### Option 4: Manual Build

```bash
# 1. Activate virtual environment
.venv\Scripts\activate

# 2. Build frontend
cd app
npm run build
cd ..

# 3. Build executable
pyinstaller build.spec --noconfirm --onefile
```

## Output

The executable will be located at:
```
dist/PDF Editor.exe
```

## Running the Application

### From Build
```bash
dist\PDF Editor.exe
```

The application will start automatically and open a local web server on `http://127.0.0.1:5173`

### During Development

Run the development server:
```bash
cd app
npm run dev
```

Then in another terminal, run the FastAPI backend:
```bash
.venv\Scripts\activate
python main.py
```

Access the application at `http://localhost:5173`

## Project Structure

```
d:\CODE\EDITOR PDF\
├── .venv/                 # Python virtual environment
├── app/                   # React application
│   ├── src/              # React source code
│   ├── dist/             # Built frontend (generated)
│   ├── package.json      # NPM dependencies
│   └── vite.config.ts    # Vite build config
├── main.py               # FastAPI backend entry point
├── requirements.txt      # Python dependencies
├── build.spec            # PyInstaller configuration
├── build.ps1             # PowerShell build script
├── build.bat             # CMD build script
└── build.sh              # Bash build script
```

## Key Files

- **main.py**: FastAPI server that serves the React frontend and provides API endpoints
- **build.spec**: PyInstaller configuration for creating the executable
- **requirements.txt**: Python dependencies (FastAPI, uvicorn, PyInstaller)
- **app/package.json**: Node.js dependencies (React, Vite, etc.)

## Environment Variables

- `PORT`: Server port (default: 5173)

## Troubleshooting

### Build Fails with "npm not found"
- Ensure Node.js is installed and added to PATH
- Reinstall Node.js if necessary

### Build Fails with "python not found"
- Ensure Python 3.8+ is installed and added to PATH
- Check that `.venv` is properly created

### Executable crashes on start
- Check that `app/dist` folder exists
- Rebuild the frontend: `cd app && npm run build`

### Port already in use
- Change the PORT environment variable: `set PORT=5174`
- Or modify the port in `main.py`

## Performance Notes

- First run may take a few seconds to extract files
- Subsequent runs are faster
- Executable size: ~200-300MB (includes Python runtime, FastAPI, and frontend)

## Distribution

To distribute the application:

1. Build the executable using one of the build methods
2. Distribute `dist/PDF Editor.exe`
3. Users can run it directly without installing Python or Node.js

## Future Improvements

- Add app icon to executable
- Create installer with NSIS or Inno Setup
- Add auto-update functionality
- Reduce executable size using UPX

