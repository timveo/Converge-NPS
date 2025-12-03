# Converge-NPS Setup and Deployment Guide

**Last Updated**: December 3, 2025
**Target Environment**: Railway (Production) + Local Development

---

## 📋 Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v15 or higher (local dev)
- **Redis**: v7 or higher (local dev)
- **Docker**: v20.0.0 or higher (for local DB)

### Required Accounts
- GitHub account (for code repository)
- Railway account (for deployment)
- Sendgrid account (for emails)
- Smartsheet account (for data sync)

---

## 🚀 Quick Start (Local Development)

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone https://github.com/timveo/Converge-NPS.git
cd Converge-NPS

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Local Databases

```bash
# Start PostgreSQL and Redis with Docker
cd backend
docker-compose up -d

# Verify databases are running
docker ps
```

### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/converge_nps

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=30d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# API URL
API_URL=http://localhost:3000

# Email (Sendgrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@converge-nps.com

# Smartsheet
SMARTSHEET_API_KEY=your-smartsheet-api-key

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

### 4. Initialize Database

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### 5. Start Development Servers

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Access Application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/health

---

## 🏗️ Railway Deployment

### Phase 1: Create Railway Project

1. **Sign up for Railway**: https://railway.app
2. **Create New Project**: Click "New Project"
3. **Choose "Empty Project"**
4. **Name it**: "converge-nps-production"

### Phase 2: Set Up PostgreSQL

1. **Add PostgreSQL Service**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway automatically provisions and configures
   - Note the `DATABASE_URL` from Variables tab

2. **Configure Connection**:
   - Railway provides `DATABASE_URL` automatically
   - No manual configuration needed

### Phase 3: Set Up Redis

1. **Add Redis Service**:
   - Click "New" → "Database" → "Redis"
   - Railway automatically provisions
   - Note the `REDIS_URL` from Variables tab

2. **Configure Connection**:
   - Railway provides `REDIS_URL` automatically
   - No manual configuration needed

### Phase 4: Deploy Backend

1. **Create Backend Service**:
   - Click "New" → "GitHub Repo"
   - Connect your GitHub account
   - Select `timveo/Converge-NPS` repository
   - Select `main` branch

2. **Configure Build Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run prisma:generate && npm run build`
   - **Start Command**: `npm start`
   - **Port**: 3000

3. **Set Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=${{RAILWAY_PORT}}

   # Railway auto-injects these:
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}

   # Add these manually:
   JWT_SECRET=<generate-strong-secret>
   JWT_REFRESH_SECRET=<generate-strong-secret>
   FRONTEND_URL=https://converge-nps.up.railway.app
   API_URL=https://converge-nps-api.up.railway.app
   SENDGRID_API_KEY=<your-key>
   FROM_EMAIL=noreply@converge-nps.com
   SMARTSHEET_API_KEY=<your-key>
   ```

4. **Generate Secrets**:
   ```bash
   # Use this to generate secure secrets:
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. **Deploy**:
   - Click "Deploy"
   - Railway automatically builds and deploys
   - Get your backend URL from Deployments tab

6. **Run Database Migrations**:
   - In Railway dashboard, go to Backend service
   - Click "Settings" → "Deploy Triggers"
   - Add one-time command: `npm run prisma:migrate:deploy`

### Phase 5: Deploy Frontend

1. **Create Frontend Service**:
   - Click "New" → "GitHub Repo"
   - Select `timveo/Converge-NPS` repository
   - Select `main` branch

2. **Configure Build Settings**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview` (or use Nginx)
   - **Port**: 4173

3. **Set Environment Variables**:
   ```env
   VITE_API_BASE_URL=https://converge-nps-api.up.railway.app/api/v1
   VITE_WS_URL=https://converge-nps-api.up.railway.app
   ```

4. **Deploy**:
   - Click "Deploy"
   - Railway builds and deploys
   - Get your frontend URL

### Phase 6: Configure Custom Domain (Optional)

1. **Add Domain to Backend**:
   - Go to Backend service → Settings → Domain
   - Add custom domain: `api.converge-nps.com`
   - Update DNS records as instructed

2. **Add Domain to Frontend**:
   - Go to Frontend service → Settings → Domain
   - Add custom domain: `converge-nps.com`
   - Update DNS records

3. **Update Environment Variables**:
   - Update `FRONTEND_URL` and `API_URL` in Backend
   - Update `VITE_API_BASE_URL` in Frontend
   - Redeploy both services

---

## 🗄️ Database Setup

### Initial Migration

After deploying to Railway, run the migration:

```bash
# From Railway CLI or dashboard
railway run npm run prisma:migrate:deploy
```

### Seed Data (Optional)

Create seed data for testing:

```bash
# Local development
npm run prisma:seed

# Production (via Railway)
railway run npm run prisma:seed
```

### Prisma Studio (Database Browser)

```bash
# View/edit database locally
npm run prisma:studio

# Opens at: http://localhost:5555
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in UI mode
npm run test:ui
```

