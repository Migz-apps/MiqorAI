$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is required but not installed."
}

if (-not (Test-Path "node_modules\concurrently")) {
    Write-Host "Installing root dependencies..."
    npm install
}

Write-Host "Starting all MiqorAI web frontends..."
Write-Host "  Patient portal   -> http://localhost:5173"
Write-Host "  Hospital portal  -> http://localhost:8080"
Write-Host "  Insurance portal -> http://localhost:8081"
Write-Host "  Pharmacy portal  -> http://localhost:8082"
Write-Host "  Admin portal     -> http://localhost:8083"
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers."
Write-Host ""

npm run dev
