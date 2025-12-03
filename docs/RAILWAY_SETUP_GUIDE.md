# Railway Setup Guide

**Document Version:** 1.0
**Date:** 2025-12-02
**Author:** DevOps Engineer Agent
**Status:** Ready for Implementation

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Railway Account Setup](#railway-account-setup)
3. [Project Creation](#project-creation)
4. [Environment Configuration](#environment-configuration)
5. [Service Provisioning](#service-provisioning)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [Redis Setup](#redis-setup)
9. [Backend Deployment](#backend-deployment)
10. [Domain Configuration](#domain-configuration)
11. [Monitoring Setup](#monitoring-setup)
12. [Cost Management](#cost-management)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting Railway setup, ensure you have:

- [x] GitHub account with access to Converge-NPS repository
- [x] Valid credit card for Railway billing (free $5 trial, then pay-as-you-go)
- [x] Node.js 20+ installed locally
- [x] Git configured locally
- [x] Access to Supabase account (for PostgreSQL)
- [x] Domain name purchased (optional for MVP, can use Railway subdomain)

---

## Railway Account Setup

### Step 1: Create Railway Account

1. Visit https://railway.app
2. Click "Start a New Project" or "Sign Up"
3. Choose "Sign in with GitHub"
4. Authorize Railway to access your GitHub repositories
5. Complete account setup

**Important Security Notes:**
- Railway will request access to your GitHub repositories
- You can limit access to specific repositories (recommended)
- Enable Two-Factor Authentication (2FA) in Railway settings

### Step 2: Connect GitHub Repository

1. After signing in, go to Railway Dashboard
2. Click on your profile → Settings → GitHub
3. Click "Configure GitHub App"
4. Select repositories to grant access:
   - Option 1: All repositories (not recommended)
   - Option 2: Only select repositories → Select `Converge-NPS`
5. Save changes

### Step 3: Enable Billing

**Free Trial:**
- Railway provides $5 credit for new accounts
- Sufficient for testing and initial setup
- No credit card required for trial

**Production Billing:**
1. Go to Account Settings → Billing
2. Click "Add Payment Method"
3. Enter credit card details
4. Set spending limits (recommended):
   - Development: $50/month
   - Staging: $100/month
   - Production: $300/month
5. Enable billing alerts (email notifications at 50%, 80%, 100%)

**Cost Expectations:**
- Development: ~$30/month
- Staging: ~$50/month
- Production: ~$150-250/month (scales with usage)

---

## Project Creation

### Step 1: Create Railway Project

1. From Railway Dashboard, click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select `Converge-NPS` repository
4. Railway will detect monorepo structure

**Alternative: CLI Method**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to project directory
cd /path/to/Converge-NPS

# Initialize Railway project
railway init

# Follow prompts:
# - Project name: converge-nps
# - Link to existing project or create new: Create new
```

### Step 2: Project Settings

1. Go to Project Settings (gear icon)
2. Set project name: `converge-nps`
3. Set project description: "Converge-NPS Enterprise Event Networking Platform"
4. Enable "Automatically deploy on push" (recommended)
5. Set default branch: `main` (production) or `develop` (staging)

---

## Environment Configuration

Railway supports multiple environments (development, staging, production). We'll create 3 environments:

### Environment 1: Development

**Purpose:** For developers to test features before merging to main branches.

1. From Project Dashboard, click "New Environment"
2. Name: `development`
3. Base environment: None (empty)
4. Auto-deploy: Enabled
5. Branch: `develop`

**Configuration:**
- Services: Backend, Redis, PostgreSQL (shared or local)
- Auto-deploy: Push to `develop` branch
- Replica count: 1 instance
- Resources: 1 vCPU, 1GB RAM

### Environment 2: Staging

**Purpose:** Pre-production testing, QA, UAT.

1. Click "New Environment"
2. Name: `staging`
3. Base environment: None
4. Auto-deploy: Enabled
5. Branch: `staging`

**Configuration:**
- Services: Backend, Redis, PostgreSQL (separate from dev)
- Auto-deploy: Push to `staging` branch
- Replica count: 2 instances (test HA)
- Resources: 1 vCPU, 2GB RAM per instance

### Environment 3: Production

**Purpose:** Live event, real users.

1. Click "New Environment"
2. Name: `production`
3. Base environment: None
4. Auto-deploy: Disabled (manual approval required)
5. Branch: `main`

**Configuration:**
- Services: Backend, Redis, PostgreSQL (dedicated)
- Auto-deploy: Disabled (use GitHub Actions with manual approval)
- Replica count: 2 instances (minimum for HA)
- Resources: 2 vCPU, 4GB RAM per instance
- Health checks: Enabled (`/health` endpoint)

---

## Service Provisioning

For each environment, provision the following services:

### 1. Backend Service (Node.js)

**Development Environment:**
1. Click "New Service" in `development` environment
2. Choose "GitHub Repo"
3. Select `Converge-NPS` repository
4. Root directory: `/backend`
5. Build command: `npm install && npm run build`
6. Start command: `npm start`
7. Port: `3000`

**Railway will auto-detect:**
- Node.js version from `package.json` engines field
- Dockerfile if present (recommended for production)

**Settings:**
- **Restart policy:** On failure
- **Health check path:** `/health`
- **Health check interval:** 30 seconds
- **Health check timeout:** 5 seconds
- **Replica count:**
  - Development: 1
  - Staging: 2
  - Production: 2-5 (auto-scaling)

**Staging Environment:**
- Repeat steps above for `staging` environment
- Use same configuration but separate instance

**Production Environment:**
- Repeat steps above for `production` environment
- Increase resources:
  - CPU: 2 vCPU
  - Memory: 4GB RAM
  - Replica count: 2 (can scale to 5)

### 2. Redis Cache

**For Each Environment:**

1. Click "New Service"
2. Choose "Database" → "Redis"
3. Railway will provision Redis instance
4. Configuration:
   - Development: 256MB RAM
   - Staging: 256MB RAM
   - Production: 512MB RAM (or 1GB if heavy caching)

**Redis Configuration:**
- Persistence: RDB + AOF (automatic)
- Max memory policy: `allkeys-lru` (evict least recently used)
- Eviction: Enabled (to prevent OOM)

**Connection String:**
Railway provides `REDIS_URL` automatically:
```
redis://:password@hostname:port
```

### 3. PostgreSQL Database (Supabase)

**Important:** Railway PostgreSQL is expensive for production. We use Supabase instead.

**However, for local development (optional):**
1. Click "New Service" → "Database" → "PostgreSQL"
2. Railway provisions PostgreSQL 15
3. Use for development/testing only

**Production Database:**
- Use Supabase (see [Database Setup](#database-setup))
- Connect Railway backend to Supabase via `DATABASE_URL`

---

## Environment Variables

### Setting Variables via Railway Dashboard

1. Go to Service (e.g., Backend)
2. Click "Variables" tab
3. Click "New Variable"
4. Add key-value pairs

**Example:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=<generate-secure-secret>
```

### Setting Variables via Railway CLI

```bash
# Select environment
railway environment

# Set variable
railway variables set JWT_SECRET=your-secret-here

# Set multiple variables
railway variables set \
  NODE_ENV=production \
  PORT=3000 \
  JWT_SECRET=your-secret \
  JWT_REFRESH_SECRET=your-refresh-secret

# View variables
railway variables

# Delete variable
railway variables delete JWT_SECRET
```

### Required Environment Variables

**Development:**
```bash
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/converge_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-prod
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d
FRONTEND_URL=http://localhost:5173
PORT=3000
LOG_LEVEL=debug
```

**Staging:**
```bash
NODE_ENV=staging
DATABASE_URL=<supabase-staging-url>
REDIS_URL=<railway-redis-url>
JWT_SECRET=<generate-256-bit-secret>
JWT_REFRESH_SECRET=<generate-256-bit-secret>
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d
FRONTEND_URL=https://staging.converge-nps.com
SMARTSHEET_API_KEY=<staging-api-key>
SENDGRID_API_KEY=<staging-api-key>
SENTRY_DSN=<staging-dsn>
PORT=3000
LOG_LEVEL=info
```

**Production:**
```bash
NODE_ENV=production
DATABASE_URL=<supabase-production-url>
REDIS_URL=<railway-redis-url>
JWT_SECRET=<strong-256-bit-secret>
JWT_REFRESH_SECRET=<strong-256-bit-secret>
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d
FRONTEND_URL=https://converge-nps.com
SMARTSHEET_API_KEY=<production-api-key>
SENDGRID_API_KEY=<production-api-key>
SENTRY_DSN=<production-dsn>
PORT=3000
LOG_LEVEL=warn
ENABLE_DEBUG_LOGS=false
```

### Generating Secrets

**JWT Secrets (256-bit):**
```bash
# Generate secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
```

**Important:**
- Use different secrets for development, staging, production
- Never commit secrets to Git
- Rotate secrets every 90 days
- Store secrets in password manager (1Password, LastPass)

---

## Database Setup

### Option 1: Supabase (Recommended for Production)

**Why Supabase:**
- Managed PostgreSQL with backups
- Built-in connection pooling (PgBouncer)
- Row-Level Security (RLS) policies
- Realtime capabilities (optional)
- $25/month Pro plan (vs $50+ Railway PostgreSQL)

**Setup Steps:**

1. Go to https://supabase.com
2. Create account or sign in
3. Click "New Project"
4. Project settings:
   - Name: `converge-nps-dev` (or `staging`, `production`)
   - Database password: Generate strong password
   - Region: `us-west-1` (closest to NPS Monterey)
   - Plan: Free (dev), Pro ($25/month for production)

5. Wait for project provisioning (2-3 minutes)

6. Get connection strings:
   - Go to Project Settings → Database
   - Copy "Connection string" (Transaction mode for Railway)
   - Format: `postgresql://postgres:[password]@[host]:6543/postgres?pgbouncer=true`

7. Add to Railway environment variables:
```bash
railway variables set DATABASE_URL="postgresql://postgres:password@db.supabase.co:6543/postgres?pgbouncer=true"
```

**Connection Pooling:**
- Supabase includes PgBouncer by default (port 6543)
- Use pooled connection for application (port 6543)
- Use direct connection for migrations (port 5432)

**Direct connection (for migrations):**
```
postgresql://postgres:[password]@db.supabase.co:5432/postgres
```

### Option 2: Railway PostgreSQL (Development Only)

**For local/development testing:**

1. Railway Dashboard → New Service → PostgreSQL
2. Railway provisions PostgreSQL 15
3. Connection string auto-added to environment variables
4. Cost: ~$10/month for 1GB storage

**Not recommended for production due to cost and limited features.**

### Database Migrations

**Run migrations after database setup:**

```bash
# Set environment
railway environment production

# Run Prisma migrations
railway run npx prisma migrate deploy

# Or connect directly
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

---

## Redis Setup

Redis is provisioned automatically by Railway for each environment.

### Configuration

1. Railway Dashboard → Environment → New Service → Redis
2. Railway creates Redis instance with default settings
3. `REDIS_URL` automatically added to environment variables

**Memory Allocation:**
- Development: 256MB (sufficient for testing)
- Staging: 256MB
- Production: 512MB (or 1GB if heavy caching)

**Persistence:**
- RDB snapshots: Every 900s if 1 key changed
- AOF (Append-Only File): Enabled, fsync every second
- Automatic backups: Daily

**Eviction Policy:**
```redis
maxmemory-policy allkeys-lru
```
- Evicts least recently used keys when memory full
- Prevents Redis from crashing on OOM

### Redis CLI Access

```bash
# Connect to Redis via Railway CLI
railway connect redis

# Or manually
redis-cli -u $REDIS_URL
```

### Testing Redis Connection

```bash
# Ping Redis
redis-cli -u $REDIS_URL ping
# Expected: PONG

# Set key
redis-cli -u $REDIS_URL SET test "Hello Railway"

# Get key
redis-cli -u $REDIS_URL GET test
# Expected: "Hello Railway"
```

---

## Backend Deployment

### Initial Deployment

**Method 1: GitHub Integration (Recommended)**

1. Push code to GitHub repository
2. Railway auto-detects changes and deploys
3. Monitor deployment logs in Railway Dashboard
4. Deployment completes in 2-5 minutes

**Method 2: Railway CLI**

```bash
# Navigate to backend directory
cd backend

# Deploy to Railway
railway up

# Specify environment
railway up --environment production
```

### Deployment Configuration

**railway.toml** (optional, but recommended):

Create in backend directory:
```toml
[build]
  builder = "dockerfile"
  dockerfilePath = "Dockerfile"

[deploy]
  numReplicas = 2
  restartPolicyType = "on-failure"
  restartPolicyMaxRetries = 3
  healthcheckPath = "/health"
  healthcheckTimeout = 5

[scaling]
  minReplicas = 2
  maxReplicas = 5
  targetCPUPercent = 70
```

### Build Process

**Using Dockerfile (Recommended):**
Railway uses `backend/Dockerfile` if present.

**Using Nixpacks (Alternative):**
Railway auto-detects Node.js and builds using Nixpacks (no Dockerfile needed).

### Post-Deployment Checks

1. **Health Check:**
```bash
curl https://api.converge-nps.com/health
# Expected: {"status":"healthy","checks":{...}}
```

2. **View Logs:**
```bash
railway logs --environment production
```

3. **Monitor Metrics:**
- Railway Dashboard → Service → Metrics
- Check CPU, memory, response times

---

## Domain Configuration

### Railway Subdomain (Default)

Railway provides free subdomain:
```
https://converge-nps-production.up.railway.app
```

**Pros:**
- Free, automatic SSL
- No DNS configuration

**Cons:**
- Not branded
- Long URL

### Custom Domain (Recommended)

**Prerequisites:**
- Domain purchased (e.g., converge-nps.com)
- Access to DNS settings

**Setup Steps:**

1. Railway Dashboard → Service → Settings → Domains
2. Click "Add Domain"
3. Enter custom domain: `api.converge-nps.com`
4. Railway provides DNS records:
   - Type: CNAME
   - Name: `api`
   - Value: `converge-nps-production.up.railway.app`

5. Add CNAME record to your DNS provider:
   - Login to domain registrar (Namecheap, GoDaddy, etc.)
   - Go to DNS settings
   - Add CNAME record:
     - Host: `api`
     - Value: `converge-nps-production.up.railway.app`
     - TTL: 300 (5 minutes)

6. Wait for DNS propagation (5-60 minutes)

7. Railway automatically provisions SSL certificate (Let's Encrypt)

8. Verify:
```bash
curl https://api.converge-nps.com/health
```

**Additional Domains:**
- Staging: `api.staging.converge-nps.com`
- Development: `api.dev.converge-nps.com` (optional)

---

## Monitoring Setup

### Railway Built-in Monitoring

**Metrics Available:**
- CPU usage (%)
- Memory usage (MB)
- Network traffic (MB)
- Request rate (req/s)
- Response time (ms)
- Error rate (%)

**Accessing Metrics:**
1. Railway Dashboard → Service → Metrics
2. View real-time and historical data
3. Set custom date ranges

### Setting Up Alerts

**Railway Webhooks:**
1. Project Settings → Webhooks
2. Add webhook URL (Slack, Discord, custom endpoint)
3. Select events:
   - Deployment started
   - Deployment failed
   - Deployment succeeded
   - Service crashed
   - Health check failed

**Example: Slack Webhook**
```bash
# Add Slack webhook
railway webhooks add \
  --url https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  --events deployment.failed,deployment.succeeded
```

### External Monitoring (Recommended)

**1. Sentry (Error Tracking)**

Already configured in backend code. Add DSN to environment variables:
```bash
railway variables set SENTRY_DSN="https://[key]@sentry.io/[project]"
```

**2. UptimeRobot (Uptime Monitoring)**

1. Go to https://uptimerobot.com (free tier)
2. Add new monitor:
   - Monitor Type: HTTPS
   - URL: `https://api.converge-nps.com/health`
   - Monitoring Interval: 5 minutes
   - Alert Contacts: Your email

3. UptimeRobot will email you if service is down

**3. Grafana + Prometheus (Advanced, Optional)**

- Export Railway metrics to Prometheus
- Visualize in Grafana dashboards
- Set up custom alerts

---

## Cost Management

### Cost Breakdown (Expected)

**Development:**
- Backend (1 instance): $15/month
- Redis (256MB): $5/month
- PostgreSQL (Supabase): $0 (free tier)
- **Total:** ~$20/month

**Staging:**
- Backend (2 instances): $30/month
- Redis (256MB): $5/month
- PostgreSQL (Supabase Pro): $25/month
- **Total:** ~$60/month

**Production:**
- Backend (2-5 instances): $100-250/month (scales with usage)
- Redis (512MB): $10/month
- PostgreSQL (Supabase Pro): $25/month
- **Total:** ~$135-285/month

**Total across environments:** ~$215-365/month (within $200-500 budget)

### Cost Optimization Tips

1. **Auto-Scaling Limits:**
   - Set max replicas to 5 (prevents runaway costs)
   - Scale down staging to 1 instance during off-hours

2. **Resource Right-Sizing:**
   - Start with smaller instances (1 vCPU, 2GB RAM)
   - Scale up only if needed (monitor CPU/memory)

3. **Redis Memory:**
   - Start with 256MB
   - Upgrade to 512MB only if cache hit rate low

4. **Development:**
   - Use local PostgreSQL/Redis for development (free)
   - Only use Railway for shared dev environment

5. **Spending Limits:**
   - Set monthly spending cap in Railway Dashboard
   - Enable billing alerts at 50%, 80%, 100%

### Viewing Costs

1. Railway Dashboard → Billing
2. View current month usage
3. Download invoices
4. Set up billing alerts

---

## Troubleshooting

### Issue 1: Deployment Fails

**Symptoms:**
- Railway shows "Deployment Failed"
- Logs show build errors

**Solutions:**

1. Check build logs:
```bash
railway logs --environment production
```

2. Common issues:
   - Missing environment variables → Add in Railway Dashboard
   - Build command fails → Check `package.json` scripts
   - Dockerfile errors → Validate Dockerfile locally
   - Out of memory → Increase memory allocation

3. Test build locally:
```bash
docker build -t converge-backend .
docker run -p 3000:3000 converge-backend
```

### Issue 2: Health Check Failing

**Symptoms:**
- Railway marks service as unhealthy
- Service restarts frequently

**Solutions:**

1. Verify health check endpoint:
```bash
curl https://your-service.railway.app/health
```

2. Check backend logs for errors:
```bash
railway logs --environment production | grep ERROR
```

3. Common issues:
   - Database connection failed → Check `DATABASE_URL`
   - Redis connection failed → Check `REDIS_URL`
   - Health check timeout → Increase timeout in settings

### Issue 3: Environment Variables Not Loading

**Symptoms:**
- App crashes with "undefined environment variable"
- Logs show missing config

**Solutions:**

1. Verify variables are set:
```bash
railway variables
```

2. Re-deploy after adding variables:
```bash
railway up --environment production
```

3. Check variable names (case-sensitive)

### Issue 4: High Costs

**Symptoms:**
- Monthly bill higher than expected

**Solutions:**

1. Check resource usage:
   - Railway Dashboard → Metrics
   - Identify high CPU/memory services

2. Optimize:
   - Reduce replica count if low traffic
   - Downsize instances (2GB RAM → 1GB RAM)
   - Enable auto-scaling down

3. Set spending limit:
   - Railway Dashboard → Billing → Set Limit

### Issue 5: Slow Performance

**Symptoms:**
- API response times >1s
- High latency

**Solutions:**

1. Check metrics:
   - CPU usage >80% → Scale up (more replicas)
   - Memory usage >90% → Increase memory
   - Database slow queries → Add indexes, optimize queries

2. Enable Redis caching:
   - Cache frequently accessed data
   - Set appropriate TTL

3. Use connection pooling:
   - Supabase connection pooling (port 6543)
   - Redis connection pooling in backend

---

## Next Steps

After completing Railway setup:

1. [x] Railway account created and billing enabled
2. [x] 3 environments provisioned (dev, staging, production)
3. [x] Backend service deployed to each environment
4. [x] Redis provisioned for each environment
5. [x] Database (Supabase) connected
6. [x] Environment variables configured
7. [x] Custom domains configured (optional)
8. [x] Monitoring and alerts set up

**Proceed to:**
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) - Deployment procedures
- [CI/CD Setup](../.github/workflows/deploy.yml) - Automated deployments
- [Database Migrations](#database-migrations) - Apply schema changes

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-12-02
**Maintainer:** DevOps Engineer Agent
