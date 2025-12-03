# Converge-NPS Cost Monitoring Guide

**Document Version:** 1.0
**Date:** 2025-12-03
**Author:** DevOps Engineer Agent
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Cost Budget](#cost-budget)
3. [Service-by-Service Costs](#service-by-service-costs)
4. [Railway Cost Monitoring](#railway-cost-monitoring)
5. [Supabase Cost Monitoring](#supabase-cost-monitoring)
6. [Budget Alerts](#budget-alerts)
7. [Cost Optimization Strategies](#cost-optimization-strategies)
8. [Scaling Cost Implications](#scaling-cost-implications)
9. [Monthly Cost Reporting](#monthly-cost-reporting)

---

## Overview

This document provides guidance on monitoring and controlling costs for Converge-NPS infrastructure. The target budget is **$200-500/month**, with costs varying based on traffic and event dates.

### Cost Management Goals

1. **Stay Within Budget**: Keep monthly costs between $200-500
2. **Predictable Costs**: Avoid surprise charges
3. **Cost Visibility**: Track spending by service
4. **Optimize Resources**: Right-size infrastructure
5. **Alert on Overages**: Notify when approaching budget limits

---

## Cost Budget

### Target Monthly Budget

```
Development: $50/month (minimal resources)
Staging: $100/month (moderate resources)
Production: $200-370/month (full resources)
Event Period (3 days): +$100/month (scaled up)
```

### Budget Breakdown by Environment

| Environment | Backend | Database | Redis | Frontend | Monitoring | Storage | Total |
|-------------|---------|----------|-------|----------|------------|---------|-------|
| **Development** | $20 | $0 (free) | $5 | $0 (free) | $0 (free) | $5 | **$30** |
| **Staging** | $50 | $25 | $10 | $0 (free) | $0 (free) | $5 | **$90** |
| **Production (MVP)** | $100 | $25 | $10 | $20 | $26 | $5 | **$186** |
| **Production (Event)** | $250 | $25 | $10 | $20 | $26 | $5 | **$336** |

---

## Service-by-Service Costs

### 1. Railway (Backend + Redis)

**Pricing Model**: Pay-per-use
```
$0.000463/GB-hour (memory)
$0.000231/vCPU-hour (compute)
Minimum: ~$5/service/month
```

**Production Backend Estimate**
```
2 instances × 1 vCPU × 2GB RAM × 730 hours/month
= $100/month
```

**Scaling Cost**
```
Each additional instance: +$50/month
5 instances (event period): $250/month
```

**Cost Monitoring Dashboard**
```
Railway Dashboard > Usage
- Current month spend
- Projected month spend
- Usage by service
- Historical trends
```

---

### 2. Supabase (Database)

**Pricing Tiers**
```
Free: $0/month
  - 500MB database
  - 50,000 rows (soft limit)
  - 2GB bandwidth
  - 1GB file storage

Pro: $25/month
  - 8GB database
  - 100GB bandwidth
  - 100GB file storage
  - 7-day backups
  - Daily backups
  - Point-in-time recovery

Team: $125/month
  - 16GB database
  - 250GB bandwidth
  - 200GB file storage
  - 14-day backups
  - Dedicated CPU
```

**Recommended Plan**: Pro ($25/month)

**Cost Monitoring**
```
Supabase Dashboard > Settings > Billing
- Current plan
- Database size
- Bandwidth usage
- File storage usage
```

**Overage Charges** (if exceeding Pro limits)
```
Database storage: $0.125/GB/month
Bandwidth: $0.09/GB
File storage: $0.021/GB/month
```

---

### 3. Vercel (Frontend)

**Pricing Tiers**
```
Hobby: $0/month
  - 100GB bandwidth
  - Unlimited deployments
  - Automatic HTTPS
  - Edge network

Pro: $20/month/member
  - 1TB bandwidth
  - Advanced analytics
  - Team collaboration
  - Priority support
```

**Recommended Plan**: Hobby (free) for MVP, Pro for production

**Cost Monitoring**
```
Vercel Dashboard > Usage
- Bandwidth usage
- Build minutes
- Serverless function invocations
```

**Bandwidth Estimates**
```
Average page size: 500KB
1,000 visitors/day × 5 pages/visitor × 500KB = 2.5GB/day
Monthly: ~75GB (within free tier)

Event period (500 concurrent users):
500 users × 10 pages/day × 3 days × 500KB = 7.5GB
Well within free tier
```

---

### 4. Monitoring (Sentry)

**Pricing Tiers**
```
Developer: $26/month
  - 10,000 errors/month
  - 10,000 transactions/month
  - 30-day retention

Team: $80/month
  - 50,000 errors/month
  - 100,000 transactions/month
  - 90-day retention
```

**Recommended Plan**: Developer ($26/month)

**Cost Control**
```typescript
// Reduce transaction sample rate to stay within limits
Sentry.init({
  tracesSampleRate: 0.1,  // Sample 10% of transactions
});
```

**Monitoring Quota Usage**
```
Sentry Dashboard > Stats
- Errors used / quota
- Transactions used / quota
- Projected overage
```

---

### 5. Storage (AWS S3 or Compatible)

**S3 Pricing**
```
Storage: $0.023/GB/month (first 50TB)
PUT requests: $0.005/1,000 requests
GET requests: $0.0004/1,000 requests
Data transfer: $0.09/GB (out)
```

**Estimate for 1,000 Users**
```
Average avatar: 100KB
1,000 users × 100KB = 100MB
Monthly storage: $0.002

Uploads/month: 1,000
PUT requests: $0.005

Downloads: 10,000 (10 views per avatar)
GET requests: $0.004

Total: ~$5/month
```

---

### 6. Email (SendGrid)

**Pricing Tiers**
```
Free: $0/month
  - 100 emails/day (3,000/month)
  - 1 sender

Essentials: $19.95/month
  - 50,000 emails/month
  - 5 senders
  - Email API
  - 7-day logs

Pro: $89.95/month
  - 100,000 emails/month
  - Unlimited senders
  - 30-day logs
```

**Recommended Plan**: Free for MVP, Essentials for production

**Email Volume Estimate**
```
Registration: 1,000 emails
Password resets: 200 emails/month
Notifications: 500 emails/month

Total: ~1,700 emails/month (within free tier)
```

---

### 7. Domain & DNS

**Domain Registration**
```
.com domain: $12/year = $1/month (Namecheap, Google Domains)
```

**DNS (Cloudflare)**
```
Free: $0/month
  - Unlimited DNS queries
  - Basic DDoS protection
  - CDN (unlimited bandwidth)

Pro: $20/month
  - Advanced DDoS protection
  - Web Application Firewall
  - Image optimization
```

**Recommended Plan**: Free for MVP, Pro for production

---

## Railway Cost Monitoring

### Real-Time Cost Tracking

**Access Usage Dashboard**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View current usage
railway usage

# View detailed metrics
railway metrics --service backend
```

**Railway Dashboard**
```
1. Navigate to: https://railway.app/dashboard
2. Select project: converge-nps
3. Click "Usage" tab
4. View:
   - Current month spend
   - Projected month end total
   - Per-service breakdown
   - Historical usage graphs
```

---

### Set Usage Limits

**Configure Spending Limits**
```
Railway Dashboard > Project Settings > Usage Limits

Set monthly limit: $400
- Alert at: $300 (75%)
- Hard stop at: $400 (100%)

Alert email: admin@converge-nps.com
```

**Service-Level Limits**
```
Backend Service:
  Memory limit: 2GB per instance
  Replicas: Min 2, Max 5

Redis Service:
  Memory limit: 512MB

PostgreSQL (via Supabase):
  Managed externally
```

---

### Cost Optimization Checklist

**Weekly Review**
- [ ] Check Railway usage dashboard
- [ ] Review per-service costs
- [ ] Identify cost spikes
- [ ] Verify instance counts (scale down after events)
- [ ] Check for unused services

**Monthly Actions**
- [ ] Export detailed usage report
- [ ] Compare actual vs. budget
- [ ] Identify optimization opportunities
- [ ] Adjust limits if needed
- [ ] Archive old logs/backups

---

## Supabase Cost Monitoring

### Database Size Monitoring

**Check Database Size**
```sql
-- Connect to Supabase SQL Editor
SELECT
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  pg_size_pretty(pg_total_relation_size('public.profiles')) as profiles_size,
  pg_size_pretty(pg_total_relation_size('public.connections')) as connections_size,
  pg_size_pretty(pg_total_relation_size('public.messages')) as messages_size,
  pg_size_pretty(pg_total_relation_size('public.audit_logs')) as audit_logs_size;
```

**Monitor Growth**
```sql
-- Create daily size tracking table
CREATE TABLE IF NOT EXISTS db_size_history (
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  database_size_mb NUMERIC,
  connections_size_mb NUMERIC,
  messages_size_mb NUMERIC
);

-- Run daily via cron
INSERT INTO db_size_history (database_size_mb, connections_size_mb, messages_size_mb)
SELECT
  pg_database_size(current_database()) / 1024 / 1024,
  pg_total_relation_size('public.connections') / 1024 / 1024,
  pg_total_relation_size('public.messages') / 1024 / 1024;
```

---

### Bandwidth Monitoring

**Supabase Dashboard**
```
Navigate to: Supabase > Settings > Billing
View:
- Database bandwidth (egress)
- Storage bandwidth
- Current month usage vs. quota
```

**Optimize Bandwidth**
```
1. Enable connection pooling (reduces overhead)
2. Use SELECT only needed columns
3. Implement pagination (limit result sizes)
4. Cache frequently accessed data in Redis
```

---

### Backup Costs

**Included in Pro Plan**
```
- Daily automated backups (7-day retention)
- Point-in-time recovery
- No additional cost
```

**Manual Backups (Export to S3)**
```bash
# Weekly backup to S3 (for long-term archival)
pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://converge-backups/weekly/$(date +%Y%m%d).sql.gz

# Cost: ~$1/month (assuming 1GB compressed × 4 weekly backups)
```

---

## Budget Alerts

### Railway Alerts

**Configure in Railway Dashboard**
```
Settings > Notifications

Alert when:
- Monthly spend reaches $300 (75% of $400 limit)
- Monthly spend reaches $350 (87.5% of $400 limit)
- Projected spend exceeds $400

Notification channels:
- Email: admin@converge-nps.com
- Slack: #alerts-billing
```

---

### Supabase Alerts

**Billing Alerts**
```
Supabase Dashboard > Settings > Billing > Notifications

Alert when:
- Approaching database size limit (6GB of 8GB)
- Approaching bandwidth limit (80GB of 100GB)
- Storage approaching limit

Email: admin@converge-nps.com
```

---

### Custom Budget Monitoring

**Weekly Cost Report Script**
```bash
#!/bin/bash
# scripts/cost-report.sh

echo "=== Converge-NPS Weekly Cost Report ==="
echo "Date: $(date)"
echo ""

# Railway costs (fetch via API)
RAILWAY_COST=$(railway usage --json | jq '.estimatedCost')
echo "Railway: \$$RAILWAY_COST"

# Supabase costs
echo "Supabase: \$25.00 (fixed)"

# Sentry costs
echo "Sentry: \$26.00 (fixed)"

# Total
TOTAL=$(echo "$RAILWAY_COST + 25 + 26" | bc)
echo ""
echo "Total Estimated: \$$TOTAL"

# Send to Slack
curl -X POST $SLACK_WEBHOOK -H 'Content-Type: application/json' \
  -d "{\"text\":\"Weekly Cost Report: \$$TOTAL (Railway: \$$RAILWAY_COST, Supabase: \$25, Sentry: \$26)\"}"
```

**Run Weekly via Cron**
```bash
# Add to crontab
0 9 * * MON /path/to/cost-report.sh
```

---

## Cost Optimization Strategies

### 1. Right-Size Instances

**Monitor Resource Usage**
```
Railway Dashboard > Metrics

Check:
- CPU usage (should average 50-70%)
- Memory usage (should be <80%)
- If consistently low, scale down
```

**Optimization Actions**
```
- If CPU <30%: Reduce vCPUs or consolidate instances
- If Memory <50%: Reduce memory allocation
- If Request Rate low: Scale down replicas
```

---

### 2. Auto-Scaling Configuration

**Configure Auto-Scaling**
```toml
# railway.toml
[deploy]
  replicas = 2  # Start with 2 instances

[scaling]
  minReplicas = 2
  maxReplicas = 5  # Cap at 5 to control costs
  targetCPUPercent = 70
```

**Cost Impact**
```
2 instances (base): $100/month
3 instances (light load): $150/month
5 instances (peak event): $250/month

Savings vs. always running 5: $100/month
```

---

### 3. Environment Optimization

**Development Environment**
```
- Use free/minimal tiers
- Share database with staging
- Disable monitoring (use logs only)
- Single backend instance

Savings: ~$100/month vs. production
```

**Staging Environment**
```
- Smaller instance sizes
- Shared Redis instance
- Less frequent backups
- Disable premium features

Savings: ~$80/month vs. production
```

---

### 4. Data Cleanup

**Delete Old Data**
```sql
-- Delete audit logs older than 90 days
DELETE FROM public.audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete expired sessions
DELETE FROM public.user_sessions
WHERE expires_at < NOW();

-- Archive old messages (optional, move to cold storage)
-- DELETE FROM public.messages WHERE created_at < NOW() - INTERVAL '180 days';
```

**Run Monthly**
```bash
# scripts/cleanup-old-data.sh
psql $DATABASE_URL -f cleanup-queries.sql
```

**Savings**: Reduces database size, keeping within Pro tier limits

---

### 5. CDN & Caching

**Cloudflare Free Tier**
```
- Cache static assets
- Reduce origin requests by 80-90%
- Save on bandwidth costs

Savings: ~$20/month on bandwidth
```

**Redis Caching**
```typescript
// Cache frequently accessed data
const cachedSessions = await redis.get('sessions:list');
if (cachedSessions) {
  return JSON.parse(cachedSessions);
}

const sessions = await db.sessions.findMany();
await redis.setex('sessions:list', 3600, JSON.stringify(sessions));

Savings: Reduces database queries by 70%, saves on database compute
```

---

## Scaling Cost Implications

### Event Period Scaling

**Baseline (2 instances)**
```
Monthly cost: $100
Daily cost: $3.33
```

**Scaled Up (5 instances for 3-day event)**
```
3 additional instances × 3 days = 9 instance-days
Cost: 9 × $1.67 = $15 additional

Total event cost: $100 (baseline) + $15 (scaling) = $115
```

**Pre-Event Scaling Timeline**
```
Week -1: Scale to 3 instances (test load)
Day -1: Scale to 5 instances (pre-event)
Event days (3 days): 5 instances
Week +1: Scale down to 2 instances
```

---

### Traffic-Based Scaling

**Cost per 100 Concurrent Users**
```
1 instance supports ~200 concurrent users
100 users = 0.5 instances

Incremental cost: ~$25/instance/month
```

**Scaling Decision Matrix**
```
0-200 users: 2 instances ($100/month)
200-400 users: 3 instances ($150/month)
400-600 users: 4 instances ($200/month)
600-1000 users: 5 instances ($250/month)
```

---

## Monthly Cost Reporting

### Cost Report Template

**Monthly Infrastructure Cost Report**
```markdown
# Converge-NPS Cost Report
**Month:** December 2025
**Environment:** Production

## Summary
- Total Spend: $222
- Budget: $400
- Variance: -$178 (44% under budget)

## Service Breakdown
| Service | Budget | Actual | Variance |
|---------|--------|--------|----------|
| Railway Backend | $100 | $95 | -$5 |
| Supabase Database | $25 | $25 | $0 |
| Railway Redis | $10 | $10 | $0 |
| Vercel Frontend | $20 | $0 | -$20 |
| Sentry | $26 | $26 | $0 |
| S3 Storage | $5 | $3 | -$2 |
| SendGrid | $15 | $0 | -$15 |
| Domain | $1 | $1 | $0 |
| **Total** | **$202** | **$160** | **-$42** |

## Cost Drivers
- Backend: 2 instances running 24/7
- Database: 3.2GB used (40% of Pro tier)
- Bandwidth: 45GB (45% of quota)

## Optimization Opportunities
1. Vercel still on free tier (upgrade if needed)
2. SendGrid still on free tier (sufficient for now)
3. Redis memory usage at 60% (could optimize)

## Recommendations
- Continue current configuration
- Monitor for event period scaling needs
- Consider upgrading Vercel before event

## Next Month Forecast
- Estimated: $220 (including event scaling)
- Risk: Low
- Action: None required
```

---

### Automated Reporting

**Generate Monthly Report**
```bash
#!/bin/bash
# scripts/monthly-cost-report.sh

MONTH=$(date +%B\ %Y)
RAILWAY_COST=$(railway usage --json | jq '.currentMonth')
TOTAL_COST=$(echo "$RAILWAY_COST + 51" | bc)  # Railway + fixed costs

cat > cost-report-$(date +%Y%m).md <<EOF
# Converge-NPS Cost Report
**Month:** $MONTH

## Summary
- Railway: \$$RAILWAY_COST
- Fixed Costs: \$51 (Supabase \$25 + Sentry \$26)
- **Total: \$$TOTAL_COST**

Budget: \$400
Remaining: \$$(echo "400 - $TOTAL_COST" | bc)

---
Generated: $(date)
EOF

# Send to Slack
curl -X POST $SLACK_WEBHOOK -d @cost-report-$(date +%Y%m).md
```

---

## Cost Monitoring Dashboard

### Metrics to Track

**Weekly**
- [ ] Current month spend vs. budget
- [ ] Projected end-of-month total
- [ ] Per-service costs
- [ ] Instance counts (verify correct scaling)
- [ ] Database size growth

**Monthly**
- [ ] Total spend review
- [ ] Service-by-service breakdown
- [ ] Cost trends (compare to previous months)
- [ ] Optimization opportunities
- [ ] Budget adjustments if needed

---

## Summary

**Target Budget**: $200-500/month
**Typical Production Cost**: $220/month
**Event Period Cost**: $320/month (3-day spike)

**Cost Control Measures**:
- Railway spending limits ($400/month)
- Supabase Pro tier (fixed $25)
- Auto-scaling with replica caps
- Free tiers where possible (Vercel, Cloudflare, SendGrid)

**Monitoring**:
- Railway dashboard (weekly review)
- Supabase billing (monthly review)
- Automated weekly cost reports
- Budget alerts at 75% and 87.5%

**Next Steps**:
1. Configure Railway spending limits
2. Set up budget alert emails
3. Create weekly cost report automation
4. Review costs monthly
5. Optimize based on actual usage data

---

**Document Status**: Ready for Implementation
**Owner**: DevOps Engineer
**Review Frequency**: Weekly during event preparation, monthly post-event
