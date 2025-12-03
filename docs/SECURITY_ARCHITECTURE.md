# Converge-NPS Security Architecture

**Document Version:** 1.0
**Date:** 2025-12-02
**Author:** Architect Agent
**Status:** Ready for Review

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Security](#authentication-security)
3. [Authorization & Access Control](#authorization--access-control)
4. [Data Security](#data-security)
5. [API Security](#api-security)
6. [Audit Logging](#audit-logging)
7. [Security Headers](#security-headers)
8. [Third-Party Security](#third-party-security)
9. [Incident Response](#incident-response)
10. [Security Compliance](#security-compliance)
11. [Security Testing Strategy](#security-testing-strategy)

---

## Overview

This document defines the comprehensive security architecture for Converge-NPS, an enterprise event networking platform for the Naval Postgraduate School's Tech Accelerator 2026. Given the sensitive nature of defense-related events and military personnel data, security is implemented with defense-in-depth principles across all layers.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Users and services have minimum required permissions
3. **Privacy by Design**: Privacy controls enforced at database level
4. **Secure by Default**: Security settings default to most restrictive
5. **Fail Secure**: System fails to secure state, not open state
6. **Audit Everything**: Comprehensive logging of security-relevant events

### Threat Model

**Primary Threats:**
- Unauthorized access to military/government personnel data
- Account takeover via credential stuffing or phishing
- Data exfiltration (connections, messages, project details)
- Spam/abuse via messaging or connection features
- DoS attacks during critical event dates
- Man-in-the-middle attacks on sensitive communications
- Insider threats (malicious admin/staff actions)

**Risk Mitigation Priority:**
1. **Critical**: Authentication bypass, data breach, privilege escalation
2. **High**: Account takeover, DoS, data leakage
3. **Medium**: Spam, abuse, privacy violations
4. **Low**: Information disclosure, brute force

---

## Authentication Security

### 1.1 JWT Implementation

**Token Strategy:**
- **Access Token**: Short-lived (1 hour), used for API authentication
- **Refresh Token**: Long-lived (30 days), stored securely, single-use rotation
- **Algorithm**: HS256 (HMAC with SHA-256) for MVP, RS256 (RSA) for production scale

**Access Token Structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["student"],
  "iat": 1640000000,
  "exp": 1640003600,
  "iss": "converge-nps.com",
  "aud": "converge-nps-api"
}
```

**Security Requirements:**
- JWT secret: 256-bit random key, stored in environment variables
- Token includes `iss` (issuer) and `aud` (audience) claims
- Token validated on every API request
- No sensitive data in JWT payload (no PII, passwords, etc.)

**Token Rotation:**
```
1. User logs in → Receive access + refresh token
2. Access token expires → Use refresh token to get new access token
3. Refresh token used → Issue new access + refresh token, invalidate old refresh
4. Logout → Invalidate refresh token in database
```

**Implementation (Pseudocode):**
```typescript
// Token generation
function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      iss: 'converge-nps.com',
      aud: 'converge-nps-api'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
}

function generateRefreshToken(user: User): string {
  const token = jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d', algorithm: 'HS256' }
  );

  // Store refresh token hash in database
  await storeRefreshToken(user.id, hashToken(token));
  return token;
}

// Token validation middleware
async function validateAccessToken(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'converge-nps.com',
      audience: 'converge-nps-api'
    });

    req.user = { id: decoded.sub, email: decoded.email, roles: decoded.roles };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

### 1.2 Token Storage (Client-Side)

**Web (Desktop/Mobile Browser):**
- **Access Token**: Memory only (React state, NOT localStorage/cookies)
- **Refresh Token**: `httpOnly` secure cookie with `SameSite=Strict`
- **Rationale**: Prevents XSS attacks from stealing tokens

**PWA (Installed):**
- **Access Token**: Memory (ServiceWorker cannot access)
- **Refresh Token**: IndexedDB (encrypted with Web Crypto API)
- **Encryption Key**: Derived from user session, not stored persistently

**Cookie Configuration:**
```http
Set-Cookie: refreshToken=<token>;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Path=/api/v1/auth/refresh;
  Max-Age=2592000
```

**Security Measures:**
- No tokens in URL parameters (prevents leakage via referer headers)
- No tokens in localStorage (vulnerable to XSS)
- Access token refresh before expiration (seamless UX)
- Clear tokens on logout and session timeout

---

### 1.3 Session Management

**Session Timeout:**
- **Inactivity Timeout**: 30 minutes (per PRD US-12.1)
- **Warning**: 2 minutes before timeout
- **Extension Option**: User can extend session
- **Absolute Timeout**: 12 hours (force re-authentication)

**Session Tracking:**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  refresh_token_hash TEXT NOT NULL,
  device_info TEXT,
  ip_address INET,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

**Session Invalidation:**
- Logout: Delete session record and invalidate refresh token
- Password change: Invalidate all sessions except current
- Role change: Invalidate all sessions (force re-authentication)
- Suspicious activity: Admin can terminate sessions

**Concurrent Session Limits:**
- Maximum 5 active sessions per user
- Oldest session auto-terminated when limit exceeded
- User can view/terminate active sessions in profile settings

---

### 1.4 Password Security

**Password Requirements (per PRD US-1.1):**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Optional: Special character (recommended but not required)

**Password Hashing:**
- **Algorithm**: bcrypt with cost factor 12
- **Salt**: Unique per password (bcrypt handles automatically)
- **No plaintext storage**: Passwords NEVER stored or logged in plaintext

**Implementation:**
```typescript
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

**Password Reset Security:**
- Reset token: 256-bit random token, single-use
- Expiration: 1 hour from generation
- Token stored as hash in database
- Email sent with reset link: `https://converge-nps.com/reset-password?token=<token>`
- Token invalidated after use or expiration
- Rate limit: 3 reset requests per email per hour

**Password Change Audit:**
- Log all password changes with timestamp, IP, user agent
- Email notification sent to user on password change
- Require current password for password change (not just reset)

---

### 1.5 Email Verification Flow

**Registration Flow:**
1. User registers → Account created in `disabled` state
2. Verification email sent with token
3. User clicks link → Token validated → Account enabled
4. User can log in

**Token Security:**
- Verification token: 256-bit random token, single-use
- Expiration: 24 hours from generation
- Token stored as hash in database
- Email sent with verification link: `https://converge-nps.com/verify-email?token=<token>`

**Rate Limiting:**
- Maximum 3 verification emails per email address per hour
- Prevents abuse and email bombing

**Implementation:**
```typescript
function generateEmailVerificationToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  // Store hash in database
  await storeVerificationToken(userId, hash, Date.now() + 24 * 60 * 60 * 1000);

  return token;
}

async function verifyEmailToken(token: string): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await getVerificationToken(hash);
  if (!record || record.expiresAt < Date.now()) {
    return false;
  }

  // Mark email as verified, delete token
  await markEmailVerified(record.userId);
  await deleteVerificationToken(hash);

  return true;
}
```

---

### 1.6 Password Reset Flow Security

**Reset Request Flow:**
1. User submits email → System checks if email exists (silently)
2. If exists: Generate reset token, send email
3. If not exists: Same response (prevent email enumeration)
4. Response: "If the email exists, a reset link has been sent"

**Reset Token Validation:**
```typescript
async function validateResetToken(token: string): Promise<User | null> {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await getResetToken(hash);
  if (!record || record.expiresAt < Date.now()) {
    return null;
  }

  return await getUserById(record.userId);
}

async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const user = await validateResetToken(token);
  if (!user) {
    return false;
  }

  // Validate password strength
  if (!isPasswordStrong(newPassword)) {
    throw new Error('Password does not meet requirements');
  }

  // Hash and update password
  const hash = await hashPassword(newPassword);
  await updateUserPassword(user.id, hash);

  // Delete reset token (single-use)
  await deleteResetToken(token);

  // Invalidate all sessions (force re-login)
  await invalidateAllUserSessions(user.id);

  // Send notification email
  await sendPasswordChangedEmail(user.email);

  // Log security event
  await logSecurityEvent('password_reset', 'completed', user.id);

  return true;
}
```

**Security Logging:**
- Log all reset requests (including email, IP, timestamp)
- Log successful resets
- Log failed reset attempts
- Alert on suspicious patterns (e.g., 10+ resets in 1 hour)

---

## Authorization & Access Control

### 2.1 Role-Based Access Control (RBAC)

**Five Roles (per PRD):**

| Role | Permissions | User Count (Estimate) |
|------|-------------|----------------------|
| **student** | View public profiles, connect via QR, RSVP, message, view projects/partners | 200 |
| **faculty** | Same as student + create projects, post opportunities | 100 |
| **industry** | Same as student + create partner profiles | 150 |
| **staff** | Check-in attendees, register walk-ins, view attendance stats | 20 |
| **admin** | Full access: manage users, roles, sessions, Smartsheet sync, analytics | 10 |

**Role Assignment:**
- Roles assigned by admin only (not self-assignable)
- Users can have multiple roles (e.g., faculty + admin)
- Role changes logged in `user_role_history` table
- Role changes invalidate all user sessions (force re-auth)

**Permission Matrix:**

| Feature | Student | Faculty | Industry | Staff | Admin |
|---------|---------|---------|----------|-------|-------|
| View public profiles | ✅ | ✅ | ✅ | ✅ | ✅ |
| QR scan connections | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| RSVP to sessions | ✅ | ✅ | ✅ | ✅ | ✅ |
| View research projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create projects** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Post opportunities** | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Create partner profiles** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Check-in attendees** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Register walk-ins** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Manage users** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Smartsheet sync** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **View audit logs** | ❌ | ❌ | ❌ | ❌ | ✅ |

**Role Checking Middleware:**
```typescript
function requireRole(...allowedRoles: Role[]) {
  return (req, res, next) => {
    const userRoles = req.user.roles; // From JWT

    const hasPermission = allowedRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

// Usage
app.post('/v1/projects',
  authenticateToken,
  requireRole('faculty', 'admin'),
  createProject
);

app.post('/v1/check-ins',
  authenticateToken,
  requireRole('staff', 'admin'),
  checkInAttendee
);
```

---

### 2.2 Row-Level Security (RLS) Policies

**Database-Level Enforcement:**

All tables have RLS enabled. Policies are defined in `DATABASE_SCHEMA.md` section 6.

**Key RLS Patterns:**

**1. Own Data Access:**
```sql
-- Users can view/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can view/update their own connections
CREATE POLICY "Users can view own connections"
  ON public.connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**2. Public Data Access:**
```sql
-- Public profiles visible to authenticated users
CREATE POLICY "Public profiles visible to authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public');

-- All sessions visible to authenticated users
CREATE POLICY "Anyone can view sessions"
  ON public.sessions FOR SELECT
  USING (true);
```

**3. Role-Based Access:**
```sql
-- Only admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only staff/admin can view check-ins
CREATE POLICY "Staff can view check-ins"
  ON public.check_ins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('staff', 'admin')
    )
  );
```

**4. Privacy-Aware Access:**
```sql
-- Enforce QR scanning privacy
CREATE TRIGGER enforce_qr_scanning_privacy
  BEFORE INSERT ON public.connections
  FOR EACH ROW
  WHEN (NEW.connection_method = 'qr_scan')
  EXECUTE FUNCTION check_qr_scanning_allowed();

-- Enforce messaging privacy
CREATE TRIGGER enforce_messaging_privacy
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION check_messaging_allowed();
```

**RLS Performance Optimization:**
- RLS policies use indexes (e.g., `idx_user_roles_user_id`)
- Helper functions marked as `STABLE` for caching
- Complex policies use materialized views for performance

---

### 2.3 Privacy Controls Enforcement

**Four Privacy Toggles (per PRD US-2.2):**

1. **Profile Visibility**: `public` or `private`
   - Public: Profile visible to all authenticated users
   - Private: Profile visible only to user and admins

2. **Allow QR Scanning**: `true` or `false`
   - If `false`, QR scans to this user are rejected at database level
   - Trigger validation on `connections` INSERT

3. **Allow Messaging**: `true` or `false`
   - If `false`, new messages to this user are rejected
   - Trigger validation on `messages` INSERT

4. **Hide Contact Info**: `true` or `false`
   - If `true`, email, phone, LinkedIn, website hidden from other users
   - Enforced via `profiles_safe` view

**Privacy Enforcement Flow:**

```
User A tries to QR scan User B
  ↓
Frontend sends POST /v1/connections with connected_user_id = User B
  ↓
Backend validates JWT and user permissions
  ↓
Database trigger checks User B's allow_qr_scanning
  ↓
If false → EXCEPTION raised → 403 Forbidden
If true → Connection created
```

**Privacy-Aware Views:**

Views used by API instead of raw tables:

```sql
-- profiles_safe: Hides contact info based on privacy settings
SELECT * FROM profiles_safe WHERE id = 'user-id';

-- industry_partners_safe: Hides contact info for partners
SELECT * FROM industry_partners_safe WHERE id = 'partner-id';
```

**API Response Respects Privacy:**
```json
// GET /v1/users/{userId} with hideContactInfo = true
{
  "id": "uuid",
  "fullName": "Jane Doe",
  "organization": "DARPA",
  "bio": "...",
  "email": null,          // Hidden
  "phone": null,          // Hidden
  "linkedinUrl": null,    // Hidden
  "websiteUrl": null,     // Hidden
  "privacy": {
    "hideContactInfo": true
  }
}
```

---

### 2.4 Feature Flagging Security

**Device-Based Feature Flags:**

Feature availability varies by device (mobile vs. desktop vs. tablet) as defined in PRD Section 2.

**Security Implications:**
- QR scanner only enabled on devices with camera (prevents UI confusion)
- Admin dashboard accessible on all devices, but optimized for desktop
- Staff check-in optimized for mobile (touch-first)

**Implementation:**
```typescript
// Feature flag check (client-side)
const deviceType = useDeviceType(); // 'mobile' | 'tablet' | 'desktop'
const hasCamera = useHasCamera();
const userRole = useUserRole();

const canUseQRScanner =
  hasCamera &&
  ['mobile', 'tablet'].includes(deviceType) &&
  isFeatureEnabled('qrScanner', userRole, deviceType);

// Server-side validation
function validateFeatureAccess(
  feature: string,
  userRoles: Role[],
  deviceType?: string
): boolean {
  const featureConfig = featureFlags[feature];

  // Check role permission
  if (featureConfig.roles && !featureConfig.roles.some(r => userRoles.includes(r))) {
    return false;
  }

  // Check device compatibility (if applicable)
  if (deviceType && featureConfig.devices && !featureConfig.devices.includes(deviceType)) {
    return false;
  }

  return featureConfig.enabled;
}
```

---

### 2.5 Device-Based Access Control

**Device Fingerprinting:**
- Track device info for security (not for invasive tracking)
- Device ID generated on first login (stored in browser)
- Used for:
  - Multi-device session management
  - Suspicious login detection
  - Offline queue deduplication

**Device Info Logged:**
```typescript
interface DeviceInfo {
  deviceId: string;      // Client-generated UUID (stored in localStorage)
  userAgent: string;     // Browser/OS info
  screenResolution: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  hasCamera: boolean;
  hasTouchscreen: boolean;
}
```

**Suspicious Device Detection:**
- New device login → Email notification
- Login from unusual location (IP geolocation) → Email notification
- Multiple failed logins from same device → Temporary block (15 minutes)

**Device Management:**
- Users can view all active devices in settings
- Users can terminate sessions on specific devices
- Admin can view device info for security investigations

---

## Data Security

### 3.1 Encryption at Rest

**Database Encryption:**
- **Platform**: PostgreSQL with full-disk encryption (provider-level)
- **Sensitive Columns**: Additional encryption using pgcrypto extension (optional for high-security fields)
- **Encryption Algorithm**: AES-256-GCM

**S3/Object Storage Encryption:**
- **Avatars & Uploads**: Server-side encryption (SSE-S3 or SSE-KMS)
- **Encryption at Upload**: Client-side pre-encryption for highly sensitive files (optional)

**Encryption Key Management:**
- **Application Secrets**: Stored in environment variables, never in code
- **Rotation**: Secrets rotated every 90 days
- **Key Hierarchy**:
  - Master key: AWS KMS or cloud provider key management
  - Data encryption keys: Derived from master key
  - Token signing keys: Separate from data encryption keys

**Optional: Encrypted Fields (pgcrypto):**
```sql
-- Example: Encrypt connection notes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  connected_user_id UUID NOT NULL,
  notes_encrypted BYTEA,  -- Encrypted field
  -- ... other fields
);

-- Encrypt on insert
INSERT INTO connections (id, user_id, notes_encrypted)
VALUES (
  gen_random_uuid(),
  'user-uuid',
  pgp_sym_encrypt('Sensitive notes', current_setting('app.encryption_key'))
);

-- Decrypt on select (via application, not exposed directly)
SELECT
  id,
  pgp_sym_decrypt(notes_encrypted, current_setting('app.encryption_key')) as notes
FROM connections
WHERE user_id = 'user-uuid';
```

**Note**: Encryption key stored in secure environment variable, rotated regularly.

---

### 3.2 Encryption in Transit

**TLS 1.3 Enforcement:**
- All API endpoints require HTTPS
- HTTP requests auto-redirected to HTTPS
- TLS 1.3 with strong cipher suites only
- Certificate: Let's Encrypt or AWS ACM (auto-renewal)

**TLS Configuration:**
```nginx
# Nginx config
ssl_protocols TLSv1.3;
ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
ssl_prefer_server_ciphers on;

# HSTS header (force HTTPS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**Certificate Pinning (Optional for mobile apps):**
- Pin production certificate in mobile app bundle
- Prevents man-in-the-middle attacks with rogue certificates
- Update pins with each app release

**WebSocket Encryption:**
- Real-time messaging uses WSS (WebSocket Secure)
- Same TLS 1.3 configuration as HTTPS

---

### 3.3 Sensitive Data Handling

**PII (Personally Identifiable Information):**
- Email, phone, name, organization, bio
- **Never logged** in application logs or error messages
- **Never included** in URLs or query parameters
- **Redacted** in non-production environments

**Sensitive Operations Logging:**
```typescript
// Bad: Logs PII
logger.info(`User ${user.email} logged in`);

// Good: Logs user ID only
logger.info(`User ${user.id} logged in`);

// Audit log: Full context (stored securely, 90-day retention)
auditLog.log({
  event: 'login',
  userId: user.id,
  email: user.email,  // OK in audit log
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

**Data Minimization:**
- Collect only required data
- Delete unused data (e.g., expired sessions, old audit logs after 90 days)
- Optional fields truly optional (not required)

**Data Anonymization (for analytics):**
```typescript
// Aggregated analytics (no PII)
const analytics = {
  totalConnections: 1234,
  avgConnectionsPerUser: 12.3,
  popularSessions: ['session-id-1', 'session-id-2'],
  // No user emails, names, or IDs
};
```

---

### 3.4 PII Protection

**GDPR/Privacy Compliance:**
- User consent collected during onboarding
- Privacy policy presented before registration
- Users can update privacy settings anytime
- Users can request data export (admin feature, post-MVP)
- Users can request account deletion (post-MVP)

**Data Access Controls:**
- Only admins can export PII (via Smartsheet sync or CSV export)
- Exports logged in audit trail
- Exports encrypted before transmission

**Data Retention:**
- User data: Retained indefinitely (event networking platform)
- Audit logs: 90-day retention, then deleted
- Deleted accounts: Hard delete after 30-day grace period (post-MVP)

**PII in Backups:**
- Database backups encrypted at rest
- Backup access restricted to admins only
- Backups retained for 30 days, then deleted

---

### 3.5 Privacy Settings Enforcement

**Database-Level Enforcement:**

Privacy settings enforced via:
1. Row-Level Security (RLS) policies
2. Privacy-aware views (`profiles_safe`, `industry_partners_safe`)
3. Database triggers (prevent privacy violations)

**Application-Level Enforcement:**

API respects privacy settings:
```typescript
// GET /v1/users/{userId}
async function getUserProfile(userId: string, requesterId: string) {
  const user = await db.query(`
    SELECT * FROM profiles_safe WHERE id = $1
  `, [userId]);

  // Check profile visibility
  if (user.profileVisibility === 'private' && user.id !== requesterId) {
    // Only admins can view private profiles
    if (!isAdmin(requesterId)) {
      throw new ForbiddenError('User has a private profile');
    }
  }

  return user; // Contact info already filtered by profiles_safe view
}
```

**Frontend Enforcement:**
- UI respects privacy settings (e.g., disable QR scan button if user disallows)
- Defensive: Backend validation is ultimate authority

---

## API Security

### 4.1 Rate Limiting

**Multi-Tier Rate Limiting:**

| Tier | Scope | Limit | Window | Purpose |
|------|-------|-------|--------|---------|
| **Global** | IP address | 1000 req/hour | Sliding | Prevent DoS |
| **User** | Authenticated user | 1000 req/hour | Sliding | Prevent abuse |
| **Endpoint** | Specific API | Varies | Fixed | Prevent feature abuse |

**Endpoint-Specific Limits:**

| Endpoint | Limit | Window | Enforcement |
|----------|-------|--------|-------------|
| `POST /v1/auth/login` | 5 attempts | 15 min | IP + email |
| `POST /v1/auth/register` | 3 attempts | 1 hour | IP |
| `POST /v1/auth/forgot-password` | 3 requests | 1 hour | Email |
| `POST /v1/connections` | 50 connections | 24 hours | User (DB trigger) |
| `POST /v1/messages` | 40 messages | 24 hours | User (DB trigger) |
| `PATCH /v1/users/me` | 20 updates | 24 hours | User (DB trigger) |
| `POST /v1/opportunities` | 10 posts | 24 hours | User (DB trigger) |

**Implementation Strategy:**

**Option 1: Application-Level (Redis)**
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const loginLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
});

app.post('/v1/auth/login', loginLimiter, loginHandler);
```

**Option 2: Database-Level (Simpler for MVP)**
```sql
-- Enforced via triggers (see DATABASE_SCHEMA.md section 9.2)
CREATE TRIGGER enforce_message_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_rate_limit();
```

**Rate Limit Response:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 900

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 15 minutes.",
  "retryAfter": 900
}
```

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640000000
```

---

### 4.2 Input Validation

**Validation Strategy:**
- **Client-Side**: Zod schemas (type safety + runtime validation)
- **Server-Side**: Same Zod schemas (never trust client)
- **Database**: CHECK constraints (last line of defense)

**Validation Layers:**

```typescript
// Shared schema (used on client + server)
import { z } from 'zod';

const CreateConnectionSchema = z.object({
  connectedUserId: z.string().uuid(),
  collaborativeIntents: z.array(z.string()).max(10),
  notes: z.string().max(1000).optional(),
  connectionMethod: z.enum(['qr_scan', 'manual_entry']),
});

// Server-side validation middleware
function validateRequest(schema: z.ZodSchema) {
  return (req, res, next) => {
    try {
      req.validatedData = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
  };
}

// Usage
app.post('/v1/connections',
  authenticateToken,
  validateRequest(CreateConnectionSchema),
  createConnection
);
```

**Validation Rules:**

| Field Type | Validation |
|------------|------------|
| **UUID** | Valid UUID v4 format |
| **Email** | RFC 5322 compliant, max 255 chars |
| **Password** | 8+ chars, uppercase, lowercase, number |
| **URL** | Valid URL, HTTPS only, max 200 chars |
| **Text** | Max length, no XSS patterns |
| **Array** | Max length, item validation |
| **ENUM** | Whitelist of allowed values |

**Whitelist vs Blacklist:**
- **Always use whitelisting** (allow known-good patterns)
- Never use blacklisting (too easy to bypass)

**Example: Prevent XSS in text fields**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeUserInput(input: string): string {
  // Remove all HTML tags (bio, notes fields)
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

// Apply before saving to database
const sanitizedBio = sanitizeUserInput(req.body.bio);
```

---

### 4.3 SQL Injection Prevention

**Parameterized Queries:**
- **Always use parameterized queries** (never string concatenation)
- **Use ORMs** (Prisma, TypeORM) or query builders (Kysely) that parameterize automatically

**Bad (Vulnerable to SQL injection):**
```typescript
// NEVER DO THIS
const userId = req.params.userId;
const result = await db.query(`SELECT * FROM profiles WHERE id = '${userId}'`);
```

**Good (Safe):**
```typescript
// Parameterized query
const userId = req.params.userId;
const result = await db.query(`SELECT * FROM profiles WHERE id = $1`, [userId]);

// Or use ORM
const result = await prisma.profile.findUnique({ where: { id: userId } });
```

**Stored Procedures:**
- Use stored procedures for complex operations
- Procedures defined in migrations, not constructed dynamically

**Input Validation:**
- Validate UUID format before query (extra safety layer)
- Reject non-UUID inputs early

---

### 4.4 XSS Prevention

**Content Security Policy (CSP):**
See Section 6.1 for full CSP configuration.

**Output Encoding:**
- React auto-escapes JSX expressions (safe by default)
- Careful with `dangerouslySetInnerHTML` (avoid unless necessary)

**Sanitize User-Generated Content:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before rendering (if rendering HTML)
function SafeHTML({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**HTTP-Only Cookies:**
- Refresh token in `httpOnly` cookie (not accessible to JavaScript)
- Prevents XSS from stealing tokens

---

### 4.5 CSRF Protection

**CSRF Token Strategy:**

**For Cookie-Based Auth (Refresh Token):**
- Generate CSRF token on login
- Store in encrypted cookie: `csrfToken=<token>; HttpOnly; SameSite=Strict`
- Require token in `X-CSRF-Token` header for state-changing requests

**Implementation:**
```typescript
import { randomBytes } from 'crypto';

function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

// Middleware to validate CSRF token
function validateCSRFToken(req, res, next) {
  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }

  next();
}

// Apply to state-changing endpoints
app.post('/v1/connections',
  validateCSRFToken,
  authenticateToken,
  createConnection
);
```

**SameSite Cookie Attribute:**
```http
Set-Cookie: refreshToken=<token>;
  HttpOnly;
  Secure;
  SameSite=Strict;  # Prevents CSRF
```

**Alternative: JWT-Only (No Cookies):**
- JWT stored in memory only (not cookies)
- CSRF not applicable (no cookies to send automatically)
- Chosen for MVP (simpler implementation)

---

### 4.6 CORS Configuration

**CORS Policy:**

**Production:**
```typescript
import cors from 'cors';

const corsOptions = {
  origin: [
    'https://converge-nps.com',
    'https://www.converge-nps.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true, // Allow cookies
  maxAge: 86400, // 24 hours (cache preflight)
};

app.use(cors(corsOptions));
```

**Development:**
```typescript
const corsOptions = {
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
};
```

**Preflight Requests:**
- Browser sends OPTIONS request before POST/PUT/DELETE
- Server responds with allowed origins, methods, headers
- Preflight cached for 24 hours (reduces overhead)

**CORS Headers:**
```http
Access-Control-Allow-Origin: https://converge-nps.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

## Audit Logging

### 5.1 What to Log

**Security Events:**
- User login (success and failure)
- User logout
- Password reset requests
- Password changes
- Email verification
- Failed authentication attempts (track brute force)
- Session creation and termination
- Role changes (assignment/removal)
- Permission escalation attempts

**Data Access:**
- Sensitive data exports (CSV, Smartsheet sync)
- Admin viewing private user profiles
- Admin modifying user data
- Bulk data operations

**Administrative Operations:**
- User management (create, update, delete, suspend)
- Role assignments
- Session terminations
- Smartsheet sync operations
- Configuration changes

**Suspicious Activity:**
- Multiple failed login attempts
- Login from new device/location
- Rate limit violations
- CSRF validation failures
- Unauthorized access attempts (403 Forbidden)

**Not Logged:**
- Normal read operations (GET requests for public data)
- User browsing sessions, projects, partners
- Message content (only metadata: sender, recipient, timestamp)

---

### 5.2 Log Retention

**Retention Policy:**
- **Audit Logs**: 90 days (per PRD US-12.2)
- **Application Logs**: 30 days
- **Access Logs** (Nginx/load balancer): 7 days

**Automatic Cleanup:**
```sql
-- Daily cleanup job (via pg_cron or scheduled task)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily at midnight
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 0 * * *',
  'SELECT cleanup_old_audit_logs()'
);
```

**Backup Before Deletion:**
- Before deleting, export audit logs to cold storage (S3 Glacier)
- Compressed and encrypted
- Retained for 1 year for compliance/legal purposes

---

### 5.3 Log Analysis and Alerting

**Log Structure:**
```json
{
  "id": "log-uuid",
  "timestamp": "2026-01-28T10:30:00Z",
  "eventType": "login",
  "eventAction": "success",
  "userId": "user-uuid",
  "targetUserId": null,
  "resourceType": null,
  "resourceId": null,
  "ipAddress": "192.0.2.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "deviceType": "mobile",
    "location": "Monterey, CA"
  }
}
```

**Alert Rules:**

| Alert | Condition | Action |
|-------|-----------|--------|
| **Brute Force Attack** | 10+ failed logins from same IP in 15 min | Block IP, alert admin |
| **Credential Stuffing** | 5+ failed logins across multiple accounts from same IP | Block IP, alert admin |
| **Unusual Login** | Login from new country/device | Email user |
| **Privilege Escalation** | Non-admin tries to access admin endpoint | Alert admin, log incident |
| **Mass Data Export** | Admin exports >100 user records | Alert admin, require justification |
| **Rate Limit Violation** | User hits rate limit 3+ times in 1 hour | Alert admin, investigate |

**Log Analysis Tools:**
- **ELK Stack** (Elasticsearch, Logstash, Kibana): Full-featured log analysis
- **CloudWatch Logs** (AWS): Managed log service with alerting
- **Datadog/Sentry**: Application performance + error tracking

**Real-Time Alerting:**
```typescript
// Example: Alert on suspicious login
function checkSuspiciousLogin(userId: string, ipAddress: string, deviceInfo: string) {
  // Check if new device
  const isNewDevice = await isDeviceNew(userId, deviceInfo);

  if (isNewDevice) {
    // Send email notification
    await sendEmail(user.email, 'New device login detected', {
      device: deviceInfo,
      ip: ipAddress,
      time: new Date(),
    });

    // Log security event
    await logSecurityEvent('login', 'new_device', userId, { ipAddress, deviceInfo });
  }

  // Check if unusual location (IP geolocation)
  const location = await geolocateIP(ipAddress);
  const isUnusualLocation = await isLocationUnusual(userId, location);

  if (isUnusualLocation) {
    await sendEmail(user.email, 'Login from unusual location', { location });
    await logSecurityEvent('login', 'unusual_location', userId, { location });
  }
}
```

---

### 5.4 Compliance Requirements

**Audit Trail for Compliance:**
- **FISMA** (Federal Information Security Management Act): Event logging required
- **DoD Compliance**: Audit logs for access to sensitive defense information
- **GDPR**: User data access logging (for EU citizens, if applicable)

**Log Immutability:**
- Audit logs **cannot be modified or deleted** by users (including admins)
- Only automated cleanup after 90 days
- Write-only table with append-only permissions

**Access Controls:**
```sql
-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- No one can modify or delete audit logs (system only)
-- No UPDATE or DELETE policies defined
```

**Log Integrity:**
- Hash each log entry (SHA-256) and chain hashes (optional for high-security)
- Prevents tampering with log history
- Verify integrity periodically

---

## Security Headers

### 6.1 Content Security Policy (CSP)

**CSP Configuration:**

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  media-src 'self' blob:;
  connect-src 'self' https://api.converge-nps.com wss://api.converge-nps.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Explanation:**
- `default-src 'self'`: Only load resources from same origin by default
- `script-src`: Allow scripts from CDN (for libraries like React)
- `style-src`: Allow inline styles (required for styled-components/Tailwind)
- `img-src`: Allow images from any HTTPS source (user avatars, partner logos)
- `connect-src`: Allow API calls to backend and WebSocket
- `frame-ancestors 'none'`: Prevent clickjacking (site cannot be framed)
- `upgrade-insecure-requests`: Auto-upgrade HTTP to HTTPS

**CSP Reporting:**
```http
Content-Security-Policy-Report-Only: ...; report-uri /api/v1/csp-report
```

**Report Endpoint:**
```typescript
app.post('/api/v1/csp-report', (req, res) => {
  const report = req.body;
  logger.warn('CSP violation', { report });

  // Alert if many violations (possible attack)
  if (await getCspViolationCount() > 100) {
    alertAdmin('High CSP violation count detected');
  }

  res.status(204).send();
});
```

---

### 6.2 Additional Security Headers

**HSTS (HTTP Strict Transport Security):**
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
- Forces HTTPS for 1 year
- Includes all subdomains
- Eligible for HSTS preload list

**X-Frame-Options:**
```http
X-Frame-Options: DENY
```
- Prevents clickjacking attacks
- Site cannot be embedded in iframe

**X-Content-Type-Options:**
```http
X-Content-Type-Options: nosniff
```
- Prevents MIME-type sniffing
- Browser respects declared Content-Type

**X-XSS-Protection:**
```http
X-XSS-Protection: 1; mode=block
```
- Enable browser XSS filter
- Block page if XSS detected (legacy browsers)

**Referrer-Policy:**
```http
Referrer-Policy: strict-origin-when-cross-origin
```
- Send full referrer for same-origin
- Send origin only for cross-origin
- Protects sensitive URLs from leaking

**Permissions-Policy:**
```http
Permissions-Policy: camera=(self), microphone=(self), geolocation=(self), payment=()
```
- Control browser feature access
- Allow camera for QR scanner
- Block payment API (not used)

**Express.js Implementation:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.converge-nps.com", "wss://api.converge-nps.com"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: ["'self'"],
      microphone: ["'self'"],
      geolocation: ["'self'"],
      payment: [],
    },
  },
}));
```

---

### 6.3 Cookie Security Flags

**Secure Cookies:**
```http
Set-Cookie: refreshToken=<token>;
  HttpOnly;           # Prevents JavaScript access (XSS protection)
  Secure;             # Only sent over HTTPS
  SameSite=Strict;    # CSRF protection
  Path=/api/v1/auth;  # Limit scope
  Max-Age=2592000;    # 30 days
  Domain=converge-nps.com
