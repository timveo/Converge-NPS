# Product Requirements Document (PRD) - MVP

**Product Name:** Converge-NPS - Enterprise Event Networking Platform (MVP)
**Version:** 1.0 MVP
**Date:** 2025-12-02
**Author:** Product Manager Agent
**Event Date:** January 28-30, 2026

---

## 1. Executive Summary

Converge-NPS MVP is an enterprise-grade event networking platform for the Naval Postgraduate School's Tech Accelerator 2026. This MVP focuses on core event networking features: QR code-based connections, schedule management, research project discovery, real-time messaging, and event administration.

This is a production-ready rebuild of loveable-converge, maintaining the proven UI/UX while implementing enterprise-grade backend architecture. The MVP simplifies offline support to network-first caching and defers advanced features (AI recommendations, SMS verification, advanced exports) to post-MVP releases.

**MVP Timeline:** 12 weeks to production launch (3 weeks before event)

**Platform Strategy:** Single responsive PWA with device-based feature flagging

---

## 2. Platform Architecture

### Single Responsive PWA with Device-Based Features

**Architecture:** One codebase that adapts to device capabilities
- **Responsive Design:** Mobile-first with desktop enhancements
- **Device Detection:** Feature availability based on device type and capabilities
- **Feature Flagging:** Device-based (mobile vs. desktop vs. tablet)
- **Same User, Different Experience:** Users see different features on mobile vs. desktop

### Responsive Breakpoints

- **Mobile:** <768px (touch-first, bottom navigation, single column)
- **Tablet:** 768-1024px (hybrid touch/mouse, adaptive layout)
- **Desktop:** >1024px (mouse/keyboard, sidebar navigation, multi-column)

### Device-Specific Feature Matrix

| Feature | Mobile | Desktop | Tablet | Notes |
|---------|--------|---------|--------|-------|
| **QR Scanner** | ✅ Primary | ❌ Hidden | ✅ If camera | Camera required; desktop shows manual entry only |
| **Manual Code Entry** | ✅ Fallback | ✅ Primary | ✅ Available | Always available as backup |
| **Admin Dashboard** | ✅ Works | ✅ Optimized | ✅ Works | Desktop gets enhanced layout; mobile fully functional |
| **Staff Check-In** | ✅ Optimized | ✅ Works | ✅ Optimized | Mobile-first for event floor use |
| **Messaging** | ✅ Full | ✅ Full | ✅ Full | Identical across devices |
| **Schedule (List View)** | ✅ Full | ✅ Full | ✅ Full | Identical across devices |
| **Schedule (Timeline View)** | ✅ Scrollable | ✅ Wide | ✅ Medium | Responsive width adjustment |
| **Connections List** | ✅ Card view | ✅ Table view | ✅ Card view | Different layouts, same data |
| **Profile Editing** | ✅ Full form | ✅ Full form | ✅ Full form | Identical across devices |
| **Research Projects** | ✅ Full | ✅ Full | ✅ Full | Identical across devices |
| **Industry Partners** | ✅ Full | ✅ Full | ✅ Full | Identical across devices |
| **Navigation** | ✅ Bottom nav | ✅ Sidebar | ✅ Bottom nav | Different UI patterns |
| **PWA Install** | ✅ Prompted | ⚠️ Optional | ✅ Prompted | Desktop can use browser; mobile encouraged to install |

### Feature Detection vs. Screen Size

**Camera Access (Feature Detection):**
```typescript
// Show QR scanner only if device has camera
const hasCamera = await navigator.mediaDevices.enumerateDevices()
  .then(devices => devices.some(d => d.kind === 'videoinput'));

if (hasCamera) {
  showQRScanner();
} else {
  showManualEntryOnly();
}
```

**Screen Size (Responsive):**
```typescript
// Adapt layout based on screen size
const isMobile = window.innerWidth < 768;
const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
const isDesktop = window.innerWidth >= 1024;

// Show different navigation patterns
{isMobile ? <BottomNav /> : <SidebarNav />}
```

### Device-Specific Behavior Examples

**1. QR Scanner**
- **Mobile:** Full-screen camera viewfinder with back camera default
- **Desktop:** Hidden (no camera access); manual entry shown instead
- **Tablet:** Camera viewfinder if camera available; manual entry fallback

**2. Admin Dashboard**
- **Mobile:** Single-column layout, stacked widgets, vertical scroll
- **Desktop:** Multi-column layout, side-by-side widgets, grid layout
- **Tablet:** Two-column layout, adaptive grid

**3. Staff Check-In**
- **Mobile:** Large touch targets, QR scanner prominent, streamlined workflow
- **Desktop:** Table view with search, QR scanner hidden, keyboard-optimized
- **Tablet:** Hybrid layout with touch-optimized buttons and table view

