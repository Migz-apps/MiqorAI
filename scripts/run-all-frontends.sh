#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed."
  exit 1
fi

if [ ! -d node_modules/concurrently ]; then
  echo "Installing root dependencies..."
  npm install
fi

echo "Starting all MiqorAI web frontends..."
echo "  Patient portal  -> http://localhost:5173"
echo "  Hospital portal -> http://localhost:8080"
echo "  Insurance portal-> http://localhost:8081"
echo "  Pharmacy portal -> http://localhost:8082"
echo "  Admin portal    -> http://localhost:8083"
echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

npm run dev