```

**Cookie Flags Explained:**
- **HttpOnly**: JavaScript cannot access cookie (prevents XSS token theft)
- **Secure**: Cookie only sent over HTTPS (prevents man-in-the-middle)
- **SameSite=Strict**: Cookie only sent for same-site requests (CSRF protection)
- **Path**: Limit cookie to specific path (reduce attack surface)
- **Domain**: Limit to specific domain (prevent subdomain attacks)

**Session Cookie (if used):**
```http
Set-Cookie: session=<session-id>;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Path=/;
  Max-Age=1800  # 30 minutes
```

---

## Third-Party Security

### 7.1 Smartsheet API Security

**OAuth 2.0 Authentication:**
- Use OAuth 2.0 for Smartsheet API access (not API keys)
- Access token stored in environment variables (not code)
- Token rotation every 90 days

**API Permissions:**
- **Read-Only** for import sheets (industry partners, projects, sessions)
- **Write-Only** for export sheets (registrations, connections)
- Least privilege: Only access to specific sheets, not entire workspace

**Error Handling:**
- Rate limit errors: Exponential backoff
- Authentication errors: Alert admin, log incident
- Data validation errors: Skip invalid rows, log for review

**Data Validation:**
```typescript
// Validate imported data before inserting
function validateSmartsheetData(row: any, schema: z.ZodSchema): boolean {
  try {
    schema.parse(row);
    return true;
  } catch (error) {
    logger.warn('Invalid Smartsheet row', { row, error });
    return false;
  }
}

