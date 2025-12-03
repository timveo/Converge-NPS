# Product Requirements Document (PRD)

**Product Name:** Converge-NPS - Enterprise Event Networking Platform
**Version:** 1.0
**Date:** 2025-12-02
**Author:** Product Manager Agent
**Event Date:** January 28-30, 2026

---

## 1. Executive Summary

Converge-NPS is an enterprise-grade event networking and collaboration platform designed specifically for the Naval Postgraduate School's Tech Accelerator 2026. The platform enables 500+ attendees—including students, faculty, industry partners, and military personnel—to forge meaningful connections, discover research collaboration opportunities, and manage their event experience through an intuitive, mobile-first interface.

This product is a production-ready rebuild of the successful loveable-converge prototype, maintaining its proven user experience while implementing an enterprise-worthy backend architecture capable of scaling, ensuring security, and supporting mission-critical event operations. The platform combines QR code-based networking, intelligent schedule management, research matchmaking, real-time messaging, and comprehensive administrative capabilities—all while supporting full offline functionality for seamless mobile use during the event.

Key differentiators include robust offline-first architecture, privacy-aware data access controls, enterprise-grade security and monitoring, seamless third-party integrations (Smartsheet, CRM, calendar systems), and a sophisticated role-based access control system that ensures appropriate data visibility across diverse user types.

---

## 2. Problem Statement

### Current Situation

The Naval Postgraduate School hosts an annual Tech Accelerator event bringing together students, faculty, industry partners, and military stakeholders. Currently, attendee networking relies on manual business card exchanges and ad-hoc conversations, making it difficult to:
- Track meaningful connections and collaborative intent
- Discover relevant research projects and funding opportunities
- Manage complex event schedules with 30+ concurrent sessions
- Enable real-time communication between attendees
- Collect actionable data for post-event follow-up and fundraising

The prototype loveable-converge application successfully demonstrated these capabilities but was built on a rapid-prototype backend (Supabase) that lacks the enterprise-grade features needed for production deployment, scalability, and long-term maintainability.

### Pain Points

1. **Inefficient Networking** - Manual business card exchanges are easily lost; no systematic way to capture why people connected or what they want to collaborate on
2. **Information Overload** - 500+ attendees, 45+ industry partners, 50+ research projects, 30+ sessions across 3 days creates discovery challenges
3. **Schedule Conflicts** - Multiple overlapping sessions make it difficult to plan attendance without conflicts
4. **Limited Mobile Experience** - Need offline-capable mobile app since cellular connectivity may be unreliable in event venues
5. **Data Integration Gaps** - Event organizers need to export data to CRM systems, fundraising platforms, and Smartsheet without manual data entry
6. **Privacy Concerns** - Military and industry personnel require granular privacy controls to protect sensitive information
7. **Administrative Burden** - Manual check-in processes, walk-in registrations, and data management consume significant staff time
8. **Lack of Production Infrastructure** - Prototype backend cannot support enterprise requirements (monitoring, backups, disaster recovery, security compliance, performance SLAs)

### Opportunity

Build a production-ready platform that:
- Maximizes networking value through intelligent matchmaking and intent tracking
- Streamlines event operations through automation and self-service capabilities
- Enables research collaboration by connecting projects with industry partners and funding
- Provides enterprise-grade reliability, security, and performance for mission-critical event support
- Reduces administrative overhead through automation and third-party integrations
- Delivers measurable ROI through post-event analytics and follow-up capabilities

---

## 3. Product Vision & Goals

### Vision

Become the definitive platform for academic-industry-military collaboration events, enabling meaningful connections that accelerate research, drive innovation, and strengthen public-private partnerships in defense technology.

### Goals

1. **Maximize Connection Quality** - Enable 200+ meaningful collaborations (not just business card exchanges) through intent-driven networking
2. **Ensure Event Success** - Support flawless event execution with 99.5%+ uptime, <2s load times, and 100% offline capability
3. **Drive Research Partnerships** - Connect 80%+ of NPS research projects with potential industry partners or funding sources
4. **Reduce Administrative Burden** - Automate 70%+ of event check-in, registration, and data management tasks
5. **Enable Data-Driven Follow-Up** - Provide actionable post-event data for fundraising, partnership development, and program improvement
6. **Deliver Enterprise Quality** - Meet production readiness standards: >80% test coverage, comprehensive monitoring, automated deployments, security compliance

### Success Metrics

**User Engagement**
- **Profile Completion Rate:** 80%+ of attendees complete full profiles
- **Connections per Attendee:** Average 10+ meaningful connections
- **Session RSVPs:** 70%+ of attendees RSVP to at least 3 sessions
- **Message Engagement:** 50%+ of attendees send/receive at least 1 message
- **QR Scan Adoption:** 60%+ of attendees use QR code networking

**Technical Performance**
- **Uptime SLA:** 99.5% during event dates (Jan 28-30, 2026)
- **Page Load Time:** <2 seconds (p95)
- **API Response Time:** <500ms (p95)
- **Concurrent Users:** Support 500+ simultaneously
- **Offline Capability:** 100% of core features work offline
- **Data Sync Success:** >99% of offline changes sync successfully

**Business Impact**
- **Industry-Academic Connections:** 200+ documented collaboration connections
- **Research Visibility:** 80%+ of projects viewed by industry partners
- **Opportunities Generated:** 50+ formal collaboration opportunities initiated
- **User Satisfaction:** 90%+ satisfaction score (post-event survey)
- **Repeat Attendance Intent:** 75%+ plan to attend next year

**Operational Efficiency**
- **Automated Check-Ins:** 80%+ of attendees self-check-in via app
- **Data Export Accuracy:** <1% error rate in CRM/Smartsheet exports
- **Support Ticket Volume:** <10 support requests per 100 attendees
- **Administrative Time Savings:** 50%+ reduction vs. manual processes

---

## 4. Target Users

### Primary Users

**P1: NPS Graduate Students**
- **Description:** 200-250 master's and PhD students in engineering, computer science, operations research, and related fields
- **Needs:**
  - Find internships and job opportunities with industry partners
  - Connect with potential thesis/dissertation advisors and collaborators
  - Discover funded research opportunities
  - Network with peers across departments
- **Goals:**
  - Make 5-10 meaningful industry connections
  - Identify 2-3 potential employers or internship sponsors
  - Learn about cutting-edge research in their field
- **Technical Profile:** Highly technical, mobile-first, expect modern UX

**P2: NPS Faculty & Researchers**
- **Description:** 50-75 professors, research scientists, and principal investigators
- **Needs:**
  - Find industry partners for research collaborations
  - Identify funding opportunities for projects
  - Recruit talented students for research teams
  - Connect with government sponsors and stakeholders
- **Goals:**
  - Secure 1-2 industry partnerships or funding commitments
  - Present research to relevant stakeholders
  - Build long-term collaborative relationships
- **Technical Profile:** Variable technical comfort; need simple, intuitive interface

**P3: Industry Partners**
- **Description:** 45+ companies ranging from defense contractors to startups
- **Needs:**
  - Discover NPS research relevant to their technology needs
  - Recruit top talent (students for internships/jobs, faculty for consulting)
  - Explore partnership opportunities
  - Understand DoD research priorities
- **Goals:**
  - Identify 3-5 promising research projects or collaboration opportunities
  - Connect with 10-15 qualified candidates
  - Generate leads for business development
- **Technical Profile:** Expect professional, enterprise-quality experience; privacy-conscious

**P4: Military & Government Personnel**
- **Description:** 50-75 DoD sponsors, program managers, and military officers
- **Needs:**
  - Identify research that addresses operational needs
  - Connect researchers with funding programs
  - Understand technology landscape and capabilities
  - Network with industry and academic experts
- **Goals:**
  - Find 2-3 research projects worth funding
  - Connect researchers with appropriate DoD programs
  - Build awareness of NPS capabilities
