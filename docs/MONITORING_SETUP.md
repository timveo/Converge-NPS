# Converge-NPS Monitoring Setup Guide

**Document Version:** 1.0
**Date:** 2025-12-03
**Author:** DevOps Engineer Agent
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Sentry Error Tracking](#sentry-error-tracking)
3. [Railway Metrics](#railway-metrics)
4. [Uptime Monitoring](#uptime-monitoring)
5. [Database Monitoring](#database-monitoring)
6. [Redis Monitoring](#redis-monitoring)
7. [Alert Configuration](#alert-configuration)
8. [Dashboard Setup](#dashboard-setup)
9. [Performance Monitoring](#performance-monitoring)
10. [Log Aggregation](#log-aggregation)

---

## Overview

This document provides step-by-step instructions for setting up comprehensive monitoring for Converge-NPS across all environments (development, staging, production).

### Monitoring Goals

1. **Proactive Detection**: Identify issues before users report them
2. **Performance Insights**: Track response times, throughput, and resource usage
3. **Error Tracking**: Capture and debug exceptions in real-time
4. **Uptime Assurance**: Ensure 99.5% uptime during event dates
5. **Cost Control**: Monitor resource usage to stay within budget

### Monitoring Stack

| Service | Purpose | Cost | Priority |
|---------|---------|------|----------|
| **Sentry** | Error tracking + performance | $26/month | Critical |
| **Railway** | Infrastructure metrics | Included | Critical |
| **UptimeRobot** | Uptime monitoring | Free | Critical |
| **Supabase** | Database metrics | Included | High |
| **Grafana Cloud** | Custom dashboards (optional) | Free tier | Medium |

---

## Sentry Error Tracking

### 1.1 Account Setup

**Step 1: Create Sentry Account**
```bash
# Visit https://sentry.io/signup/
# Sign up with GitHub account (recommended)
# Create organization: "converge-nps"
```

**Step 2: Create Projects**
```
- Backend Project: "converge-backend"
- Frontend Project: "converge-frontend"
```

**Step 3: Get DSN Keys**
```bash
# Navigate to Settings > Projects > [project-name] > Client Keys (DSN)
# Copy DSN for backend and frontend
```

---

### 1.2 Backend Integration

**Install Sentry SDK**
```bash
cd backend
npm install @sentry/node @sentry/tracing
```

**Configure Sentry (backend/src/config/sentry.ts)**
```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling (optional)
    profilesSampleRate: 0.1,
    integrations: [
      new ProfilingIntegration(),
    ],

    // Scrub sensitive data
    beforeSend(event, hint) {
      // Remove PII from error reports
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Scrub sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      return event;
    },

    // Ignore common errors
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Network request failed',
      'timeout',
    ],
  });
}
```

**Add to Express App (backend/src/index.ts)**
```typescript
import express from 'express';
import * as Sentry from '@sentry/node';
import { initSentry } from './config/sentry';

const app = express();

// Initialize Sentry BEFORE other middleware
initSentry();

// RequestHandler creates a separate execution context using domains
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// ... your routes ...

// ErrorHandler must be AFTER all other middleware
app.use(Sentry.Handlers.errorHandler());

// Optional fallback error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});
```

---

### 1.3 Frontend Integration

**Install Sentry SDK**
```bash
cd frontend
npm install @sentry/react
```

**Configure Sentry (frontend/src/lib/sentry.ts)**
```typescript
import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV || 'development',

    // Performance monitoring
    integrations: [
      new Sentry.BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Sample rates
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Scrub sensitive data
    beforeSend(event, hint) {
      // Remove tokens from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/token=[^&]+/g, 'token=REDACTED');
      }

      return event;
    },

    // Ignore common errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection',
      'Network request failed',
    ],
  });
}
```

**Add to App Entry (frontend/src/main.tsx)**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { initSentry } from './lib/sentry';

// Initialize Sentry
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

---

### 1.4 Alert Configuration

**Navigate to Sentry > Alerts > Create Alert**

**Critical Alerts (Immediate Notification)**

1. **New Error in Production**
   - Condition: When a new issue is created
   - Environment: production
   - Action: Send Slack notification + email
   - Cooldown: None

2. **Error Spike**
   - Condition: Number of events > 10 in 1 minute
   - Environment: production
   - Action: Send Slack notification + page on-call
   - Cooldown: 15 minutes

3. **Regression**
   - Condition: An issue changes state from resolved to unresolved
   - Environment: production
   - Action: Send Slack notification
   - Cooldown: None

**High Alerts (1-Hour Response)**

4. **High Error Rate**
   - Condition: Error rate > 5% in 5 minutes
   - Environment: production
   - Action: Send Slack notification
   - Cooldown: 30 minutes

5. **Slow Transactions**
   - Condition: p95 > 2000ms
   - Environment: production
   - Action: Send Slack notification
   - Cooldown: 1 hour

**Slack Integration**
```bash
# Sentry > Settings > Integrations > Slack
# Connect workspace
# Configure channels:
#   - Critical alerts: #alerts-critical
#   - High alerts: #alerts-high
#   - All alerts: #sentry-notifications
```

---

## Railway Metrics

### 2.1 Built-in Metrics

Railway provides built-in metrics for all services:

**Access Metrics Dashboard**
```
1. Navigate to Railway Dashboard
2. Select project: "converge-nps"
3. Select environment: production
4. Select service: backend / frontend / postgres / redis
5. View Metrics tab
```

**Available Metrics**
- CPU usage (%)
- Memory usage (MB)
- Network I/O (MB/s)
- Request count (req/min)
- Response time (ms)
- Active connections

---

### 2.2 Custom Metrics (Prometheus)

**Install Prometheus Client**
```bash
cd backend
npm install prom-client
```

**Setup Metrics (backend/src/metrics/prometheus.ts)**
```typescript
import prometheus from 'prom-client';

// Create a Registry
export const register = new prometheus.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
prometheus.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeConnections = new prometheus.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

export const cacheHitRate = new prometheus.Gauge({
  name: 'redis_cache_hit_rate',
  help: 'Redis cache hit rate (0-1)',
  registers: [register],
});
```

**Add Metrics Middleware (backend/src/middleware/metrics.ts)**
```typescript
import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../metrics/prometheus';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    httpRequestDuration.labels(labels).observe(duration);
    httpRequestTotal.labels(labels).inc();
  });

  next();
}
```

**Expose Metrics Endpoint**
```typescript
import { register } from './metrics/prometheus';

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Uptime Monitoring

### 3.1 UptimeRobot Setup

**Step 1: Create Account**
```
Visit: https://uptimerobot.com/signUp
Sign up (Free plan supports 50 monitors)
```

**Step 2: Create Monitors**

**Monitor 1: Frontend (Production)**
```
Monitor Type: HTTP(s)
Friendly Name: Converge NPS - Frontend (Production)
URL: https://converge-nps.com
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
```

**Monitor 2: Backend Health Check (Production)**
```
Monitor Type: HTTP(s)
Friendly Name: Converge NPS - Backend Health (Production)
URL: https://api.converge-nps.com/health
Monitoring Interval: 5 minutes
Keyword: "healthy"
Alert if keyword is missing
```

**Monitor 3: Backend API (Production)**
```
Monitor Type: HTTP(s)
Friendly Name: Converge NPS - Backend API (Production)
URL: https://api.converge-nps.com/v1/health
Monitoring Interval: 5 minutes
```

**Monitor 4: Frontend (Staging)**
```
URL: https://staging.converge-nps.com
Monitoring Interval: 10 minutes
```

**Monitor 5: Backend Health (Staging)**
```
URL: https://api.staging.converge-nps.com/health
Monitoring Interval: 10 minutes
```

---

### 3.2 Alert Contacts

**Add Alert Contacts**
```
Email: admin@converge-nps.com
Slack: #alerts-uptime webhook
SMS: (Optional for critical production alerts)
```

**Alert Settings**
```
Alert when: Monitor is down
Send notifications:
  - After 2 retries (10 minutes)
  - Every 30 minutes until up
  - When monitor goes back up
```

---

### 3.3 Status Page (Optional)

**Create Public Status Page**
```
UptimeRobot > My Settings > Status Pages
Create new status page
Add monitors:
  - Frontend (Production)
  - Backend API (Production)
Custom domain: status.converge-nps.com (optional)
```

---

## Database Monitoring

### 4.1 Supabase Metrics

**Access Database Metrics**
```
1. Login to Supabase dashboard
2. Select project: "converge-nps-production"
3. Navigate to Database > Metrics
```

**Key Metrics to Monitor**
- Active connections (alert if >80% of limit)
- Query performance (p95 latency)
- Database size (track growth)
- Cache hit ratio (should be >90%)
- Connection pool utilization

---

### 4.2 Slow Query Logging

**Enable pg_stat_statements**
```sql
-- Enable extension (already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries (>1 second)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Create Alert for Slow Queries**
```sql
-- Run daily via cron job
CREATE OR REPLACE FUNCTION check_slow_queries()
RETURNS void AS $$
DECLARE
  slow_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO slow_count
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000;

  IF slow_count > 5 THEN
    -- Send alert (via webhook or notification)
    PERFORM pg_notify('slow_queries_alert', slow_count::TEXT);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

### 4.3 Connection Pool Monitoring

**Monitor Pool Utilization**
```typescript
// backend/src/lib/db.ts
import { PrismaClient } from '@prisma/client';
import { dbPoolUtilization } from '../metrics/prometheus';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Track connection pool
setInterval(async () => {
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as active_connections
    FROM pg_stat_activity
    WHERE datname = current_database()
  `;

  const activeConnections = result[0].active_connections;
  const maxConnections = 100; // Adjust based on your plan

  const utilization = activeConnections / maxConnections;
  dbPoolUtilization.set(utilization);

  if (utilization > 0.8) {
    logger.warn('Database connection pool utilization high', { utilization });
  }
}, 60000); // Check every minute
```

---

## Redis Monitoring

### 5.1 Railway Redis Metrics

**Access Redis Metrics**
```
1. Railway Dashboard > converge-nps > production
2. Select Redis service
3. View Metrics tab
```

**Key Metrics**
- Memory usage (MB)
- Hit rate (%)
- Operations per second
- Connected clients

---

### 5.2 Custom Redis Metrics

**Monitor Redis Health**
```typescript
// backend/src/lib/redis.ts
import Redis from 'ioredis';
import { cacheHitRate } from '../metrics/prometheus';

let hits = 0;
let misses = 0;

export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await redis.get(key);

  if (cached) {
    hits++;
    return JSON.parse(cached);
  }

  misses++;
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}

// Update cache hit rate metric every minute
setInterval(() => {
  const total = hits + misses;
  if (total > 0) {
    cacheHitRate.set(hits / total);
  }
  hits = 0;
  misses = 0;
}, 60000);
```

---

## Alert Configuration

### 6.1 Alert Thresholds

**Critical Alerts (Immediate Response)**
```yaml
- Service Down:
    Condition: Uptime check fails for 10 minutes
    Action: Slack #alerts-critical + email + SMS

- Database Connection Pool Exhausted:
    Condition: Pool utilization > 95%
    Action: Slack #alerts-critical + email

- Error Rate Spike:
    Condition: Error rate > 10% for 5 minutes
    Action: Slack #alerts-critical + page on-call
```

**High Alerts (1-Hour Response)**
```yaml
- High Response Time:
    Condition: p95 > 2000ms for 10 minutes
    Action: Slack #alerts-high

- High Memory Usage:
    Condition: Memory > 90% for 5 minutes
    Action: Slack #alerts-high

- Redis Down:
    Condition: Redis health check fails
    Action: Slack #alerts-high + email
```

**Medium Alerts (4-Hour Response)**
```yaml
- Elevated Response Time:
    Condition: p95 > 1000ms for 15 minutes
    Action: Slack #alerts-medium

- Database Connection Pool High:
    Condition: Pool utilization > 80%
    Action: Slack #alerts-medium

- Cache Hit Rate Low:
    Condition: Hit rate < 50% for 30 minutes
    Action: Slack #alerts-medium
```

---

### 6.2 Slack Integration

**Create Slack Webhooks**
```bash
# Navigate to Slack > Apps > Incoming Webhooks
# Create webhooks for each channel:
#   - #alerts-critical
#   - #alerts-high
#   - #alerts-medium
#   - #sentry-notifications
```

**Add to Railway/Sentry/UptimeRobot**
```
Railway: Settings > Integrations > Slack
Sentry: Settings > Integrations > Slack
UptimeRobot: My Settings > Alert Contacts > Add Slack
```

---

## Dashboard Setup

### 7.1 Grafana Cloud (Optional)

**Setup Grafana Dashboards**
```bash
# 1. Sign up for Grafana Cloud (free tier)
# Visit: https://grafana.com/auth/sign-up

# 2. Create dashboard for Converge-NPS
# Import pre-built dashboards:
#   - Node.js Application Metrics
#   - PostgreSQL Database
#   - Redis Monitoring

# 3. Configure Prometheus data source
# Add Prometheus endpoint from Railway
```

---

### 7.2 Custom Dashboard

**Key Panels to Include**
```
1. System Health
   - API Response Time (p50, p95, p99)
   - Error Rate
   - Request Rate
   - Active Users

2. Infrastructure
   - CPU Usage (backend instances)
   - Memory Usage
   - Database Connections
   - Redis Memory

3. Business Metrics
   - Active Connections
   - Messages Sent
   - QR Scans
   - Session RSVPs

4. External Services
   - Smartsheet Sync Status
   - Email Delivery Rate
   - S3 Upload Success Rate
```

---

## Performance Monitoring

### 8.1 Frontend Performance

**Web Vitals Tracking**
```typescript
// frontend/src/lib/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';

function sendToAnalytics(metric) {
  // Send to Sentry as measurement
  Sentry.setMeasurement(metric.name, metric.value, metric.unit);

  // Optional: Send to custom analytics
  fetch('/api/v1/analytics/web-vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

**Vercel Analytics (if using Vercel)**
```typescript
// frontend/src/main.tsx
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Analytics />
  </>
);
```

---

### 8.2 Backend Performance

**API Transaction Tracking**
```typescript
// backend/src/middleware/tracing.ts
import * as Sentry from '@sentry/node';

export function tracingMiddleware(req, res, next) {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: `${req.method} ${req.route?.path || req.path}`,
  });

  // Set transaction on request for use in route handlers
  req.transaction = transaction;

  res.on('finish', () => {
    transaction.setHttpStatus(res.statusCode);
    transaction.finish();
  });

  next();
}
```

---

## Log Aggregation

### 9.1 Structured Logging

**Winston Logger Setup**
```typescript
// backend/src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'converge-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json(),
    }),
  ],
});
```

---

### 9.2 Log Retention

**Railway Logs**
```
Retention: 7 days (automatic)
Access: Railway Dashboard > Logs tab
Search: Full-text search available
Download: Export logs as JSON
```

**Long-Term Storage (Optional)**
```bash
# Export logs to S3 for long-term storage
railway logs --tail 1000 | gzip | aws s3 cp - s3://converge-logs/$(date +%Y%m%d).log.gz
```

---

## Monitoring Checklist

### Pre-Launch

- [ ] Sentry configured for backend and frontend
- [ ] Sentry alerts created and tested
- [ ] UptimeRobot monitors created
- [ ] Slack integrations configured
- [ ] Railway metrics reviewed
- [ ] Database slow query logging enabled
- [ ] Redis monitoring configured
- [ ] Health check endpoints tested
- [ ] Status page created (optional)
- [ ] On-call rotation scheduled

### Post-Launch

- [ ] Monitor error rates daily
- [ ] Review slow queries weekly
- [ ] Check uptime reports weekly
- [ ] Verify alert notifications working
- [ ] Review performance metrics weekly
- [ ] Adjust alert thresholds as needed
- [ ] Archive old logs monthly

---

## Summary

This monitoring setup provides comprehensive visibility into Converge-NPS:

- **Error Tracking**: Sentry for frontend and backend errors
- **Infrastructure**: Railway metrics for CPU, memory, network
- **Uptime**: UptimeRobot for 24/7 availability monitoring
- **Database**: Supabase metrics + slow query logging
- **Redis**: Connection and performance tracking
- **Alerts**: Multi-tier alerting via Slack, email, SMS
- **Performance**: Web Vitals + API transaction tracing
- **Logs**: Structured logging with Winston

**Estimated Monthly Cost**: $26 (Sentry Developer Plan)

**Next Steps**:
1. Create Sentry account and configure DSNs
2. Set up UptimeRobot monitors
3. Configure Slack webhooks
4. Test alert notifications
5. Review metrics dashboards weekly
6. Adjust thresholds based on baseline data

---

**Document Status**: Ready for Implementation
**Owner**: DevOps Engineer
**Review Date**: Weekly during event preparation