// Import with validation
async function importIndustryPartners(sheetId: string) {
  const rows = await smartsheet.getRows(sheetId);

  for (const row of rows) {
    if (validateSmartsheetData(row, IndustryPartnerSchema)) {
      await db.insertIndustryPartner(row);
    }
  }
}
```

**Audit Logging:**
- Log all Smartsheet sync operations
- Track: sheet name, direction (import/export), row count, success/failure
- Stored in `smartsheet_sync` table

---

### 7.2 Email Provider Security

**SendGrid/AWS SES Configuration:**

**API Key Security:**
- API key stored in environment variables
- Key rotated every 90 days
- Least privilege: Only send permissions, not read/delete

**Email Content Security:**
- Sanitize user-generated content before emailing (prevent phishing)
- Use email templates (not dynamic HTML construction)
- Include security warnings in sensitive emails (password reset, etc.)

**SPF/DKIM/DMARC:**
```dns
; SPF: Authorize SendGrid to send email on behalf of domain
converge-nps.com. IN TXT "v=spf1 include:sendgrid.net ~all"

; DKIM: Email signature verification
default._domainkey.converge-nps.com. IN TXT "v=DKIM1; k=rsa; p=<public-key>"

; DMARC: Email authentication policy
_dmarc.converge-nps.com. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@converge-nps.com"
```

**Email Rate Limiting:**
- Maximum 5 emails per user per hour (password reset, verification)
- Prevents email bombing attacks

**Email Content:**
```typescript
// Password reset email template (safe)
const resetEmail = {
  to: user.email,
  from: 'noreply@converge-nps.com',
  subject: 'Password Reset Request',
  html: `
    <p>Hi ${escapeHtml(user.fullName)},</p>
    <p>You requested a password reset. Click the link below:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
    <p><strong>If you didn't request this, ignore this email.</strong></p>
  `,
};
```

---

### 7.3 Dependency Management

**Dependency Scanning:**
- **npm audit**: Run on every `npm install`
- **Snyk/Dependabot**: Automated vulnerability scanning
- **GitHub Security Alerts**: Enable for all repositories

**Update Policy:**
- **Critical vulnerabilities**: Patch within 24 hours
- **High vulnerabilities**: Patch within 1 week
- **Medium/low vulnerabilities**: Patch in next release

**Dependency Pinning:**
```json
// package.json: Pin exact versions for production
{
  "dependencies": {
    "express": "4.18.2",      // Exact version, not ^4.18.2
    "bcrypt": "5.1.1",
    "jsonwebtoken": "9.0.2"
  }
}
```

**Lock Files:**
- Commit `package-lock.json` to version control
- Ensures consistent dependency versions across environments

**CI/CD Checks:**
```yaml
# GitHub Actions: Dependency audit
- name: Audit dependencies
  run: npm audit --audit-level=high