**4. Messaging**
- **Mobile:** Full-screen conversation, back button to list
- **Desktop:** Split view (conversation list + active chat)
- **Tablet:** Split view on landscape, full-screen on portrait

**5. Schedule Timeline View**
- **Mobile:** Horizontal scroll, time blocks stacked vertically
- **Desktop:** Wide timeline, multiple sessions visible side-by-side
- **Tablet:** Medium timeline, 2-3 sessions visible

**6. Connections List**
- **Mobile:** Card view with large touch targets, swipe actions
- **Desktop:** Table view with sortable columns, hover actions
- **Tablet:** Card view on portrait, table view on landscape

---

## 3. MVP Scope

### ✅ In-Scope for MVP

**Core Networking**
- QR code scanning with camera access
- Manual code entry fallback
- Collaborative intent tracking
- Connection notes and reminders
- Connections list with search/filter
- Basic offline caching for QR scanning

**Event Schedule**
- Browse sessions with filters (day, time, type)
- RSVP with capacity limits and waitlisting
- Conflict detection
- My Schedule view (list + timeline)
- Session search

**Research & Opportunities**
- Browse NPS research projects with filters
- Browse military/government opportunities
- Project bookmarking
- Express interest feature
- CSV export for admin

**Messaging**
- Real-time direct messaging
- Conversation list
- Read receipts
- Rate limiting (40 messages/day)
- Basic offline message queue

**User Management**
- Email/password authentication
- Profile management with simplified privacy controls
- QR badge generation
- Role-based access (student, faculty, industry, staff, admin)

**Industry Partners**
- Partner directory with filters
- Favorite partners
- Partner privacy controls

**Admin Features**
- User management
- Smartsheet integration (multiple sheets, each upload OR download only)
- Analytics dashboard
- Audit logging

**Staff Features**
- Attendee check-in (search + QR scan)
- Walk-in registration
- Real-time attendance stats

**PWA**
- Installable to home screen
- Network-first caching strategy
- Basic offline support for critical features
- Service worker for asset caching

### ❌ Out-of-Scope for MVP (Post-MVP)

1. **AI-Powered Recommendations** - Deferred to Phase 2
2. **SMS/Phone Verification** - Email-only for MVP
3. **vCard Export** - CSV export sufficient for MVP
4. **ICS Calendar Export** - Manual calendar entry for MVP
5. **Complex Offline Sync** - Simplified to network-first caching
6. **Raiser's Edge Integration** - CSV export sufficient for MVP
7. **Smartsheet Bidirectional Sync** - Each sheet is upload OR download only, not both

---

## 3. Simplified Technical Requirements

### Offline Strategy (Simplified)

**Network-First with Basic Caching:**
- Cache strategy: Try network first, fall back to cache
- 24-hour cache TTL for static data
- Offline queue ONLY for:
  - QR scans
  - Messages
  - Session RSVPs
- No complex sync service (simple retry on connection restore)
- No IndexedDB for full offline storage (localStorage + service worker cache only)

**Impact:**
- Reduces frontend complexity by 40%
- Removes: Complex sync service, exponential backoff, conflict resolution, stale data detection
- Keeps: Core offline functionality for critical features (QR scanning, messaging)

### Privacy Controls (Simplified)

Instead of 10+ granular toggles, simplify to match current UI:
- **Profile Visibility:** Public / Private (preset)
- **Allow QR Scanning:** Yes / No
- **Allow Messaging:** Yes / No
- **Show Contact Info:** Yes / No

**Impact:**
- Simpler UX (less overwhelming for users)
- Maintains privacy for military/industry users
- Faster development

### Smartsheet Integration (Clarified)

**Multiple Sheets, Each Upload OR Download Only:**
- Sheet 1: Industry Partners (import/download only from Smartsheet)
- Sheet 2: Research Projects (import/download only from Smartsheet)
- Sheet 3: Event Schedule (import/download only from Smartsheet)
- Sheet 4: Registrations (export/upload only to Smartsheet)
- Sheet 5: Connections (export/upload only to Smartsheet)

**Impact:**
- Each sheet has one-way data flow (simpler error handling)
- No bidirectional sync complexity
- Manual refresh for imports, manual trigger for exports

---

## 4. Core User Stories (MVP Only)

### Epic 1: Authentication & Onboarding

#### US-1.1: Email Registration & Login
**As a** new user
**I want to** register with email and password
**So that** I can access the platform securely

**Acceptance Criteria:**
- [ ] Email/password registration
- [ ] Email verification required
- [ ] Password requirements: 8+ chars, uppercase, lowercase, number
- [ ] Forgot password flow
- [ ] Session persists for 30 days

**Priority:** P0 (Critical)

#### US-1.2: Multi-Step Onboarding
**As a** new user
**I want to** complete guided onboarding
**So that** I understand key features

