#!/usr/bin/env bash
# Restart frontend and/or backend dev servers.
# Usage: ./scripts/restart.sh [fe|be|all]
#   fe  — restart frontend only (port 3000)
#   be  — restart backend only (port 3001)
#   all — restart both (default)

set -e
cd "$(dirname "$0")/.."

kill_port() {
  local port=$1
  # Get PIDs from ss (catches IPv4 + IPv6), then from lsof as fallback
  local pids=$(ss -tlnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
  if [ -z "$pids" ]; then
    pids=$(lsof -ti :$port 2>/dev/null || true)
  fi
  if [ -n "$pids" ]; then
    echo "  Killing PIDs on :$port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

restart_fe() {
  echo "Stopping frontend (port 3000)..."
  kill_port 3000
  echo "Starting frontend..."
  pnpm --filter frontend dev &
  echo "Frontend starting on :3000"
}

restart_be() {
  echo "Stopping backend (port 3001)..."
  kill_port 3001
  echo "Starting backend..."
  pnpm --filter backend dev &
  echo "Backend starting on :3001"
}

case "${1:-all}" in
  fe)  restart_fe ;;
  be)  restart_be ;;
  all) restart_be; restart_fe ;;
  *)   echo "Usage: $0 [fe|be|all]"; exit 1 ;;
esac

echo "Done. Waiting for servers..."
wait
