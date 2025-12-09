# Stage 1: Build
FROM node:18-bullseye AS builder

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Pass build arguments
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production frontend
RUN npm run build

# Stage 2: Runtime
FROM node:18-bullseye

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy build artifacts
COPY --from=builder /app/dist ./dist

# Set environment
ENV PORT=5173

EXPOSE 5173

# Start frontend
CMD ["serve", "-s", "dist", "-l", "5173", "--single"]
