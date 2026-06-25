$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $BackendDir "logs"
$PidsFile = Join-Path $LogDir "service-pids.txt"

if (Test-Path $PidsFile) {
    Get-Content $PidsFile | ForEach-Object {
        if ($_ -match '^\d+$') {
            try {
                Stop-Process -Id ([int]$_) -Force -ErrorAction SilentlyContinue
            } catch {}
        }
    }
    Remove-Item $PidsFile -Force
}

Write-Host "MediPass backend services stopped."
Write-Host "Infrastructure containers are still running. Stop them with:"
Write-Host "  cd backend; docker compose down"
