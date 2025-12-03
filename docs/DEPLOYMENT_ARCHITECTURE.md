# Converge-NPS Deployment Architecture

**Document Version:** 1.0
**Date:** 2025-12-02
**Author:** Architect Agent
**Status:** Ready for Review

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Choice](#infrastructure-choice)
3. [Environment Strategy](#environment-strategy)
4. [Container Strategy](#container-strategy)
5. [Database Deployment](#database-deployment)
6. [Redis Deployment](#redis-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Observability](#monitoring--observability)
9. [Scaling Strategy](#scaling-strategy)
10. [Disaster Recovery](#disaster-recovery)
11. [Cost Optimization](#cost-optimization)
12. [Deployment Checklist](#deployment-checklist)

---

## Overview

This document defines the deployment architecture for Converge-NPS, optimized for a production-ready MVP supporting 500+ concurrent users during the NPS Tech Accelerator 2026 event (January 28-30, 2026).

### Design Goals

1. **Cost-Effective**: Target $200-500/month operational cost
2. **Scalable**: Support 500+ concurrent users, 2,000 total users
3. **Reliable**: 99.5% uptime during event dates
4. **Simple**: Easy to deploy, monitor, and maintain
5. **Fast**: <2s page load, <500ms API response (p95)
6. **Secure**: Production-grade security controls

### Architecture Overview

```
                             ┌─────────────────┐
                             │   CloudFlare    │
                             │   CDN + WAF     │
                             └────────┬────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                   ┌────▼────┐               ┌─────▼─────┐
                   │  Railway │               │  Vercel   │
                   │  Backend │               │  Frontend │
                   │  (Node.js)│               │  (React)  │
                   └────┬────┘               └───────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │Supabase │    │ Railway │    │SendGrid │
   │PostgreSQL│    │  Redis  │    │  Email  │
   └─────────┘    └─────────┘    └─────────┘
```

---

## Infrastructure Choice

### Platform Recommendation: Railway

**CHOSEN: Railway.app**

### Rationale

| Criteria | Railway | Render | Kubernetes |
|----------|---------|--------|------------|
| **Ease of Deployment** | ⭐⭐⭐⭐⭐ One-click deploys | ⭐⭐⭐⭐ Easy but slower | ⭐⭐ Complex setup |
| **Cost** | ⭐⭐⭐⭐ $200-400/month | ⭐⭐⭐ $300-500/month | ⭐⭐ $500+/month |
| **Auto-Scaling** | ⭐⭐⭐⭐ Horizontal + Vertical | ⭐⭐⭐⭐ Good scaling | ⭐⭐⭐⭐⭐ Full control |
| **PostgreSQL** | ⭐⭐⭐ Via Supabase | ⭐⭐⭐⭐ Managed Postgres | ⭐⭐⭐ Self-managed |
| **Redis** | ⭐⭐⭐⭐⭐ Built-in | ⭐⭐⭐⭐ Built-in | ⭐⭐⭐ Self-managed |
| **Monitoring** | ⭐⭐⭐ Basic metrics | ⭐⭐⭐ Good metrics | ⭐⭐⭐⭐⭐ Full control |
| **Developer Experience** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good | ⭐⭐ Steep learning curve |
| **Time to Production** | 1-2 days | 2-3 days | 1-2 weeks |

**Railway Advantages:**
- **Fast Setup**: Deploy backend in minutes with GitHub integration
- **Built-in Services**: PostgreSQL, Redis, cron jobs in one platform
- **Cost-Effective**: $200-400/month for MVP scale (vs. $500+ for Kubernetes)
- **Auto-Scaling**: Automatic horizontal scaling based on load
- **Environment Management**: Built-in dev/staging/prod environments
- **Developer Experience**: Excellent CLI, GitHub integration, logs, metrics

**Railway Limitations:**
- Less control than Kubernetes (acceptable for MVP)
- Smaller ecosystem than AWS/GCP (mitigated by simplicity)
- Regional availability limited (US, EU regions sufficient)

**Alternative Platforms:**

**Render.com:**
- Similar to Railway, slightly more expensive
- Better for static sites (but using Vercel for frontend)
- Good alternative if Railway unavailable

**Kubernetes (AWS EKS/GKE):**
- Overkill for MVP (500 users)
- Higher cost ($500+/month)
- Complex setup and maintenance
- Consider for post-MVP if scale requires (2,000+ concurrent users)

---

### Cost Analysis

**Target: $200-500/month**

| Service | Provider | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **Backend** | Railway | 2 instances (1 vCPU, 2GB RAM) | $100 |
| **Database** | Supabase Pro | PostgreSQL + Auth + Storage | $25 |
| **Redis** | Railway | 1 instance (256MB) | $10 |
| **Frontend** | Vercel Pro | CDN + Build + Analytics | $20 |
| **CDN/WAF** | CloudFlare Pro | DDoS protection + CDN | $20 |
| **Email** | SendGrid | 10,000 emails/month | $15 |
| **Monitoring** | Sentry | Error tracking (10k events) | $26 |
| **Domain** | Namecheap | .com domain | $1 |
| **S3 Storage** | AWS S3 | 10GB (avatars, uploads) | $5 |
| **Backups** | Railway/Supabase | Automated backups | Included |
| **TOTAL** |  |  | **$222/month** |

**Scaling Cost (500+ concurrent users):**
- Additional backend instance: +$50/month
- Supabase Team plan: +$100/month
- **Total at scale**: ~$370/month

**Cost Optimization Notes:**
- Vercel has generous free tier (may not need Pro for MVP)
- CloudFlare Free tier sufficient for MVP (upgrade to Pro for advanced DDoS)
- SendGrid Essentials ($15) includes 100k emails (sufficient)

---

### Regional Deployment

**Primary Region**: US-West (California) - Closest to NPS Monterey

**Provider Regions:**
- Railway: `us-west1` (Oregon) or `us-west2` (Los Angeles)
- Supabase: `us-west-1` (California)
- Vercel: Global Edge Network (auto-optimized)

**Latency Expectations:**
- NPS Monterey → US-West: ~10-20ms
- East Coast → US-West: ~70-100ms
- International → US-West: ~150-300ms (acceptable for event-based app)

**Multi-Region (Post-MVP):**
- Add EU region if European participants (minimal for NPS event)
- Use Cloudflare CDN for global edge caching

---

## Environment Strategy

### 1. Development Environment

**Purpose**: Local development and testing

**Infrastructure:**
- **Frontend**: Vite dev server (localhost:5173)
- **Backend**: Node.js/Express (localhost:3000)
- **Database**: Supabase local dev (Docker) or shared dev instance
- **Redis**: Local Redis (Docker) or Railway dev instance

**Configuration:**
```env
# .env.development
NODE_ENV=development
API_URL=http://localhost:3000
DATABASE_URL=postgresql://localhost:5432/converge_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-change-in-prod
```

**Access:**
- Developers only
- No real user data (test/seed data only)
- No email sending (console.log emails instead)

---

### 2. Staging Environment

**Purpose**: Pre-production testing, QA, UAT

**Infrastructure:**
- **Frontend**: Vercel (staging.converge-nps.com)
- **Backend**: Railway (api.staging.converge-nps.com)
- **Database**: Supabase (separate staging instance)
- **Redis**: Railway (separate staging instance)

**Configuration:**
```env
# .env.staging
NODE_ENV=staging
API_URL=https://api.staging.converge-nps.com
DATABASE_URL=<supabase-staging-url>
REDIS_URL=<railway-staging-redis>
JWT_SECRET=<staging-secret>
ENABLE_DEBUG_LOGS=true
```

**Access:**
- QA team, stakeholders, select beta users
- Test data (refreshed weekly from anonymized production data)
- Emails sent to test accounts only

**Deployment:**
- Auto-deploy on merge to `develop` branch
- Manual approval gate for testing

---

### 3. Production Environment

**Purpose**: Live event, real users

**Infrastructure:**
- **Frontend**: Vercel (converge-nps.com)
- **Backend**: Railway (api.converge-nps.com)
- **Database**: Supabase Pro (production instance)
- **Redis**: Railway (production instance)

**Configuration:**
```env
# .env.production
NODE_ENV=production
API_URL=https://api.converge-nps.com
DATABASE_URL=<supabase-prod-url>
REDIS_URL=<railway-prod-redis>
JWT_SECRET=<strong-random-secret>
ENABLE_DEBUG_LOGS=false
SENTRY_DSN=<sentry-production-dsn>
```

**Access:**
- All users
- Real data
- Full monitoring and alerting

**Deployment:**
- Manual approval required
- Deploy during low-traffic windows (not during event)
- Automated smoke tests after deployment

---

### Environment Variables Management

**Storage**: Railway/Vercel environment variables (encrypted)

**Secret Rotation:**
- JWT secrets: Every 90 days
- API keys (Smartsheet, SendGrid): Every 90 days
- Database passwords: Every 90 days

**Secret Management:**
```bash
# Railway CLI: Set production secrets
railway variables set JWT_SECRET=<secret> --environment production
railway variables set DATABASE_URL=<url> --environment production

# Vercel CLI: Set frontend env vars
vercel env add API_URL production
```

**Never Commit Secrets:**
- Use `.env.example` with placeholder values
- `.env`, `.env.local` in `.gitignore`
- Secrets stored in Railway/Vercel dashboard

---

## Container Strategy

### 4.1 Docker Setup for Backend

**Dockerfile (Multi-Stage Build):**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy built app and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node healthcheck.js

# Start app
CMD ["node", "dist/index.js"]
```

**Health Check Script:**
```javascript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => {
  process.exit(1);
});

request.end();
```

**Image Optimization:**
- Multi-stage build: Reduces image size (200MB → 80MB)
- Alpine base: Smaller than debian (40MB vs 120MB)
- Production dependencies only: Excludes dev dependencies
- Non-root user: Security best practice

---

### 4.2 Docker Setup for Frontend

**Dockerfile (Multi-Stage Build):**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build React app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration:**
```nginx
# nginx.conf
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

  # Security headers
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # SPA routing: Serve index.html for all routes
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Health check endpoint
  location /health {
    return 200 "OK";
    add_header Content-Type text/plain;
  }
}
```

**Note**: For MVP, Vercel handles frontend deployment (no Docker needed). Nginx config provided for self-hosted option.

---

### 4.3 Docker Compose (Local Development)

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: converge-postgres
    environment:
      POSTGRES_DB: converge_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: converge-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: converge-backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/converge_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-key
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  # Frontend (optional, usually run with Vite dev server)
  # frontend:
  #   build:
  #     context: ./frontend
  #     dockerfile: Dockerfile
  #   container_name: converge-frontend
  #   ports:
  #     - "5173:80"
  #   depends_on:
  #     - backend

volumes:
  postgres_data:
  redis_data:
```

**Usage:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## Database Deployment

### 5.1 PostgreSQL Hosting

**Provider**: Supabase (PostgreSQL + Auth + Storage + Realtime)

**Plan**:
- **MVP**: Supabase Pro ($25/month)
- **Scale**: Supabase Team ($100/month) if >500 concurrent users

**Specifications (Pro Plan):**
- PostgreSQL 15
- 8GB RAM, 2 vCPU
- 50GB storage (SSD)
- Unlimited API requests
- 100GB bandwidth
- Automated backups (7-day retention)
- Point-in-time recovery

**Configuration:**
```sql
-- PostgreSQL optimizations
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  -- SSD
effective_io_concurrency = 200
```

---

### 5.2 Connection Pooling (PgBouncer)

**Why Connection Pooling?**
- PostgreSQL has limited connections (200 max)
- Backend instances may open many connections (10 per instance)
- Connection pooling reuses connections, reducing overhead

**Supabase Built-in Pooler:**
- Uses PgBouncer under the hood
- Two modes:
  - **Transaction mode**: For serverless/short-lived connections (Railway)
  - **Session mode**: For long-lived connections (traditional servers)

**Connection Strings:**
```
# Direct connection (for migrations, admin tasks)
postgresql://postgres:[password]@db.supabase.co:5432/postgres

# Pooled connection (for application)
postgresql://postgres:[password]@db.supabase.co:6543/postgres?pgbouncer=true
```

**Application Configuration:**
```typescript
// Use pooled connection for production
const databaseUrl = process.env.NODE_ENV === 'production'
  ? process.env.DATABASE_URL + '?pgbouncer=true'
  : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,  // Max connections per backend instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**PgBouncer Settings:**
- `pool_mode = transaction`: Each transaction gets a new connection
- `max_client_conn = 1000`: Max concurrent clients
- `default_pool_size = 20`: Connections to PostgreSQL per database

---

### 5.3 Backup Strategy

**Automated Backups:**
- **Frequency**: Daily (Supabase Pro includes daily backups)
- **Retention**: 7 days (included), 30 days (upgrade to Team plan)
- **Type**: Full database dump + WAL archiving (point-in-time recovery)

**Backup Schedule:**
- **Daily**: 2:00 AM UTC (off-peak hours)
- **Pre-Deployment**: Manual backup before production deployments
- **Event Period**: Hourly backups during Jan 28-30, 2026

**Manual Backup:**
```bash
# Supabase CLI: Trigger manual backup
supabase db backup create

# Download backup
supabase db backup download <backup-id> --output backup.sql

# Restore from backup
supabase db reset --restore-from backup.sql
```

**Off-Site Backups:**
```bash
# Export to S3 (weekly)
pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://converge-backups/weekly/$(date +%Y%m%d).sql.gz

# Retention: 4 weekly backups, then archive to Glacier
```

---

### 5.4 Disaster Recovery

**Recovery Time Objective (RTO)**: <4 hours
**Recovery Point Objective (RPO)**: <1 hour

**Recovery Procedures:**

**Scenario 1: Database Corruption**
1. Restore from latest backup (Supabase dashboard: 1 click)
2. Restore service (15-30 minutes)
3. Verify data integrity (queries, spot checks)
4. Resume service

**Scenario 2: Accidental Data Deletion**
1. Use point-in-time recovery (Supabase Team plan)
2. Restore to 5 minutes before deletion
3. Export affected data
4. Re-import to production

**Scenario 3: Complete Platform Failure (Supabase outage)**
1. Restore latest backup to new PostgreSQL instance (AWS RDS or Railway)
2. Update DATABASE_URL in Railway
3. Restart backend services
4. Verify service health
5. RTO: 2-4 hours

**Testing:**
- **Monthly**: Test backup restoration in staging
- **Pre-Event**: Full disaster recovery drill (restore production backup to staging)

---

### 5.5 Migration Management

**Migration Tool**: Prisma Migrate (or Supabase Migrations)

**Migration Workflow:**
```bash
# Create migration
npx prisma migrate dev --name add_user_roles

# Apply to staging
npx prisma migrate deploy --env staging

# Apply to production (manual approval)
npx prisma migrate deploy --env production
```

**Migration Best Practices:**
- **Backwards Compatible**: New migrations don't break existing code
- **Rollback Plan**: Every migration has a rollback script
- **Test in Staging**: Apply to staging first, test thoroughly
- **Backup Before Migration**: Manual backup before production migration
- **Low-Traffic Window**: Migrate during low traffic (not during event)

**Rollback Script Example:**
```sql
-- Migration: 001_add_user_roles.sql
CREATE TABLE user_roles (...);

-- Rollback: 001_add_user_roles_rollback.sql
DROP TABLE IF EXISTS user_roles;
```

---

## Redis Deployment

### 6.1 Redis Hosting

**Provider**: Railway (Redis service)

**Plan**: Redis instance (256MB RAM) - $10/month

**Use Cases:**
1. **Session Storage**: User sessions (JWT refresh tokens)
2. **Rate Limiting**: Track API request counts
3. **Caching**: Frequently accessed data (sessions, user roles)
4. **Real-Time**: WebSocket connection tracking (optional)

**Configuration:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('Redis connection error', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});
```

---

### 6.2 Persistence Configuration

**Persistence**: RDB (snapshotting) + AOF (append-only file)

**RDB Configuration:**
```conf
# redis.conf
save 900 1    # Save after 900s (15min) if at least 1 key changed
save 300 10   # Save after 300s (5min) if at least 10 keys changed
save 60 10000 # Save after 60s (1min) if at least 10,000 keys changed
```

**AOF Configuration:**
```conf
# Append-only file (for durability)
appendonly yes
appendfsync everysec  # Fsync every second (balance between performance and durability)
```

**Data Persistence:**
- Sessions: Persist (TTL: 30 days)
- Rate limiting: Ephemeral (TTL: 1 hour)
- Cached data: Ephemeral (TTL: 24 hours)

---

### 6.3 Failover Strategy

**High Availability (Post-MVP):**
- **Redis Sentinel**: Automatic failover (if primary fails, promote replica)
- **Redis Cluster**: Sharding for scale (if >1GB data)

**MVP Strategy (Single Instance):**
- **Backup**: Railway Redis includes automated backups
- **Monitoring**: Alert on Redis downtime (critical alert)
- **Fallback**: Application degrades gracefully if Redis unavailable

**Graceful Degradation:**
```typescript
// Example: Fall back to database if Redis unavailable
async function getUserSession(userId: string) {
  try {
    // Try Redis first (fast)
    const session = await redis.get(`session:${userId}`);
    if (session) return JSON.parse(session);
  } catch (error) {
    logger.warn('Redis unavailable, falling back to database', error);
  }

  // Fall back to database (slower but reliable)
  return await db.getUserSession(userId);
}
```

---

## CI/CD Pipeline

### 7.1 GitHub Actions Workflow

**Workflow Overview:**

```
Push to branch
  ↓
GitHub Actions triggered
  ↓
[Job 1] Lint & Type Check
[Job 2] Unit Tests
[Job 3] Build Docker Image
  ↓
Deploy to Staging (if develop branch)
  ↓
Run Integration Tests
  ↓
Manual Approval (if main branch)
  ↓
Deploy to Production
  ↓
Smoke Tests
  ↓
Notify Team (Slack/Email)
```

**GitHub Actions Workflow File:**

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # Job 1: Lint and Type Check
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npm run typecheck

  # Job 2: Unit Tests
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # Job 3: Build Docker Image
  build:
    needs: [lint-and-typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: convergenps/backend:${{ github.sha }}
          cache-from: type=registry,ref=convergenps/backend:latest
          cache-to: type=inline

  # Job 4: Deploy to Staging
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway (Staging)
        run: |
          npm install -g @railway/cli
          railway up --environment staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_STAGING_TOKEN }}

      - name: Run integration tests
        run: npm run test:integration
        env:
          API_URL: https://api.staging.converge-nps.com

      - name: Notify team (Slack)
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Staging deployment successful: ${{ github.sha }}"
            }

  # Job 5: Deploy to Production
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://converge-nps.com
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway (Production)
        run: |
          npm install -g @railway/cli
          railway up --environment production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_PRODUCTION_TOKEN }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          API_URL: https://api.converge-nps.com

      - name: Notify team (Slack)
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🚀 Production deployment successful: ${{ github.sha }}"
            }

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Production deployment FAILED: ${{ github.sha }}"
            }
```

---

### 7.2 Build Process

**Backend Build:**
```bash
# Install dependencies
npm ci --only=production

# Compile TypeScript
npm run build  # tsc -p tsconfig.json

# Output: dist/ directory
```

**Frontend Build:**
```bash
# Install dependencies
npm ci

# Build React app with Vite
npm run build  # vite build

# Output: dist/ directory (static files)
```

**Build Optimizations:**
- **Tree Shaking**: Remove unused code (Vite default)
- **Code Splitting**: Lazy load routes (React.lazy)
- **Compression**: Gzip/Brotli (Vercel/Nginx)
- **Caching**: Cache node_modules in CI (GitHub Actions cache)

---

### 7.3 Test Automation

**Test Levels:**

1. **Unit Tests** (70% coverage target)
   - Test individual functions and components
   - Run on every PR and push
   - Fast (<2 minutes)

2. **Integration Tests** (20% coverage target)
   - Test API endpoints with test database
   - Run on staging deployments
   - Moderate speed (5-10 minutes)

3. **Smoke Tests** (10% coverage target)
   - Test critical user flows (login, QR scan, RSVP)
   - Run on production deployments
   - Fast (<2 minutes)

**Test Scripts:**
```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:smoke": "playwright test smoke"
  }
}
```

**Example Smoke Test (Playwright):**
```typescript
// tests/smoke/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('https://converge-nps.com');

  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'TestPassword123!');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/dashboard/);
});
```

---

### 7.4 Deployment Process

**Staging Deployment (Automatic):**
```
1. Developer merges PR to `develop` branch
2. GitHub Actions runs tests and builds
3. Railway deploys to staging environment
4. Integration tests run against staging
5. Team notified via Slack
```

**Production Deployment (Manual Approval):**
```
1. Developer creates PR from `develop` to `main`
2. Code review and approval
3. Merge to `main` triggers GitHub Actions
4. Manual approval gate (GitHub Environments)
5. Deploy to Railway production
6. Smoke tests run against production
7. Team notified via Slack
```

**Deployment Commands:**
```bash
# Railway CLI: Deploy to production
railway up --environment production

