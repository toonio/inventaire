$ErrorActionPreference = 'Stop'
Set-Location -Path (Join-Path $PSScriptRoot '..')

if (-not (Test-Path 'node_modules')) {
	npm install
}

if (-not (Test-Path '.env')) {
	Write-Host 'No .env file found - copying .env.example.' -ForegroundColor Yellow
	Write-Host 'Fill in your Google Client ID / API key before signing in (see CLAUDE.md).' -ForegroundColor Yellow
	Copy-Item '.env.example' '.env'
}

npm run dev
