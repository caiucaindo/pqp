@echo off
echo [desktop\build.bat] Build frontend and package
call ..\.venv\Scripts\activate.bat
cd ..\app
npm run build || (echo Frontend build failed & exit /b 1)
cd ..
pyinstaller desktop\build.spec --noconfirm
echo Build finished