# Vercel CLI: Deploy frontend to production
vercel --prod

# Manual rollback (if needed)
railway rollback --environment production
```

---

### 7.5 Rollback Strategy

**Automatic Rollback:**
- If smoke tests fail, auto-rollback to previous version
- GitHub Actions posts failure notification

**Manual Rollback:**
```bash
# Railway: Rollback to previous deployment
railway rollback --environment production

# Railway: Deploy specific version
railway up --environment production --tag v1.2.3

# Vercel: Rollback to previous deployment
vercel rollback
```

**Rollback Criteria:**
- Smoke tests fail
- Critical bug discovered
- Performance degradation (p95 >2s)
- Error rate >5%

**Post-Rollback:**
1. Notify team of rollback
2. Investigate root cause
3. Fix bug in develop branch
4. Re-deploy when ready

---

## Monitoring & Observability

### 8.1 Logging (Structured Logs)

**Log Levels:**
- **ERROR**: Critical errors requiring immediate attention
- **WARN**: Warning conditions (degraded service, non-critical errors)
- **INFO**: General information (user actions, API requests)
- **DEBUG**: Detailed debugging information (disabled in production)

**Structured Logging (JSON):**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'converge-backend',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('User logged in', { userId: 'uuid', ip: '192.0.2.1' });
logger.error('Database connection failed', { error: err.message });
```

