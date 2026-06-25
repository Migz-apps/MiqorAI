#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

echo "==> Starting infrastructure (postgres, redis, rabbitmq, mailhog)..."
docker compose up -d

echo "==> Waiting for postgres..."
until docker compose exec -T postgres pg_isready -U medipass -d medipass >/dev/null 2>&1; do
  sleep 2
done

echo "==> Building all services..."
mvn package -DskipTests -q

LOG_DIR="$BACKEND_DIR/logs"
mkdir -p "$LOG_DIR"
PIDS_FILE="$LOG_DIR/service-pids.txt"
: > "$PIDS_FILE"

start_service() {
  local name="$1"
  local jar="$2"
  local port="$3"
  echo "==> Starting $name on port $port..."
  nohup java -jar "$jar" > "$LOG_DIR/$name.log" 2>&1 &
  echo $! >> "$PIDS_FILE"
}

start_service "auth-service" "$BACKEND_DIR/auth-service/target/auth-service-1.0.0-SNAPSHOT.jar" 8081
start_service "patient-service" "$BACKEND_DIR/patient-service/target/patient-service-1.0.0-SNAPSHOT.jar" 8082
start_service "medical-service" "$BACKEND_DIR/medical-service/target/medical-service-1.0.0-SNAPSHOT.jar" 8083
start_service "audit-service" "$BACKEND_DIR/audit-service/target/audit-service-1.0.0-SNAPSHOT.jar" 8084
start_service "notification-service" "$BACKEND_DIR/notification-service/target/notification-service-1.0.0-SNAPSHOT.jar" 8085
start_service "api-gateway" "$BACKEND_DIR/api-gateway/target/api-gateway-1.0.0-SNAPSHOT.jar" 8080

wait_for_health() {
  local name="$1"
  local url="$2"
  local attempts=60
  echo "==> Waiting for $name health at $url..."
  for i in $(seq 1 $attempts); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "    $name is UP"
      return 0
    fi
    sleep 3
  done
  echo "    WARNING: $name did not become healthy in time"
  return 1
}

wait_for_health "auth-service" "http://localhost:8081/actuator/health"
wait_for_health "patient-service" "http://localhost:8082/actuator/health"
wait_for_health "medical-service" "http://localhost:8083/actuator/health"
wait_for_health "audit-service" "http://localhost:8084/actuator/health"
wait_for_health "notification-service" "http://localhost:8085/actuator/health"
wait_for_health "api-gateway" "http://localhost:8080/gateway/health"

echo ""
echo "MediPass backend is running."
echo "  API Gateway:  http://localhost:8080"
echo "  MailHog UI:   http://localhost:8025"
echo "  RabbitMQ UI:  http://localhost:15672 (guest/guest)"
echo "  Logs:         $LOG_DIR"
echo "  PIDs file:    $PIDS_FILE"
