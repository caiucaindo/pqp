@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS1_PATH=%SCRIPT_DIR%build.ps1"

if not exist "%PS1_PATH%" (
  echo [desktop/build.bat] build.ps1 nao encontrado em: %PS1_PATH%
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_PATH%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo [desktop/build.bat] Build falhou com codigo %EXIT_CODE%.
  exit /b %EXIT_CODE%
)

echo [desktop/build.bat] Build concluida com sucesso.
exit /b 0