- name: Check for outdated packages
  run: npm outdated
```

---

### 7.4 Vulnerability Scanning

**Application Scanning:**
- **OWASP ZAP**: Automated security scanning (weekly)
- **Snyk Code**: Static analysis for code vulnerabilities
- **SonarQube**: Code quality and security analysis

**Infrastructure Scanning:**
- **Docker Image Scanning**: Scan container images for vulnerabilities (Trivy, Clair)
- **AWS Inspector** (if on AWS): Automated security assessments

**Penetration Testing:**
- **Pre-Launch**: Third-party penetration test before production
- **Ongoing**: Annual penetration testing
- **Scope**: OWASP Top 10, authentication, authorization, data exposure

**Vulnerability Disclosure:**
- **Security Contact**: security@converge-nps.com
- **Bug Bounty** (post-MVP): Responsible disclosure program
- **Response SLA**: Acknowledge within 24 hours, patch critical within 7 days

---

## Incident Response

### 8.1 Security Monitoring

**Real-Time Monitoring:**
- **Sentry**: Client-side error tracking and performance monitoring
- **CloudWatch/Datadog**: Server-side metrics and logs
- **Prometheus + Grafana**: Custom metrics dashboards

**Key Metrics:**
| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| **Failed login rate** | >10/min from single IP | Block IP, alert admin |
| **API error rate** | >5% of requests | Alert on-call engineer |
| **Response time** | p95 >1s | Alert on-call engineer |
| **Database connections** | >80% of pool | Scale up, alert admin |
| **Disk usage** | >85% | Alert admin, cleanup logs |
| **Memory usage** | >90% | Alert on-call, investigate leak |

**Security Dashboards:**
- Failed authentication attempts (by IP, by user)
- Rate limit violations
- CSRF validation failures
- Unauthorized access attempts (403 errors)
- Admin actions (user management, role changes, exports)

---

### 8.2 Alert Thresholds

**Critical Alerts (Immediate Response):**
- Database breach detected (unauthorized data export)
- Multiple admin accounts compromised
- DDoS attack (>10,000 req/min)
- Production service down (API returning 5xx errors)

**High Alerts (Response within 1 hour):**
- Brute force attack detected
- Unusual admin activity (mass user deletion)
- SSL certificate expiring in <7 days
- Backup failure

**Medium Alerts (Response within 4 hours):**
- Rate limit violations (user or IP)
- High error rate (>2% of requests)
- Slow response times (p95 >2s)

**Low Alerts (Response within 24 hours):**
- Dependency vulnerability detected
- Disk usage >75%
- Unusual login patterns

---

### 8.3 Incident Response Plan

**Response Team:**
- **On-Call Engineer**: First responder (24/7 rotation)
- **Security Lead**: Architect Agent (escalation point)
- **Project Owner**: NPS event organizer

**Incident Severity:**

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| **P0 - Critical** | Service down, data breach | <15 min | Database compromised, API down |
| **P1 - High** | Security incident, major bug | <1 hour | Brute force attack, auth bypass |
| **P2 - Medium** | Degraded service | <4 hours | Slow API, high error rate |
| **P3 - Low** | Minor issue | <24 hours | UI bug, non-critical feature broken |

**Incident Response Steps:**

1. **Detection**: Alert triggered (monitoring system, user report)
2. **Assessment**: On-call engineer assesses severity
3. **Containment**: Immediate action to stop damage
   - Block malicious IPs
   - Terminate compromised sessions
   - Take affected service offline (if necessary)
4. **Investigation**: Analyze logs, identify root cause
5. **Remediation**: Fix vulnerability, restore service
6. **Recovery**: Verify service health, monitor closely
7. **Post-Mortem**: Document incident, update runbooks, prevent recurrence

---

### 8.4 Data Breach Procedures

**Immediate Actions (First 15 Minutes):**
1. Isolate affected systems (prevent further data loss)
2. Preserve evidence (logs, snapshots)
3. Notify security lead and project owner
4. Begin investigation (identify scope of breach)

**Investigation (First 1 Hour):**
1. Identify compromised data (what was accessed/exfiltrated)
2. Identify attack vector (how breach occurred)
3. Identify affected users (whose data was compromised)
4. Document timeline of events

**Containment (First 4 Hours):**
1. Patch vulnerability
2. Reset compromised credentials (API keys, passwords)
3. Revoke compromised access tokens
4. Deploy security fixes

**Notification (Within 72 Hours):**
1. Notify affected users via email
2. Notify NPS event organizers
3. Notify authorities if required (GDPR, state laws)
4. Public disclosure (if significant breach)

**Post-Breach:**
1. Offer credit monitoring (if financial data compromised)
2. Conduct forensic analysis (third-party if major breach)
3. Implement additional security controls
4. Update incident response plan
5. Train team on lessons learned

**Communication Template:**
```
Subject: Security Incident Notification

