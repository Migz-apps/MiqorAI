# Mirrors the deployable files from miqorai-ai-service into hf-space-publish.
# miqorai-ai-service is the single source of truth; hf-space-publish is a
# generated deploy copy. Edit miqorai-ai-service and rerun this script.
# The hf-space-publish/.git and .gitattributes deployment metadata are left untouched.
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "miqorai-ai-service"
$target = Join-Path $repoRoot "hf-space-publish"

if (-not (Test-Path $source)) { throw "Source not found: $source" }
if (-not (Test-Path $target)) { throw "Target not found: $target" }

$directories = @("app", "examples")
if (Test-Path (Join-Path $source "model")) { $directories += "model" }

foreach ($dir in $directories) {
    $from = Join-Path $source $dir
    $to = Join-Path $target $dir
    if (Test-Path $to) { Remove-Item -Recurse -Force $to }
    Copy-Item -Recurse -Force $from $to
    # Drop local interpreter artifacts from the deploy copy.
    Get-ChildItem -Path $to -Recurse -Directory -Filter "__pycache__" |
        Remove-Item -Recurse -Force
}

$files = @("Dockerfile", "README.md", ".dockerignore") +
    @(Get-ChildItem -Path $source -File -Filter "requirements*.txt" | ForEach-Object { $_.Name })

foreach ($file in $files) {
    $from = Join-Path $source $file
    if (Test-Path $from) {
        Copy-Item -Force $from (Join-Path $target $file)
    }
}

Write-Host "Synced miqorai-ai-service -> hf-space-publish ($($directories -join ', '); $($files -join ', '))"
