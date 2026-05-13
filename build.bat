@echo off
REM Build script for PDF Editor
REM This script creates a standalone executable

setlocal enabledelayedexpansion

echo ============================================
echo  PDF Editor - Build Process
echo ============================================
echo.

REM Activate venv
echo [1/3] Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate venv
    exit /b 1
)

REM Build frontend
echo [2/3] Building frontend...
cd app
call npm run build
if errorlevel 1 (
    echo Error: Frontend build failed
    cd ..
    exit /b 1
)
cd ..

REM Build executable with PyInstaller
echo [3/3] Building executable with PyInstaller...
call .venv\Scripts\pyinstaller.exe build.spec --noconfirm --onefile
if errorlevel 1 (
    echo Error: PyInstaller build failed
    exit /b 1
)

echo.
echo ============================================
echo  Build Complete!
echo ============================================
echo.
echo Executable location: dist\PDF Editor.exe
echo.
pause
