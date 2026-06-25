#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$BACKEND_DIR/logs"
PIDS_FILE="$LOG_DIR/service-pids.txt"

if [[ -f "$PIDS_FILE" ]]; then
  while IFS= read -r pid; do
    if [[ "$pid" =~ ^[0-9]+$ ]]; then
      kill "$pid" 2>/dev/null || true
    fi
  done < "$PIDS_FILE"
  rm -f "$PIDS_FILE"
fi

echo "MediPass backend services stopped."
echo "Infrastructure containers are still running. Stop them with:"
echo "  cd backend && docker compose down"
