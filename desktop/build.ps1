Write-Host "[desktop/build.ps1] Starting build..."

# Root do projeto
$root = Resolve-Path "$PSScriptRoot\.."

Write-Host "Activating virtual environment..."
& "$root\.venv\Scripts\Activate.ps1"

Set-Location "$root\app"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed"
    exit 1
}

Set-Location $root

pyinstaller desktop\build.spec --noconfirm

Write-Host "Build finished"