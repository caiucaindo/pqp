Write-Host "[desktop/build.ps1] Starting build..."

$ErrorActionPreference = "Stop"

# Root do projeto
$root = (Resolve-Path "$PSScriptRoot\..").Path
$npmCmd = "npm.cmd"
$pyinstallerExe = Join-Path $root ".venv\Scripts\pyinstaller.exe"

if (-not (Test-Path $pyinstallerExe)) {
    Write-Host "[desktop/build.ps1] pyinstaller nao encontrado em $pyinstallerExe"
    Write-Host "[desktop/build.ps1] Crie/ative a .venv e instale requirements primeiro."
    exit 1
}

Set-Location (Join-Path $root "app")

& $npmCmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[desktop/build.ps1] Frontend build failed"
    exit 1
}

Set-Location $root

& $pyinstallerExe "desktop\build.spec" --noconfirm --clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "[desktop/build.ps1] PyInstaller build failed"
    exit 1
}

Write-Host "[desktop/build.ps1] Build finished"