Dear [User Name],

We are writing to inform you of a security incident involving the Converge-NPS platform.

What Happened:
[Brief description of breach]

What Data Was Affected:
[List of data types: emails, names, etc.]

What We're Doing:
[Actions taken to secure platform]

What You Should Do:
[Recommended user actions: change password, monitor accounts]

We sincerely apologize for this incident and any inconvenience it may cause.

If you have questions, contact us at security@converge-nps.com.

Sincerely,
Converge-NPS Security Team
```

---

## Security Compliance

### 9.1 OWASP Top 10 Mitigation

| Vulnerability | Mitigation |
|---------------|------------|
| **A01: Broken Access Control** | RLS policies, role-based middleware, privacy enforcement at DB level |
| **A02: Cryptographic Failures** | TLS 1.3, AES-256 encryption, bcrypt password hashing, secure token storage |
| **A03: Injection** | Parameterized queries, ORM, input validation, CSP headers |
| **A04: Insecure Design** | Threat modeling, security reviews, secure defaults, fail-secure design |
| **A05: Security Misconfiguration** | Secure headers, HSTS, CSP, least privilege, regular audits |
| **A06: Vulnerable Components** | npm audit, Snyk, Dependabot, pinned dependencies, update policy |
| **A07: Identification & Auth Failures** | Bcrypt, JWT, MFA (post-MVP), rate limiting, session timeout, audit logging |
| **A08: Software & Data Integrity** | Code signing, SRI for CDN, dependency lock files, CSP |
| **A09: Security Logging Failures** | Comprehensive audit logs, log analysis, alerting, 90-day retention |
| **A10: Server-Side Request Forgery** | Whitelist allowed URLs, validate inputs, no user-controlled URLs |

---

### 9.2 Defense-in-Depth Summary

**Layer 1: Network**
- TLS 1.3 encryption
- CORS policy
- Rate limiting (IP-based)
- DDoS protection (Cloudflare/AWS Shield)

**Layer 2: Application**
- Input validation (Zod)
- Output encoding (React auto-escape)
- CSRF protection
- Security headers (Helmet.js)

**Layer 3: Authentication**
- Bcrypt password hashing
- JWT with short expiration
- Refresh token rotation
- Session timeout

**Layer 4: Authorization**
- Role-based access control (RBAC)
- Row-level security (RLS)
- Privacy enforcement
- Feature flags

**Layer 5: Data**
- Database encryption at rest
- Encrypted backups
- Sensitive field encryption (pgcrypto)
- Data minimization

**Layer 6: Monitoring**
- Audit logging
- Security alerts
- Anomaly detection
- Incident response

---

## Security Testing Strategy

### 10.1 Security Test Cases

**Authentication Tests:**
- [ ] Password must meet requirements (8+ chars, uppercase, lowercase, number)
- [ ] Failed login attempts rate-limited (5 per 15 min)
- [ ] JWT expires after 1 hour
- [ ] Refresh token rotates on use
- [ ] Session timeout after 30 minutes inactivity
- [ ] Logout invalidates refresh token

**Authorization Tests:**
- [ ] Non-admin cannot access admin endpoints
- [ ] Users can only view/edit their own data
- [ ] RLS policies prevent unauthorized data access
- [ ] Privacy settings enforced (QR scanning, messaging, contact info)

**Input Validation Tests:**
- [ ] XSS payloads rejected (`<script>alert('XSS')</script>`)
- [ ] SQL injection attempts rejected (`' OR 1=1--`)
- [ ] Oversized inputs rejected (>max length)
- [ ] Invalid UUIDs rejected
- [ ] Malformed JSON rejected

