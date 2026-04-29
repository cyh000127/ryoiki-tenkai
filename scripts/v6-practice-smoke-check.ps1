param(
    [ValidateSet("fast", "full")]
    [string] $Mode = "fast",
    [switch] $PlanOnly
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$steps = New-Object System.Collections.Generic.List[object]

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

Add-Step "Unity build config check" @(
    "powershell.exe",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "scripts\unity-build-check.ps1"
)
Add-Step "Frontend typecheck" @("pnpm", "--dir", "FE/app", "typecheck")
Add-Step "Practice renderer unit tests" @(
    "pnpm",
    "--dir",
    "FE/app",
    "test",
    "AnimsetRendererSurface",
    "BattleGameWorkspace",
    "skillPresentationManifest",
    "unityWebglRenderer",
    "animsetRegistry"
)
Add-Step "Git diff check" @("git", "diff", "--check")

if ($Mode -eq "full") {
    Add-Step "Frontend production build" @("pnpm", "--dir", "FE/app", "build")
    Add-Step "Live camera smoke fixture" @("pnpm", "--dir", "FE/app", "smoke:camera")
}

if ($PlanOnly) {
    Write-Host "V6 practice smoke check plan ($Mode mode):"
    foreach ($step in $steps) {
        Write-Host "- $($step.Name): $(Format-Command $step.Command)"
    }
    exit 0
}

foreach ($step in $steps) {
    Invoke-Step $step.Name $step.Command
}

Write-Host ""
Write-Host "V6 practice smoke check passed ($Mode mode)."