**Acceptance Criteria:**
- [ ] Welcome screen
- [ ] Profile completion (role, organization, interests)
- [ ] Simplified privacy settings (4 toggles)
- [ ] Feature tour
- [ ] PWA installation prompt (mobile)

**Priority:** P1 (High)

#### US-1.3: Role-Based Access
**As a** system administrator
**I want to** assign roles to users
**So that** users access appropriate features

**Acceptance Criteria:**
- [ ] Roles: student, faculty, industry, staff, admin
- [ ] Role determines feature access
- [ ] Only admins can modify roles

**Priority:** P0 (Critical)

---

### Epic 2: User Profiles (Simplified)

#### US-2.1: Profile Management
**As a** user
**I want to** create and edit my profile
**So that** others can learn about me

**Acceptance Criteria:**
- [ ] Fields: name, email, organization, department, role, bio, avatar
- [ ] Optional: LinkedIn URL, website URL
- [ ] Interests: multi-select
- [ ] Avatar upload (2MB max, auto-resize)
- [ ] Profile preview

**Priority:** P0 (Critical)

#### US-2.2: Simplified Privacy Controls
**As a** user
**I want to** control my privacy
**So that** I protect my information

**Acceptance Criteria:**
- [ ] 4 privacy toggles:
  - [ ] Profile Visibility (Public/Private preset)
  - [ ] Allow QR Scanning
  - [ ] Allow Messaging
  - [ ] Show Contact Info
- [ ] Changes take effect immediately
- [ ] Privacy indicator always visible

**Priority:** P0 (Critical)

#### US-2.3: QR Code Badge
**As a** user
**I want to** display my QR badge
**So that** others can scan and connect

**Acceptance Criteria:**
- [ ] QR code generated from UUID
- [ ] Badge shows: QR code, name, organization
- [ ] Downloadable as PNG
- [ ] Fullscreen option
- [ ] Works offline

**Priority:** P1 (High)

---

### Epic 3: QR Code Networking

#### US-3.1: QR Scanner
**As a** user
**I want to** scan QR codes
**So that** I can quickly connect with attendees

**Acceptance Criteria:**
- [ ] Camera access with permission prompt
- [ ] Back camera default (mobile)
- [ ] Real-time detection with visual feedback
- [ ] Haptic feedback on success (mobile)
- [ ] Offline queue (simple retry)
- [ ] Error handling

**Priority:** P0 (Critical)

#### US-3.2: Manual Code Entry
**As a** user
**I want to** manually enter codes
**So that** I can connect without camera

**Acceptance Criteria:**
- [ ] Input accepts partial UUID (8+ chars)
- [ ] Same connection flow as QR scan
- [ ] Works offline

**Priority:** P1 (High)

#### US-3.3: Collaborative Intent
**As a** user
**I want to** specify why I'm connecting
**So that** we remember the context

**Acceptance Criteria:**
- [ ] Multi-select intents: research, brainstorming, design sprint, hackathon, funding, internship/job
- [ ] Intent required before saving
- [ ] Can update later

**Priority:** P1 (High)

#### US-3.4: Connection Notes
**As a** user
**I want to** add notes to connections
**So that** I remember key details

**Acceptance Criteria:**
- [ ] Notes field (500 char limit)
- [ ] Notes private
- [ ] Optional follow-up reminder
- [ ] Can edit from connections list

**Priority:** P2 (Medium)

---

### Epic 4: Connection Management

#### US-4.1: Connections List
**As a** user
**I want to** view all my connections
**So that** I can follow up

**Acceptance Criteria:**
- [ ] Shows: name, organization, intents, date
- [ ] Search by name/organization
- [ ] Filter by intent
- [ ] Sort by date or name
- [ ] CSV export (admin only)

**Priority:** P1 (High)

---

### Epic 5: Event Schedule

#### US-5.1: Browse Sessions
**As a** user
**I want to** browse sessions
**So that** I can discover interesting content

**Acceptance Criteria:**
- [ ] Shows all sessions (3 days)
- [ ] Filters: day, time slot, type, featured
- [ ] Search by keyword
- [ ] List view AND timeline view
- [ ] Shows RSVP status and capacity
- [ ] Network-first caching (24-hour TTL)

**Priority:** P0 (Critical)

#### US-5.2: RSVP to Sessions
**As a** user
**I want to** RSVP to sessions
**So that** I can plan my schedule

**Acceptance Criteria:**
- [ ] RSVP button
- [ ] Conflict warning dialog
- [ ] Auto-waitlist if at capacity
- [ ] Email confirmation
- [ ] Can cancel RSVP
- [ ] Offline queue for RSVPs

**Priority:** P0 (Critical)

#### US-5.3: Conflict Detection
**As a** user
**I want** conflict warnings
**So that** I don't double-book

