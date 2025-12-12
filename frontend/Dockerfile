# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

# Set build-time environment variables for Vite
ARG VITE_API_BASE_URL=https://converge-nps-production.up.railway.app/api/v1
ARG VITE_WS_URL=wss://converge-nps-production.up.railway.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Stage 2: Nginx runtime
FROM nginx:1.27-alpine AS runtime

# Remove default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config as template (will substitute $PORT at runtime)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Railway provides PORT env var, default to 80 for local dev
ENV PORT=80

# Use nginx's built-in envsubst on startup
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