**Log Aggregation:**
- **Railway Logs**: Built-in log viewer (basic)
- **CloudWatch Logs** (if on AWS): Centralized log aggregation
- **Datadog/Logz.io** (optional): Advanced log analysis

---

### 8.2 Metrics (Prometheus or CloudWatch)

**Key Metrics:**

| Metric | Type | Alert Threshold |
|--------|------|----------------|
| **API Response Time** | Histogram | p95 >1s |
| **Error Rate** | Counter | >5% of requests |
| **Request Rate** | Gauge | >1000 req/min (scale trigger) |
| **Database Connection Pool** | Gauge | >80% utilization |
| **Redis Memory Usage** | Gauge | >80% of limit |
| **Active WebSocket Connections** | Gauge | >500 (scale trigger) |
| **CPU Usage** | Gauge | >80% |
| **Memory Usage** | Gauge | >90% |

**Prometheus Metrics (Example):**
```typescript
import prometheus from 'prom-client';

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Middleware to record metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.labels(req.method, req.route?.path || req.path, res.statusCode.toString()).observe(duration);
    httpRequestTotal.labels(req.method, req.route?.path || req.path, res.statusCode.toString()).inc();
  });

  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

**Grafana Dashboard:**
- Visualize Prometheus metrics
- Pre-built dashboards for Node.js, PostgreSQL, Redis
- Custom dashboards for business metrics (connections, RSVPs, messages)

---

### 8.3 Error Tracking (Sentry)

**Sentry Configuration:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,  // 100% of transactions sampled (reduce in production if needed)
  beforeSend(event, hint) {
    // Scrub PII from error reports
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});

// Express error handler
app.use(Sentry.Handlers.errorHandler());

// Capture errors manually
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: 'riskyOperation' },
    user: { id: userId }
  });
  throw error;
}
```

