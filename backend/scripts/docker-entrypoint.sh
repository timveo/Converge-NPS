#!/bin/bash
set -euo pipefail

BACKEND_DIR="/app/backend"

# Use DATABASE_URL if already set (e.g., from Railway), otherwise construct it
if [ -z "${DATABASE_URL:-}" ]; then
  POSTGRES_HOST=${POSTGRES_HOST:-"postgres"}
  POSTGRES_PORT=${POSTGRES_PORT:-"5432"}
  POSTGRES_USER=${POSTGRES_USER:-"postgres"}
  POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-"postgres"}
  DATABASE_NAME=${DATABASE_NAME:-"converge_nps"}
  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${DATABASE_NAME}?schema=public"
  export DATABASE_URL
fi

wait_for_db() {
  echo "DATABASE_URL: ${DATABASE_URL}"
  # Extract host and port from DATABASE_URL
  DB_HOST=$(echo "${DATABASE_URL}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  DB_PORT=$(echo "${DATABASE_URL}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_PORT=${DB_PORT:-5432}

  echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
  until (echo > /dev/tcp/${DB_HOST}/${DB_PORT}) >/dev/null 2>&1; do
    echo "   ↳ Database is not ready yet. Retrying in 3s..."
    sleep 3
  done
  echo "Postgres is reachable."
}

run_migrations() {
  echo "Applying Prisma schema to database..."
  cd "${BACKEND_DIR}"
  npx prisma db push --skip-generate --accept-data-loss
  echo "Database schema is up to date."
}

run_seed() {
  echo "Checking if database needs seeding..."
  cd "${BACKEND_DIR}"
  npm run prisma:seed
  echo "Seed completed."
}

wait_for_db
run_migrations
run_seed

echo "Starting application..."
exec "$@"
