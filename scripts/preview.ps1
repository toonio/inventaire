$ErrorActionPreference = 'Stop'
Set-Location -Path (Join-Path $PSScriptRoot '..')

if (-not (Test-Path 'build')) {
	Write-Host 'No build/ folder found - building first.' -ForegroundColor Yellow
	npm run build
}

npm run preview
