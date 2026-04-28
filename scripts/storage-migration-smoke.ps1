param(
    [string] $DatabaseUrl = "postgresql+psycopg://app:app@localhost:5432/gesture_skill",
    [switch] $StartDb,
    [switch] $VerifyRollback,
    [switch] $AllowDestructiveReset,
    [switch] $PlanOnly
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$apiDir = Join-Path $root "BE/api"

if ($VerifyRollback -and -not $AllowDestructiveReset) {
    throw "Rollback smoke can drop local tables. Re-run with -AllowDestructiveReset when the target database is disposable."
}

Write-Host "Storage migration smoke plan:"
Write-Host "- API directory: $apiDir"
Write-Host "- Database URL: $DatabaseUrl"
Write-Host "- Start DB: $StartDb"
Write-Host "- Verify rollback: $VerifyRollback"

if ($PlanOnly) {
    Write-Host "Plan-only mode finished. No migration command was executed."
    exit 0
}

function Invoke-Alembic {
    param(
        [string[]] $Arguments
    )

    Write-Host "Running: uv run --package gesture-api alembic $($Arguments -join ' ')"
    & uv run --package gesture-api alembic @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Alembic command failed: $($Arguments -join ' ')"
    }
}

if ($StartDb) {
    Push-Location $root
    try {
        & docker compose up -d db
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to start local database service."
        }
        Start-Sleep -Seconds 3
    }
    finally {
        Pop-Location
    }
}

$hadDatabaseUrl = Test-Path Env:DATABASE_URL
$previousDatabaseUrl = $env:DATABASE_URL
$env:DATABASE_URL = $DatabaseUrl

Push-Location $apiDir
try {
    Invoke-Alembic -Arguments @("current")
    Invoke-Alembic -Arguments @("upgrade", "head")
    Invoke-Alembic -Arguments @("current")

    if ($VerifyRollback) {
        Invoke-Alembic -Arguments @("downgrade", "-1")
        Invoke-Alembic -Arguments @("current")
        Invoke-Alembic -Arguments @("upgrade", "head")
        Invoke-Alembic -Arguments @("current")
    }
}
finally {
    Pop-Location

    if ($hadDatabaseUrl) {
        $env:DATABASE_URL = $previousDatabaseUrl
    }
    else {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    }
}

Write-Host "Storage migration smoke passed."
