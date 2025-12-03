# Post-MVP Feature Roadmap

**Document Version:** 1.0
**Date:** 2025-12-02
**Status:** Planning

---

## Overview

This document tracks features deferred from MVP to Phase 2 (post-event enhancements). These features were identified as valuable but not critical for the January 2026 event launch.

---

## Phase 2: Post-MVP Enhancements

**Target Timeline:** Post-event (February 2026 onwards)
**Trigger:** After successful event completion and lessons learned review

---

## Deferred Features

### 1. AI-Powered Recommendations

**Priority:** High
**Effort:** Medium
**Value:** High user engagement

**Features:**
- Connection recommendations based on:
  - Shared research interests
  - Same organization/department
  - Mutual connections
  - Complementary "seeking support" preferences
- Session recommendations based on user interests
- Scoring algorithm with machine learning
- Dismissal tracking (don't show again)
- Daily refresh during event

**Why Deferred:**
- Not critical for MVP networking functionality
- Search/filter provides adequate discovery
- Complex algorithm development time

**Implementation Notes:**
- Can use simple heuristic algorithm initially
- Upgrade to ML model if budget allows
- Requires recommendation engine backend service

---

### 2. SMS/Phone Verification

**Priority:** Medium
**Effort:** Medium
**Value:** Medium (security enhancement)

**Features:**
- Optional phone number verification
- SMS code delivery (6-digit, 10-minute expiration)
- SMS notifications for:
  - Session reminders
  - Message notifications
  - RSVP confirmations
- Two-factor authentication (2FA) option
- Rate limiting: 3 SMS per hour per user

**Why Deferred:**
- Email-only authentication sufficient for MVP
- SMS costs (~$0.02 per message)
- Additional integration complexity (Twilio)
- Not required by NPS stakeholders

**Implementation Notes:**
- Integrate Twilio or similar SMS provider
- Add phone verification flow to onboarding
- Optional opt-in for SMS notifications

**Cost Estimate:**
- 500 users × 3 SMS each = $30/event
- Ongoing: ~$50-100/month if used year-round

---

### 3. vCard Export

**Priority:** Medium
**Effort:** Low
**Value:** High user convenience

**Features:**
- Export single connection or all connections
- vCard format (.vcf) compatible with:
  - Google Contacts
  - Apple Contacts
  - Microsoft Outlook
- Includes: name, email, phone, organization, role, website, LinkedIn
- Respects privacy settings (only exports visible fields)
- Works offline (exports from cached data)

**Why Deferred:**
- CSV export covers admin use case
- Users can manually add contacts from app during event
- Nice-to-have, not critical

**Implementation Notes:**
- Simple vCard generation library (vcard-creator)
- Client-side generation (no server required)
- ~1 day development effort

---

### 4. ICS Calendar Export

**Priority:** Low
**Effort:** Low
**Value:** Medium user convenience

**Features:**
- Export individual session or entire schedule
- ICS format (.ics) compatible with:
  - Google Calendar
  - Apple Calendar
  - Microsoft Outlook
- Includes: title, time, location, description, speaker
- Works offline

**Why Deferred:**
- Users can manually add sessions to calendar
- Lower priority than other features
- CSV export covers admin reporting use case

**Implementation Notes:**
- ICS generation library (ics.js)
- Client-side generation
- ~1 day development effort

---

### 5. Complex Offline Sync

**Priority:** Low
**Effort:** High
**Value:** Medium (reliability enhancement)

**Features:**
- IndexedDB for full offline data storage
- Exponential backoff retry (2, 4, 8, 10 minutes)
- Conflict resolution (last-write-wins or manual resolution)
- Stale data detection (>24 hours banner)
- Visibility detection (pause sync when tab hidden)
- Comprehensive offline queue for all mutations

**Why Deferred:**
- Network-first caching sufficient for MVP
- Complex implementation (40%+ frontend complexity)
- Event venue will have WiFi backup
- Basic offline queue covers critical features (QR scans, messages, RSVPs)

**Implementation Notes:**
- Requires IndexedDB wrapper (idb library)
- Sync service with exponential backoff
- Conflict resolution UI
- ~3-4 weeks development effort

---

### 6. Raiser's Edge Integration

**Priority:** Low
**Effort:** Medium
**Value:** Low (CSV export sufficient)

**Features:**
- Export industry-faculty/student connections
- Format compatible with Raiser's Edge import
- Includes: contact info, connection date, collaborative intents
- Respects privacy settings
- Scheduled or manual export

**Why Deferred:**
- CSV export covers fundraising use case
- Manual import to Raiser's Edge is acceptable
- Raiser's Edge API complexity

**Implementation Notes:**
- Research Raiser's Edge CSV format requirements
- May not need API integration (CSV import sufficient)
- ~1-2 weeks development effort

---

### 7. Account Deletion (GDPR Compliance)

**Priority:** Low (for event context)
**Effort:** Medium
**Value:** High (if required for compliance)

**Features:**
- User-initiated account deletion from settings
- Confirmation dialog with consequences warning
- Password re-authentication required
- Deletes: profile, connections, messages, RSVPs, bookmarks
- Anonymizes: audit logs (replaces user ID with "deleted user")
- Completes within 48 hours
- Email confirmation when complete
- Admin can export user data before deletion

**Why Deferred:**
- Not critical for single event (January 2026)
- Most users won't delete accounts during event
- Can add if platform reused for future events

**Implementation Notes:**
- Cascade delete rules in database
- Anonymization logic for audit logs
- Admin export feature for GDPR compliance
- ~1 week development effort

---

### 8. Enhanced Privacy Controls

**Priority:** Low
**Effort:** Medium
**Value:** Low (simplified controls sufficient)

**Features:**
- 10+ granular privacy toggles:
  - Hide contact info
  - Share email (separate from hide contact)
  - Show LinkedIn
  - Show organization
  - Show role/rank
  - Show in lists
  - Allow QR scanning
  - Allow messaging
  - Show avatar
  - Show bio
- Privacy presets (Public, Private, Custom)
- Privacy impact preview

**Why Deferred:**
- 4 simplified toggles cover 90% of use cases
- Overwhelming UX for most users
- Military/industry users satisfied with simplified controls

**Implementation Notes:**
- Add additional privacy fields to database
- Update privacy UI with more toggles
- Update privacy-aware queries to check all fields
- ~2 weeks development effort

---

### 9. Message Encryption (End-to-End)

**Priority:** Medium
**Effort:** High
**Value:** High (if privacy-critical)

**Features:**
- End-to-end encrypted messages (server can't read)
- Public/private key pair per user
- Key exchange on first message
- Encrypted message storage
- Device-specific encryption keys

**Why Deferred:**
- Server-side encryption sufficient for MVP
- Complex implementation (cryptography)
- Military/industry users not requesting E2EE for event context
- Messages are ephemeral (post-event communication moves to email)

**Implementation Notes:**
- Requires encryption library (libsodium.js or SubtleCrypto API)
- Key management infrastructure
- Forward secrecy considerations
- ~4-6 weeks development effort
- **Decision:** Confirm with Security Engineer if E2EE required

---

### 10. Advanced Analytics

**Priority:** Low
**Effort:** Medium
**Value:** Medium (post-event insights)

**Features:**
- Heatmaps (popular sessions, booth traffic)
- Funnel analysis (registration → profile completion → connections → RSVPs)
- Cohort analysis (student vs. faculty vs. industry engagement)
- Retention metrics (if platform reused)
- Export to BI tools (Tableau, Power BI)

**Why Deferred:**
- Basic analytics dashboard covers MVP needs
- Post-event analysis can use CSV exports
- Not time-sensitive (can add after event)

**Implementation Notes:**
- Analytics service (Mixpanel, Amplitude, or custom)
- Additional database queries for complex metrics
- Dashboard visualizations
- ~2-3 weeks development effort

---

## Prioritization Matrix

| Feature | Priority | Effort | Value | Target Phase |
|---------|----------|--------|-------|--------------|
| AI Recommendations | High | Medium | High | Phase 2 (Q1 2026) |
| SMS Verification | Medium | Medium | Medium | Phase 2 (Q2 2026) |
| vCard Export | Medium | Low | High | Phase 2 (Q1 2026) |
| ICS Export | Low | Low | Medium | Phase 3 |
| Complex Offline Sync | Low | High | Medium | Phase 3 |
| Raiser's Edge | Low | Medium | Low | Phase 3 |
| Account Deletion | Low | Medium | High* | Phase 2 (if GDPR required) |
| Enhanced Privacy | Low | Medium | Low | Phase 3 |
| Message E2EE | Medium | High | High* | Phase 2 (if security-critical) |
| Advanced Analytics | Low | Medium | Medium | Phase 3 |

*High value only if required for compliance/security

---

## Phase 2 Recommendations

**Quick Wins (Low Effort, High Value):**
1. ✅ **vCard Export** - 1 day, high user convenience
2. ✅ **ICS Export** - 1 day, high user convenience

**High Impact (Worth the Effort):**
1. ✅ **AI Recommendations** - Significantly improves discovery
2. ✅ **SMS Verification** - Security enhancement, 2FA support

**Evaluate Post-Event:**
1. ❓ **Account Deletion** - Only if GDPR compliance required
2. ❓ **Message E2EE** - Only if security audit recommends
3. ❓ **Complex Offline Sync** - Only if MVP offline strategy proves insufficient

**Low Priority:**
1. ❌ **Enhanced Privacy Controls** - Simplified controls sufficient
2. ❌ **Raiser's Edge** - CSV export acceptable
3. ❌ **Advanced Analytics** - Can use CSV + BI tools

---

## Implementation Strategy

### Phase 2a: Post-Event Quick Wins (Weeks 19-20)
- vCard export
- ICS calendar export
- Lessons learned from event inform priorities

### Phase 2b: High-Impact Features (Weeks 21-26)
- AI recommendations (if budget approved)
- SMS verification (if security requires)

### Phase 2c: Compliance & Security (As Needed)
- Account deletion (if GDPR required)
- Message E2EE (if security audit recommends)

### Phase 3: Future Enhancements (2026+)
- Complex offline sync (if platform reused for future events)
- Advanced analytics
- Enhanced privacy controls

---

## Decision Log

### Decisions Made

1. **AI Recommendations:** Deferred to Phase 2
   - **Rationale:** Not critical for networking; search/filter sufficient
   - **Date:** 2025-12-02
   - **Decided By:** Product Manager + Stakeholder

2. **SMS Verification:** Email-only for MVP
   - **Rationale:** Email sufficient; SMS costs not justified for single event
   - **Date:** 2025-12-02
   - **Decided By:** Product Manager + Stakeholder

3. **Offline Strategy:** Simplified to network-first
   - **Rationale:** Full offline-first adds 40% frontend complexity; venue has WiFi
   - **Date:** 2025-12-02
   - **Decided By:** Product Manager + Stakeholder

4. **Privacy Controls:** Simplified to 4 toggles
   - **Rationale:** Current UI design; less overwhelming; covers 90% of use cases
   - **Date:** 2025-12-02
   - **Decided By:** Product Manager + Stakeholder

5. **Smartsheet:** Each sheet upload OR download only
   - **Rationale:** Simpler than bidirectional sync; clear data flow
   - **Date:** 2025-12-02
   - **Decided By:** Product Manager + Stakeholder

6. **Export Formats:** CSV only for MVP
   - **Rationale:** vCard/ICS nice-to-have but not critical
   - **Date:** 2025-12-02
   - **Decided By:** Product Manager + Stakeholder

### Pending Decisions

1. **Message Encryption:** E2EE or server-side?
   - **Owner:** Security Engineer + Architect
   - **Timeline:** Week 1 (Architecture phase)

2. **Account Deletion:** Required for MVP?
   - **Owner:** Legal/Compliance review
   - **Timeline:** Week 2

3. **SMS Provider:** If Phase 2 approved, which provider?
   - **Owner:** DevOps Engineer
   - **Timeline:** Phase 2 planning

---

## Review Schedule

- **After Event (Week 18):** Review lessons learned, reprioritize Phase 2 features
- **Monthly (Ongoing):** Review feature requests and user feedback
- **Quarterly:** Assess platform reuse for future events

---

**Last Updated:** 2025-12-02
**Next Review:** Week 18 (Post-Event)
