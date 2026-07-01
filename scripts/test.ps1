$ErrorActionPreference = 'Stop'
Set-Location -Path (Join-Path $PSScriptRoot '..')

if (-not (Test-Path 'node_modules')) {
	npm install
}

npm run test