**API Security Tests:**
- [ ] CORS blocks unauthorized origins
- [ ] CSRF token required for state-changing requests
- [ ] Rate limits enforced (connections, messages, profile updates)
- [ ] Missing Authorization header returns 401
- [ ] Invalid JWT returns 401
- [ ] Expired JWT returns 401

**Data Security Tests:**
- [ ] Passwords hashed with bcrypt
- [ ] Passwords never logged or exposed
- [ ] PII redacted in logs
- [ ] Contact info hidden when hideContactInfo = true
- [ ] Private profiles not visible to non-admins

---

### 10.2 Penetration Testing

**Pre-Launch Penetration Test:**
- **Scope**: OWASP Top 10, authentication, authorization, data exposure
- **Timeline**: 2 weeks before production launch
- **Provider**: Third-party security firm (if budget allows) or internal team
- **Deliverables**: Vulnerability report, risk assessment, remediation plan

**Ongoing Testing:**
- **Annual penetration test**: Full security assessment
- **Quarterly scans**: OWASP ZAP automated scans
- **Continuous**: Dependency vulnerability scanning (Snyk, npm audit)

---

## Summary

This security architecture provides comprehensive protection for Converge-NPS across all layers:

**✅ Authentication**: Bcrypt + JWT + refresh token rotation + session management
**✅ Authorization**: RBAC (5 roles) + RLS policies + privacy enforcement
**✅ Data Security**: TLS 1.3 + AES-256 encryption + PII protection
**✅ API Security**: Rate limiting + input validation + CSRF + CORS
**✅ Audit Logging**: Comprehensive logging + 90-day retention + alerting
**✅ Security Headers**: CSP + HSTS + X-Frame-Options + secure cookies
**✅ Third-Party**: Smartsheet OAuth + email SPF/DKIM + dependency scanning
**✅ Incident Response**: Monitoring + alerting + breach procedures

**Next Steps:**
1. Review with Security & Privacy Engineer
2. Implement security controls during development
3. Conduct pre-launch security audit
4. Schedule penetration testing
5. Configure monitoring and alerting
6. Train team on incident response

---

**Document Status**: ✅ Ready for Review
**Reviewer**: Security & Privacy Engineer Agent
**Approval Required**: Master Orchestrator
