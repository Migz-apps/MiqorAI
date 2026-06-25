$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $PSScriptRoot
Set-Location $BackendDir

Write-Host "==> Starting infrastructure (postgres, redis, rabbitmq, mailhog)..."
docker compose up -d

Write-Host "==> Waiting for postgres..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        docker compose exec -T postgres pg_isready -U medipass -d medipass 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}
if (-not $ready) { Write-Warning "Postgres may not be ready yet" }

Write-Host "==> Building all services..."
mvn package -DskipTests -q

$LogDir = Join-Path $BackendDir "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$PidsFile = Join-Path $LogDir "service-pids.txt"
Set-Content -Path $PidsFile -Value ""

function Start-ServiceJar {
    param(
        [string]$Name,
        [string]$JarPath,
        [int]$Port
    )
    Write-Host "==> Starting $Name on port $Port..."
    $logFile = Join-Path $LogDir "$Name.log"
    $proc = Start-Process -FilePath "java" -ArgumentList "-jar", $JarPath -RedirectStandardOutput $logFile -RedirectStandardError $logFile -PassThru -WindowStyle Hidden
    Add-Content -Path $PidsFile -Value $proc.Id
}

Start-ServiceJar "auth-service" (Join-Path $BackendDir "auth-service\target\auth-service-1.0.0-SNAPSHOT.jar") 8081
Start-ServiceJar "patient-service" (Join-Path $BackendDir "patient-service\target\patient-service-1.0.0-SNAPSHOT.jar") 8082
Start-ServiceJar "medical-service" (Join-Path $BackendDir "medical-service\target\medical-service-1.0.0-SNAPSHOT.jar") 8083
Start-ServiceJar "audit-service" (Join-Path $BackendDir "audit-service\target\audit-service-1.0.0-SNAPSHOT.jar") 8084
Start-ServiceJar "notification-service" (Join-Path $BackendDir "notification-service\target\notification-service-1.0.0-SNAPSHOT.jar") 8085
Start-ServiceJar "api-gateway" (Join-Path $BackendDir "api-gateway\target\api-gateway-1.0.0-SNAPSHOT.jar") 8080

function Wait-ForHealth {
    param(
        [string]$Name,
        [string]$Url
    )
    Write-Host "==> Waiting for $Name health at $Url..."
    for ($i = 1; $i -le 60; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Host "    $Name is UP"
                return
            }
        } catch {}
        Start-Sleep -Seconds 3
    }
    Write-Warning "    $Name did not become healthy in time"
}

Wait-ForHealth "auth-service" "http://localhost:8081/actuator/health"
Wait-ForHealth "patient-service" "http://localhost:8082/actuator/health"
Wait-ForHealth "medical-service" "http://localhost:8083/actuator/health"
Wait-ForHealth "audit-service" "http://localhost:8084/actuator/health"
Wait-ForHealth "notification-service" "http://localhost:8085/actuator/health"
Wait-ForHealth "api-gateway" "http://localhost:8080/gateway/health"

Write-Host ""
Write-Host "MediPass backend is running."
Write-Host "  API Gateway:  http://localhost:8080"
Write-Host "  MailHog UI:   http://localhost:8025"
Write-Host "  RabbitMQ UI:  http://localhost:15672 (guest/guest)"
Write-Host "  Logs:         $LogDir"
Write-Host "  PIDs file:    $PidsFile"
