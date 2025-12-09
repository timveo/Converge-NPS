#!/bin/bash
set -euo pipefail

BACKEND_DIR="/app/backend"
POSTGRES_HOST=${POSTGRES_HOST:-"postgres"}
POSTGRES_PORT=${POSTGRES_PORT:-"5432"}
POSTGRES_USER=${POSTGRES_USER:-"postgres"}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-"postgres"}
DATABASE_URL=${DATABASE_URL:-"postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/converge_nps?schema=public"}

export DATABASE_URL

wait_for_db() {
  echo "🔄 Waiting for Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
  until (echo > /dev/tcp/${POSTGRES_HOST}/${POSTGRES_PORT}) >/dev/null 2>&1; do
    echo "   ↳ Database is not ready yet. Retrying in 3s..."
    sleep 3
  done
  echo "✅ Postgres is reachable."
}

run_migrations() {
  echo "🚀 Applying Prisma schema to database..."
  cd "${BACKEND_DIR}"
  npx prisma db push --skip-generate --accept-data-loss
  echo "✅ Database schema is up to date."
}

run_seed() {
  echo "🌱 Seeding database with initial data..."
  cd "${BACKEND_DIR}"
  npm run prisma:seed
  echo "✅ Seed completed."
}

wait_for_db
run_migrations
run_seed

echo "⚙️  Starting application..."
exec "$@"
