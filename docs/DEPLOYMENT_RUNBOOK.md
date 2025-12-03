# Deployment Runbook - Converge-NPS

**Document Version:** 1.0
**Date:** 2025-12-02
**Author:** DevOps Engineer Agent
**Status:** Ready for Operations

---

## Table of Contents

1. [Overview](#overview)
2. [Initial Deployment](#initial-deployment)
3. [Rolling Updates](#rolling-updates)
4. [Rollback Procedures](#rollback-procedures)
5. [Database Migrations](#database-migrations)
6. [Emergency Procedures](#emergency-procedures)
7. [Disaster Recovery](#disaster-recovery)
8. [Health Checks](#health-checks)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This runbook provides step-by-step procedures for deploying, updating, and maintaining the Converge-NPS platform in production.

### Environments

| Environment | Purpose | Auto-Deploy | URL |
|-------------|---------|-------------|-----|
| **Development** | Feature development | Yes (develop branch) | api.dev.converge-nps.com |
| **Staging** | Pre-production testing | Yes (staging branch) | api.staging.converge-nps.com |
| **Production** | Live event | No (manual approval) | api.converge-nps.com |

### Deployment Windows

**Preferred Times:**
- Monday-Thursday: 10:00 AM - 4:00 PM PST (outside event hours)
- Avoid Fridays (no time to fix issues before weekend)
- **NEVER during event**: January 28-30, 2026

**Blackout Windows:**
- Event dates: January 28-30, 2026
- Friday after 2:00 PM PST
- Major holidays

---

## Initial Deployment

### Prerequisites Checklist

Before first production deployment:

- [ ] All tests passing in staging
- [ ] Security audit completed
- [ ] Performance testing completed (500+ concurrent users)
- [ ] Database migrations tested in staging
- [ ] Backup restoration tested
- [ ] SSL certificates configured
- [ ] Monitoring and alerting configured
- [ ] On-call rotation scheduled
- [ ] Incident response plan reviewed
- [ ] Environment variables verified
- [ ] DNS configuration verified
- [ ] Email deliverability tested (SPF/DKIM/DMARC)
- [ ] Smartsheet integration tested
- [ ] Rate limiting tested

### Step 1: Pre-Deployment Backup

```bash
# Set production environment
export RAILWAY_TOKEN=$RAILWAY_TOKEN_PRODUCTION
export DATABASE_URL=$PRODUCTION_DATABASE_URL

# Create manual backup
cd backend
./scripts/backup-db.sh

# Verify backup
ls -lh backups/

# Optional: Upload to S3
aws s3 cp backups/converge_backup_$(date +%Y%m%d_*)*.sql.gz \
  s3://converge-nps-backups/pre-deployment/
```

### Step 2: Database Migrations

```bash
# Review pending migrations
cd backend
npx prisma migrate status

# Run migrations (production)
railway run --environment production npx prisma migrate deploy

# Verify migration success
railway run --environment production npx prisma migrate status
```

### Step 3: Deploy Backend

**Option A: GitHub Actions (Recommended)**

1. Create PR from `staging` to `main`
2. Request code review from team
3. Wait for CI/CD checks to pass
4. Merge PR
5. GitHub Actions will:
   - Build backend
   - Run tests
   - Wait for manual approval (production environment)
6. Approve deployment in GitHub Actions UI
7. Monitor deployment logs

**Option B: Railway CLI (Manual)**

```bash
# Navigate to backend
cd backend

# Deploy to production
railway up --environment production

# Monitor logs
railway logs --environment production --follow
```

### Step 4: Deploy Frontend

**Vercel (Recommended):**

Frontend deploys automatically on merge to `main` via Vercel GitHub integration.

**Manual Deploy:**
```bash
cd frontend
vercel --prod
```

### Step 5: Post-Deployment Verification

```bash
# 1. Health check
curl https://api.converge-nps.com/health
# Expected: {"status":"healthy","checks":{...}}

# 2. Test authentication
curl -X POST https://api.converge-nps.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# 3. Check frontend
open https://converge-nps.com

# 4. Monitor logs for errors
railway logs --environment production --tail 100

# 5. Check Sentry for errors
# Visit: https://sentry.io/organizations/converge-nps/issues/
```

### Step 6: Smoke Tests

Run critical user flows:

1. **User Registration**
   - Register new account
   - Verify email
   - Log in

2. **QR Scanning**
   - Scan test QR code
   - Create connection
   - Verify connection saved

3. **Messaging**
   - Send message to connection
   - Receive message
   - Verify delivery

4. **RSVP**
   - Browse sessions
   - RSVP to session
   - Verify RSVP saved

5. **Admin Dashboard**
   - Log in as admin
   - View analytics
   - Export data

### Step 7: Notify Team

```bash
# Post to Slack (automatic via GitHub Actions)
# Or manually:
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Production deployment complete",
    "attachments": [{
      "color": "good",
      "fields": [
        {"title": "Version", "value": "v1.0.0", "short": true},
        {"title": "Commit", "value": "'$(git rev-parse --short HEAD)'", "short": true},
        {"title": "URL", "value": "https://converge-nps.com", "short": false}
      ]
    }]
  }'
```

---

## Rolling Updates

For routine updates (bug fixes, features) after initial deployment.

### Update Procedure

1. **Create Feature Branch**
```bash
git checkout -b feature/your-feature
# Make changes
git add .
git commit -m "feat: Add new feature"
git push origin feature/your-feature
```

2. **Deploy to Development**
```bash
# Merge to develop branch
git checkout develop
git merge feature/your-feature
git push origin develop

# Auto-deploys to development environment
```

3. **Test in Development**
- Verify feature works
- Check logs for errors
- Run integration tests

4. **Deploy to Staging**
```bash
# Merge to staging branch
git checkout staging
git merge develop
git push origin staging

# Auto-deploys to staging environment
```

5. **QA Testing in Staging**
- Full regression testing
- Security testing
- Performance testing
- User acceptance testing

6. **Deploy to Production**
```bash
# Create PR: staging -> main
gh pr create --base main --head staging \
  --title "Release v1.1.0" \
  --body "Changes: ..."

# Wait for reviews and approval
# Merge PR
# GitHub Actions deploys to production (with manual approval gate)
```

### Zero-Downtime Deployment

Railway performs rolling updates automatically:

1. New instance starts
2. Health check passes
3. Traffic shifts to new instance
4. Old instance drains connections
5. Old instance terminates

**Verify zero-downtime:**
```bash
# Monitor during deployment
while true; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.converge-nps.com/health
  sleep 1
done
# Should always return 200 (no downtime)
```

---

## Rollback Procedures

### When to Rollback

Rollback if:
- Smoke tests fail
- Critical bug discovered
- Error rate >5%
- Performance degradation (p95 >2s)
- Data corruption detected

### Automatic Rollback

GitHub Actions will auto-rollback if smoke tests fail (configured in workflow).

### Manual Rollback - Backend

**Option 1: Railway CLI**

```bash
# List recent deployments
railway deployments --environment production

# Rollback to previous deployment
railway rollback --environment production

# Or rollback to specific deployment
railway rollback --environment production --to <deployment-id>
```

**Option 2: Git Revert**

```bash
# Revert last commit
git revert HEAD
git push origin main

# GitHub Actions will deploy reverted version
```

**Option 3: Redeploy Previous Version**

```bash
# Checkout previous tag
git checkout v1.0.0

# Deploy
cd backend
railway up --environment production --detach

# Return to main
git checkout main
```

### Manual Rollback - Frontend

**Vercel:**

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Or specify deployment
vercel rollback <deployment-url>
```

### Database Rollback

**If migration needs to be reverted:**

1. **Restore from backup:**
```bash
# List recent backups
ls -lh backups/

# Restore backup (WARNING: Data loss)
./scripts/restore-db.sh backups/converge_backup_YYYYMMDD_HHMMSS.sql.gz
```

2. **Manual migration rollback:**
```bash
# Create rollback migration
npx prisma migrate dev --name revert_feature_x

# Apply to production
railway run --environment production npx prisma migrate deploy
```

### Post-Rollback

1. **Verify service health**
```bash
curl https://api.converge-nps.com/health
```

2. **Monitor logs**
```bash
railway logs --environment production --tail 100
```

3. **Notify team**
```
Posted to Slack: "Production rollback completed. Service restored to v1.0.0"
```

4. **Incident report**
- Document what went wrong
- Root cause analysis
- Prevention plan

---

## Database Migrations

### Development/Staging Migrations

```bash
# Create new migration
cd backend
npx prisma migrate dev --name add_user_roles

# Test migration
npm test

# Push to staging
git push origin staging

# Auto-deploys and runs migrations
```

### Production Migrations

**Backwards-Compatible Migrations (Preferred):**

Safe to run without downtime:
- Adding new tables
- Adding nullable columns
- Adding indexes (with CONCURRENTLY)
- Creating new functions

**Non-Compatible Migrations (Caution):**

Require coordination:
- Dropping columns
- Changing column types
- Adding non-nullable columns
- Dropping tables

**Migration Procedure:**

1. **Pre-Migration Backup**
```bash
export DATABASE_URL=$PRODUCTION_DATABASE_URL
./scripts/backup-db.sh
```

2. **Review Migration**
```bash
# Check pending migrations
npx prisma migrate status

# View migration SQL
cat prisma/migrations/20251202_add_feature/migration.sql
```

3. **Run Migration**
```bash
# Apply migration
railway run --environment production npx prisma migrate deploy

# Monitor output for errors
```

4. **Verify Migration**
```bash
# Check migration status
railway run --environment production npx prisma migrate status

# Test database queries
curl https://api.converge-nps.com/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

5. **Rollback Plan**

If migration fails:
```bash
# Restore from backup
./scripts/restore-db.sh backups/converge_backup_20251202_*.sql.gz

# Or create revert migration
npx prisma migrate dev --name revert_add_feature
railway run --environment production npx prisma migrate deploy
```

### Large Data Migrations

For migrations that modify large amounts of data:

1. **Test with production data copy**
2. **Schedule maintenance window**
3. **Run during low-traffic period**
4. **Monitor database performance**
5. **Have rollback plan ready**

---

## Emergency Procedures

### Production Down

**Severity: P0 - Critical**
**Response Time: <15 minutes**

1. **Assess Impact**
```bash
# Check health endpoint
curl https://api.converge-nps.com/health

# Check Railway status
railway status --environment production

# Check logs
railway logs --environment production --tail 100
```

2. **Identify Root Cause**
- Database connection failed?
- Redis connection failed?
- Application crash?
- Infrastructure outage?

3. **Immediate Actions**

**If application crash:**
```bash
# Restart service
railway restart --environment production
```

**If bad deployment:**
```bash
# Rollback
railway rollback --environment production
```

**If database issue:**
```bash
# Check database status (Supabase dashboard)
# Restore from backup if needed
```

4. **Notify Team**
```
Post to Slack: "@channel Production is down. Investigating..."
```

5. **Monitor Recovery**
```bash
# Watch logs
railway logs --environment production --follow

# Monitor metrics
# Railway Dashboard → Production → Metrics
```

6. **Post-Incident**
- Document incident timeline
- Root cause analysis
- Prevention measures

### Database Breach

**Severity: P0 - Critical**
**Response Time: <15 minutes**

1. **Isolate System**
```bash
# Take service offline (if breach is ongoing)
railway down --environment production

# Or block attacker IP
# Railway Dashboard → Settings → Networking
```

2. **Preserve Evidence**
```bash
# Download logs
railway logs --environment production > incident_logs.txt

# Export audit logs
railway run --environment production npx prisma db execute --stdin <<SQL
COPY (SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours')
TO '/tmp/audit_export.csv' CSV HEADER;
SQL
```

3. **Assess Scope**
- What data was accessed?
- How was breach accomplished?
- When did breach occur?
- Who was affected?

4. **Contain Breach**
```bash
# Reset all JWT secrets
railway variables set JWT_SECRET=<new-secret>
railway variables set JWT_REFRESH_SECRET=<new-secret>

# Invalidate all sessions
railway run --environment production npx prisma db execute --stdin <<SQL
DELETE FROM user_sessions;
SQL

# Force password reset for affected users
```

5. **Notify Stakeholders**
- NPS event organizers
- Affected users (within 72 hours - GDPR requirement)
- Authorities (if required)

6. **Remediation**
- Patch vulnerability
- Deploy security fix
- Enhanced monitoring

### High Error Rate

**Severity: P1 - High**
**Response Time: <1 hour**

1. **Check Sentry**
```
Visit: https://sentry.io/organizations/converge-nps/issues/
Filter by: Last 24 hours, Production environment
```

2. **Identify Error Pattern**
- Is it a specific endpoint?
- Is it affecting all users or a subset?
- When did it start?

3. **Quick Fix Options**

**If feature-specific:**
```bash
# Deploy feature flag to disable feature
railway variables set FEATURE_X_ENABLED=false
railway restart --environment production
```

**If deployment-related:**
```bash
# Rollback
railway rollback --environment production
```

4. **Monitor Resolution**
```bash
# Watch error rate in Sentry
# Should decrease within 5-10 minutes
```

### DDoS Attack

**Severity: P1 - High**
**Response Time: <1 hour**

1. **Confirm Attack**
```bash
# Check request rate
railway logs --environment production | grep "429 Too Many Requests"

# Check source IPs
railway logs --environment production | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

2. **Block Malicious IPs**
```
Railway Dashboard → Settings → Networking → IP Allowlist
Add IP blocklist
```

3. **Enable Rate Limiting**
```bash
# If not already enabled
railway variables set ENABLE_RATE_LIMITING=true
railway variables set RATE_LIMIT_MAX_REQUESTS=100
railway restart --environment production
```

4. **Cloudflare Protection**
```
Cloudflare Dashboard → Security → DDoS
Enable "Under Attack" mode
```

5. **Scale Up**
```bash
# Increase replicas to handle load
railway scale --replicas 5 --environment production
```

---

## Disaster Recovery

### Complete Platform Failure

**Scenario:** Railway outage, region failure, complete data center loss

**RTO:** <8 hours
**RPO:** <1 hour

**Recovery Steps:**

1. **Assess Situation**
- Railway status page: https://status.railway.app
- Estimated recovery time?
- Backup infrastructure needed?

2. **Activate DR Plan**

If Railway down >4 hours:

**Option A: Restore to AWS/GCP**

```bash
# 1. Provision new infrastructure
terraform apply -var-file=dr.tfvars

# 2. Restore database from S3 backup
aws s3 cp s3://converge-nps-backups/latest/backup.sql.gz .
gunzip backup.sql.gz
psql $NEW_DATABASE_URL < backup.sql

# 3. Deploy backend
docker build -t converge-backend backend/
docker push gcr.io/converge-nps/backend:latest
kubectl apply -f k8s/backend-deployment.yaml

# 4. Update DNS
# Point api.converge-nps.com to new infrastructure

# 5. Deploy frontend
vercel --prod

# RTO: 4-8 hours
```

**Option B: Wait for Railway Recovery**

If Railway estimates <4 hour recovery:
- Monitor Railway status
- Notify users of outage
- Prepare for traffic surge on recovery

3. **Verify Recovery**
```bash
# Test all critical endpoints
./scripts/smoke-test.sh

# Monitor error rates
# Check Sentry dashboard
```

4. **Post-Incident**
- Post-mortem meeting
- Document lessons learned
- Update DR procedures
- Test DR plan quarterly

---

## Health Checks

### Application Health Check

**Endpoint:** `GET /health`

**Expected Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "timestamp": "2025-12-02T10:30:00Z"
  },
  "uptime": 86400,
  "version": "1.0.0"
}
```

**Unhealthy Response:**
```json
{
  "status": "unhealthy",
  "checks": {
    "database": false,
    "redis": true,
    "timestamp": "2025-12-02T10:30:00Z"
  }
}
```

### Manual Health Check

```bash
# Basic health
curl https://api.converge-nps.com/health

# Detailed check
curl https://api.converge-nps.com/health | jq .

# Monitor continuously
watch -n 5 'curl -s https://api.converge-nps.com/health | jq .'
```

### Database Health

```bash
# Check connection
railway run --environment production npx prisma db execute --stdin <<SQL
SELECT version();
SQL

# Check slow queries
railway run --environment production npx prisma db execute --stdin <<SQL
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
SQL
```

### Redis Health

```bash
# Ping Redis
redis-cli -u $REDIS_URL ping
# Expected: PONG

# Check memory usage
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human
```

---

## Monitoring

### Key Metrics Dashboard

**Access:** Railway Dashboard → Production → Metrics

**Critical Metrics:**
- CPU usage (alert if >80%)
- Memory usage (alert if >90%)
- Request rate (requests/second)
- Error rate (% of requests)
- Response time (p50, p95, p99)
- Database connections (% of pool)

### Setting Up Alerts

**UptimeRobot:**

1. Go to https://uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: https://api.converge-nps.com/health
   - Interval: 5 minutes
3. Alert contacts: Your email, Slack webhook

**Sentry Alerts:**

1. Sentry Dashboard → Alerts
2. Create alert rule:
   - Condition: Error count >100 in 1 hour
   - Action: Notify Slack channel
   - Environment: production

**Railway Webhooks:**

```bash
railway webhooks add \
  --url https://hooks.slack.com/services/YOUR/WEBHOOK \
  --events deployment.failed,service.crashed
```

### Log Analysis

```bash
# View recent errors
railway logs --environment production | grep ERROR

# Count errors by type
railway logs --environment production | grep ERROR | awk '{print $5}' | sort | uniq -c

# Monitor specific user
railway logs --environment production | grep "userId: abc123"

# Real-time log streaming
railway logs --environment production --follow
```

---

## Troubleshooting

### Deployment Fails

**Symptoms:**
- GitHub Actions shows "Deployment Failed"
- Railway shows build errors

**Diagnosis:**
```bash
# Check build logs
railway logs --environment production --deployment <id>

# Test build locally
cd backend
npm install
npm run build
```

**Solutions:**
- Missing environment variables → Add in Railway Dashboard
- Dependency issues → Update package-lock.json
- TypeScript errors → Fix type errors
- Memory issues → Increase build memory limit

### Slow Performance

**Symptoms:**
- API response times >1s
- Users report slow loading

**Diagnosis:**
```bash
# Check metrics
# Railway Dashboard → Metrics → Response Time

# Check database
railway run --environment production npx prisma db execute --stdin <<SQL
SELECT * FROM pg_stat_activity WHERE state = 'active';
SQL

# Check slow queries
railway run --environment production npx prisma db execute --stdin <<SQL
SELECT query, mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;
SQL
```

**Solutions:**
- High CPU → Scale up (more replicas)
- Slow queries → Add indexes
- Memory issues → Increase memory allocation
- Redis cache misses → Increase cache TTL

### Database Connection Issues

**Symptoms:**
- "Too many connections" errors
- Connection timeouts

**Diagnosis:**
```bash
# Check active connections
railway run --environment production npx prisma db execute --stdin <<SQL
SELECT count(*) FROM pg_stat_activity;
SQL

# Check max connections
railway run --environment production npx prisma db execute --stdin <<SQL
SHOW max_connections;
SQL
```

**Solutions:**
- Too many connections → Enable connection pooling (Supabase port 6543)
- Connection leaks → Review code for unclosed connections
- High traffic → Scale up backend instances

---

## Appendix

### Useful Commands

```bash
# Railway
railway login
railway environment
railway up
railway logs --tail 100
railway restart
railway rollback
railway scale --replicas 3

# Database
npx prisma migrate status
npx prisma migrate deploy
npx prisma studio

# Git
git log --oneline -10
git show HEAD
git revert HEAD

# Docker
docker build -t converge-backend .
docker run -p 3000:3000 converge-backend
docker logs <container-id>

# Health checks
curl https://api.converge-nps.com/health
curl https://converge-nps.com
```

### Contact Information

**On-Call Engineer:** See PagerDuty rotation

**Emergency Contacts:**
- DevOps Lead: devops@converge-nps.com
- Security Lead: security@converge-nps.com
- Project Owner: owner@converge-nps.com

**External Support:**
- Railway Support: https://railway.app/help
- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/support

---

**Document Status:** Ready for Operations
**Last Updated:** 2025-12-02
**Review Frequency:** Monthly
**Next Review:** 2026-01-02
**Maintainer:** DevOps Engineer Agent