- **Technical Profile:** Security-conscious, need privacy controls; mobile usage during event

### Administrative Users

**A1: Event Staff**
- **Description:** 10-15 staff managing registrations, check-ins, and attendee support
- **Needs:**
  - Fast check-in process for pre-registered attendees
  - Walk-in registration capability
  - Real-time attendance tracking
  - Quick troubleshooting for attendee issues
- **Goals:**
  - Check in 500+ attendees in <2 hours
  - Handle walk-ins without disrupting registration flow
  - Minimal training required to use system
- **Technical Profile:** Non-technical; need simple, foolproof interface

**A2: System Administrators**
- **Description:** 2-3 event organizers/IT staff with platform admin access
- **Needs:**
  - Import/export data from Smartsheet and CRM systems
  - Monitor platform health and usage
  - Manage user roles and permissions
  - Generate reports and analytics
  - Handle data privacy requests
- **Goals:**
  - Zero manual data entry (automated imports/exports)
  - Real-time visibility into platform usage
  - Quick resolution of user issues
- **Technical Profile:** Technical proficiency; comfortable with admin dashboards

---

## 5. User Stories & Features

### Epic 1: User Authentication & Onboarding

#### US-1.1: Email Registration & Login
**As a** new user
**I want to** register with my email and password
**So that** I can access the platform securely

**Acceptance Criteria:**
- [ ] User can register with email, password, full name, and organization
- [ ] Password must meet security requirements (8+ chars, uppercase, lowercase, number)
- [ ] Email verification sent upon registration
- [ ] User must verify email before accessing full features
- [ ] Error messages clearly explain validation failures
- [ ] "Forgot password" flow allows password reset via email
- [ ] Session persists across browser/app restarts
- [ ] Automatic logout after 30 days of inactivity

**Priority:** P0 (Critical)
**Dependencies:** None
**Reference:** /loveable-converge/src/pages/Auth.tsx

#### US-1.2: Phone Verification (Optional)
**As a** user
**I want to** verify my phone number
**So that** I can receive SMS notifications and enable two-factor authentication

**Acceptance Criteria:**
- [ ] User can optionally add phone number to profile
- [ ] SMS code sent for verification (rate limit: 3 attempts/hour)
- [ ] 6-digit verification code expires after 10 minutes
- [ ] Verified phone enables SMS notifications (if user opts in)
- [ ] Users can update/remove phone number from settings
- [ ] Rate limiting prevents abuse

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/components/auth/PhoneInput.tsx

#### US-1.3: Multi-Step Onboarding
**As a** new user
**I want to** complete a guided onboarding process
**So that** I can set up my profile and understand key features

**Acceptance Criteria:**
- [ ] Step 1: Welcome screen with event overview
- [ ] Step 2: Profile completion (role, department, interests, seeking support)
- [ ] Step 3: Privacy settings configuration
- [ ] Step 4: Feature tour (QR scanning, schedule, opportunities, messaging)
- [ ] Step 5: PWA installation prompt (mobile only)
- [ ] User can skip onboarding and complete later
- [ ] Progress indicator shows completion status
- [ ] Onboarding state persists (can resume if interrupted)

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/components/OnboardingFlow.tsx

#### US-1.4: Role-Based Access Control
**As a** system administrator
**I want to** assign roles to users
**So that** users only access features appropriate to their role

**Acceptance Criteria:**
- [ ] Five roles supported: student, faculty, industry, staff, admin
- [ ] Users can have multiple roles (e.g., student + staff)
- [ ] Role determines access to admin panel, staff check-in, and other restricted features
- [ ] Role history tracked for audit purposes
- [ ] Only admins can modify user roles
- [ ] Role changes take effect immediately (no re-login required)

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/integrations/supabase/types.ts (user_roles table)

---

### Epic 2: User Profiles & Privacy

#### US-2.1: Profile Management
**As a** user
**I want to** create and edit my profile
**So that** others can learn about me and my interests

**Acceptance Criteria:**
- [ ] Profile includes: full name, email, phone, rank, organization, department, role, bio
- [ ] Optional fields: avatar, LinkedIn URL, website URL
- [ ] Interests: multi-select from predefined list (acceleration_interests)
- [ ] Seeking support: multi-select (collaboration, funding, internships, etc.)
- [ ] Character limits: bio (500 chars), all URLs validated
- [ ] Avatar upload (max 2MB, jpg/png only, auto-resized to 400x400)
- [ ] Profile preview shows how others will see your profile
- [ ] Changes save automatically with success confirmation

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/pages/ProfileEdit.tsx

#### US-2.2: Privacy Controls
**As a** user
**I want to** control what information is visible to others
**So that** I can protect my privacy

**Acceptance Criteria:**
- [ ] Granular visibility toggles:
  - [ ] Hide contact info (email/phone)
  - [ ] Share email separately from "hide contact info"
  - [ ] Show LinkedIn URL
  - [ ] Show organization
  - [ ] Show role/rank
  - [ ] Show in public lists (directory)
  - [ ] Allow QR code scanning
  - [ ] Allow messaging
- [ ] Privacy settings affect profile views, QR scans, and search results
- [ ] Default settings are privacy-preserving (most fields hidden)
- [ ] Privacy indicator shows current visibility status
- [ ] Changes take effect immediately

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/components/settings/PrivacySettings.tsx

#### US-2.3: QR Code Badge
**As a** user
**I want to** display my QR code badge
**So that** others can quickly scan and connect with me

**Acceptance Criteria:**
- [ ] QR code generated from user UUID (unique identifier)
- [ ] Badge displays: QR code, name, organization, role
- [ ] Downloadable as PNG for printing
- [ ] Badge respects privacy settings (e.g., hides role if toggled off)
- [ ] Works offline (generated client-side)
- [ ] Option to display fullscreen for easier scanning
- [ ] Can be disabled via "allow QR scan" privacy setting

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/components/QRCodeBadge.tsx

#### US-2.4: Account Deletion
**As a** user
**I want to** permanently delete my account
**So that** I can exercise my right to be forgotten

**Acceptance Criteria:**
- [ ] User-initiated account deletion from settings
- [ ] Confirmation dialog explains consequences (irreversible, data deletion)
- [ ] Requires password re-authentication
- [ ] Deletes: profile, connections, messages, RSVPs, bookmarks
- [ ] Anonymizes: audit logs (replaces user ID with "deleted user")
- [ ] Completes within 48 hours
- [ ] Email confirmation sent when deletion complete
- [ ] Admin can export user data before deletion (GDPR compliance)

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/components/settings/AccountDeletionDialog.tsx

---

### Epic 3: QR Code Networking

#### US-3.1: QR Code Scanner
**As a** user
**I want to** scan another attendee's QR code
**So that** I can quickly view their profile and save the connection

**Acceptance Criteria:**
- [ ] Camera access requested with clear permission prompt
- [ ] Back camera used by default on mobile (user can switch)
- [ ] Real-time QR code detection with visual feedback
- [ ] Haptic feedback on successful scan (mobile only)
- [ ] Scanned profile loads with privacy-aware data
- [ ] Fallback to manual code entry if camera unavailable
- [ ] Works offline (queued for sync)
- [ ] Error handling: invalid code, privacy disabled, camera denied

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/pages/Scanner.tsx

#### US-3.2: Manual Code Entry
**As a** user
**I want to** manually enter a connection code
**So that** I can connect even if QR scanning isn't working

**Acceptance Criteria:**
- [ ] Input field accepts partial UUID (first 8+ characters)
- [ ] Lookup finds matching profile via RPC function
- [ ] Clear error if no match or multiple matches
- [ ] Same connection flow as QR scan
- [ ] Works offline

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Scanner.tsx (manual entry mode)

#### US-3.3: Collaborative Intent Tracking
**As a** user
**I want to** specify why I'm connecting with someone
**So that** we both remember the context for follow-up

