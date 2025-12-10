# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Nginx runtime
FROM nginx:1.27-alpine AS runtime

# Remove default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy built files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx config if exists
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# ✨ The missing line — forces nginx to start properly
CMD ["nginx", "-g", "daemon off;"]
