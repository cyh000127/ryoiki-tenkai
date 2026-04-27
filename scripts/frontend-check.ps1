$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$packagePath = Join-Path $root "FE/app/package.json"

if (-not (Test-Path $packagePath)) {
    throw "Missing FE/app/package.json"
}

node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" $packagePath
Write-Host "Frontend package manifest is valid JSON."
