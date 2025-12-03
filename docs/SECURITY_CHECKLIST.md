# Converge-NPS Security Checklist

**Document Version:** 1.0
**Date:** 2025-12-03
**Author:** DevOps Engineer Agent
**Status:** Ready for Implementation

---

## Table of Contents

1. [Pre-Launch Security Checklist](#pre-launch-security-checklist)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Security](#data-security)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Third-Party Security](#third-party-security)
7. [Monitoring & Incident Response](#monitoring--incident-response)
8. [Compliance & Privacy](#compliance--privacy)
9. [Post-Launch Security](#post-launch-security)
10. [Security Audit Schedule](#security-audit-schedule)

---

## Pre-Launch Security Checklist

### Critical Items (Must Complete Before Launch)

- [ ] **SSL/TLS Configuration**
  - [ ] HTTPS enforced on all endpoints
  - [ ] TLS 1.3 enabled
  - [ ] HTTP auto-redirects to HTTPS
  - [ ] Valid SSL certificate installed
  - [ ] Certificate expiration > 30 days
  - [ ] HSTS header configured

- [ ] **Environment Variables**
  - [ ] All secrets in environment variables (not code)
  - [ ] Production secrets different from staging/dev
  - [ ] JWT secrets are strong (256-bit random)
  - [ ] Database passwords are strong
  - [ ] API keys rotated and documented
  - [ ] `.env` files in `.gitignore`
  - [ ] No secrets committed to git history

- [ ] **Authentication**
  - [ ] Password requirements enforced (8+ chars, uppercase, lowercase, number)
  - [ ] Passwords hashed with bcrypt (cost factor 12)
  - [ ] JWT expiration set (1 hour access, 30 days refresh)
  - [ ] Refresh token rotation enabled
  - [ ] Session timeout configured (30 minutes)
  - [ ] Email verification required
  - [ ] Password reset flow tested

- [ ] **Authorization**
  - [ ] RBAC implemented (5 roles)
  - [ ] RLS policies enabled on all tables
  - [ ] Privacy controls enforced (QR scanning, messaging)
  - [ ] Admin endpoints protected
  - [ ] Permission checks on all routes

- [ ] **API Security**
  - [ ] Rate limiting configured (login, registration, API)
  - [ ] Input validation on all endpoints (Zod schemas)
  - [ ] SQL injection prevention (parameterized queries)
  - [ ] XSS prevention (output encoding)
  - [ ] CSRF protection enabled
  - [ ] CORS configured (whitelist origins)

- [ ] **Security Headers**
  - [ ] Content-Security-Policy (CSP)
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Referrer-Policy configured
  - [ ] Permissions-Policy configured

- [ ] **Data Security**
  - [ ] Database encryption at rest enabled
  - [ ] Backups encrypted
  - [ ] PII not logged or exposed in URLs
  - [ ] Sensitive fields encrypted (if applicable)
  - [ ] File uploads validated and scanned

- [ ] **Audit Logging**
  - [ ] Security events logged (login, logout, password reset)
  - [ ] Admin actions logged (user management, role changes)
  - [ ] Audit logs retention configured (90 days)
  - [ ] Log immutability enforced

- [ ] **Third-Party Security**
  - [ ] Smartsheet OAuth configured
  - [ ] Email SPF/DKIM/DMARC configured
  - [ ] Dependencies scanned for vulnerabilities
  - [ ] No known high/critical vulnerabilities

---

## Authentication & Authorization

### Password Security

- [ ] **Password Requirements**
  - [ ] Minimum 8 characters
  - [ ] At least 1 uppercase letter
  - [ ] At least 1 lowercase letter
  - [ ] At least 1 number
  - [ ] Client-side validation matches server-side

- [ ] **Password Storage**
  - [ ] Bcrypt with cost factor 12
  - [ ] Passwords never logged
  - [ ] Passwords never sent in plain text (emails, responses)
  - [ ] No password hints stored

- [ ] **Password Reset**
  - [ ] Reset token: 256-bit random
  - [ ] Token expires in 1 hour
  - [ ] Token single-use
  - [ ] Rate limited (3 requests/hour)
  - [ ] Email doesn't reveal if account exists

### JWT Security

- [ ] **Token Configuration**
  - [ ] Access token: 1 hour expiration
  - [ ] Refresh token: 30 days expiration
  - [ ] Algorithm: HS256 (or RS256 for scale)
  - [ ] Issuer and audience claims included
  - [ ] No sensitive data in JWT payload

- [ ] **Token Storage**
  - [ ] Access token: Memory only (not localStorage)
  - [ ] Refresh token: httpOnly secure cookie
  - [ ] Tokens cleared on logout
  - [ ] Tokens not in URLs

- [ ] **Token Rotation**
  - [ ] Refresh token rotates on use
  - [ ] Old refresh tokens invalidated
  - [ ] All sessions terminated on password change

### Session Management

- [ ] **Session Timeout**
  - [ ] Inactivity timeout: 30 minutes
  - [ ] Warning shown 2 minutes before timeout
  - [ ] Absolute timeout: 12 hours
  - [ ] Session extended on user activity

- [ ] **Session Tracking**
  - [ ] Sessions stored in database
  - [ ] Session invalidation on logout
  - [ ] Max 5 concurrent sessions per user
  - [ ] User can view active sessions
  - [ ] Admin can terminate sessions

### Role-Based Access Control

- [ ] **Roles Defined**
  - [ ] student, faculty, industry, staff, admin
  - [ ] Permissions mapped for each role
  - [ ] Role assignment by admin only
  - [ ] Role changes logged

- [ ] **Permission Checks**
  - [ ] Middleware validates roles
  - [ ] Database RLS enforces access
  - [ ] Frontend hides unauthorized features
  - [ ] API returns 403 for unauthorized access

---

## Data Security

### Encryption

- [ ] **In Transit**
  - [ ] TLS 1.3 for all connections
  - [ ] HSTS header enforced
  - [ ] WebSocket uses WSS
  - [ ] Certificate valid and trusted

- [ ] **At Rest**
  - [ ] Database encryption enabled (provider level)
  - [ ] Backups encrypted
  - [ ] S3 storage encrypted (SSE-S3 or SSE-KMS)
  - [ ] Sensitive fields encrypted (optional pgcrypto)

### PII Protection

- [ ] **Data Minimization**
  - [ ] Only collect required data
  - [ ] Optional fields truly optional
  - [ ] Unused data deleted

- [ ] **PII Handling**
  - [ ] Email, phone, name not in logs
  - [ ] PII not in URLs or query params
  - [ ] PII redacted in non-production
  - [ ] Contact info hidden when hideContactInfo = true

- [ ] **Data Access Controls**
  - [ ] Only admins can export PII
  - [ ] Exports logged
  - [ ] Exports encrypted

### Privacy Controls

- [ ] **Privacy Settings Enforced**
  - [ ] Profile visibility (public/private)
  - [ ] QR scanning allowed/disallowed
  - [ ] Messaging allowed/disallowed
  - [ ] Contact info hidden when requested

- [ ] **Database Triggers**
  - [ ] QR scan checks privacy setting
  - [ ] Messaging checks privacy setting
  - [ ] Privacy violations blocked at DB level

---

## API Security

### Input Validation

- [ ] **Validation Strategy**
  - [ ] Client-side validation (Zod schemas)
  - [ ] Server-side validation (same schemas)
  - [ ] Database CHECK constraints

- [ ] **Validation Rules**
  - [ ] UUIDs validated
  - [ ] Emails validated (RFC 5322)
  - [ ] URLs validated (HTTPS only)
  - [ ] Text length limits enforced
  - [ ] Array size limits enforced
  - [ ] ENUM whitelisting used

- [ ] **XSS Prevention**
  - [ ] Output encoding (React auto-escapes)
  - [ ] DOMPurify for user HTML
  - [ ] No dangerouslySetInnerHTML (or sanitized)
  - [ ] CSP header configured

### SQL Injection Prevention

- [ ] **Parameterized Queries**
  - [ ] No string concatenation in queries
  - [ ] ORM or query builder used (Prisma)
  - [ ] Stored procedures for complex queries

- [ ] **Additional Protection**
  - [ ] UUID validation before queries
  - [ ] User input never directly in queries
  - [ ] Database user has least privilege

### Rate Limiting

- [ ] **Global Rate Limits**
  - [ ] 1000 requests/hour per IP
  - [ ] 1000 requests/hour per user

- [ ] **Endpoint-Specific Limits**
  - [ ] Login: 5 attempts/15 min
  - [ ] Registration: 3 attempts/hour
  - [ ] Password reset: 3 requests/hour
  - [ ] Connections: 50/day per user
  - [ ] Messages: 40/day per user

- [ ] **Rate Limit Headers**
  - [ ] X-RateLimit-Limit
  - [ ] X-RateLimit-Remaining
  - [ ] X-RateLimit-Reset
  - [ ] 429 status code on limit

### CSRF Protection

- [ ] **CSRF Token**
  - [ ] Generated on login
  - [ ] Required in X-CSRF-Token header
  - [ ] Validated on state-changing requests
  - [ ] Invalidated on logout

- [ ] **SameSite Cookies**
  - [ ] SameSite=Strict on cookies
  - [ ] Prevents CSRF attacks

### CORS Configuration

- [ ] **Allowed Origins**
  - [ ] Whitelist specific origins (not *)
  - [ ] Development: localhost:5173
  - [ ] Production: converge-nps.com

- [ ] **Allowed Methods**
  - [ ] GET, POST, PUT, PATCH, DELETE
  - [ ] No unnecessary methods

- [ ] **Credentials**
  - [ ] credentials: true (for cookies)
  - [ ] Preflight caching configured

---

## Infrastructure Security

### Railway Security

- [ ] **Access Control**
  - [ ] Railway account secured with 2FA
  - [ ] Limited team access (need-to-know)
  - [ ] Service tokens rotated regularly

- [ ] **Service Configuration**
  - [ ] Non-root user in Docker
  - [ ] Health checks configured
  - [ ] Restart policy: on-failure
  - [ ] Resource limits set

- [ ] **Network Security**
  - [ ] Private networking enabled
  - [ ] Services not publicly exposed (except API)
  - [ ] Database accessible only from backend

### Database Security

- [ ] **Supabase Configuration**
  - [ ] Connection pooling enabled
  - [ ] SSL required for connections
  - [ ] RLS enabled on all tables
  - [ ] Strong database password

- [ ] **Access Control**
  - [ ] Database user least privilege
  - [ ] Admin access restricted
  - [ ] Connection from specific IPs only (if possible)

- [ ] **Backup Security**
  - [ ] Automated backups enabled
  - [ ] Backups encrypted
  - [ ] Backup retention configured
  - [ ] Restore tested

### Container Security

- [ ] **Docker Images**
  - [ ] Multi-stage builds
  - [ ] Alpine base images (minimal attack surface)
  - [ ] No secrets in Dockerfile
  - [ ] Images scanned for vulnerabilities

- [ ] **Container Runtime**
  - [ ] Non-root user
  - [ ] Read-only root filesystem (where possible)
  - [ ] No privileged mode
  - [ ] Resource limits set

---

## Third-Party Security

### Smartsheet Integration

- [ ] **OAuth Configuration**
  - [ ] OAuth 2.0 (not API keys)
  - [ ] Access token in environment variable
  - [ ] Token rotation every 90 days

- [ ] **API Permissions**
  - [ ] Read-only for import sheets
  - [ ] Write-only for export sheets
  - [ ] Least privilege access

- [ ] **Error Handling**
  - [ ] Rate limit errors handled
  - [ ] Authentication errors logged
  - [ ] Data validation on import

### Email Provider (SendGrid/SES)

- [ ] **API Key Security**
  - [ ] API key in environment variable
  - [ ] Key rotated every 90 days
  - [ ] Least privilege (send only)

- [ ] **Email Security**
  - [ ] SPF record configured
  - [ ] DKIM signature enabled
  - [ ] DMARC policy set
  - [ ] Email content sanitized

- [ ] **Rate Limiting**
  - [ ] Max 5 emails/user/hour
  - [ ] Prevents email bombing

### Dependency Management

- [ ] **Vulnerability Scanning**
  - [ ] npm audit run regularly
  - [ ] Snyk or Dependabot enabled
  - [ ] GitHub Security Alerts enabled

- [ ] **Update Policy**
  - [ ] Critical vulnerabilities: 24 hours
  - [ ] High vulnerabilities: 1 week
  - [ ] Regular updates scheduled

- [ ] **Lock Files**
  - [ ] package-lock.json committed
  - [ ] Exact versions pinned in production
  - [ ] CI checks for vulnerabilities

---

## Monitoring & Incident Response

### Error Tracking

- [ ] **Sentry Configuration**
  - [ ] Frontend and backend configured
  - [ ] PII scrubbed from errors
  - [ ] Sensitive headers removed
  - [ ] Error alerts configured

### Uptime Monitoring

- [ ] **UptimeRobot**
  - [ ] Frontend monitored
  - [ ] Backend health check monitored
  - [ ] API endpoints monitored
  - [ ] Alerts configured (Slack, email)

### Audit Logging

- [ ] **Security Events Logged**
  - [ ] Login/logout
  - [ ] Password changes
  - [ ] Failed login attempts
  - [ ] Admin actions
  - [ ] Role changes

- [ ] **Log Retention**
  - [ ] 90-day retention
  - [ ] Logs immutable
  - [ ] Only admins can view

### Incident Response

- [ ] **Response Plan**
  - [ ] Incident response plan documented
  - [ ] On-call rotation defined
  - [ ] Escalation procedures defined
  - [ ] Communication templates prepared

- [ ] **Alerting**
  - [ ] Critical alerts: Slack + email
  - [ ] High alerts: Slack
  - [ ] Medium alerts: Email
  - [ ] Alert thresholds configured

---

## Compliance & Privacy

### GDPR Compliance (if applicable)

- [ ] **User Consent**
  - [ ] Privacy policy displayed
  - [ ] User consent collected
  - [ ] Users can update privacy settings

- [ ] **Data Rights**
  - [ ] User can request data export (admin feature)
  - [ ] User can request account deletion (post-MVP)
  - [ ] Data retention policy documented

### FISMA/DoD Compliance (for NPS event)

- [ ] **Audit Trail**
  - [ ] Comprehensive audit logging
  - [ ] 90-day log retention
  - [ ] Access to sensitive data logged

- [ ] **Access Controls**
  - [ ] Role-based access control
  - [ ] Least privilege principle
  - [ ] Regular access reviews

---

## Post-Launch Security

### Weekly Security Tasks

- [ ] Review Sentry errors for security issues
- [ ] Check failed login attempts
- [ ] Review audit logs for suspicious activity
- [ ] Verify SSL certificate validity
- [ ] Check dependency vulnerabilities

### Monthly Security Tasks

- [ ] Rotate secrets (if applicable)
- [ ] Review user access and permissions
- [ ] Audit admin actions
- [ ] Backup verification
- [ ] Security patch review and application

### Quarterly Security Tasks

- [ ] Penetration testing
- [ ] Security audit
- [ ] Disaster recovery drill
- [ ] Update incident response plan
- [ ] Security training for team

---

## Security Audit Schedule

### Pre-Launch (2 Weeks Before)

- [ ] Complete security checklist
- [ ] Run automated security scan (OWASP ZAP)
- [ ] Manual security review
- [ ] Penetration test (if budget allows)
- [ ] Fix all high/critical issues

### Launch Day

- [ ] Verify all security measures active
- [ ] Monitor error rates
- [ ] Check alert notifications working
- [ ] Review first-day logs

### Weekly (First Month)

- [ ] Review security metrics
- [ ] Check for failed login patterns
- [ ] Monitor unusual activity
- [ ] Verify backups working

### Monthly (Ongoing)

- [ ] Security checklist review
- [ ] Dependency updates
- [ ] Access audit
- [ ] Backup restoration test

### Quarterly (Ongoing)

- [ ] Full security audit
- [ ] Penetration test
- [ ] Update security documentation
- [ ] Team security training

---

## Security Tools

### Recommended Tools

| Tool | Purpose | Cost | Priority |
|------|---------|------|----------|
| **Sentry** | Error tracking | $26/month | Critical |
| **OWASP ZAP** | Security scanning | Free | High |
| **npm audit** | Dependency scanning | Free | Critical |
| **Snyk** | Continuous vulnerability monitoring | Free tier | High |
| **SSL Labs** | SSL/TLS testing | Free | Medium |
| **Security Headers** | Header testing | Free | Medium |

### Running Security Scans

**Dependency Audit**
```bash
cd backend && npm audit --audit-level=high
cd frontend && npm audit --audit-level=high
```

**OWASP ZAP Scan**
```bash
# Download OWASP ZAP: https://www.zaproxy.org/download/
# Run automated scan
zap-baseline.py -t https://api.staging.converge-nps.com
```

**SSL Test**
```bash
# Visit: https://www.ssllabs.com/ssltest/
# Enter: https://api.converge-nps.com
# Verify: Grade A or higher
```

**Security Headers Test**
```bash
# Visit: https://securityheaders.com/
# Enter: https://converge-nps.com
# Verify: Grade A
```

---

## Emergency Contacts

### Security Incident

**Critical Incident (Data Breach, Service Down)**
- On-Call Engineer: [contact info]
- Security Lead: [contact info]
- Project Owner: [contact info]

**Escalation**
- Severity P0: Immediate notification (phone + Slack)
- Severity P1: 1-hour response (Slack + email)
- Severity P2: 4-hour response (email)

---

## Summary

This security checklist ensures Converge-NPS follows security best practices:

- **Authentication**: Secure password handling, JWT, session management
- **Authorization**: RBAC, RLS, privacy controls
- **Data Security**: Encryption, PII protection, privacy enforcement
- **API Security**: Input validation, rate limiting, CSRF, CORS
- **Infrastructure**: Secure deployment, container security, network isolation
- **Monitoring**: Error tracking, audit logging, incident response
- **Compliance**: GDPR, FISMA, data retention

**Pre-Launch Critical Path**:
1. Complete all "Critical Items" checklist
2. Run automated security scans
3. Fix all high/critical vulnerabilities
4. Penetration test (if possible)
5. Sign-off from security reviewer

---

**Document Status**: Ready for Implementation
**Owner**: DevOps Engineer + Security Engineer
**Review Frequency**: Weekly pre-launch, monthly post-launch