**Acceptance Criteria:**
- [ ] Multi-select collaborative intents:
  - [ ] Research collaboration
  - [ ] Brainstorming session
  - [ ] Design sprint
  - [ ] Hackathon participation
  - [ ] Funded research opportunity
  - [ ] Internship/job opportunity
  - [ ] Other (custom text)
- [ ] Intent required before saving connection
- [ ] Intents visible to both parties
- [ ] Can update intents later from connection details

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Scanner.tsx (intent selection)

#### US-3.4: Connection Notes & Reminders
**As a** user
**I want to** add notes and set follow-up reminders
**So that** I remember key details and action items

**Acceptance Criteria:**
- [ ] Notes field (500 char limit)
- [ ] Notes private (only visible to note taker)
- [ ] Optional follow-up reminder (date picker)
- [ ] Reminder notification on due date
- [ ] Can edit notes/reminder from connections list
- [ ] Works offline

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/pages/Scanner.tsx (notes field)

#### US-3.5: Offline Scan Queue
**As a** user
**I want to** scan QR codes even when offline
**So that** I can network during the event without worrying about connectivity

**Acceptance Criteria:**
- [ ] Scans saved to offline queue (IndexedDB)
- [ ] Queue shows pending, synced, and failed scans
- [ ] Auto-sync when connection restored
- [ ] Exponential backoff on sync failures (2-10 min intervals)
- [ ] Visual indicator for offline/syncing/synced status
- [ ] Manual retry option for failed scans
- [ ] Queue persists across app restarts

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/lib/offlineQueue.ts

---

### Epic 4: Connection Management

#### US-4.1: Connections List
**As a** user
**I want to** view all my connections
**So that** I can review who I've met and follow up

**Acceptance Criteria:**
- [ ] List shows: name, organization, role, collaborative intents, connection date
- [ ] Search by name or organization
- [ ] Filter by collaborative intent
- [ ] Sort by: date (newest/oldest), name (A-Z)
- [ ] Tap to view full profile
- [ ] Shows sync status for offline connections
- [ ] Export connections to vCard (Google/Apple/Outlook contacts)

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Connections.tsx

#### US-4.2: AI-Powered Recommendations
**As a** user
**I want to** receive personalized connection recommendations
**So that** I can discover people I should meet

**Acceptance Criteria:**
- [ ] Recommendations based on:
  - [ ] Shared research interests
  - [ ] Same organization/department
  - [ ] Mutual connections
  - [ ] Complementary "seeking support" preferences
- [ ] Scoring algorithm ranks recommendations
- [ ] Can dismiss recommendations
- [ ] Dismissed recommendations don't reappear
- [ ] Refreshes daily during event
- [ ] Recommendations respect privacy settings

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/components/RecommendationCard.tsx

#### US-4.3: vCard Export
**As a** user
**I want to** export connections to my contacts app
**So that** I can follow up after the event

**Acceptance Criteria:**
- [ ] Export single connection or all connections
- [ ] vCard format compatible with Google Contacts, Apple Contacts, Outlook
- [ ] Includes: name, email, phone, organization, role, website, LinkedIn
- [ ] Respects privacy settings (only exports visible fields)
- [ ] Downloads as .vcf file
- [ ] Works offline (exports from local cache)

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/lib/vCardGenerator.ts

---

### Epic 5: Event Schedule Management

#### US-5.1: Browse Sessions
**As a** user
**I want to** browse the event schedule
**So that** I can discover interesting sessions

**Acceptance Criteria:**
- [ ] Shows all sessions across 3-day event
- [ ] Session details: title, speaker, time, location, description, capacity
- [ ] Filter by:
  - [ ] Day (Jan 28/29/30)
  - [ ] Time slot
  - [ ] Session type (keynote, panel, workshop, demo, etc.)
  - [ ] Featured sessions
- [ ] Search by keyword (title, speaker, description)
- [ ] Toggle between list view and timeline view
- [ ] Shows RSVP status and capacity (e.g., "45/50 registered")
- [ ] Works offline (cached data, 24-hour TTL)

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/pages/Schedule.tsx

#### US-5.2: RSVP to Sessions
**As a** user
**I want to** RSVP to sessions
**So that** I can plan my schedule and receive updates

**Acceptance Criteria:**
- [ ] Tap "RSVP" button to register
- [ ] Confirmation dialog if session conflicts with existing RSVP
- [ ] Auto-waitlist if session at capacity
- [ ] Confirmation message shows RSVP status (confirmed/waitlisted)
- [ ] Email confirmation sent (if user opted in)
- [ ] Can cancel RSVP from session details or My Schedule
- [ ] RSVP count updates in real-time
- [ ] Works offline (queued for sync)

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/pages/Schedule.tsx

#### US-5.3: Conflict Detection
**As a** user
**I want to** be warned about scheduling conflicts
**So that** I don't accidentally double-book myself

**Acceptance Criteria:**
- [ ] Conflict dialog shows:
  - [ ] Existing session details
  - [ ] New session details
  - [ ] Overlapping time period
- [ ] Options: "Keep existing", "Switch to new", "Attend both" (if feasible)
- [ ] Can choose to ignore conflict warnings
- [ ] Conflicts highlighted in My Schedule view

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/components/schedule/ConflictDialog.tsx

#### US-5.4: My Schedule View
**As a** user
**I want to** view my personalized schedule
**So that** I can see only sessions I've RSVP'd to

**Acceptance Criteria:**
- [ ] Shows only sessions user has RSVP'd to
- [ ] Grouped by day
- [ ] Timeline view shows visual schedule with time blocks
- [ ] Highlights current/upcoming session
- [ ] Shows conflicts visually (overlapping blocks)
- [ ] Export to calendar (ICS format)
- [ ] Works offline

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/components/schedule/TimelineView.tsx

#### US-5.5: Calendar Export (ICS)
**As a** user
**I want to** export my schedule to my calendar app
**So that** I can integrate event sessions with my personal calendar

**Acceptance Criteria:**
- [ ] Export individual session or entire schedule
- [ ] ICS format compatible with Google Calendar, Apple Calendar, Outlook
- [ ] Includes: title, time, location, description, speaker
- [ ] Downloads as .ics file
- [ ] Works offline

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/lib/icsGenerator.ts

#### US-5.6: Session Recommendations
**As a** user
**I want to** receive personalized session recommendations
**So that** I discover sessions relevant to my interests

**Acceptance Criteria:**
- [ ] Recommendations based on user's research interests
- [ ] Scored by relevance
- [ ] Badge/tag indicates "Recommended for you"
- [ ] Can dismiss recommendations
- [ ] Refreshes daily

**Priority:** P2 (Medium)
**Reference:** Supabase function personalized-recommendations

---

### Epic 6: Research Projects & Opportunities

#### US-6.1: Browse NPS Research Projects
**As a** user
**I want to** browse NPS research projects
**So that** I can discover collaboration opportunities

**Acceptance Criteria:**
- [ ] List shows: project title, PI name, department, stage, description
- [ ] Filter by:
  - [ ] Department
  - [ ] Research stage (concept, active, completed)
  - [ ] Classification level (unclassified, FOUO, classified)
  - [ ] Research areas (AI/ML, cybersecurity, robotics, etc.)
  - [ ] Seeking (funding, students, industry partners, etc.)
- [ ] Search by keyword
- [ ] Tap to view full project details
- [ ] Shows: description, PI contact, keywords, demo schedule, students
- [ ] Works offline (cached data)

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Opportunities.tsx

#### US-6.2: Browse Military/Gov Opportunities
**As a** user
**I want to** browse military and government opportunities
**So that** I can find funding, internships, and collaboration opportunities

