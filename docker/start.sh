#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="/app/backend"
FRONTEND_DIR="/app/frontend"
BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

export NODE_ENV=${NODE_ENV:-development}
export PORT=${BACKEND_PORT}

echo "🚀 Launching Converge-NPS services..."
concurrently \
  "cd ${BACKEND_DIR} && node dist/server.js" \
  "cd ${FRONTEND_DIR}/dist && serve -s . -l ${FRONTEND_PORT} --single"
