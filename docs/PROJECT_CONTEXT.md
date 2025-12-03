# Project Context

## Project Name
Converge-NPS - Enterprise Event Networking Platform

## Overview
Converge-NPS is an enterprise-grade event networking and collaboration platform for the Naval Postgraduate School's tech accelerator event (January 28-30, 2026). The platform facilitates meaningful connections between students, faculty, industry partners, and military personnel while providing comprehensive event management, research collaboration, and real-time communication capabilities.

This is a production-ready rebuild of the loveable-converge prototype, maintaining the proven UI/UX and feature set while building an enterprise-worthy backend architecture from scratch that can be deployed and scaled in production environments.

## Target Users

### Primary Users
- **NPS Students** - Graduate students seeking research collaborations, internships, and industry connections
- **NPS Faculty** - Researchers and professors looking for industry partnerships and funding opportunities
- **Industry Partners** - Companies exhibiting at the event, seeking talent and research partnerships
- **Military/Government Personnel** - DoD sponsors and stakeholders exploring research opportunities

### Administrative Users
- **Event Staff** - Managing check-ins, registrations, and attendee support
- **System Administrators** - Managing platform data, users, integrations, and security

## Business Goals

1. **Maximize Networking Value** - Enable 500+ attendees to make meaningful connections through QR-based networking with collaborative intent tracking
2. **Streamline Event Operations** - Provide efficient schedule management, RSVP system, and real-time check-in capabilities
3. **Facilitate Research Collaboration** - Connect NPS research projects with industry partners and funding opportunities
4. **Ensure Production Readiness** - Build enterprise-grade backend architecture that can scale, is secure, and maintainable
5. **Enable Offline Operation** - Support full offline functionality for mobile users during the event
6. **Support Data Integration** - Enable seamless data exchange with Smartsheet, CRM systems, and fundraising platforms

## Key Stakeholders

- **Product Owner:** Naval Postgraduate School / Event Organizers
- **Tech Lead:** Multi-Agent Development System Orchestrator
- **Development Team:** 10 specialized AI agents (Product Manager, Architect, Frontend Dev, Backend Dev, Data Engineer, DevOps, QA, Security & Privacy, UX/UI Designer, Orchestrator)
- **Reference Implementation:** loveable-converge (timveo/loveable-converge)

## Project Timeline

- **Start Date:** 2025-12-02
- **Target Event Date:** 2026-01-28 to 2026-01-30
- **Current Phase:** Planning (MVP PRD Creation)
- **Phases (MVP - Simplified):**
  1. Planning & Requirements (Week 1)
  2. Architecture Design (Week 1-2)
  3. Development (Week 3-10) - MVP features only
  4. Testing & QA (Week 11-12)
  5. Deployment (Week 13) - 3 weeks before event
  6. Event Support & Monitoring (Weeks 16-17)
  7. Post-Event Analysis & Phase 2 Planning (Week 18)

## Success Metrics

### User Engagement
- 80%+ of attendees create profiles and complete onboarding
- Average 10+ connections per attendee
- 70%+ session RSVP rate
- 50%+ message engagement rate

### Technical Performance
- 99.5% uptime during event dates
- <2 second page load time (p95)
- <500ms API response time (p95)
- Support 500+ concurrent users
- 100% offline functionality for core features

### Business Impact
- 200+ meaningful industry-student/faculty connections
- 80%+ research project visibility to industry partners
- 50+ collaboration opportunities initiated
- 90%+ user satisfaction score (post-event survey)

### Data Quality
- <1% data sync errors
- 100% data privacy compliance
- Complete audit trail for all transactions
- Successful integration with external systems (Smartsheet, Raiser's Edge)

## Constraints

### Budget
- Target: Tier 2 deployment ($200-500/month operational costs)
- Development: Multi-agent system (no direct labor costs)
- Infrastructure: Cloud-hosted (PostgreSQL, Redis, edge functions)
- External Services: SMS verification, email delivery

### Timeline
- **MVP:** 12 weeks to production launch (simplified scope)
- Must be ready 3 weeks before event for testing and user onboarding
- Post-event support for 2 weeks
- **Phase 2:** Post-event enhancements (AI recommendations, SMS, advanced exports)

### Technology
- **Must Maintain:** UI/UX patterns from loveable-converge
- **Must Improve:** Backend architecture, scalability, security
- **Must Support:** Mobile-first, PWA, offline-first
- **Must Integrate:** Smartsheet, CRM exports, calendar systems
- **Enterprise Requirements:** Audit logging, role-based access control, data encryption, compliance

### Resources
- No dedicated operations team (must be operationally simple)
- Limited on-site IT support during event
- Must be self-service for administrators

## Related Projects/Dependencies

### Reference Implementation
- **loveable-converge** (https://github.com/timveo/loveable-converge)
  - Provides UI/UX patterns, feature definitions, user flows
  - Demonstrates offline capabilities, PWA implementation
  - Contains all component designs and interactions

### External Systems
- **Smartsheet** - Data source for partners, research projects, schedule
- **SMS Provider** - Phone verification and notifications
- **Email Provider** - Authentication and system notifications
- **Calendar Systems** - ICS export for user calendars
- **CRM Systems** - CSV export for Salesforce/HubSpot
- **Raiser's Edge** - Fundraising platform integration

## Links

- **Reference Repository:** https://github.com/timveo/loveable-converge
- **Project Repository:** https://github.com/timveo/Converge-NPS
- **Event Information:** Naval Postgraduate School Tech Accelerator 2026
- **Design System:** shadcn/ui + Tailwind CSS (from reference)
- **Target Users:** 500+ attendees (students, faculty, industry, military)

## Key Differentiators from Reference Implementation

### What We're Keeping (MVP)
- Complete UI/UX design and user flows
- Core features: networking, schedule, opportunities, messaging, admin
- Network-first caching (simplified from full offline-first)
- PWA capabilities (installable, basic offline queue)
- Mobile optimization
- Simplified privacy controls (4 toggles instead of 10+)

### What We're Rebuilding
- **Backend Architecture** - Enterprise-grade, scalable, maintainable
- **Database Design** - Optimized schema, proper indexing, RLS policies
- **API Layer** - RESTful or GraphQL with proper error handling
- **Authentication** - Enterprise-grade security with session management
- **Data Sync** - Robust offline sync with conflict resolution
- **Deployment** - Production-ready infrastructure (Tier 2/3 capable)
- **Monitoring** - Comprehensive logging, metrics, alerting
- **Testing** - Full test coverage (>80%)
- **Documentation** - Complete technical and operational docs

### Enterprise Requirements
- Horizontal scalability
- High availability (99.9%+)
- Security compliance (data encryption, audit logs)
- Disaster recovery and backup
- Performance monitoring and optimization
- Rate limiting and abuse prevention
- Graceful degradation
- Automated deployment pipeline