**Acceptance Criteria:**
- [ ] List shows: opportunity title, sponsor org, type, deadline, status
- [ ] Filter by:
  - [ ] Opportunity type (funding, internship, job, collaboration)
  - [ ] Status (open, closing soon, closed)
  - [ ] DoD alignment (SBIR, STTR, OTA, etc.)
  - [ ] Featured opportunities
- [ ] Search by keyword
- [ ] Tap to view full details
- [ ] Shows: description, benefits, requirements, contact, deadline
- [ ] Works offline

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Opportunities.tsx

#### US-6.3: Bookmark Projects
**As a** user
**I want to** bookmark projects/opportunities
**So that** I can easily find them later

**Acceptance Criteria:**
- [ ] Tap bookmark icon to save
- [ ] Bookmarks persist across sessions
- [ ] View all bookmarks in dedicated tab
- [ ] Remove bookmarks with single tap
- [ ] Export bookmarks to CSV
- [ ] Works offline

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/pages/Opportunities.tsx (bookmark functionality)

#### US-6.4: Express Interest in Projects
**As a** user
**I want to** express interest in projects/opportunities
**So that** the project owner knows I want to learn more

**Acceptance Criteria:**
- [ ] "Express Interest" button on project details
- [ ] Optional message to project owner (500 chars)
- [ ] Notification sent to project owner
- [ ] Interest tracked for admin analytics
- [ ] Can withdraw interest
- [ ] Works offline (queued for sync)

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/integrations/supabase/types.ts (opportunity_interests table)

#### US-6.5: CSV Export for CRM
**As a** user (admin/industry)
**I want to** export project/contact data to CSV
**So that** I can import into Salesforce, HubSpot, or other CRM systems

**Acceptance Criteria:**
- [ ] Export bookmarked projects with contact info
- [ ] Export connections with collaborative intents
- [ ] CSV format compatible with Salesforce and HubSpot
- [ ] Respects privacy settings (only exports visible fields)
- [ ] Downloads as .csv file

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/lib/csvExporter.ts

---

### Epic 7: Industry Partner Directory

#### US-7.1: Browse Industry Partners
**As a** user
**I want to** browse exhibiting industry partners
**So that** I can learn about companies and plan booth visits

**Acceptance Criteria:**
- [ ] List shows: company name, logo, description, booth location
- [ ] Filter by:
  - [ ] Organization type (large defense contractor, small business, startup, nonprofit)
  - [ ] Technology focus areas (AI/ML, cyber, autonomous systems, etc.)
  - [ ] Seeking collaboration types
  - [ ] DoD sponsors
- [ ] Search by company name or keyword
- [ ] Tap to view full partner profile
- [ ] Shows: description, website, team members, contact info, booth location
- [ ] Works offline

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Industry.tsx

#### US-7.2: Favorite Partners
**As a** user
**I want to** favorite industry partners
**So that** I remember which booths to visit

**Acceptance Criteria:**
- [ ] Tap star icon to favorite
- [ ] Favorites persist across sessions
- [ ] View all favorites in dedicated tab
- [ ] Booth locations visible on favorites list
- [ ] Works offline

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/integrations/supabase/types.ts (industry_favorites table)

#### US-7.3: Partner Privacy Controls
**As an** industry partner
**I want to** control visibility of contact information
**So that** we can manage inbound inquiries

**Acceptance Criteria:**
- [ ] "Hide contact info" toggle on partner profile
- [ ] When hidden, email/phone not shown to attendees
- [ ] Primary contact info only visible to admins
- [ ] Privacy-aware view enforced via database RLS

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/integrations/supabase/types.ts (industry_partners_safe view)

---

### Epic 8: Messaging System

#### US-8.1: Send Direct Messages
**As a** user
**I want to** send direct messages to other attendees
**So that** I can follow up on connections

**Acceptance Criteria:**
- [ ] Send message from profile or connections list
- [ ] Character limit: 1000 per message
- [ ] Real-time delivery via WebSocket (when online)
- [ ] Queued for delivery when offline
- [ ] Message status: sending, sent, delivered, read
- [ ] Error handling for failed delivery
- [ ] Can edit message within 5 minutes of sending

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Messages.tsx

#### US-8.2: Conversation List
**As a** user
**I want to** view all my conversations
**So that** I can manage my messages

**Acceptance Criteria:**
- [ ] Shows: contact name, avatar, last message preview, timestamp
- [ ] Unread message indicator (badge count)
- [ ] Sort by most recent activity
- [ ] Tap to open conversation
- [ ] Search conversations by contact name
- [ ] Works offline (shows cached messages)

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Messages.tsx

#### US-8.3: Read Receipts
**As a** user
**I want to** see when my messages are read
**So that** I know if the recipient saw my message

**Acceptance Criteria:**
- [ ] Read receipt sent when message viewed
- [ ] Visual indicator: checkmarks (sent, delivered, read)
- [ ] Timestamp shows when message was read
- [ ] Read receipts sent in real-time (when online)
- [ ] Works offline (queued for sync)

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/integrations/supabase/types.ts (message_read_receipts table)

#### US-8.4: Message Rate Limiting
**As a** system
**I want to** rate-limit messaging
**So that** we prevent spam and abuse

