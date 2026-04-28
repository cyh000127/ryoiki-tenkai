param(
    [ValidateSet("fast", "full")]
    [string] $Mode = "fast",
    [switch] $PlanOnly
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$steps = New-Object System.Collections.Generic.List[object]

function ConvertFrom-CodePoints {
    param([int[]] $CodePoints)

    return -join ($CodePoints | ForEach-Object { [char] $_ })
}

function Get-ProviderNeutralPattern {
    $termCodes = @(
        @(77, 101, 100, 105, 97, 80, 105, 112, 101),
        @(71, 111, 111, 103, 108, 101),
        @(84, 101, 108, 101, 103, 114, 97, 109),
        @(65, 87, 83),
        @(71, 105, 116, 76, 97, 98),
        @(74, 101, 110, 107, 105, 110, 115),
        @(84, 104, 97, 110, 107, 115, 67, 97, 114, 98, 111, 110),
        @(75, 97, 107, 97, 111),
        @(78, 97, 118, 101, 114),
        @(83, 97, 109, 115, 117, 110, 103),
        @(83, 51),
        @(77, 111, 110, 116, 97, 103, 101),
        @(119, 97, 110, 116, 101, 100, 100, 101, 118),
        @(87, 68, 83),
        @(87, 101, 98, 82, 84, 67),
        @(76, 105, 118, 101, 75, 105, 116)
    )
    $shortStorageTerm = ConvertFrom-CodePoints @(83, 51)

    $patterns = foreach ($termCode in $termCodes) {
        $term = ConvertFrom-CodePoints $termCode
        if ($term -eq $shortStorageTerm) {
            "\b$([regex]::Escape($term))\b"
        }
        else {
            [regex]::Escape($term)
        }
    }

    return $patterns -join "|"
}

function Add-Step {
    param(
        [string] $Name,
        [string[]] $Command
    )

    $script:steps.Add([pscustomobject]@{
        Name = $Name
        Command = $Command
    }) | Out-Null
}

function Format-Command {
    param([string[]] $Command)

    return ($Command | ForEach-Object {
        if ($_ -match "\s") {
            '"' + $_ + '"'
        }
        else {
            $_
        }
    }) -join " "
}

function Invoke-Step {
    param(
        [string] $Name,
        [string[]] $Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    Write-Host (Format-Command $Command)

    Push-Location $root
    try {
        $executable = $Command[0]
        $arguments = @()
        if ($Command.Length -gt 1) {
            $arguments = $Command[1..($Command.Length - 1)]
        }

        & $executable @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Step failed with exit code $LASTEXITCODE`: $Name"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-ProviderNeutralScan {
    Write-Host ""
    Write-Host "==> Provider-neutral targeted text scan"
    Write-Host "rg -n --glob '!**/pnpm-lock.yaml' --glob '!**/.git/**' <provider-neutral-pattern>"

    Push-Location $root
    try {
        $providerNeutralPattern = Get-ProviderNeutralPattern
        $matches = rg -n --glob "!**/pnpm-lock.yaml" --glob "!**/.git/**" $providerNeutralPattern
        if ($LASTEXITCODE -eq 1) {
            Write-Host "No forbidden terms found"
            return
        }

        if ($LASTEXITCODE -ne 0) {
            throw "Provider-neutral scan failed with exit code $LASTEXITCODE"
        }

        $matches | ForEach-Object { Write-Host $_ }
        throw "Provider-neutral scan found forbidden terms"
    }
    finally {
        Pop-Location
    }
}

Add-Step "Frontend typecheck" @("pnpm", "--dir", "FE/app", "typecheck")
Add-Step "Frontend unit/component tests" @("pnpm", "--dir", "FE/app", "test")
Add-Step "Backend lint" @("uv", "run", "ruff", "check", "BE")
Add-Step "Backend tests" @("uv", "run", "pytest", "BE")
Add-Step "Boundary check" @("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\check-boundaries.ps1")
Add-Step "Compose config" @("docker", "compose", "-f", "docker-compose.yml", "config", "--quiet")
Add-Step "Git diff check" @("git", "diff", "--check")

if ($Mode -eq "full") {
    Add-Step "Frontend camera smoke" @("pnpm", "--dir", "FE/app", "smoke:camera")
    Add-Step "Frontend production build" @("pnpm", "--dir", "FE/app", "build")
}

if ($PlanOnly) {
    Write-Host "V3 handoff check plan ($Mode mode):"
    foreach ($step in $steps) {
        Write-Host "- $($step.Name): $(Format-Command $step.Command)"
    }
    Write-Host "- Provider-neutral targeted text scan"
    exit 0
}

foreach ($step in $steps) {
    Invoke-Step $step.Name $step.Command
}

Invoke-ProviderNeutralScan

Write-Host ""
Write-Host "V3 handoff check passed ($Mode mode)."