**Acceptance Criteria:**
- [ ] Conflict dialog shows both sessions
- [ ] Options: keep existing, switch, attend both
- [ ] Conflicts highlighted in My Schedule

**Priority:** P1 (High)

#### US-5.4: My Schedule (List + Timeline)
**As a** user
**I want to** view my schedule
**So that** I see only my RSVPs

**Acceptance Criteria:**
- [ ] List view: grouped by day
- [ ] Timeline view: visual time blocks
- [ ] Highlights current/upcoming session
- [ ] Shows conflicts visually

**Priority:** P1 (High)

---

### Epic 6: Research Projects & Opportunities

#### US-6.1: Browse Projects
**As a** user
**I want to** browse NPS research
**So that** I can discover collaborations

**Acceptance Criteria:**
- [ ] Filters: department, stage, classification, research area, seeking
- [ ] Search by keyword
- [ ] Project details: PI, description, keywords, students
- [ ] Network-first caching

**Priority:** P1 (High)

#### US-6.2: Browse Opportunities
**As a** user
**I want to** browse military/gov opportunities
**So that** I can find funding/jobs

**Acceptance Criteria:**
- [ ] Filters: type, status, DoD alignment, featured
- [ ] Search by keyword
- [ ] Details: sponsor, benefits, requirements, deadline

**Priority:** P1 (High)

#### US-6.3: Bookmark & Express Interest
**As a** user
**I want to** bookmark projects and express interest
**So that** I can follow up later

**Acceptance Criteria:**
- [ ] Bookmark icon
- [ ] Bookmarks persist
- [ ] Express interest with optional message
- [ ] Notification to project owner

**Priority:** P2 (Medium)

---

### Epic 7: Industry Partners

#### US-7.1: Browse Partners
**As a** user
**I want to** browse industry partners
**So that** I can plan booth visits

**Acceptance Criteria:**
- [ ] Filters: org type, tech focus, collaboration type, DoD sponsors
- [ ] Search by name/keyword
- [ ] Details: description, website, team, booth location

**Priority:** P1 (High)

#### US-7.2: Favorite Partners
**As a** user
**I want to** favorite partners
**So that** I remember which booths to visit

**Acceptance Criteria:**
- [ ] Star icon to favorite
- [ ] Favorites tab
- [ ] Booth locations visible

**Priority:** P2 (Medium)

---

### Epic 8: Messaging (Simplified)

#### US-8.1: Send Messages
**As a** user
**I want to** send direct messages
**So that** I can follow up on connections

**Acceptance Criteria:**
- [ ] Send from profile or connections list
- [ ] 1000 char limit
- [ ] Real-time delivery (WebSocket when online)
- [ ] Offline queue (simple retry)
- [ ] Message status: sending, sent, delivered, read

**Priority:** P1 (High)

#### US-8.2: Conversation List
**As a** user
**I want to** view conversations
**So that** I can manage messages

**Acceptance Criteria:**
- [ ] Shows: contact, last message, timestamp
- [ ] Unread indicator
- [ ] Sort by recent activity
- [ ] Search conversations

**Priority:** P1 (High)

#### US-8.3: Read Receipts
**As a** user
**I want to** see when messages are read
**So that** I know if they saw my message

**Acceptance Criteria:**
- [ ] Read receipt sent when viewed
- [ ] Visual indicators: sent, delivered, read
- [ ] Timestamp when read

**Priority:** P2 (Medium)

#### US-8.4: Rate Limiting
**As a** system
**I want to** rate-limit messaging
**So that** we prevent spam

**Acceptance Criteria:**
- [ ] 40 messages per user per day
- [ ] Clear error message
- [ ] Resets at midnight UTC
- [ ] Server-side enforcement

**Priority:** P1 (High)

---

### Epic 9: PWA (Simplified)

#### US-9.1: App Installation
**As a** mobile user
**I want to** install the app
**So that** I can access it like a native app

**Acceptance Criteria:**
- [ ] Installation prompt after onboarding
- [ ] App icon on home screen
- [ ] Standalone mode
- [ ] Splash screen
- [ ] Icons: 192x192, 512x512

**Priority:** P1 (High)

#### US-9.2: Network-First Caching
**As a** system
**I want to** cache assets for performance
**So that** the app loads quickly

**Acceptance Criteria:**
- [ ] Network-first strategy
- [ ] Cache: app shell, static assets
- [ ] 24-hour TTL for data
- [ ] Auto-update service worker

**Priority:** P1 (High)

#### US-9.3: Offline Queue (Simplified)
**As a** user
**I want to** critical actions queued offline
**So that** they sync when reconnected

**Acceptance Criteria:**
- [ ] Offline queue for: QR scans, messages, RSVPs
- [ ] Auto-retry on reconnection (simple retry, no exponential backoff)
- [ ] Visual indicator for queued actions
- [ ] Manual retry option