### End-to-End Tests

```bash
cd frontend

# Run e2e tests (requires backend running)
npm run test:e2e
```

---

## 📊 Monitoring Setup

### Sentry (Error Tracking)

1. **Create Sentry Project**: https://sentry.io
2. **Get DSN**: From project settings
3. **Add to Environment**:
   ```env
   SENTRY_DSN=your-sentry-dsn
   ```

### UptimeRobot (Uptime Monitoring)

1. **Create Account**: https://uptimerobot.com
2. **Add Monitor**:
   - Type: HTTPS
   - URL: https://your-api-url/health
   - Interval: 5 minutes

### Railway Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request count

Access via: Railway Dashboard → Service → Metrics

---

## 🔒 Security Checklist

### Pre-Launch Security

- [ ] All secrets are strong (64+ characters)
- [ ] JWT secrets are unique (not default values)
- [ ] Database has RLS policies enabled
- [ ] CORS is configured correctly
- [ ] Rate limiting is active
- [ ] HTTPS is enforced
- [ ] Environment variables are secured
- [ ] No secrets in git history
- [ ] Dependencies are up to date
- [ ] Security headers are set (Helmet)

### Post-Launch Monitoring

- [ ] Error tracking is active (Sentry)
- [ ] Uptime monitoring is active
- [ ] Log monitoring is configured
- [ ] Backup strategy is in place
- [ ] Incident response plan exists

---

## 🐛 Troubleshooting

### Backend Won't Start

**Issue**: "Cannot find module '@prisma/client'"
**Solution**:
```bash
npm run prisma:generate
```

**Issue**: "Database connection failed"
**Solution**: Check `DATABASE_URL` is correct and database is running

### Frontend Build Fails

**Issue**: "Module not found"
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue**: "Environment variable not defined"
**Solution**: Ensure `.env` file exists and variables are prefixed with `VITE_`

### WebSocket Connection Fails

**Issue**: "WebSocket connection failed"
**Solution**:
- Check `VITE_WS_URL` matches backend URL
- Ensure backend supports WebSocket (Socket.IO)
- Check CORS configuration allows WebSocket

### Database Migration Errors

**Issue**: "Migration failed"
**Solution**:
```bash
# Reset database (development only!)
npm run prisma:migrate reset

# Or create new migration
npm run prisma:migrate dev --name fix_issue
```

---

## 📦 Deployment Checklist

### Before Deploying

- [ ] All tests pass locally
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] CORS configured for production URLs
- [ ] Secrets generated (JWT, etc.)
- [ ] Sendgrid API key obtained
- [ ] Smartsheet API key obtained

### During Deployment

- [ ] PostgreSQL service created
- [ ] Redis service created
- [ ] Backend deployed and running
- [ ] Frontend deployed and running
- [ ] Database migrations ran
- [ ] Environment variables set
- [ ] Custom domains configured (if applicable)

### After Deployment

- [ ] Health check returns 200
- [ ] Can register new user
- [ ] Can login successfully
- [ ] WebSocket connects
- [ ] API endpoints respond
- [ ] Frontend loads correctly
- [ ] Monitoring configured
- [ ] Team notified

---

## 📈 Performance Optimization

### Backend Optimization

1. **Enable Caching**:
   - Redis for sessions
   - API response caching
   - Database query caching

2. **Database Optimization**:
   - Ensure indexes are created
   - Use connection pooling
   - Optimize N+1 queries

3. **WebSocket Optimization**:
   - Limit connected users per room
   - Implement message batching
   - Use Redis adapter for scaling

### Frontend Optimization

1. **Build Optimization**:
   ```bash
   # Analyze bundle size
   npm run build -- --analyze
   ```

2. **Code Splitting**:
   - Lazy load routes
   - Dynamic imports for large components
   - Tree shaking enabled

3. **PWA Optimization**:
   - Precache critical assets
   - Implement efficient caching strategies
   - Minimize service worker size

---

## 🔄 Backup and Recovery

### Database Backup

**Automated Backups** (Railway):
- Railway automatically backs up PostgreSQL
- Access via: Dashboard → Database → Backups

**Manual Backup**:
```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Import database
psql $DATABASE_URL < backup.sql
```

### Application Backup

**Code**:
- Stored in GitHub
- Tagged releases for each deployment

**Assets**:
- User uploads stored in Railway volumes
- Configure regular backups

---

## 📞 Support

### Development Issues
- Check logs in Railway dashboard
- Review error tracking in Sentry
- Consult documentation in `/docs`

### Production Issues
- Check uptime monitoring
- Review application logs
- Check database health
- Verify environment variables

### Emergency Contacts
- DevOps Lead: [Contact Info]
- Backend Lead: [Contact Info]
- Frontend Lead: [Contact Info]

---

**Next Steps**: After deployment, proceed to Week 7-8 Admin Dashboard development.
