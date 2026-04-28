param(
    [switch] $SkipMigration,
    [switch] $PlanOnly
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dependencyServices = @("db", "cache")

Write-Host "Local dependency plan:"
Write-Host "- Compose file: docker-compose.yml"
Write-Host "- Services: $($dependencyServices -join ', ')"
Write-Host "- Run migration: $(-not $SkipMigration)"

if ($PlanOnly) {
    Write-Host "Plan-only mode finished. No container command was executed."
    exit 0
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    throw "Docker CLI is required to start local dependency services."
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    & docker info *> $null
    $dockerInfoExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousErrorActionPreference
}

if ($dockerInfoExitCode -ne 0) {
    throw "Docker daemon is not reachable. Start the local container runtime, then re-run this script."
}

Push-Location $root
try {
    Write-Host "Starting local dependency services..."
    & docker compose up -d @dependencyServices
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start local dependency services."
    }

    if (-not $SkipMigration) {
        Write-Host "Applying database migrations..."
        & docker compose run --rm db-migrate
        if ($LASTEXITCODE -ne 0) {
            throw "Database migration failed."
        }
    }

    & docker compose ps db cache
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read dependency service status."
    }
}
finally {
    Pop-Location
}

Write-Host "Local dependencies are ready."