**Priority:** P1 (High)

---

### Epic 10: Admin Dashboard

#### US-10.1: User Management
**As an** admin
**I want to** manage users
**So that** I can support attendees

**Acceptance Criteria:**
- [ ] Search by name, email, organization
- [ ] View user details and activity
- [ ] Assign/remove roles
- [ ] Reset password
- [ ] Suspend/unsuspend account
- [ ] Export user list to CSV

**Priority:** P1 (High)

#### US-10.2: Smartsheet Integration (Simplified)
**As an** admin
**I want to** import/export data from Smartsheet
**So that** I avoid manual data entry

**Acceptance Criteria:**
- [ ] **Import-only sheets (download from Smartsheet):**
  - [ ] Industry partners
  - [ ] Research projects
  - [ ] Event schedule
- [ ] **Export-only sheets (upload to Smartsheet):**
  - [ ] Attendee registrations
  - [ ] Connection data
- [ ] One-click import/export with progress indicator
- [ ] Error handling with retry
- [ ] Import history tracked

**Priority:** P1 (High)

#### US-10.3: Analytics Dashboard
**As an** admin
**I want to** view usage analytics
**So that** I can measure success

**Acceptance Criteria:**
- [ ] Metrics: total users, active users, connections, RSVPs, messages, scans
- [ ] Charts: line graphs (over time), bar charts (by category)
- [ ] Date range filter
- [ ] Export analytics to CSV

**Priority:** P2 (Medium)

---

### Epic 11: Staff Check-In

#### US-11.1: Attendee Check-In
**As a** staff member
**I want to** check in attendees
**So that** we track attendance

**Acceptance Criteria:**
- [ ] Search by name, email, partial ID
- [ ] Scan QR code for fast check-in
- [ ] Shows attendee details before confirming
- [ ] One-tap check-in
- [ ] Already checked-in attendees flagged
- [ ] Works offline (queued)

**Priority:** P1 (High)

#### US-11.2: Walk-In Registration (Staff Feature)
**As a** staff member
**I want to** register walk-ins
**So that** we accommodate unregistered guests

**Acceptance Criteria:**
- [ ] Quick registration form: name, email, organization, role
- [ ] Auto-creates account (temp password emailed)
- [ ] Marks as walk-in
- [ ] Checks in immediately after registration
- [ ] Works offline (queued)

**Priority:** P1 (High)

#### US-11.3: Attendance Stats
**As a** staff member
**I want to** see real-time stats
**So that** I can monitor attendance

**Acceptance Criteria:**
- [ ] Total checked-in vs. registered
- [ ] Check-ins last hour
- [ ] Walk-ins vs. pre-registered
- [ ] Check-ins by role
- [ ] Auto-refresh every 30 seconds

**Priority:** P2 (Medium)

---

### Epic 12: Security

#### US-12.1: Session Management
**As a** user
**I want to** automatic session timeout
**So that** my account is protected

**Acceptance Criteria:**
- [ ] 30-minute inactivity timeout
- [ ] Warning 2 minutes before timeout
- [ ] Option to extend
- [ ] Session persists 30 days max

**Priority:** P1 (High)

#### US-12.2: Audit Logging
**As a** system
**I want to** log security events
**So that** we detect suspicious activity

**Acceptance Criteria:**
- [ ] Events: login, password reset, role changes, failed auth, data exports
- [ ] Log includes: user ID, event, timestamp, IP, user agent
- [ ] 90-day retention
- [ ] Admin can search logs

**Priority:** P1 (High)

---

## 5. Functional Requirements Summary

### Authentication & Authorization
- [x] Email/password registration with email verification
- [x] Password reset via email
- [x] Role-based access control (student, faculty, industry, staff, admin)
- [x] Session management with 30-minute timeout
- [ ] ~~SMS/Phone verification~~ (Post-MVP)

### User Profiles
- [x] Create/edit profile (name, email, organization, role, bio, avatar, URLs)
- [x] Simplified privacy controls (4 toggles)
- [x] QR code badge generation
- [ ] ~~Account deletion~~ (Post-MVP, not critical for event)

### QR Code Networking
- [x] QR scanner with camera access
- [x] Manual code entry fallback
- [x] Collaborative intent tracking
- [x] Connection notes
- [x] Basic offline queue for scans

### Connection Management
- [x] View connections list
- [x] Search/filter connections
- [ ] ~~AI recommendations~~ (Post-MVP)
- [ ] ~~vCard export~~ (Post-MVP, CSV sufficient)

### Event Schedule
- [x] Browse sessions with filters
- [x] RSVP with capacity/waitlisting
- [x] Conflict detection
- [x] My Schedule (list + timeline views)
- [ ] ~~ICS calendar export~~ (Post-MVP)
- [ ] ~~Session recommendations~~ (Post-MVP, AI feature)

