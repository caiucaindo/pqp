# Build script for PDF Editor - PowerShell version
# This script creates a standalone executable

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PDF Editor - Build Process" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Activate venv
    Write-Host "[1/3] Activating virtual environment..." -ForegroundColor Yellow
    & ".\.venv\Scripts\Activate.ps1"
    
    # Build frontend
    Write-Host "[2/3] Building frontend..." -ForegroundColor Yellow
    Set-Location app
    npm run build
    Set-Location ..
    
    # Build executable with PyInstaller
    Write-Host "[3/3] Building executable with PyInstaller..." -ForegroundColor Yellow
    pyinstaller build.spec --noconfirm --onefile
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Build Complete!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Executable location: dist\PDF Editor.exe" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
