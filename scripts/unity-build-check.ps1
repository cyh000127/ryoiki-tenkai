param(
    [string] $BuildConfigPath = "FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/build.json",
    [string] $ExpectedVersion = "prototype-v1",
    [switch] $RequireUnityBuild,
    [switch] $PlanOnly
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedConfigPath = Join-Path $root $BuildConfigPath

function Resolve-UnityAssetPath {
    param(
        [string] $BaseDirectory,
        [string] $RelativePath,
        [string] $FieldName
    )

    if ([string]::IsNullOrWhiteSpace($RelativePath)) {
        throw "Missing Unity build config field: $FieldName"
    }

    if ([System.Uri]::IsWellFormedUriString($RelativePath, [System.UriKind]::Absolute)) {
        throw "Unity build config field must be a repository-relative asset path: $FieldName=$RelativePath"
    }

    $candidatePath = Join-Path $BaseDirectory $RelativePath
    if (-not (Test-Path $candidatePath)) {
        throw "Missing Unity build asset for $FieldName`: $RelativePath"
    }

    return Resolve-Path $candidatePath
}

function Test-PathInsideDirectory {
    param(
        [string] $ParentDirectory,
        [string] $ChildPath,
        [string] $FieldName
    )

    $parent = [System.IO.Path]::GetFullPath($ParentDirectory)
    $child = [System.IO.Path]::GetFullPath($ChildPath)
    if (-not $child.StartsWith($parent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unity build asset escapes the build config directory: $FieldName"
    }
}

if ($PlanOnly) {
    Write-Host "Unity build check plan:"
    Write-Host "- Read build config: $BuildConfigPath"
    Write-Host "- Expected productVersion: $ExpectedVersion"
    Write-Host "- Validate loaderUrl, productVersion, bridgeTarget, bridgeMethod"
    Write-Host "- Validate referenced files exist under the config directory"
    Write-Host "- Require real Unity WebGL files: $($RequireUnityBuild.IsPresent)"
    exit 0
}

if (-not (Test-Path $resolvedConfigPath)) {
    throw "Missing Unity build config: $BuildConfigPath"
}

$configDirectory = Split-Path $resolvedConfigPath -Parent
$config = Get-Content $resolvedConfigPath -Raw | ConvertFrom-Json

if ($config.productVersion -ne $ExpectedVersion) {
    throw "Unity build version mismatch: expected $ExpectedVersion, received $($config.productVersion)"
}

if ([string]::IsNullOrWhiteSpace($config.bridgeTarget)) {
    throw "Missing Unity build config field: bridgeTarget"
}

if ([string]::IsNullOrWhiteSpace($config.bridgeMethod)) {
    throw "Missing Unity build config field: bridgeMethod"
}

$loaderPath = Resolve-UnityAssetPath $configDirectory $config.loaderUrl "loaderUrl"
Test-PathInsideDirectory $configDirectory $loaderPath "loaderUrl"

$isMockLoader = [System.IO.Path]::GetFileName($loaderPath).Equals(
    "mock.loader.js",
    [System.StringComparison]::OrdinalIgnoreCase
)

if ($RequireUnityBuild) {
    if ($isMockLoader) {
        throw "Unity build check requires a real Unity WebGL loader, but mock.loader.js is configured."
    }

    $dataPath = Resolve-UnityAssetPath $configDirectory $config.dataUrl "dataUrl"
    $frameworkPath = Resolve-UnityAssetPath $configDirectory $config.frameworkUrl "frameworkUrl"
    $codePath = Resolve-UnityAssetPath $configDirectory $config.codeUrl "codeUrl"

    Test-PathInsideDirectory $configDirectory $dataPath "dataUrl"
    Test-PathInsideDirectory $configDirectory $frameworkPath "frameworkUrl"
    Test-PathInsideDirectory $configDirectory $codePath "codeUrl"
}

$mode = if ($isMockLoader) { "mock" } else { "unity-webgl" }
Write-Host "Unity build config is valid."
Write-Host "Mode: $mode"
Write-Host "Config: $BuildConfigPath"
Write-Host "Version: $($config.productVersion)"
Write-Host "Bridge: $($config.bridgeTarget).$($config.bridgeMethod)"
