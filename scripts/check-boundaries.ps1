$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

$checks = @(
    "BE/api/src/gesture_api/api/routes",
    "BE/api/src/gesture_api/api/schemas",
    "BE/api/src/gesture_api/services",
    "BE/api/src/gesture_api/repositories",
    "BE/api/src/gesture_api/models",
    "BE/api/src/gesture_api/domain",
    "BE/api/src/gesture_api/db",
    "BE/core/src/gesture_core",
    "BE/worker/src/gesture_worker",
    "FE/app/src/pages",
    "FE/app/src/widgets",
    "FE/app/src/features",
    "FE/app/src/entities",
    "FE/app/src/platform",
    "FE/app/src/generated"
)

foreach ($path in $checks) {
    $fullPath = Join-Path $root $path
    if (-not (Test-Path $fullPath)) {
        throw "Boundary check failed. Missing path: $path"
    }
}

Write-Host "Boundary check passed."
