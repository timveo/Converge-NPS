# Stage 1: Dependencies (prod only)
FROM node:18-bullseye-slim AS deps
WORKDIR /app/backend

COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-bullseye-slim AS builder
WORKDIR /app/backend

COPY package*.json ./
RUN npm ci

COPY . ./

RUN npx prisma generate \
 && npm run build

# Stage 3: Runtime (small, stable, glibc, OpenSSL)
FROM node:18-bullseye-slim AS runtime
WORKDIR /app/backend

# ADD curl here so the healthcheck works
RUN apt-get update && apt-get install -y \
    dumb-init bash postgresql-client curl \
    && rm -rf /var/lib/apt/lists/*

# Copy node_modules INCLUDING generated Prisma client
COPY --from=builder /app/backend/node_modules ./node_modules

# Copy build output and other required files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/scripts ./scripts

RUN chmod +x ./scripts/docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--", "/app/backend/scripts/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