### Research Projects & Opportunities
- [x] Browse projects/opportunities with filters
- [x] Bookmarking
- [x] Express interest
- [x] CSV export

### Industry Partners
- [x] Browse partner directory
- [x] Filter by org type, tech focus
- [x] Favorite partners

### Messaging
- [x] Direct messaging
- [x] Real-time delivery (WebSocket)
- [x] Basic offline queue
- [x] Read receipts
- [x] Rate limiting (40/day)

### PWA
- [x] Installable to home screen
- [x] Network-first caching (simplified)
- [x] Basic offline queue (QR scans, messages, RSVPs)
- [ ] ~~Complex offline sync~~ (Removed, network-first sufficient)

### Admin Dashboard
- [x] User management
- [x] Smartsheet integration (multiple sheets, each upload OR download only)
- [x] Analytics dashboard
- [x] Audit logging
- [ ] ~~Raiser's Edge export~~ (Post-MVP, CSV sufficient)

### Staff Check-In
- [x] Search and check in attendees
- [x] QR scan check-in
- [x] Walk-in registration (staff feature)
- [x] Real-time attendance stats

---

## 6. Non-Functional Requirements (MVP)

### Performance
- **Page Load Time:** <2 seconds (p95)
- **API Response Time:** <500ms (p95)
- **Concurrent Users:** Support 500+ simultaneously
- **Bundle Size:** <500KB initial JS bundle (gzipped)

### Security
- **Data Encryption:** TLS 1.3 in transit; AES-256 at rest for sensitive fields
- **Authentication:** Bcrypt password hashing; JWT tokens with 30-day expiration
- **Authorization:** Row-level security (RLS) policies at database level
- **OWASP Top 10:** All vulnerabilities addressed
- **Rate Limiting:** Messaging (40/day), API (1000/hour per user)
- **Audit Logging:** 90-day retention

### Usability
- **Mobile-First Design**
- **Touch Targets:** 44x44px minimum
- **Accessibility:** WCAG 2.1 AA compliance
- **Browser Support:** Latest 2 versions of Chrome, Safari, Firefox, Edge
- **Loading States:** Skeleton screens for all async operations

### Scalability
- **User Growth:** Support 2,000 users (4x target) without architecture changes
- **Database:** PostgreSQL with connection pooling
- **Horizontal Scaling:** Stateless API design
- **CDN:** Static assets served via CDN

### Reliability
- **Uptime SLA:** 99.5% during event dates (Jan 28-30, 2026)
- **Automated Backups:** Daily full backups; 30-day retention
- **Disaster Recovery:** <4 hour RTO, <1 hour RPO
- **Health Checks:** Automated monitoring with alerting
- **Error Tracking:** Client-side error monitoring (Sentry)

### Maintainability
- **Test Coverage:** >80% unit test coverage
- **Code Quality:** ESLint + Prettier; TypeScript
- **CI/CD:** Automated testing and deployment
- **Documentation:** API documentation (OpenAPI/Swagger)

---

## 7. Technical Stack (To Be Finalized by Architect)

### Frontend (Maintained from Reference)
- **Framework:** React 18 + TypeScript + Vite
- **UI Library:** shadcn/ui (Radix UI) + Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Themes:** next-themes

### Backend (TBD by Architect)
- **Option A:** Node.js + Express
- **Option B:** Python + FastAPI
- **Database:** PostgreSQL 15+
- **Cache:** Redis 7+
- **Real-Time:** WebSocket (Socket.io or native WS)
- **Storage:** S3-compatible (AWS S3, Cloudflare R2)

### External Services
- **Email:** SendGrid or AWS SES
- **Smartsheet:** REST API (OAuth2)
- **Monitoring:** Prometheus + Grafana or CloudWatch
- **Error Tracking:** Sentry
- **Deployment:** Railway, Render, or Kubernetes (Tier 2)

### Device-Based Feature Flagging Architecture

**Implementation Strategy:**
```typescript
// Feature flag configuration
interface FeatureFlags {
  qrScanner: {
    enabled: boolean;
    requiresCamera: boolean;
    devices: ('mobile' | 'tablet' | 'desktop')[];
  };
  adminDashboard: {
    enabled: boolean;
    optimizedFor: 'desktop' | 'mobile' | 'both';
    roles: string[];
  };
  // ... more features
}

// Device detection service
class DeviceService {
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  async hasCamera(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(d => d.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}

// Feature availability check
function isFeatureAvailable(
  featureName: keyof FeatureFlags,
  userRole: string,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  hasCamera: boolean
): boolean {
  const feature = featureFlags[featureName];

  // Check device compatibility
  if (!feature.devices.includes(deviceType)) {
    return false;
  }

  // Check camera requirement
  if (feature.requiresCamera && !hasCamera) {
    return false;
  }

  // Check role-based access
  if (feature.roles && !feature.roles.includes(userRole)) {
    return false;
  }

  return feature.enabled;
}
```