**Sentry Alerts:**
- New error: Notify Slack channel
- Error spike: >10 errors/min → Page on-call engineer
- Regression: Previously resolved error reoccurs → Notify team

---

### 8.4 Performance Monitoring

**Frontend Performance (Vercel Analytics):**
- Page load time (Core Web Vitals)
- Time to Interactive (TTI)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

**Backend Performance (APM):**
- **Sentry Performance**: Transaction tracing, slow queries
- **Datadog APM** (optional): Distributed tracing, service maps

**Database Performance:**
- Query execution time (pg_stat_statements)
- Slow query log (queries >1s)
- Connection pool utilization
- Cache hit ratio

**Example: Slow Query Alert**
```sql
-- Identify slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- >1 second
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

### 8.5 Uptime Monitoring

**Uptime Monitoring Service**: UptimeRobot (free) or Pingdom

**Monitored Endpoints:**
- https://converge-nps.com (frontend)
- https://api.converge-nps.com/health (backend health check)
- https://api.converge-nps.com/v1/auth/login (critical endpoint)

**Check Frequency**: Every 5 minutes

**Alert Channels:**
- Email: admin@converge-nps.com
- SMS: On-call engineer (during event dates)
- Slack: #alerts channel

**Health Check Endpoint:**
```typescript
// GET /health
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    timestamp: new Date().toISOString(),
  };

  const isHealthy = checks.database && checks.redis;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
  });
});

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function checkRedis() {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
```

---

### 8.6 Alerting Rules

**Critical Alerts (Page On-Call):**
- Production API down (health check fails)
- Database connection pool exhausted
- Error rate >10%
- DDoS attack detected (>10k req/min from single IP)

**High Alerts (Notify Slack):**
- API response time p95 >2s
- Error rate >5%
- Redis down
- SSL certificate expiring in <7 days

**Medium Alerts (Notify Slack, Low Priority):**
- API response time p95 >1s
- Database connection pool >80%
- Memory usage >80%
- Failed backup

**Low Alerts (Email):**
- Disk usage >75%
- Dependency vulnerability detected

---

## Scaling Strategy

### 9.1 Horizontal Scaling

**Auto-Scaling Configuration (Railway):**

```yaml
# railway.toml
[build]
  builder = "dockerfile"

[deploy]
  replicas = 2  # Start with 2 instances
  restartPolicyType = "on-failure"
  restartPolicyMaxRetries = 3

[scaling]
  minReplicas = 2
  maxReplicas = 5
  targetCPUPercent = 70  # Scale up if CPU >70%
  targetMemoryPercent = 80  # Scale up if memory >80%
```

**Scaling Triggers:**
- **CPU >70%** for 5 minutes → Add replica
- **Request rate >500 req/min per instance** → Add replica
- **CPU <30%** for 15 minutes → Remove replica (down to min 2)

**Stateless Design:**
- No in-memory session storage (use Redis)
- No local file storage (use S3)
- Any instance can handle any request

---

### 9.2 Load Balancing

**Railway Load Balancer (Built-in):**
- Round-robin distribution
- Health checks: Remove unhealthy instances
- Sticky sessions: Not needed (stateless backend)

**CloudFlare (CDN + DDoS Protection):**
- Cache static assets (frontend)
- Rate limiting (IP-based)
- WAF (Web Application Firewall)
- DDoS mitigation (layer 3/4/7)

---

### 9.3 Auto-Scaling Triggers

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| **CPU** | >70% for 5 min | <30% for 15 min |
| **Memory** | >80% for 5 min | <50% for 15 min |
| **Request Rate** | >500 req/min/instance | <200 req/min/instance |
| **Error Rate** | >5% (investigate, not auto-scale) | N/A |
| **Response Time** | p95 >1s for 10 min | p95 <500ms for 20 min |

**Manual Scaling (Event Preparation):**
- 1 week before event: Scale to 3 instances
- 1 day before event: Scale to 5 instances
- During event: Monitor and scale as needed
- 1 week after event: Scale down to 2 instances

---

### 9.4 Database Read Replicas

**When to Use:**
- Read-heavy workload (80%+ reads)
- Primary database CPU >80%
- Read queries slow (p95 >500ms)

**Setup (Supabase Team Plan):**
- Enable read replicas (1-2 replicas)
- Direct read queries to replicas
- Write queries to primary

**Application Configuration:**
```typescript
// Read from replica
const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_REPLICA_URL,
  max: 20,
});

