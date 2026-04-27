param(
    [switch] $InstallDependencies
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$requiredPaths = @(
    "FE/app",
    "BE/api",
    "BE/core",
    "BE/worker",
    "BE/api/contracts",
    "docs/conventions",
    "infra/runtime",
    "ops",
    "scripts"
)

foreach ($path in $requiredPaths) {
    $fullPath = Join-Path $root $path
    if (-not (Test-Path $fullPath)) {
        throw "Missing required scaffold path: $path"
    }
}

if ($InstallDependencies) {
    $uv = Get-Command uv -ErrorAction SilentlyContinue
    if ($uv) {
        & uv sync
    }

    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm -and (Test-Path (Join-Path $root "FE/app/package.json"))) {
        & pnpm --dir (Join-Path $root "FE/app") install
    }
}

Write-Host "Workspace scaffold is ready."