**Feature Flag Configuration File:**
```typescript
// config/features.ts
export const featureFlags: FeatureFlags = {
  qrScanner: {
    enabled: true,
    requiresCamera: true,
    devices: ['mobile', 'tablet'], // Not available on desktop
  },
  manualCodeEntry: {
    enabled: true,
    requiresCamera: false,
    devices: ['mobile', 'tablet', 'desktop'], // Always available
  },
  adminDashboard: {
    enabled: true,
    optimizedFor: 'desktop',
    devices: ['mobile', 'tablet', 'desktop'],
    roles: ['admin', 'staff'],
  },
  staffCheckin: {
    enabled: true,
    optimizedFor: 'mobile',
    devices: ['mobile', 'tablet', 'desktop'],
    roles: ['staff', 'admin'],
  },
  messaging: {
    enabled: true,
    optimizedFor: 'both',
    devices: ['mobile', 'tablet', 'desktop'],
    roles: ['all'],
  },
  timelineView: {
    enabled: true,
    optimizedFor: 'desktop',
    devices: ['mobile', 'tablet', 'desktop'],
    roles: ['all'],
  },
  connectionsList: {
    enabled: true,
    optimizedFor: 'both',
    devices: ['mobile', 'tablet', 'desktop'],
    roles: ['all'],
    viewMode: {
      mobile: 'cards',
      tablet: 'cards',
      desktop: 'table',
    },
  },
};
```

**Component Usage:**
```tsx
// Example: Conditionally render QR scanner
function NetworkingPage() {
  const deviceType = useDeviceType();
  const hasCamera = useHasCamera();
  const canUseScanner = isFeatureAvailable('qrScanner', userRole, deviceType, hasCamera);

  return (
    <div>
      {canUseScanner ? (
        <QRScanner />
      ) : (
        <ManualCodeEntry
          message="QR scanner requires a camera. Enter code manually:"
        />
      )}
    </div>
  );
}

// Example: Responsive layout
function AdminDashboard() {
  const deviceType = useDeviceType();

  return (
    <div className={cn(
      'admin-dashboard',
      deviceType === 'mobile' && 'layout-single-column',
      deviceType === 'desktop' && 'layout-multi-column'
    )}>
      {/* Dashboard widgets */}
    </div>
  );
}
```

**Testing Requirements:**
- [ ] Test all features on mobile (iOS Safari, Android Chrome)
- [ ] Test all features on desktop (Chrome, Safari, Firefox, Edge)
- [ ] Test all features on tablet (iPad, Android tablet)
- [ ] Verify QR scanner hidden on desktop (no camera)
- [ ] Verify layout adaptation at all breakpoints
- [ ] Verify navigation changes (bottom nav vs. sidebar)
- [ ] Test orientation changes (portrait ↔ landscape)

---

## 8. Release Plan (MVP)

### Phase 1: MVP Development - Weeks 1-10
**Target:** Week 10
**Features:**
- [ ] Authentication (email/password only)
- [ ] User profiles with simplified privacy controls
- [ ] QR code networking (scan, manual entry, intents, notes)
- [ ] Connections list
- [ ] Event schedule (browse, RSVP, conflict detection, list + timeline views)
- [ ] Research projects & opportunities (browse, bookmark, express interest)
- [ ] Industry partner directory
- [ ] Messaging (real-time, read receipts, rate limiting)
- [ ] PWA (installable, network-first caching, basic offline queue)
- [ ] Admin dashboard (user management, Smartsheet integration, analytics)
- [ ] Staff check-in (search, QR scan, walk-in registration, stats)
- [ ] Security (session management, audit logging)

### Phase 2: Testing & QA - Weeks 11-12
**Target:** Week 12
**Activities:**
- [ ] Comprehensive testing (functional, UI, API, performance)
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Load testing (500+ concurrent users)
- [ ] Bug fixes
- [ ] User acceptance testing (UAT)

### Phase 3: Deployment - Week 13
**Target:** Week 13 (3 weeks before event)
**Activities:**
- [ ] Production deployment
- [ ] Monitoring and alerting configured
- [ ] Database backups tested
- [ ] User onboarding begins
- [ ] Staff training

### Event Week - Weeks 16-17
**Target:** Jan 28-30, 2026
**Activities:**
- [ ] 24/7 monitoring
- [ ] Real-time issue resolution
- [ ] Daily data exports

### Post-Event - Week 18
**Activities:**
- [ ] Post-event survey
- [ ] Analytics report
- [ ] CSV exports for CRM/fundraising
- [ ] Lessons learned

---