// Write to primary
const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Use appropriate pool
async function getUser(userId: string) {
  return readPool.query('SELECT * FROM profiles WHERE id = $1', [userId]);
}

async function updateUser(userId: string, data: any) {
  return writePool.query('UPDATE profiles SET ... WHERE id = $1', [userId]);
}
```

**Note**: Not needed for MVP (500 users). Consider if >2,000 concurrent users.

---

### 9.5 CDN Configuration

**Vercel Edge Network (Frontend):**
- Automatic CDN for all static assets
- 100+ edge locations globally
- Smart caching based on file types
- Brotli/Gzip compression

**CloudFlare (API + Assets):**
- Cache API responses (selectively)
- Cache images, avatars, logos
- Purge cache on updates

**Cache Rules:**
```http
# Static assets (immutable)
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# User avatars (1 hour cache)
/avatars/*
  Cache-Control: public, max-age=3600

# API responses (no cache by default)
/api/*
  Cache-Control: private, no-cache

# Cacheable API responses (session list, project list)
/api/v1/sessions
  Cache-Control: public, max-age=300, stale-while-revalidate=60
```

---

## Disaster Recovery

### 10.1 Backup Frequency

**Database:**
- **Daily**: Automated full backup (2:00 AM UTC)
- **Hourly**: During event dates (Jan 28-30)
- **Pre-Deployment**: Manual backup before production deployments
- **Retention**: 7 days (daily), 30 days (weekly off-site)

**Redis:**
- **Daily**: RDB snapshot (2:30 AM UTC)
- **Continuous**: AOF (append-only file)
- **Retention**: 7 days

**Application Code:**
- **Continuous**: Git version control
- **Tagged Releases**: v1.0.0, v1.1.0, etc.
- **Docker Images**: Tagged and pushed to Docker Hub

**Environment Variables:**
- **Manual Backup**: Export Railway env vars (monthly)
- **Stored**: Encrypted in 1Password or secure vault

---

### 10.2 Backup Retention

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| **Database (Daily)** | Daily | 7 days | Supabase (included) |
| **Database (Weekly)** | Weekly | 4 weeks | S3 Standard |
| **Database (Monthly)** | Monthly | 12 months | S3 Glacier |
| **Redis** | Daily | 7 days | Railway (included) |
| **Code** | Continuous | Indefinite | GitHub |
| **Docker Images** | On deployment | 10 latest | Docker Hub |
| **Logs** | Continuous | 30 days | Railway/CloudWatch |
| **Audit Logs** | Continuous | 90 days | Database |

---

### 10.3 Recovery Procedures

**Scenario 1: Backend Service Failure**

**RTO**: <15 minutes
**RPO**: 0 (stateless service)

**Steps:**
1. Railway auto-restarts unhealthy instances (health check fails)
2. If restart fails, deploy previous Docker image
3. Verify service health via `/health` endpoint
4. Monitor error rates and response times

**Scenario 2: Database Failure**

**RTO**: <4 hours
**RPO**: <1 hour

**Steps:**
1. Supabase auto-failover to replica (if Team plan)
2. If complete failure, restore from latest backup
3. Restore takes 30-60 minutes (depends on data size)
4. Verify data integrity (run test queries)
5. Update connection string if new instance
6. Restart backend services

**Scenario 3: Redis Failure**

**RTO**: <30 minutes
**RPO**: <24 hours (cached data acceptable loss)

**Steps:**
1. Railway auto-restarts Redis instance
2. If restart fails, provision new Redis instance
3. Application falls back to database (degraded performance)
4. Update REDIS_URL environment variable
5. Restart backend services

**Scenario 4: Complete Platform Failure (Railway Outage)**

**RTO**: <8 hours
**RPO**: <1 hour

**Steps:**
1. Provision new infrastructure (AWS/GCP)
2. Restore database from latest backup (S3)
3. Deploy latest Docker image
4. Update DNS to point to new infrastructure
5. Verify service health
6. Notify users of service restoration

---

### 10.4 RTO and RPO Targets

**Recovery Time Objective (RTO):**
- **Critical Services**: <1 hour (API, database)
- **High Priority**: <4 hours (full platform restoration)
- **Medium Priority**: <24 hours (analytics, admin features)
- **Low Priority**: <1 week (historical data, reports)

**Recovery Point Objective (RPO):**
- **Database**: <1 hour (hourly backups during event)
- **Messages/Connections**: <1 hour (critical data)
- **Logs**: <24 hours (acceptable loss)
- **Cached Data**: <24 hours (can be regenerated)

**Event Period (Jan 28-30):**
- **RTO**: <15 minutes (critical)
- **RPO**: <15 minutes (hourly backups + WAL)

---

## Cost Optimization

### 11.1 Resource Sizing

**Backend (Railway):**
- **Start**: 1 vCPU, 2GB RAM (1 instance) - $50/month
- **Scale**: 2 instances for production - $100/month
- **Event**: 3-5 instances during event - $150-250/month

**Database (Supabase):**
- **Pro Plan**: 2 vCPU, 8GB RAM, 50GB storage - $25/month
- **Team Plan** (if needed): 4 vCPU, 16GB RAM, 100GB storage - $125/month

**Redis (Railway):**
- **256MB**: Sufficient for MVP - $10/month
- **1GB**: If heavy caching needed - $25/month

**Frontend (Vercel):**
- **Free Tier**: Sufficient for MVP (100GB bandwidth)
- **Pro Tier**: $20/month (if >100GB bandwidth or need advanced features)

---

### 11.2 Auto-Scaling Boundaries

**Minimum Replicas**: 2 (production)
- Ensures high availability
- Handles traffic spikes without downtime

**Maximum Replicas**: 5 (production)
- Caps cost at $250/month for backend
- Sufficient for 2,000 concurrent users (400 users/instance)

**Scaling Policy:**
- Scale up aggressively (5 min window)
- Scale down conservatively (15 min window)
- Prevents thrashing (rapid scale up/down)

---

### 11.3 CDN Optimization

**CloudFlare Free Tier:**
- Unlimited bandwidth (sufficient for MVP)
- Basic DDoS protection
- 100+ edge locations

**Cache Hit Ratio Target**: >90%
- Static assets: 99% (immutable)
- API responses (selective caching): 50%

**Bandwidth Savings:**
- Without CDN: 1TB bandwidth (1M requests × 1MB avg) = $90/month (AWS S3)
- With CDN: 1TB cached, 100GB origin = $10/month

---

### 11.4 Database Optimization

**Connection Pooling:**
- Reduces connection overhead
- Allows more concurrent users per instance

**Query Optimization:**
- Use indexes (see DATABASE_SCHEMA.md)
- Avoid N+1 queries (use JOINs or batch queries)
- Cache frequently accessed data (Redis)

**Data Cleanup:**
- Delete old audit logs (>90 days)
- Archive old sessions (>180 days)
- Compress old backups

**Vacuum & Analyze:**
```sql
-- Weekly maintenance (reduces bloat)
VACUUM ANALYZE;

-- Identify table bloat
SELECT
  schemaname || '.' || tablename AS table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

### 11.5 Monitoring Cost Control

**Sentry:**
- **10k events/month**: $26/month (Developer plan)
- Filter noisy errors (404s, bot requests)
- Sample transactions (50% instead of 100%)

**Logs:**
- **Railway**: Included (basic log viewer)
- **CloudWatch** (if AWS): $0.50/GB ingested (limit to 10GB = $5/month)
- Delete old logs (>30 days)

**Metrics:**
- **Prometheus** (self-hosted): Free (runs on backend instance)
- **Datadog** (optional): $15/host/month (only if needed)

---

### Cost Summary

**MVP (Launch):**
- Backend: $100/month (2 instances)
- Database: $25/month (Supabase Pro)
- Redis: $10/month
- Frontend: $0/month (Vercel free tier)
- CDN: $0/month (CloudFlare free)
- Email: $15/month (SendGrid)
- Monitoring: $26/month (Sentry)
- Storage: $5/month (S3)
- Domain: $1/month
- **Total**: ~$180/month

**At Scale (Event Period):**
- Backend: $250/month (5 instances)
- Database: $25/month
- Redis: $10/month
- Frontend: $20/month (Vercel Pro)
- CDN: $20/month (CloudFlare Pro)
- Email: $15/month
- Monitoring: $26/month
- Storage: $5/month
- Domain: $1/month
- **Total**: ~$370/month

**Post-Event (Steady State):**
- Scale down to 2 backend instances
- Downgrade to free tiers where possible
- **Total**: ~$180-220/month

---

## Deployment Checklist

### Pre-Deployment (1 Week Before)

- [ ] All features tested in staging
- [ ] Security audit completed
- [ ] Performance testing completed (500+ concurrent users)
- [ ] Database migrations tested (staging → production dry run)
- [ ] Backup restoration tested
- [ ] SSL certificates validated (expiration >30 days)
- [ ] Monitoring and alerting configured
- [ ] On-call rotation scheduled
- [ ] Incident response plan reviewed
- [ ] Environment variables verified (production)
- [ ] DNS configuration verified
- [ ] Email deliverability tested (SPF/DKIM/DMARC)
- [ ] Smartsheet integration tested
- [ ] Rate limiting tested

### Deployment Day

- [ ] Announce maintenance window (if needed)
- [ ] Backup production database (manual backup)
- [ ] Deploy backend to production
- [ ] Run database migrations
- [ ] Deploy frontend to production
- [ ] Smoke tests passed
- [ ] Health checks passing
- [ ] Monitor error rates (<1%)
- [ ] Monitor response times (p95 <500ms)
- [ ] Verify critical features (login, QR scan, RSVP, messaging)
- [ ] Notify team of successful deployment

### Post-Deployment (24 Hours)

- [ ] Monitor metrics closely (first 24 hours)
- [ ] Review error logs (Sentry)
- [ ] Check database performance (slow queries)
- [ ] Verify backups running (automated)
- [ ] Review uptime monitoring (UptimeRobot)
- [ ] User feedback collection (any issues reported?)
- [ ] Document any issues encountered
- [ ] Post-deployment retrospective (team meeting)

### Event Preparation (1 Week Before Event: Jan 21-27)

- [ ] Scale backend to 3 instances
- [ ] Enable hourly database backups
- [ ] Configure event-specific alerts (higher sensitivity)
- [ ] Test disaster recovery procedures
- [ ] On-call rotation: 24/7 coverage during event
- [ ] Notify team of event dates and procedures
- [ ] Pre-load data (sessions, partners, projects from Smartsheet)
- [ ] Test QR scanning on multiple devices
- [ ] Test PWA installation on iOS and Android
- [ ] Verify staff check-in workflow

### During Event (Jan 28-30)

- [ ] Monitor metrics in real-time (dashboard)
- [ ] 24/7 on-call coverage
- [ ] Respond to incidents <15 minutes
- [ ] Daily backups + verification
- [ ] Real-time error monitoring (Sentry)
- [ ] User support channel (Slack or email)
- [ ] Log all issues and resolutions
- [ ] Daily status reports to stakeholders

### Post-Event (Feb 1-7)

- [ ] Scale down to 2 instances
- [ ] Disable hourly backups (back to daily)
- [ ] Export data for analysis (connections, RSVPs, messages)
- [ ] Generate analytics report
- [ ] User satisfaction survey
- [ ] Post-event retrospective
- [ ] Archive event data (Smartsheet export)
- [ ] Document lessons learned
- [ ] Plan for post-MVP enhancements

---

## Summary

This deployment architecture provides a production-ready, cost-effective infrastructure for Converge-NPS:

**✅ Infrastructure**: Railway + Supabase + Vercel (simple, scalable, affordable)
**✅ Cost**: $180-370/month (within $200-500 target)
**✅ Environments**: Dev, Staging, Production (proper separation)
**✅ Containers**: Docker multi-stage builds (optimized for size and security)
**✅ Database**: Supabase Pro with backups, connection pooling, RLS
**✅ Redis**: Railway Redis for sessions, caching, rate limiting
**✅ CI/CD**: GitHub Actions (automated testing, building, deploying)
**✅ Monitoring**: Sentry (errors) + Prometheus (metrics) + UptimeRobot (uptime)
**✅ Scaling**: Horizontal auto-scaling (2-5 instances) + CDN
**✅ Disaster Recovery**: Daily backups, <4h RTO, <1h RPO
**✅ Cost Optimization**: Auto-scaling boundaries, CDN caching, resource right-sizing

**Estimated Monthly Cost**: $222 (MVP) → $370 (at scale) → $180 (post-event)

**Next Steps:**
1. Review with DevOps Engineer
2. Set up Railway and Supabase accounts
3. Configure GitHub Actions workflows
4. Deploy to staging environment
5. Load testing (500+ concurrent users)
6. Security audit and penetration testing
7. Final production deployment (3 weeks before event)

---

**Document Status**: ✅ Ready for Review
**Reviewer**: DevOps Engineer Agent
**Approval Required**: Master Orchestrator
