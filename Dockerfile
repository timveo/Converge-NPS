# Combined Dockerfile for Converge-NPS frontend and backend
# Builds both applications and starts them within a single container

# =========================
# Stage 1: Backend Builder
# =========================
FROM node:18-bullseye AS backend-builder

WORKDIR /app/backend

# Install build tools
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# =========================
# Stage 2: Frontend Builder
# =========================
FROM node:18-bullseye AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# =========================
# Stage 3: Runtime Image
# =========================
FROM node:18-bullseye

WORKDIR /app

# Runtime packages
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    bash \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g serve concurrently

# Backend artifacts
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package.json ./backend/package.json
COPY --from=backend-builder /app/backend/package-lock.json ./backend/package-lock.json
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
COPY --from=backend-builder /app/backend/scripts ./backend/scripts
COPY --from=backend-builder /app/backend/.env.example ./backend/.env.example

# Frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Helper scripts
COPY docker/start.sh ./start.sh
RUN chmod +x ./start.sh && chmod +x ./backend/scripts/docker-entrypoint.sh

ENV NODE_ENV=development \
    BACKEND_PORT=3000 \
    FRONTEND_PORT=5173

EXPOSE 3000 5173

ENTRYPOINT ["dumb-init", "--", "/app/backend/scripts/docker-entrypoint.sh"]
CMD ["/app/start.sh"]