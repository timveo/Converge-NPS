# Stage 1: Builder
FROM node:18-bullseye AS backend-builder
WORKDIR /app/backend

# Copy package.json first (for caching)
COPY backend/package*.json ./

# Install dependencies inside container
RUN npm ci

# Copy the rest of the backend code
COPY backend/ ./

# Prisma generate & build
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:18-bullseye
WORKDIR /app/backend

RUN apt-get update && apt-get install -y \
    libssl1.1 bash dumb-init \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy backend artifacts from builder (without host node_modules)
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/scripts ./scripts
COPY --from=backend-builder /app/backend/.env.example ./

RUN chmod +x ./scripts/docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--", "/app/backend/scripts/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
