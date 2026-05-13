$ErrorActionPreference = "Stop"

Write-Host "[desktop/build.ps1] Starting build..." -ForegroundColor Cyan

try {
    # Activate venv from repo root
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & "..\.venv\Scripts\Activate.ps1"

    # Build frontend
    Write-Host "Building frontend (app)..." -ForegroundColor Yellow
    Set-Location ..\app
    npm run build
    Set-Location ..\

    # Build executable
    Write-Host "Building executable with PyInstaller..." -ForegroundColor Yellow
    pyinstaller desktop\build.spec --noconfirm

    Write-Host "Build complete." -ForegroundColor Green
}
catch {
    Write-Host "Build failed: $_" -ForegroundColor Red
    exit 1
}