## 9. Post-MVP Features (Phase 2)

### Deferred Features
1. **AI-Powered Recommendations**
   - Connection recommendations based on shared interests
   - Session recommendations based on user interests
   - Scoring algorithm with dismissal tracking

2. **SMS/Phone Verification**
   - Optional phone verification
   - SMS notifications
   - 2FA support

3. **Advanced Export Formats**
   - vCard export (Google/Apple/Outlook contacts)
   - ICS calendar export
   - Raiser's Edge integration

4. **Complex Offline Sync**
   - IndexedDB for full offline storage
   - Exponential backoff retry
   - Conflict resolution
   - Stale data detection

5. **Account Deletion**
   - User-initiated account deletion
   - GDPR compliance

6. **Enhanced Privacy**
   - 10+ granular privacy toggles (if needed)

---

## 10. Risks & Mitigation (MVP)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Backend rebuild takes longer than estimated** | High | Medium | Architect designs for modularity; prioritize MVP features; parallel development |
| **Poor cellular connectivity at venue** | High | Medium | Network-first caching; offline queue for critical features (QR, messages, RSVPs); pre-load data before event |
| **Smartsheet API rate limits** | Medium | Low | Cache imported data; manual CSV fallback; test integration thoroughly |
| **Security vulnerability** | High | Low | Weekly scans; penetration testing; security code reviews |
| **Performance degradation** | High | Medium | Load testing 2x expected users; database optimization; CDN for assets; horizontal scaling |
| **Messaging spam** | Medium | Low | Rate limiting (40/day); user reporting; admin moderation |
| **Service worker bugs** | High | Low | Extensive testing on iOS/Android; manual cache clear option; error tracking |

---

## 11. Open Questions (For Architect)

1. **Backend Technology:** Node.js/Express vs. Python/FastAPI?
2. **Real-Time:** Socket.io vs. native WebSockets?
3. **Deployment Platform:** Railway, Render, or Kubernetes?
4. **Message Encryption:** End-to-end or server-side?
5. **Avatar Storage:** Self-hosted S3 or third-party CDN?
6. **Test Coverage Goal:** 80% sufficient or target 90%+?
7. **Analytics Platform:** Google Analytics, self-hosted Matomo, or Mixpanel?

---

## 12. Success Criteria

MVP is successful if:
- ✅ All core features implemented and tested
- ✅ >80% test coverage
- ✅ 99.5% uptime during event
- ✅ <2s page load, <500ms API response
- ✅ 500+ concurrent users supported
- ✅ 80%+ of attendees complete profiles
- ✅ 10+ connections per attendee (average)
- ✅ 70%+ RSVP to 3+ sessions
- ✅ 90%+ user satisfaction

---

## 13. Approval

### Sign-Off Required

- [ ] **Product Manager Agent** - MVP PRD approved
- [ ] **UX/UI Designer Agent** - Design requirements approved
- [ ] **Security & Privacy Engineer Agent** - Security requirements approved
- [ ] **Architect Agent** - Technical requirements approved
- [ ] **Master Orchestrator** - Overall MVP approved for Architecture phase
- [ ] **Key Stakeholders** - NPS event organizers approve MVP scope

### Next Steps

1. **Architect Agent** designs enterprise backend architecture
2. **Frontend/Backend/Data Engineers** implement MVP features
3. **UX/UI Designer** provides design specs and accessibility guidance
4. **Security Engineer** implements security controls
5. **QA Engineer** creates test plans and automation
6. **DevOps Engineer** sets up infrastructure and CI/CD

---

**Document Version:** 1.0 MVP
**Last Updated:** 2025-12-02
**Next Review:** After Architecture phase
**Status:** READY FOR ARCHITECTURE PHASE

---

## Appendix: Simplified vs. Full PRD

### Key Simplifications
1. ✅ **Offline:** Network-first caching (not full offline-first with IndexedDB)
2. ✅ **Privacy:** 4 toggles (not 10+ granular controls)
3. ✅ **Smartsheet:** Each sheet upload OR download only (not bidirectional)
4. ❌ **AI Recommendations:** Deferred to post-MVP
5. ❌ **SMS Verification:** Email-only for MVP
6. ❌ **vCard/ICS Export:** CSV sufficient for MVP
7. ❌ **Raiser's Edge:** CSV export sufficient
8. ❌ **Complex Sync:** Simple retry on reconnection

### Development Time Savings
- **Original Estimate:** 16 weeks
- **MVP Estimate:** 12 weeks
- **Savings:** 4 weeks (25% reduction)

### Complexity Reduction
- **Backend:** 30% simpler (no complex sync, no AI recommendations)
- **Frontend:** 20% simpler (simplified offline, simplified privacy UI)
- **Integration:** 20% simpler (one-way Smartsheet, no Raiser's Edge)