**Acceptance Criteria:**
- [ ] Limit: 40 messages per user per day
- [ ] Clear error message when limit reached
- [ ] Limit resets at midnight UTC
- [ ] Admins exempt from rate limit
- [ ] Rate limit tracked server-side (can't be bypassed)

**Priority:** P1 (High)
**Reference:** /loveable-converge Supabase edge function with rate limiting

#### US-8.5: Messaging Privacy Opt-Out
**As a** user
**I want to** disable messaging
**So that** I control who can contact me

**Acceptance Criteria:**
- [ ] "Allow messaging" toggle in privacy settings
- [ ] When disabled, "Message" button hidden on profile
- [ ] Existing conversations remain accessible
- [ ] Can't receive new message threads when disabled
- [ ] Changes take effect immediately

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/integrations/supabase/types.ts (allow_messaging field)

---

### Epic 9: Progressive Web App (PWA)

#### US-9.1: App Installation
**As a** mobile user
**I want to** install the app to my home screen
**So that** I can access it like a native app

**Acceptance Criteria:**
- [ ] Installation prompt shown after onboarding (iOS/Android)
- [ ] App icon appears on home screen when installed
- [ ] Standalone mode (no browser UI)
- [ ] Splash screen shown on app launch
- [ ] App name: "Converge@NPS"
- [ ] Custom icons: 192x192, 512x512, maskable variants
- [ ] iOS-specific splash screens for various device sizes

**Priority:** P1 (High)
**Reference:** /loveable-converge/vite.config.ts (PWA manifest)

#### US-9.2: Offline Functionality
**As a** user
**I want to** use core features when offline
**So that** I can continue using the app without internet

**Acceptance Criteria:**
- [ ] Offline-capable features:
  - [ ] View cached profiles, schedule, partners, projects
  - [ ] Scan QR codes (queued for sync)
  - [ ] Add connection notes
  - [ ] RSVP to sessions (queued)
  - [ ] Bookmark projects
  - [ ] Send messages (queued)
  - [ ] View my profile/QR badge
- [ ] Offline indicator shows when disconnected
- [ ] Stale data banner if cached data >24 hours old
- [ ] Auto-sync when connection restored
- [ ] Clear visual feedback for queued actions

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/src/lib/offlineQueue.ts, service worker

#### US-9.3: Service Worker Caching
**As a** system
**I want to** cache assets and data for offline use
**So that** the app loads quickly and works offline

**Acceptance Criteria:**
- [ ] Cache strategy: Network-first with 24-hour TTL
- [ ] Cached resources:
  - [ ] App shell (HTML, CSS, JS)
  - [ ] User profiles (24-hour TTL)
  - [ ] Event schedule (24-hour TTL)
  - [ ] Industry partners (24-hour TTL)
  - [ ] Projects (24-hour TTL)
  - [ ] Static assets (images, icons)
- [ ] Auto-update: New service worker activates on app restart
- [ ] Skip waiting on update (immediate activation)

**Priority:** P0 (Critical)
**Reference:** /loveable-converge/vite.config.ts (vite-plugin-pwa configuration)

#### US-9.4: Background Sync
**As a** user
**I want to** offline actions synced automatically
**So that** I don't have to manually retry

**Acceptance Criteria:**
- [ ] Background sync for:
  - [ ] QR scans
  - [ ] Connection notes
  - [ ] Session RSVPs
  - [ ] Messages
  - [ ] Bookmarks
  - [ ] Interest expressions
- [ ] Exponential backoff: 2, 4, 8, 10 minutes (max)
- [ ] Pauses sync when tab hidden (visibility detection)
- [ ] Resumes sync when tab visible
- [ ] Manual retry button for failed syncs
- [ ] Toast notifications for sync success/failure

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/lib/syncService.ts

---

### Epic 10: Admin Dashboard

#### US-10.1: User Management
**As an** admin
**I want to** manage user accounts
**So that** I can support attendees and enforce policies

**Acceptance Criteria:**
- [ ] Search users by name, email, organization
- [ ] View user details: profile, role, activity, connections count
- [ ] Assign/remove roles (student, faculty, industry, staff, admin)
- [ ] Reset user password
- [ ] Suspend/unsuspend account
- [ ] View role history (audit trail)
- [ ] Export user list to CSV

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/Admin.tsx

#### US-10.2: Data Import from Smartsheet
**As an** admin
**I want to** import data from Smartsheet
**So that** I don't have to manually enter schedule, partners, and projects

**Acceptance Criteria:**
- [ ] Import industry partners from Smartsheet
- [ ] Import research projects from Smartsheet
- [ ] Import event schedule from Smartsheet
- [ ] One-click import with progress indicator
- [ ] Import history tracked (who, when, how many records)
- [ ] Error handling: validation failures logged
- [ ] Duplicate detection (updates existing records)
- [ ] Manual refresh or scheduled daily sync

**Priority:** P1 (High)
**Reference:** /loveable-converge Supabase functions: import-partners-from-smartsheet, import-research-from-smartsheet, import-schedule-from-smartsheet

#### US-10.3: Data Export to Smartsheet
**As an** admin
**I want to** export registration data to Smartsheet
**So that** event organizers can access data in their preferred tool

**Acceptance Criteria:**
- [ ] Export attendee registrations with fields:
  - [ ] Name, email, phone, organization, role, registration date
- [ ] Export to designated Smartsheet workspace
- [ ] One-click export with progress indicator
- [ ] Error handling with retry option

**Priority:** P2 (Medium)
**Reference:** /loveable-converge Supabase function: export-registrations

#### US-10.4: Data Export to Raiser's Edge
**As an** admin
**I want to** export connection data to Raiser's Edge
**So that** development team can follow up for fundraising

**Acceptance Criteria:**
- [ ] Export industry-faculty/student connections
- [ ] Format compatible with Raiser's Edge import
- [ ] Includes: contact info, connection date, collaborative intents
- [ ] Respects privacy settings (only exports visible fields)
- [ ] Download as CSV

**Priority:** P2 (Medium)
**Reference:** /loveable-converge Supabase function: export-raisers-edge

#### US-10.5: Analytics Dashboard
**As an** admin
**I want to** view platform usage analytics
**So that** I can measure event success and identify issues

**Acceptance Criteria:**
- [ ] Metrics displayed:
  - [ ] Total users, active users (last 24h)
  - [ ] Connections created (total, per day)
  - [ ] Session RSVPs (total, per session)
  - [ ] Messages sent
  - [ ] QR scans
  - [ ] Project/opportunity interests
  - [ ] Top research areas by interest
  - [ ] Top collaborative intents
- [ ] Charts: line graphs (over time), bar charts (by category)
- [ ] Date range filter
- [ ] Export analytics to CSV

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/pages/Admin.tsx (analytics section)

---

### Epic 11: Staff Check-In System

#### US-11.1: Attendee Check-In
**As a** staff member
**I want to** check in pre-registered attendees
**So that** we track event attendance

**Acceptance Criteria:**
- [ ] Search attendee by name, email, or partial ID
- [ ] Scan attendee QR code for fast check-in
- [ ] Shows attendee details before confirming check-in
- [ ] One-tap check-in button
- [ ] Confirmation message with timestamp
- [ ] Already checked-in attendees flagged (can't check in twice)
- [ ] Works offline (queued for sync)

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/pages/StaffCheckin.tsx

#### US-11.2: Walk-In Registration
**As a** staff member
**I want to** register walk-in attendees
**So that** we can accommodate unregistered guests

**Acceptance Criteria:**
- [ ] Quick registration form: name, email, phone, organization, role
- [ ] Auto-creates user account (temporary password sent via email)
- [ ] Marks as walk-in registration (tracked separately)
- [ ] Checks in attendee immediately after registration
- [ ] Works offline (queued for sync)

**Priority:** P1 (High)
**Reference:** /loveable-converge Supabase function: walk-in-registration

#### US-11.3: Real-Time Attendance Stats
**As a** staff member
**I want to** see real-time check-in statistics
**So that** I can monitor event attendance

**Acceptance Criteria:**
- [ ] Shows:
  - [ ] Total checked-in vs. registered
  - [ ] Check-ins in last hour
  - [ ] Walk-ins vs. pre-registered
  - [ ] Check-ins by role (student, faculty, industry, military)
- [ ] Auto-refreshes every 30 seconds
- [ ] Works offline (shows cached data)

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/pages/StaffCheckin.tsx (stats section)

---

### Epic 12: Security & Privacy

#### US-12.1: Session Management
**As a** user
**I want to** automatic session timeout after inactivity
**So that** my account is protected if I leave my device unattended

**Acceptance Criteria:**
- [ ] Session expires after 30 minutes of inactivity
- [ ] Warning dialog 2 minutes before timeout
- [ ] Option to extend session from warning dialog
- [ ] Auto-logout on timeout
- [ ] Session persists across browser/app restarts (until 30 days)
- [ ] "Remember me" extends session to 30 days

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/components/auth/SessionTimeoutDialog.tsx

#### US-12.2: Re-Authentication for Sensitive Actions
**As a** user
**I want to** re-enter my password for sensitive actions
**So that** my account is protected from unauthorized changes

**Acceptance Criteria:**
- [ ] Re-auth required for:
  - [ ] Changing password
  - [ ] Changing email
  - [ ] Account deletion
  - [ ] Privacy setting changes (admin-level)
- [ ] Re-auth modal prompts for password
- [ ] Re-auth session valid for 5 minutes
- [ ] Clear error message on incorrect password

**Priority:** P2 (Medium)
**Reference:** /loveable-converge/src/components/auth/ReauthModal.tsx

#### US-12.3: Security Audit Logging
**As a** system
**I want to** log security-relevant events
**So that** we can detect and respond to suspicious activity

**Acceptance Criteria:**
- [ ] Events logged:
  - [ ] Login attempts (success/failure)
  - [ ] Password resets
  - [ ] Role changes
  - [ ] Account suspensions
  - [ ] Failed authorization attempts
  - [ ] Privacy setting changes
  - [ ] Data exports
- [ ] Log includes: user ID, event type, timestamp, IP address, user agent
- [ ] Logs retained for 90 days
- [ ] Admin can search/filter audit logs

**Priority:** P1 (High)
**Reference:** /loveable-converge/src/integrations/supabase/types.ts (security_audits table)

#### US-12.4: Automated Security Scans
**As a** system
**I want to** run weekly automated security scans
**So that** we detect vulnerabilities proactively

**Acceptance Criteria:**
- [ ] Weekly scans check:
  - [ ] Inactive accounts (>90 days, auto-suspend)
  - [ ] Multiple failed login attempts (flag for review)
  - [ ] Anomalous data access patterns
  - [ ] Suspicious messaging patterns (spam detection)
- [ ] Findings logged to security_audits table
- [ ] Email alert to admins for critical findings
- [ ] Scheduled via Supabase cron job

**Priority:** P2 (Medium)
**Reference:** /loveable-converge Supabase function: security-audit

---

## 6. Functional Requirements

### Authentication & Authorization
- [x] Email/password registration with email verification
- [x] Password reset via email
- [x] Optional SMS phone verification
- [x] Role-based access control (student, faculty, industry, staff, admin)
- [x] Session management with 30-minute inactivity timeout
- [x] Re-authentication for sensitive operations
- [x] Multi-factor authentication (phone verification)

### User Profile Management
- [x] Create/edit user profile (name, email, phone, organization, role, bio, avatar, URLs)
- [x] Granular privacy controls (10+ visibility toggles)
- [x] QR code badge generation and display
- [x] Account deletion with data anonymization

### QR Code Networking
- [x] QR code scanner with camera access
- [x] Manual code entry fallback
- [x] Collaborative intent tracking (multi-select)
- [x] Connection notes (private)
- [x] Follow-up reminders
- [x] Offline scan queue with auto-sync

### Connection Management
- [x] View connections list
- [x] Search/filter connections
- [x] AI-powered connection recommendations
- [x] vCard export (Google/Apple/Outlook)

### Event Schedule
- [x] Browse all sessions with filters (day, time, type)
- [x] Session search by keyword
- [x] RSVP to sessions with capacity tracking
- [x] Conflict detection and resolution
- [x] Personalized schedule view
- [x] Timeline visualization
- [x] Calendar export (ICS format)
- [x] Session recommendations based on interests

### Research Projects & Opportunities
- [x] Browse NPS research projects with filters
- [x] Browse military/government opportunities
- [x] Project bookmarking
- [x] Express interest with optional message
- [x] CSV export for CRM integration

### Industry Partners
- [x] Browse industry partner directory
- [x] Filter by org type, tech focus, collaboration type
- [x] Favorite partners
- [x] Partner privacy controls

### Messaging
- [x] Direct messaging between attendees
- [x] Real-time message delivery (WebSocket)
- [x] Offline message queue
- [x] Read receipts
- [x] Message editing (5-minute window)
- [x] Rate limiting (40 messages/day)
- [x] Messaging privacy opt-out

### Progressive Web App
- [x] Installable to home screen (iOS/Android)
- [x] Offline functionality for core features
- [x] Service worker with 24-hour cache TTL
- [x] Background sync with exponential backoff
- [x] Offline/sync status indicators

### Admin Dashboard
- [x] User management (search, view, edit roles, suspend)
- [x] Smartsheet data import (partners, projects, schedule)
- [x] Smartsheet export (registrations)
- [x] Raiser's Edge export
- [x] Analytics dashboard
- [x] Audit log viewer

### Staff Check-In
- [x] Search and check in attendees
- [x] QR code scan for fast check-in
- [x] Walk-in registration
- [x] Real-time attendance stats

### Security & Compliance
- [x] Audit logging for security events
- [x] Automated security scans (weekly)
- [x] Row-level security (RLS) policies
- [x] Data encryption at rest and in transit
- [x] GDPR compliance (right to be forgotten)

---

## 7. Non-Functional Requirements

### Performance
- **Page Load Time:** <2 seconds (p95) for initial load, <1 second for subsequent navigations (SPA)
- **API Response Time:** <500ms (p95) for database queries, <200ms (p50)
- **Time to Interactive:** <3 seconds (p95) on 3G mobile connection
- **Concurrent Users:** Support 500+ simultaneously without degradation
- **Database Query Performance:** Optimized indexes for all filter/search operations
- **Asset Optimization:** Code splitting, lazy loading, image optimization (WebP/AVIF)
- **Bundle Size:** <500KB initial JS bundle (gzipped)

### Security
- **Data Encryption:** TLS 1.3 for all data in transit; AES-256 encryption at rest for sensitive fields (passwords, auth tokens)
- **Authentication:** Bcrypt password hashing (cost factor 12); JWT tokens with 30-day expiration
- **Authorization:** Row-level security (RLS) policies enforced at database level; role checks on all admin endpoints
- **OWASP Top 10:** All vulnerabilities addressed (SQL injection, XSS, CSRF, etc.)
- **Security Headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Rate Limiting:** Per-user limits on messaging (40/day), SMS verification (3/hour), API requests (1000/hour)
- **Audit Logging:** All security events logged with 90-day retention
- **Vulnerability Scanning:** Weekly automated scans via Supabase edge function
- **Secrets Management:** API keys stored in environment variables; never committed to git

### Usability
- **Mobile-First Design:** Optimized for mobile (>70% of users expected on mobile)
- **Touch Targets:** 44x44px minimum (Apple HIG compliant)
- **Accessibility:** WCAG 2.1 AA compliance; all images have alt text; keyboard navigation; screen reader tested
- **Browser Support:** Latest 2 versions of Chrome, Safari, Firefox, Edge
- **Responsive Breakpoints:** Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
- **Loading States:** Skeleton screens, progress indicators for all async operations
- **Error Handling:** User-friendly error messages; no technical jargon exposed to users
- **Onboarding:** Guided multi-step onboarding with progress indicator

### Scalability
- **User Growth:** Support 2,000 users (4x initial target) without architecture changes
- **Database:** PostgreSQL with connection pooling; supports 10,000+ connections/messages/RSVPs
- **Horizontal Scaling:** Stateless API design allows multiple server instances
- **CDN:** Static assets served via CDN for global distribution
- **Database Indexing:** Strategic indexes on all high-traffic queries
- **Query Optimization:** N+1 query prevention; batch loading via DataLoader pattern

### Reliability
- **Uptime SLA:** 99.5% during event dates (Jan 28-30); 99% otherwise
- **Automated Backups:** Daily full backups; 30-day retention; point-in-time recovery
- **Disaster Recovery:** <4 hour RTO (recovery time objective), <1 hour RPO (recovery point objective)
- **Health Checks:** Automated monitoring with alerting for API, database, and service worker
- **Graceful Degradation:** Non-critical features fail gracefully without affecting core functionality
- **Error Tracking:** Sentry or similar for client-side error monitoring
- **Logging:** Structured logging with log aggregation (CloudWatch, DataDog, or similar)

### Maintainability
- **Code Quality:** ESLint + Prettier for consistent code style; TypeScript for type safety
- **Test Coverage:** >80% unit test coverage; integration tests for critical paths; E2E tests for user flows
- **Documentation:** Inline code comments for complex logic; README with setup instructions; API documentation (OpenAPI/Swagger)
- **Version Control:** Git with feature branch workflow; semantic versioning
- **CI/CD:** Automated testing and deployment via GitHub Actions or similar
- **Dependency Management:** Regular dependency updates; security vulnerability scanning

### Observability
- **Application Monitoring:** Real-time dashboards for API latency, error rates, user activity
- **Database Monitoring:** Query performance, connection pool usage, slow query logging
- **User Analytics:** Google Analytics or Mixpanel for user behavior tracking
- **Alerting:** PagerDuty or similar for critical alerts (downtime, error spikes, security events)
- **Metrics:** Prometheus + Grafana or CloudWatch for infrastructure and application metrics

---

## 8. User Experience & Design

### Key Screens/Pages

1. **Authentication**
   - Login/Register screen with email/password
   - Phone verification screen (SMS code input)
   - Password reset flow

2. **Onboarding**
   - Welcome screen
   - Profile completion wizard
   - Privacy settings configuration
   - Feature tour (QR, schedule, opportunities, messaging)
   - PWA installation prompt

3. **Home Dashboard**
   - Quick actions (Scan QR, View Schedule, Browse Projects)
   - Recommended connections
   - Upcoming sessions (today's schedule)
   - Unread message count

4. **Profile**
   - View own profile with QR badge
   - Edit profile screen
   - Privacy settings
   - Account deletion

5. **QR Scanner**
   - Camera viewfinder with overlay
   - Manual code entry
   - Intent selection dialog
   - Profile preview (privacy-aware)
   - Connection confirmation

6. **Connections**
   - List of all connections
   - Search/filter controls
   - Recommended connections
   - Export to vCard

7. **Schedule**
   - Session list with filters (day, time, type)
   - Session details modal
   - My Schedule view
   - Timeline visualization
   - RSVP/conflict dialogs

8. **Opportunities**
   - Tabs: NPS Projects, Military/Gov Opportunities
   - Filter sidebar
   - Project/opportunity cards
   - Bookmarks tab
   - Express interest dialog

9. **Industry Partners**
   - Partner directory with filters
   - Partner detail modal
   - Favorites tab

10. **Messages**
    - Conversation list with unread indicators
    - Chat interface with real-time updates
    - Message composition

11. **Admin Dashboard** (role-restricted)
    - User management
    - Data import/export
    - Analytics charts
    - Audit log viewer

12. **Staff Check-In** (role-restricted)
    - Attendee search
    - QR scan check-in
    - Walk-in registration
    - Attendance stats

### Design Principles

1. **Mobile-First** - Design for small screens first; progressively enhance for larger screens
2. **Privacy-Aware** - Respect user privacy settings throughout the app; clear indicators of what's visible to others
3. **Offline-Capable** - Provide feedback for offline status; queue actions for sync; visual indicators for cached data
4. **Accessible** - WCAG 2.1 AA compliance; keyboard navigation; screen reader support; sufficient color contrast
5. **Consistent** - Reuse design patterns from shadcn/ui; consistent spacing, typography, colors
6. **Performant** - Skeleton screens, optimistic updates, lazy loading, code splitting
7. **Clear Feedback** - Loading states, success/error toasts, confirmation dialogs for destructive actions
8. **Minimal Cognitive Load** - Progressive disclosure; simple forms; clear calls-to-action

### Design System

**Framework:** shadcn/ui built on Radix UI primitives
**Styling:** Tailwind CSS with custom design tokens
**Icons:** Lucide React
**Themes:** Light and dark mode support via next-themes
**Typography:** System font stack (sans-serif)
**Colors:** HSL color system with CSS variables for theming
**Spacing:** Tailwind's 4px base spacing scale

### Wireframes/Mockups

**Reference Implementation:** https://github.com/timveo/loveable-converge
All UI/UX patterns, component designs, and user flows from loveable-converge will be replicated in Converge-NPS. The focus of this rebuild is backend architecture, not UI redesign.

---

## 9. Technical Constraints

### Must Maintain (from loveable-converge)
- **UI/UX Patterns:** All screens, components, and user flows from reference implementation
- **Component Library:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS with design tokens
- **PWA Capabilities:** Offline-first, installable, service worker caching
- **Mobile Optimizations:** Touch targets, haptic feedback, safe area insets

### Must Improve (enterprise requirements)
- **Backend Architecture:** Replace Supabase prototype backend with production-ready architecture
  - Custom backend API (Node.js/Express or FastAPI)
  - Proper database schema design with migrations
  - Horizontal scalability support
  - Comprehensive error handling
  - API rate limiting and abuse prevention
- **Database:** PostgreSQL with optimized schema, indexes, and RLS policies
- **Authentication:** Enterprise-grade auth with session management, refresh tokens, MFA
- **Real-Time:** WebSocket server for messaging and notifications (not Supabase Realtime)
- **Monitoring:** Application monitoring, logging, alerting (Prometheus, Grafana, Sentry)
- **Testing:** >80% test coverage with unit, integration, and E2E tests
- **CI/CD:** Automated testing, deployment, database migrations
- **Infrastructure:** Tier 2/3 deployment (Railway, Render, or Kubernetes)

### Technology Stack (to be finalized by Architect)
- **Frontend:** React 18 + TypeScript + Vite (maintained from reference)
- **Backend:** TBD by Architect (Node.js/Express or Python/FastAPI)
- **Database:** PostgreSQL (maintained) + Redis for caching
- **Real-Time:** WebSocket server (TBD: Socket.io, WS, or similar)
- **Storage:** Cloud storage for avatars (S3-compatible)
- **Email:** SendGrid, AWS SES, or similar
- **SMS:** Twilio or similar
- **Monitoring:** Prometheus + Grafana, CloudWatch, or DataDog
- **Error Tracking:** Sentry
- **Deployment:** Railway, Render, or Kubernetes (Tier 2/3 capable)

### Integration Requirements
- **Smartsheet API:** Bidirectional sync (import partners/projects/schedule; export registrations)
- **CRM Systems:** CSV export format compatible with Salesforce, HubSpot
- **Calendar Systems:** ICS export for Google Calendar, Apple Calendar, Outlook
- **Raiser's Edge:** CSV export for fundraising platform

---

## 10. Dependencies & Integrations

### External Services

**Smartsheet**
- **Purpose:** Data source for industry partners, research projects, event schedule
- **Integration:** REST API with OAuth2
- **Frequency:** Manual import by admin; optional daily scheduled sync
- **Direction:** Import (Smartsheet → Converge-NPS) and Export (registrations)

**SMS Provider** (Twilio or similar)
- **Purpose:** Phone verification codes, optional event notifications
- **Integration:** REST API
- **Rate Limit:** 3 verification attempts per user per hour
- **Cost:** ~$0.02 per SMS

**Email Provider** (SendGrid, AWS SES, or similar)
- **Purpose:** Email verification, password reset, session RSVPs, system notifications
- **Integration:** SMTP or REST API
- **Volume:** 1,000-2,000 emails during event week

**Cloud Storage** (AWS S3, Cloudflare R2, or similar)
- **Purpose:** Avatar image storage
- **Integration:** S3-compatible API
- **Storage:** <10GB (500 users × 2MB avg)

**Calendar Systems**
- **Purpose:** Export user schedules to personal calendars
- **Integration:** ICS file generation (no API required)
- **Compatibility:** Google Calendar, Apple Calendar, Outlook

**CRM Systems** (Salesforce, HubSpot)
- **Purpose:** Export connection data for post-event follow-up
- **Integration:** CSV export (no API required)
- **Format:** Standard CRM import format

**Raiser's Edge**
- **Purpose:** Export industry-faculty/student connections for fundraising
- **Integration:** CSV export (no API required)

### Internal Integrations

**Database (PostgreSQL)**
- **Purpose:** Primary data store
- **Version:** PostgreSQL 15+
- **Features:** Row-level security, full-text search, JSONB support

**Cache (Redis)**
- **Purpose:** Session storage, rate limiting, real-time pub/sub
- **Version:** Redis 7+
- **Features:** TTL support, pub/sub for real-time messaging

**Service Worker**
- **Purpose:** Offline caching, background sync
- **Technology:** Workbox via vite-plugin-pwa

**WebSocket Server**
- **Purpose:** Real-time messaging, notifications
- **Technology:** TBD by Architect (Socket.io or native WS)

---

## 11. Release Plan

### MVP (Phase 1) - Weeks 1-8
**Target Date:** Week 8
**Features:**
- [ ] Authentication (email/password, phone verification)
- [ ] User profiles with privacy controls
- [ ] QR code networking (scan, manual entry, collaborative intents)
- [ ] Connections list with search/filter
- [ ] Event schedule (browse, RSVP, conflict detection)
- [ ] Basic offline functionality (scan queue, cached data)
- [ ] PWA installation
- [ ] Admin user management

### Phase 2 - Weeks 9-12
**Target Date:** Week 12
**Features:**
- [ ] Research projects & opportunities (browse, bookmark, express interest)
- [ ] Industry partner directory
- [ ] Direct messaging with read receipts
- [ ] Connection recommendations (AI-powered)
- [ ] Full offline sync (background sync service)
- [ ] Staff check-in system
- [ ] Smartsheet import (partners, projects, schedule)
- [ ] Export utilities (vCard, ICS, CSV)

### Phase 3 - Weeks 13-14 (Testing & QA)
**Target Date:** Week 14
**Features:**
- [ ] Comprehensive QA testing (functional, UI, API, performance)
- [ ] Security audit and penetration testing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Load testing (500+ concurrent users)
- [ ] Bug fixes and refinements
- [ ] User acceptance testing (UAT) with small group

### Phase 4 - Weeks 15-16 (Deployment & Pre-Event)
**Target Date:** Week 16 (4 weeks before event)
**Features:**
- [ ] Production deployment to Tier 2 infrastructure
- [ ] Monitoring and alerting configured
- [ ] Database backups and disaster recovery tested
- [ ] User onboarding begins (pre-event registration)
- [ ] Documentation finalized (user guides, admin manual)
- [ ] Staff training sessions

### Event Week (Weeks 17-18)
**Target Date:** Jan 28-30, 2026
**Activities:**
- [ ] 24/7 monitoring and support
- [ ] Real-time issue resolution
- [ ] Performance optimization as needed
- [ ] Daily data exports to Smartsheet
- [ ] Post-event analytics preparation

### Post-Event (Weeks 19-20)
**Target Date:** Week 20
**Activities:**
- [ ] Post-event survey deployment
- [ ] Analytics report generation
- [ ] Data export to Raiser's Edge for fundraising
- [ ] CRM exports for partner follow-up
- [ ] Lessons learned documentation
- [ ] Platform archived or transitioned to maintenance mode

---

## 12. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Backend rebuild takes longer than estimated** | High - Could delay launch | Medium | Start backend development immediately after architecture approval; prioritize MVP features; architect designs for modularity to enable parallel development |
| **Poor cellular connectivity at event venue** | High - Core networking features affected | Medium | Offline-first architecture is critical; extensive offline testing required; pre-load all data to devices before event; local WiFi backup |
| **Smartsheet API changes or rate limits** | Medium - Data import/export disrupted | Low | Implement robust error handling; cache imported data; manual CSV import/export as fallback; test integration thoroughly in staging |
| **Security vulnerability discovered before event** | High - Could compromise attendee data | Low | Weekly automated security scans; penetration testing before launch; bug bounty program; security-focused code reviews |
| **Performance degradation under load** | High - Poor user experience | Medium | Load testing with 2x expected users; database query optimization; CDN for static assets; horizontal scaling capability; performance monitoring in production |
| **Adoption resistance (users prefer business cards)** | Medium - Low engagement metrics | Medium | Clear onboarding with value proposition; staff evangelism at event; QR code prominently displayed on badges; gamification (connection leaderboard) |
| **Privacy concerns from military/industry users** | Medium - User opt-outs reduce networking value | Medium | Granular privacy controls; clear privacy policy; opt-in by default for sensitive fields; privacy indicator always visible |
| **Messaging spam or abuse** | Medium - User complaints, platform reputation | Low | Rate limiting (40 messages/day); user reporting mechanism; admin moderation tools; automated spam detection |
| **Data export failure to CRM/Raiser's Edge** | Low - Manual export required | Low | Thoroughly test export formats with actual Salesforce/RE instances; CSV validation; export preview before download |
| **Service worker bugs cause app to break** | High - App unusable | Low | Extensive service worker testing on iOS/Android; skip waiting strategy for immediate updates; manual cache clear option; error tracking |
| **Insufficient admin staff during event** | Medium - Slow issue resolution | Medium | Comprehensive admin documentation; staff training sessions; on-call developer support; self-service features reduce admin burden |
| **Third-party API outages (SMS, email, Smartsheet)** | Medium - Features unavailable | Medium | Graceful degradation; queue failed API calls for retry; manual workarounds documented; status page monitoring |

---

## 13. Open Questions

1. **Backend Technology Choice:** Should we use Node.js/Express (consistency with frontend) or Python/FastAPI (better for data integrations)?
   - **Decision Owner:** Architect
   - **Timeline:** Week 1 (Architecture phase)

2. **Real-Time Architecture:** Socket.io vs. native WebSockets vs. Server-Sent Events for messaging?
   - **Decision Owner:** Architect
   - **Timeline:** Week 1 (Architecture phase)

3. **Deployment Platform:** Railway, Render, or self-managed Kubernetes?
   - **Decision Owner:** DevOps Engineer
   - **Timeline:** Week 2 (Architecture phase)

4. **AI Recommendations:** Should we use simple heuristics (low cost, fast) or ML model (better quality, higher cost)?
   - **Decision Owner:** Product Manager + Architect
   - **Timeline:** Week 3 (after MVP features prioritized)

5. **Smartsheet Sync Frequency:** Manual import only, or scheduled daily/hourly sync?
   - **Decision Owner:** Product Manager + Admin stakeholders
   - **Timeline:** Week 4 (during development)

6. **Message Encryption:** Should messages be end-to-end encrypted or server-side encrypted?
   - **Decision Owner:** Security Engineer + Architect
   - **Timeline:** Week 1 (Architecture phase)

7. **Avatar Storage:** Self-hosted (S3) or third-party CDN (Cloudinary, Imgix)?
   - **Decision Owner:** DevOps Engineer
   - **Timeline:** Week 2

8. **Test Coverage Goal:** Is 80% test coverage sufficient, or should we target 90%+ for critical paths?
   - **Decision Owner:** QA Engineer + Tech Lead
   - **Timeline:** Week 3

9. **Analytics Platform:** Google Analytics (free, privacy concerns) vs. self-hosted Matomo vs. paid Mixpanel?
   - **Decision Owner:** Product Manager + DevOps
   - **Timeline:** Week 4

10. **Post-Event Lifecycle:** Archive platform after event, or maintain for future events?
    - **Decision Owner:** Product Owner (NPS stakeholders)
    - **Timeline:** Week 16 (before event)

---

## 14. Approval

### Sign-Off Required

- [ ] **Product Manager Agent** - PRD complete and approved
- [ ] **UX/UI Designer Agent** - Design principles and accessibility requirements approved
- [ ] **Security & Privacy Engineer Agent** - Security and privacy requirements approved
- [ ] **Architect Agent** - Technical requirements and constraints approved
- [ ] **Master Orchestrator** - Overall PRD approved for Architecture phase
- [ ] **Key Stakeholders** - NPS event organizers approve product vision and scope

### Next Steps After Approval

1. **Phase 2: Architecture Design** (Architect Agent)
   - Finalize technology stack (backend framework, real-time architecture, deployment platform)
   - Design database schema with migrations
   - Design API architecture (REST vs. GraphQL, endpoint structure)
   - Design system architecture diagram
   - Define infrastructure requirements (Tier 2/3 deployment)
   - Document in ARCHITECTURE.md

2. **Phase 3: Development** (Frontend, Backend, Data Engineers)
   - Implement features according to user story priorities
   - Build enterprise-grade backend from scratch
   - Migrate UI components from loveable-converge reference
   - Implement offline sync service
   - Set up CI/CD pipeline

3. **Parallel Tracks:**
   - UX/UI Designer provides design specs and accessibility guidance
   - Security Engineer implements security controls and audit logging
   - Data Engineer designs data pipelines and integration architecture
   - QA Engineer creates test plans and automated test suite

---

**Document Version:** 1.0
**Last Updated:** 2025-12-02
**Next Review:** After Architecture phase completion
**Status:** PENDING APPROVAL
