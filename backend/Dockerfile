# Stage 1: Builder
FROM node:18-bullseye AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json /app/backend/
RUN npm ci

COPY backend/ /app/backend/

RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:18-bullseye
WORKDIR /app/backend

RUN apt-get update && apt-get install -y \
    libssl1.1 bash dumb-init \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-builder /app/backend/package*.json /app/backend/
COPY --from=backend-builder /app/backend/prisma /app/backend/prisma
COPY --from=backend-builder /app/backend/scripts /app/backend/scripts
COPY --from=backend-builder /app/backend/.env.example /app/backend/

RUN chmod +x /app/backend/scripts/docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--", "/app/backend/scripts/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
