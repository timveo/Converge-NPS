# Converge-NPS API Architecture

**Document Version:** 1.0
**Date:** 2025-12-02
**Author:** Architect Agent
**Status:** Ready for Review

---

## Table of Contents

1. [API Strategy Decision](#api-strategy-decision)
2. [Complete API Endpoint Design](#complete-api-endpoint-design)
3. [Request/Response Schemas](#requestresponse-schemas)
4. [Authentication & Authorization](#authentication--authorization)
5. [Rate Limiting Strategy](#rate-limiting-strategy)
6. [Error Handling](#error-handling)
7. [Real-Time Features](#real-time-features)
8. [Pagination & Filtering](#pagination--filtering)
9. [Performance Optimizations](#performance-optimizations)
10. [API Documentation Strategy](#api-documentation-strategy)
11. [Design Decisions](#design-decisions)

---

## API Strategy Decision

### REST vs GraphQL: Decision

**CHOSEN: REST API**

**Rationale:**

1. **Simplicity & Speed**: REST is simpler to implement and test, critical for 12-week MVP timeline
2. **Caching**: HTTP caching works out-of-the-box with REST (ETag, Cache-Control headers)
3. **Tooling**: Extensive tooling for REST (OpenAPI/Swagger, Postman, standardized testing)
4. **Team Familiarity**: Most developers are familiar with REST patterns
5. **Network-First PWA**: REST aligns better with service worker caching strategies
6. **No Complex Queries**: Application doesn't require flexible querying; endpoints can be purpose-built
7. **Mobile Performance**: REST's simpler request structure is better for mobile networks

**GraphQL Tradeoffs:**
- Would enable flexible querying (fetch exactly what you need)
- Single endpoint complexity doesn't justify benefits for MVP
- Adds significant development overhead (schema design, resolvers, N+1 query issues)

**Decision: Use REST with careful endpoint design to minimize over/under-fetching**

---

### API Versioning Strategy

**Chosen Approach: URL Path Versioning**

```
https://api.converge-nps.com/v1/users
https://api.converge-nps.com/v1/sessions
```

**Rationale:**
- Clear and explicit versioning in URL
- Easy to cache and route at CDN level
- Simple for clients to understand and implement
- Standard practice for REST APIs

**Version Lifecycle:**
- v1: MVP (January 2026 event)
- v2: Post-MVP enhancements (if breaking changes needed)
- Deprecation policy: 6-month notice for version sunset

**Alternative Considered:**
- Header-based versioning (`Accept: application/vnd.converge-nps.v1+json`) - More flexible but less discoverable

---

### Base URL Structure

**Production:**
```
https://api.converge-nps.com/v1/
```

**Staging:**
```
https://api.staging.converge-nps.com/v1/
```

**Development:**
```
http://localhost:3000/api/v1/
```

**URL Naming Conventions:**
- Lowercase letters only
- Hyphens for multi-word resources (e.g., `/industry-partners`)
- Plural nouns for collections (e.g., `/users`, `/sessions`)
- Resource identifiers via UUID path parameters (e.g., `/users/{userId}`)

---

## Complete API Endpoint Design

### Summary: Endpoint Count

| Category | Endpoints | Methods |
|----------|-----------|---------|
| **Authentication & Users** | 12 | 24 |
| **Networking & Connections** | 7 | 14 |
| **Event Schedule** | 6 | 12 |
| **Research & Opportunities** | 8 | 16 |
| **Messaging** | 5 | 10 |
| **Admin & Staff** | 10 | 20 |
| **Industry Partners** | 4 | 8 |
| **TOTAL** | **52** | **104** |

---

## 1. Authentication & Users

### 1.1 Authentication Endpoints

#### `POST /v1/auth/register`
Register a new user account

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "organization": "Naval Postgraduate School",
  "role": "student"
}
```

**Response: 201 Created**
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "role": "student",
    "emailVerified": false,
    "createdAt": "2026-01-15T10:00:00Z"
  },
  "message": "Registration successful. Please verify your email."
}
```

**Errors:**
- `400 Bad Request`: Invalid email or weak password
- `409 Conflict`: Email already exists

---

#### `POST /v1/auth/login`
Authenticate user and receive JWT token

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response: 200 OK**
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "roles": ["student"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Email not verified
- `429 Too Many Requests`: Rate limit exceeded (5 attempts per 15 minutes)

---

#### `POST /v1/auth/logout`
Invalidate user session and refresh token

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response: 204 No Content**

**Errors:**
- `401 Unauthorized`: Invalid or expired token

---

#### `POST /v1/auth/refresh`
Refresh access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response: 200 OK**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Errors:**
- `401 Unauthorized`: Invalid or expired refresh token

---

#### `POST /v1/auth/forgot-password`
Request password reset email

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response: 200 OK**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

**Note:** Always returns 200 to prevent email enumeration attacks.

---

#### `POST /v1/auth/reset-password`
Reset password using token from email

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response: 200 OK**
```json
{
  "message": "Password reset successful."
}
```

**Errors:**
- `400 Bad Request`: Invalid or expired token
- `400 Bad Request`: Password doesn't meet requirements

---

#### `POST /v1/auth/verify-email`
Verify email address using token from email

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response: 200 OK**
```json
{
  "message": "Email verified successfully."
}
```

**Errors:**
- `400 Bad Request`: Invalid or expired token

---

#### `POST /v1/auth/resend-verification`
Resend email verification link

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response: 200 OK**
```json
{
  "message": "Verification email sent."
}
```

---

### 1.2 User Profile Endpoints

#### `GET /v1/users/me`
Get current user's profile

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "id": "uuid-v4",
  "email": "john.doe@example.com",
  "fullName": "John Doe",
  "phone": "+1-555-0123",
  "organization": "Naval Postgraduate School",
  "department": "Computer Science",
  "role": "PhD Student",
  "bio": "Researching AI applications in defense...",
  "avatarUrl": "https://cdn.converge-nps.com/avatars/uuid-v4.jpg",
  "accelerationInterests": ["AI/ML", "Cybersecurity"],
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "websiteUrl": "https://johndoe.com",
  "privacy": {
    "profileVisibility": "public",
    "allowQrScanning": true,
    "allowMessaging": true,
    "hideContactInfo": false
  },
  "onboardingCompleted": true,
  "roles": ["student"],
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid or expired token

---

#### `PATCH /v1/users/me`
Update current user's profile

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body (partial update):**
```json
{
  "fullName": "John A. Doe",
  "bio": "Updated bio...",
  "accelerationInterests": ["AI/ML", "Cybersecurity", "Robotics"],
  "privacy": {
    "allowMessaging": false
  }
}
```

**Response: 200 OK**
```json
{
  "id": "uuid-v4",
  "fullName": "John A. Doe",
  "bio": "Updated bio...",
  // ... full updated profile
  "updatedAt": "2026-01-15T11:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Invalid token
- `429 Too Many Requests`: Rate limit exceeded (20 updates per day)

---

#### `GET /v1/users/{userId}`
Get another user's profile (privacy-aware)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `userId` (UUID, required): User ID

**Response: 200 OK**
```json
{
  "id": "uuid-v4",
  "fullName": "Jane Smith",
  "organization": "DARPA",
  "department": "Research",
  "role": "Program Manager",
  "bio": "Working on autonomous systems...",
  "avatarUrl": "https://cdn.converge-nps.com/avatars/uuid-v4.jpg",
  "accelerationInterests": ["Robotics", "AI/ML"],
  "privacy": {
    "profileVisibility": "public",
    "allowQrScanning": true,
    "allowMessaging": true,
    "hideContactInfo": true
  },
  // Contact info hidden due to privacy settings
  "email": null,
  "phone": null,
  "linkedinUrl": null,
  "websiteUrl": null
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: User has private profile
- `404 Not Found`: User doesn't exist

---

#### `POST /v1/users/me/avatar`
Upload user avatar image

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request Body (multipart):**
```
avatar: <file> (JPEG/PNG, max 2MB)
```

**Response: 200 OK**
```json
{
  "avatarUrl": "https://cdn.converge-nps.com/avatars/uuid-v4.jpg",
  "updatedAt": "2026-01-15T12:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Invalid file type or size
- `401 Unauthorized`: Invalid token
- `413 Payload Too Large`: File exceeds 2MB

---

#### `GET /v1/users/me/qr-code`
Get user's QR code badge

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "qrCodeData": "uuid-v4-encoded",
  "qrCodeImageUrl": "https://api.converge-nps.com/v1/users/me/qr-code/image",
  "scanCount": 15,
  "lastScannedAt": "2026-01-28T14:30:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/users/me/qr-code/image`
Get QR code as PNG image

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```
Content-Type: image/png
<PNG binary data>
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `PATCH /v1/users/me/onboarding`
Update onboarding progress

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "onboardingStep": 3,
  "onboardingCompleted": false
}
```

**Response: 200 OK**
```json
{
  "onboardingStep": 3,
  "onboardingCompleted": false,
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

**Errors:**
- `400 Bad Request`: Invalid step number
- `401 Unauthorized`: Invalid token

---

#### `POST /v1/users/me/onboarding/complete`
Mark onboarding as completed

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "onboardingCompleted": true,
  "completedAt": "2026-01-15T10:35:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

## 2. Networking & Connections

### 2.1 Connection Endpoints

#### `POST /v1/connections`
Create a new connection via QR scan or manual entry

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "connectionMethod": "qr_scan",
  "qrCodeData": "uuid-of-scanned-user",
  "collaborativeIntents": ["research", "funding"],
  "notes": "Met at keynote session. Interested in AI collaboration."
}
```

**Response: 201 Created**
```json
{
  "id": "connection-uuid",
  "userId": "current-user-uuid",
  "connectedUser": {
    "id": "scanned-user-uuid",
    "fullName": "Jane Smith",
    "organization": "DARPA",
    "role": "Program Manager",
    "avatarUrl": "https://cdn.converge-nps.com/avatars/scanned-user-uuid.jpg"
  },
  "collaborativeIntents": ["research", "funding"],
  "notes": "Met at keynote session. Interested in AI collaboration.",
  "connectionMethod": "qr_scan",
  "createdAt": "2026-01-28T14:30:00Z"
}
```

**Errors:**
- `400 Bad Request`: Invalid QR code or missing required fields
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Target user has disabled QR scanning
- `409 Conflict`: Connection already exists
- `429 Too Many Requests`: Rate limit exceeded (50 connections per day)

---

#### `POST /v1/connections/manual`
Create connection via manual code entry

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userIdentifier": "partial-uuid-or-email",
  "collaborativeIntents": ["brainstorming"],
  "notes": "Follow up after event."
}
```

**Response: 201 Created**
```json
{
  "id": "connection-uuid",
  // ... same as POST /v1/connections
  "connectionMethod": "manual_entry"
}
```

**Errors:**
- `400 Bad Request`: User not found or invalid identifier
- `401 Unauthorized`: Invalid token
- `409 Conflict`: Connection already exists
- `429 Too Many Requests`: Rate limit exceeded (50 connections per day)

---

#### `GET /v1/connections`
Get user's connections list with search and filters

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `search` (string, optional): Search by name or organization
- `intent` (string, optional): Filter by collaborative intent (e.g., "research")
- `sort` (string, optional): Sort by "date" (default) or "name"
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Results per page (default: 50, max: 100)

**Example Request:**
```
GET /v1/connections?search=Smith&intent=research&sort=date&page=1&limit=20
```

**Response: 200 OK**
```json
{
  "connections": [
    {
      "id": "connection-uuid",
      "connectedUser": {
        "id": "user-uuid",
        "fullName": "Jane Smith",
        "organization": "DARPA",
        "role": "Program Manager",
        "avatarUrl": "https://cdn.converge-nps.com/avatars/user-uuid.jpg"
      },
      "collaborativeIntents": ["research", "funding"],
      "notes": "Met at keynote session.",
      "connectionMethod": "qr_scan",
      "followUpReminder": null,
      "createdAt": "2026-01-28T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/connections/{connectionId}`
Get single connection details

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `connectionId` (UUID, required): Connection ID

**Response: 200 OK**
```json
{
  "id": "connection-uuid",
  "connectedUser": {
    "id": "user-uuid",
    "fullName": "Jane Smith",
    "organization": "DARPA",
    "department": "Research",
    "role": "Program Manager",
    "email": "jane.smith@darpa.mil",
    "phone": "+1-555-0199",
    "avatarUrl": "https://cdn.converge-nps.com/avatars/user-uuid.jpg"
  },
  "collaborativeIntents": ["research", "funding"],
  "notes": "Met at keynote session. Interested in AI collaboration.",
  "connectionMethod": "qr_scan",
  "followUpReminder": "2026-02-15T09:00:00Z",
  "reminderSent": false,
  "createdAt": "2026-01-28T14:30:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not your connection
- `404 Not Found`: Connection doesn't exist

---

#### `PATCH /v1/connections/{connectionId}`
Update connection notes or intents

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**
- `connectionId` (UUID, required): Connection ID

**Request Body (partial update):**
```json
{
  "notes": "Updated notes after follow-up meeting.",
  "collaborativeIntents": ["research", "funding", "internship"],
  "followUpReminder": "2026-02-20T10:00:00Z"
}
```

**Response: 200 OK**
```json
{
  "id": "connection-uuid",
  // ... full updated connection
  "updatedAt": "2026-01-29T10:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not your connection
- `404 Not Found`: Connection doesn't exist

---

#### `DELETE /v1/connections/{connectionId}`
Delete a connection

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `connectionId` (UUID, required): Connection ID

**Response: 204 No Content**

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not your connection
- `404 Not Found`: Connection doesn't exist

---

#### `GET /v1/connections/export`
Export connections to CSV (all users can export their own)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="connections.csv"

Name,Organization,Role,Email,Phone,Collaborative Intents,Notes,Connection Date
Jane Smith,DARPA,Program Manager,jane.smith@darpa.mil,+1-555-0199,"research,funding","Met at keynote",2026-01-28T14:30:00Z
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

## 3. Event Schedule & RSVPs

### 3.1 Session Endpoints

#### `GET /v1/sessions`
Browse all event sessions with filters

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `day` (date, optional): Filter by date (YYYY-MM-DD)
- `type` (string, optional): Filter by session type (e.g., "workshop", "keynote")
- `featured` (boolean, optional): Filter featured sessions
- `search` (string, optional): Search by title or speaker
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Results per page (default: 50, max: 100)

**Example Request:**
```
GET /v1/sessions?day=2026-01-28&type=workshop&featured=true&page=1&limit=20
```

**Response: 200 OK**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "title": "AI in Defense: Future Applications",
      "description": "Exploring cutting-edge AI applications...",
      "speaker": "Dr. Jane Smith, DARPA",
      "location": "Building 1, Room 101",
      "sessionType": "keynote",
      "startTime": "2026-01-28T09:00:00Z",
      "endTime": "2026-01-28T10:30:00Z",
      "capacity": 100,
      "registeredCount": 85,
      "waitlistCount": 5,
      "isFeatured": true,
      "requiresRsvp": true,
      "userRsvpStatus": "confirmed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/sessions/{sessionId}`
Get session details

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `sessionId` (UUID, required): Session ID

**Response: 200 OK**
```json
{
  "id": "session-uuid",
  "title": "AI in Defense: Future Applications",
  "description": "Exploring cutting-edge AI applications in defense systems...",
  "speaker": "Dr. Jane Smith, DARPA",
  "location": "Building 1, Room 101",
  "sessionType": "keynote",
  "startTime": "2026-01-28T09:00:00Z",
  "endTime": "2026-01-28T10:30:00Z",
  "capacity": 100,
  "registeredCount": 85,
  "waitlistCount": 5,
  "isFeatured": true,
  "requiresRsvp": true,
  "userRsvpStatus": "confirmed",
  "hasConflict": false,
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Session doesn't exist

---

#### `POST /v1/sessions/{sessionId}/rsvp`
RSVP to a session

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `sessionId` (UUID, required): Session ID

**Response: 201 Created**
```json
{
  "rsvp": {
    "id": "rsvp-uuid",
    "sessionId": "session-uuid",
    "userId": "user-uuid",
    "status": "confirmed",
    "createdAt": "2026-01-28T08:00:00Z"
  },
  "session": {
    "id": "session-uuid",
    "title": "AI in Defense: Future Applications",
    "startTime": "2026-01-28T09:00:00Z",
    "endTime": "2026-01-28T10:30:00Z",
    "location": "Building 1, Room 101"
  },
  "conflicts": []
}
```

**Response: 201 Created (Waitlisted)**
```json
{
  "rsvp": {
    "id": "rsvp-uuid",
    "sessionId": "session-uuid",
    "userId": "user-uuid",
    "status": "waitlisted",
    "createdAt": "2026-01-28T08:00:00Z"
  },
  "session": {
    "id": "session-uuid",
    "title": "AI in Defense: Future Applications",
    "startTime": "2026-01-28T09:00:00Z",
    "endTime": "2026-01-28T10:30:00Z",
    "location": "Building 1, Room 101"
  },
  "message": "Session is at capacity. You have been added to the waitlist."
}
```

**Response: 201 Created (With Conflicts)**
```json
{
  "rsvp": {
    "id": "rsvp-uuid",
    "sessionId": "session-uuid",
    "userId": "user-uuid",
    "status": "confirmed",
    "createdAt": "2026-01-28T08:00:00Z"
  },
  "session": {
    "id": "session-uuid",
    "title": "AI in Defense: Future Applications",
    "startTime": "2026-01-28T09:00:00Z",
    "endTime": "2026-01-28T10:30:00Z"
  },
  "conflicts": [
    {
      "sessionId": "conflict-session-uuid",
      "title": "Cybersecurity Workshop",
      "startTime": "2026-01-28T09:00:00Z",
      "endTime": "2026-01-28T11:00:00Z"
    }
  ],
  "warning": "This session conflicts with 1 other RSVP."
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Session doesn't exist
- `409 Conflict`: Already RSVP'd to this session

---

#### `DELETE /v1/sessions/{sessionId}/rsvp`
Cancel RSVP to a session

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `sessionId` (UUID, required): Session ID

**Response: 204 No Content**

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Session or RSVP doesn't exist

---

#### `GET /v1/sessions/my-schedule`
Get user's schedule (RSVPs)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `day` (date, optional): Filter by date (YYYY-MM-DD)
- `view` (string, optional): "list" (default) or "timeline"

**Example Request:**
```
GET /v1/sessions/my-schedule?day=2026-01-28&view=timeline
```

**Response: 200 OK (List View)**
```json
{
  "schedule": [
    {
      "rsvp": {
        "id": "rsvp-uuid",
        "status": "confirmed"
      },
      "session": {
        "id": "session-uuid",
        "title": "AI in Defense: Future Applications",
        "speaker": "Dr. Jane Smith",
        "location": "Building 1, Room 101",
        "startTime": "2026-01-28T09:00:00Z",
        "endTime": "2026-01-28T10:30:00Z",
        "sessionType": "keynote"
      },
      "hasConflict": false
    }
  ],
  "conflicts": []
}
```

**Response: 200 OK (Timeline View)**
```json
{
  "timelineView": {
    "days": [
      {
        "date": "2026-01-28",
        "timeSlots": [
          {
            "startTime": "09:00",
            "endTime": "10:30",
            "sessions": [
              {
                "id": "session-uuid",
                "title": "AI in Defense: Future Applications",
                "location": "Building 1, Room 101",
                "userRsvpStatus": "confirmed"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/sessions/conflicts`
Get user's schedule conflicts

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "conflicts": [
    {
      "timeSlot": {
        "startTime": "2026-01-28T09:00:00Z",
        "endTime": "2026-01-28T11:00:00Z"
      },
      "sessions": [
        {
          "id": "session-1-uuid",
          "title": "AI in Defense",
          "rsvpStatus": "confirmed"
        },
        {
          "id": "session-2-uuid",
          "title": "Cybersecurity Workshop",
          "rsvpStatus": "confirmed"
        }
      ]
    }
  ]
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

## 4. Research Projects & Opportunities

### 4.1 Research Projects

#### `GET /v1/projects`
Browse research projects with filters

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `department` (string, optional): Filter by department
- `stage` (string, optional): Filter by stage (e.g., "prototype")
- `classification` (string, optional): Filter by classification
- `researchArea` (string, optional): Filter by research area
- `seeking` (string, optional): Filter by what they're seeking
- `search` (string, optional): Search by keyword
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Example Request:**
```
GET /v1/projects?department=Computer%20Science&stage=prototype&search=AI&page=1&limit=20
```

**Response: 200 OK**
```json
{
  "projects": [
    {
      "id": "project-uuid",
      "title": "Autonomous Drone Navigation",
      "description": "Developing AI-powered autonomous navigation...",
      "pi": {
        "id": "pi-user-uuid",
        "fullName": "Dr. John Smith",
        "role": "Professor",
        "department": "Computer Science"
      },
      "department": "Computer Science",
      "stage": "prototype",
      "classification": "Unclassified",
      "researchAreas": ["AI/ML", "Robotics"],
      "keywords": ["autonomous systems", "drones", "navigation"],
      "seeking": ["funding", "industry partners"],
      "students": ["Jane Doe", "Bob Johnson"],
      "demoSchedule": "Jan 28, 2PM - Building 2",
      "interestedCount": 15,
      "userBookmarked": false,
      "userInterested": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 35,
    "totalPages": 2
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/projects/{projectId}`
Get project details

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `projectId` (UUID, required): Project ID

**Response: 200 OK**
```json
{
  "id": "project-uuid",
  "title": "Autonomous Drone Navigation",
  "description": "Developing AI-powered autonomous navigation systems for military drones...",
  "pi": {
    "id": "pi-user-uuid",
    "fullName": "Dr. John Smith",
    "email": "john.smith@nps.edu",
    "role": "Professor",
    "department": "Computer Science",
    "avatarUrl": "https://cdn.converge-nps.com/avatars/pi-uuid.jpg"
  },
  "department": "Computer Science",
  "stage": "prototype",
  "classification": "Unclassified",
  "researchAreas": ["AI/ML", "Robotics"],
  "keywords": ["autonomous systems", "drones", "navigation", "computer vision"],
  "seeking": ["funding", "industry partners", "testing facilities"],
  "students": ["Jane Doe (PhD)", "Bob Johnson (MS)"],
  "demoSchedule": "January 28, 2PM - Building 2, Lab 201",
  "interestedCount": 15,
  "userBookmarked": true,
  "userInterested": true,
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Project doesn't exist

---

#### `POST /v1/projects/{projectId}/bookmark`
Bookmark a project

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `projectId` (UUID, required): Project ID

**Request Body (optional):**
```json
{
  "notes": "Interesting project. Follow up after event."
}
```

**Response: 201 Created**
```json
{
  "bookmark": {
    "id": "bookmark-uuid",
    "projectId": "project-uuid",
    "userId": "user-uuid",
    "notes": "Interesting project. Follow up after event.",
    "createdAt": "2026-01-28T10:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Project doesn't exist
- `409 Conflict`: Already bookmarked

---

#### `DELETE /v1/projects/{projectId}/bookmark`
Remove bookmark from project

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `projectId` (UUID, required): Project ID

**Response: 204 No Content**

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Bookmark doesn't exist

---

#### `GET /v1/projects/bookmarks`
Get user's bookmarked projects

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Response: 200 OK**
```json
{
  "bookmarks": [
    {
      "bookmark": {
        "id": "bookmark-uuid",
        "notes": "Interesting project.",
        "createdAt": "2026-01-28T10:00:00Z"
      },
      "project": {
        "id": "project-uuid",
        "title": "Autonomous Drone Navigation",
        "stage": "prototype",
        "pi": {
          "fullName": "Dr. John Smith"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `POST /v1/projects/{projectId}/interest`
Express interest in a project

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**
- `projectId` (UUID, required): Project ID

**Request Body (optional):**
```json
{
  "message": "I'm interested in collaborating on this project. My expertise is in computer vision."
}
```

**Response: 201 Created**
```json
{
  "interest": {
    "id": "interest-uuid",
    "projectId": "project-uuid",
    "userId": "user-uuid",
    "message": "I'm interested in collaborating on this project...",
    "createdAt": "2026-01-28T11:00:00Z"
  },
  "notification": {
    "sent": true,
    "recipient": "pi-user-uuid"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Project doesn't exist
- `409 Conflict`: Already expressed interest

---

### 4.2 Opportunities

#### `GET /v1/opportunities`
Browse opportunities with filters

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `type` (string, optional): Filter by type ("funding", "internship", "competition")
- `status` (string, optional): Filter by status ("active", "closed")
- `dodAlignment` (string, optional): Filter by DoD alignment
- `featured` (boolean, optional): Filter featured opportunities
- `search` (string, optional): Search by keyword
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Example Request:**
```
GET /v1/opportunities?type=funding&status=active&featured=true&page=1&limit=20
```

**Response: 200 OK**
```json
{
  "opportunities": [
    {
      "id": "opportunity-uuid",
      "type": "funding",
      "title": "DARPA Innovation Grant",
      "description": "Funding for AI research projects...",
      "sponsorOrganization": "DARPA",
      "sponsorContact": {
        "id": "sponsor-user-uuid",
        "fullName": "Jane Doe",
        "email": "jane.doe@darpa.mil"
      },
      "requirements": "Must be a current student or faculty member...",
      "benefits": "Up to $500K in funding",
      "location": "Remote",
      "duration": "12 months",
      "deadline": "2026-03-01T23:59:59Z",
      "dodAlignment": ["AI/ML", "Autonomous Systems"],
      "status": "active",
      "featured": true,
      "userInterested": false,
      "createdAt": "2026-01-10T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/opportunities/{opportunityId}`
Get opportunity details

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `opportunityId` (UUID, required): Opportunity ID

**Response: 200 OK**
```json
{
  "id": "opportunity-uuid",
  "type": "funding",
  "title": "DARPA Innovation Grant",
  "description": "Funding for AI research projects aligned with DoD priorities...",
  "sponsorOrganization": "DARPA",
  "sponsorContact": {
    "id": "sponsor-user-uuid",
    "fullName": "Jane Doe",
    "email": "jane.doe@darpa.mil",
    "phone": "+1-555-0199"
  },
  "postedBy": {
    "id": "poster-user-uuid",
    "fullName": "Admin User"
  },
  "requirements": "Must be a current NPS student or faculty member...",
  "benefits": "Up to $500K in funding over 12 months",
  "location": "Remote (quarterly in-person reviews)",
  "duration": "12 months",
  "deadline": "2026-03-01T23:59:59Z",
  "dodAlignment": ["AI/ML", "Autonomous Systems", "Cybersecurity"],
  "status": "active",
  "featured": true,
  "userInterested": true,
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Opportunity doesn't exist

---

#### `POST /v1/opportunities/{opportunityId}/interest`
Express interest in an opportunity

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**
- `opportunityId` (UUID, required): Opportunity ID

**Request Body (optional):**
```json
{
  "message": "I'm interested in applying for this grant. My research aligns with DoD priorities."
}
```

**Response: 201 Created**
```json
{
  "interest": {
    "id": "interest-uuid",
    "opportunityId": "opportunity-uuid",
    "userId": "user-uuid",
    "status": "interested",
    "message": "I'm interested in applying...",
    "createdAt": "2026-01-28T12:00:00Z"
  },
  "notification": {
    "sent": true,
    "recipient": "sponsor-user-uuid"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Opportunity doesn't exist
- `409 Conflict`: Already expressed interest

---

## 5. Industry Partners

#### `GET /v1/industry-partners`
Browse industry partners with filters

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `organizationType` (string, optional): Filter by org type (e.g., "startup", "corporation")
- `techFocus` (string, optional): Filter by technology focus area
- `collaborationType` (string, optional): Filter by collaboration type
- `search` (string, optional): Search by keyword
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Example Request:**
```
GET /v1/industry-partners?organizationType=startup&techFocus=AI&page=1&limit=20
```

**Response: 200 OK**
```json
{
  "partners": [
    {
      "id": "partner-uuid",
      "companyName": "AI Defense Solutions Inc.",
      "description": "Leading AI solutions for defense applications...",
      "logoUrl": "https://cdn.converge-nps.com/logos/partner-uuid.png",
      "websiteUrl": "https://aidefense.com",
      "organizationType": "startup",
      "technologyFocusAreas": ["AI/ML", "Computer Vision"],
      "seekingCollaboration": ["research partnerships", "talent acquisition"],
      "dodSponsors": "DARPA, Navy",
      "boothLocation": "Building 1, Booth 12",
      "teamMembers": [
        {
          "name": "John Smith",
          "title": "CEO",
          "email": "john@aidefense.com"
        }
      ],
      "userFavorited": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

**Note:** Contact info and team members only shown if `hideContactInfo = false`

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/industry-partners/{partnerId}`
Get industry partner details

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `partnerId` (UUID, required): Partner ID

**Response: 200 OK**
```json
{
  "id": "partner-uuid",
  "companyName": "AI Defense Solutions Inc.",
  "description": "Leading AI solutions for defense applications. Founded in 2020...",
  "logoUrl": "https://cdn.converge-nps.com/logos/partner-uuid.png",
  "websiteUrl": "https://aidefense.com",
  "organizationType": "startup",
  "technologyFocusAreas": ["AI/ML", "Computer Vision", "Autonomous Systems"],
  "seekingCollaboration": ["research partnerships", "talent acquisition", "pilot projects"],
  "dodSponsors": "DARPA, Navy, Air Force",
  "boothLocation": "Building 1, Booth 12",
  "primaryContact": {
    "name": "Jane Doe",
    "title": "VP of Partnerships",
    "email": "jane@aidefense.com",
    "phone": "+1-555-0150"
  },
  "teamMembers": [
    {
      "name": "John Smith",
      "title": "CEO",
      "email": "john@aidefense.com"
    },
    {
      "name": "Jane Doe",
      "title": "VP of Partnerships",
      "email": "jane@aidefense.com"
    }
  ],
  "hideContactInfo": false,
  "userFavorited": true,
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Partner doesn't exist

---

#### `POST /v1/industry-partners/{partnerId}/favorite`
Favorite an industry partner

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `partnerId` (UUID, required): Partner ID

**Request Body (optional):**
```json
{
  "notes": "Visit booth on Day 2."
}
```

**Response: 201 Created**
```json
{
  "favorite": {
    "id": "favorite-uuid",
    "partnerId": "partner-uuid",
    "userId": "user-uuid",
    "notes": "Visit booth on Day 2.",
    "createdAt": "2026-01-28T13:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Partner doesn't exist
- `409 Conflict`: Already favorited

---

#### `DELETE /v1/industry-partners/{partnerId}/favorite`
Remove favorite from industry partner

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `partnerId` (UUID, required): Partner ID

**Response: 204 No Content**

**Errors:**
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Favorite doesn't exist

---

## 6. Messaging

### 6.1 Conversation & Message Endpoints

#### `GET /v1/conversations`
Get user's conversation list

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `search` (string, optional): Search by contact name
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Response: 200 OK**
```json
{
  "conversations": [
    {
      "id": "conversation-uuid",
      "participants": [
        {
          "id": "user-uuid",
          "fullName": "Jane Smith",
          "organization": "DARPA",
          "avatarUrl": "https://cdn.converge-nps.com/avatars/user-uuid.jpg"
        }
      ],
      "lastMessage": {
        "id": "message-uuid",
        "content": "Looking forward to collaborating!",
        "senderId": "user-uuid",
        "createdAt": "2026-01-28T15:30:00Z",
        "readAt": null
      },
      "unreadCount": 2,
      "updatedAt": "2026-01-28T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

#### `POST /v1/conversations`
Start a new conversation

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientId": "recipient-user-uuid",
  "initialMessage": "Hi Jane, great meeting you at the keynote!"
}
```

**Response: 201 Created**
```json
{
  "conversation": {
    "id": "conversation-uuid",
    "participants": [
      {
        "id": "current-user-uuid",
        "fullName": "John Doe"
      },
      {
        "id": "recipient-user-uuid",
        "fullName": "Jane Smith"
      }
    ],
    "createdAt": "2026-01-28T14:00:00Z"
  },
  "message": {
    "id": "message-uuid",
    "conversationId": "conversation-uuid",
    "senderId": "current-user-uuid",
    "content": "Hi Jane, great meeting you at the keynote!",
    "status": "sent",
    "createdAt": "2026-01-28T14:00:00Z"
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid recipient or message
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Recipient has disabled messaging
- `409 Conflict`: Conversation already exists
- `429 Too Many Requests`: Rate limit exceeded (40 messages per day)

---

#### `GET /v1/conversations/{conversationId}/messages`
Get messages in a conversation

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `conversationId` (UUID, required): Conversation ID

**Query Parameters:**
- `before` (ISO timestamp, optional): Get messages before this timestamp (pagination)
- `limit` (integer, optional): Results per page (default: 50, max: 100)

**Example Request:**
```
GET /v1/conversations/{conversationId}/messages?before=2026-01-28T15:00:00Z&limit=50
```

**Response: 200 OK**
```json
{
  "messages": [
    {
      "id": "message-uuid",
      "conversationId": "conversation-uuid",
      "sender": {
        "id": "sender-user-uuid",
        "fullName": "Jane Smith",
        "avatarUrl": "https://cdn.converge-nps.com/avatars/sender-uuid.jpg"
      },
      "content": "Looking forward to collaborating!",
      "isEdited": false,
      "status": "read",
      "readBy": [
        {
          "userId": "current-user-uuid",
          "readAt": "2026-01-28T15:35:00Z"
        }
      ],
      "createdAt": "2026-01-28T15:30:00Z",
      "updatedAt": "2026-01-28T15:30:00Z"
    }
  ],
  "pagination": {
    "hasMore": true,
    "oldestMessageTimestamp": "2026-01-28T14:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not a participant in this conversation
- `404 Not Found`: Conversation doesn't exist

---

#### `POST /v1/conversations/{conversationId}/messages`
Send a message in a conversation

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**
- `conversationId` (UUID, required): Conversation ID

**Request Body:**
```json
{
  "content": "Sounds great! Let's schedule a meeting."
}
```

**Response: 201 Created**
```json
{
  "message": {
    "id": "message-uuid",
    "conversationId": "conversation-uuid",
    "sender": {
      "id": "current-user-uuid",
      "fullName": "John Doe",
      "avatarUrl": "https://cdn.converge-nps.com/avatars/current-user-uuid.jpg"
    },
    "content": "Sounds great! Let's schedule a meeting.",
    "isEdited": false,
    "status": "sent",
    "createdAt": "2026-01-28T15:40:00Z"
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid message content (empty or > 1000 chars)
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not a participant or recipient disabled messaging
- `404 Not Found`: Conversation doesn't exist
- `429 Too Many Requests`: Rate limit exceeded (40 messages per day)

---

#### `PATCH /v1/messages/{messageId}/read`
Mark message as read (send read receipt)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `messageId` (UUID, required): Message ID

**Response: 200 OK**
```json
{
  "readReceipt": {
    "messageId": "message-uuid",
    "userId": "current-user-uuid",
    "readAt": "2026-01-28T15:45:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not a participant in this conversation
- `404 Not Found`: Message doesn't exist

---

#### `GET /v1/conversations/unread-count`
Get total unread message count

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "unreadCount": 5
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

## 7. Admin & Staff

### 7.1 Admin Endpoints

#### `GET /v1/admin/users`
Get all users (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Query Parameters:**
- `search` (string, optional): Search by name, email, or organization
- `role` (string, optional): Filter by user role
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Response: 200 OK**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "organization": "NPS",
      "roles": ["student"],
      "emailVerified": true,
      "onboardingCompleted": true,
      "createdAt": "2026-01-10T08:00:00Z",
      "lastLoginAt": "2026-01-28T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 487,
    "totalPages": 10
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin

---

#### `GET /v1/admin/users/{userId}`
Get user details (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Path Parameters:**
- `userId` (UUID, required): User ID

**Response: 200 OK**
```json
{
  "id": "user-uuid",
  "email": "john.doe@example.com",
  "fullName": "John Doe",
  "phone": "+1-555-0123",
  "organization": "NPS",
  "department": "Computer Science",
  "role": "PhD Student",
  "bio": "Researching AI applications...",
  "roles": ["student"],
  "emailVerified": true,
  "onboardingCompleted": true,
  "privacy": {
    "profileVisibility": "public",
    "allowQrScanning": true,
    "allowMessaging": true,
    "hideContactInfo": false
  },
  "stats": {
    "connectionsCount": 25,
    "messagesCount": 50,
    "rsvpsCount": 8
  },
  "createdAt": "2026-01-10T08:00:00Z",
  "lastLoginAt": "2026-01-28T09:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User doesn't exist

---

#### `PATCH /v1/admin/users/{userId}/roles`
Assign or remove user roles (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Required Role:** `admin`

**Path Parameters:**
- `userId` (UUID, required): User ID

**Request Body:**
```json
{
  "roles": ["student", "staff"]
}
```

**Response: 200 OK**
```json
{
  "userId": "user-uuid",
  "roles": ["student", "staff"],
  "updatedAt": "2026-01-28T16:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Invalid roles
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User doesn't exist

---

#### `POST /v1/admin/users/{userId}/reset-password`
Trigger password reset for user (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Path Parameters:**
- `userId` (UUID, required): User ID

**Response: 200 OK**
```json
{
  "message": "Password reset email sent to user.",
  "sentTo": "john.doe@example.com"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User doesn't exist

---

#### `PATCH /v1/admin/users/{userId}/suspend`
Suspend user account (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Required Role:** `admin`

**Path Parameters:**
- `userId` (UUID, required): User ID

**Request Body:**
```json
{
  "reason": "Spam violation",
  "suspendedUntil": "2026-02-28T23:59:59Z"
}
```

**Response: 200 OK**
```json
{
  "userId": "user-uuid",
  "suspended": true,
  "reason": "Spam violation",
  "suspendedUntil": "2026-02-28T23:59:59Z",
  "suspendedAt": "2026-01-28T16:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User doesn't exist

---

#### `PATCH /v1/admin/users/{userId}/unsuspend`
Unsuspend user account (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Path Parameters:**
- `userId` (UUID, required): User ID

**Response: 200 OK**
```json
{
  "userId": "user-uuid",
  "suspended": false,
  "unsuspendedAt": "2026-01-28T16:05:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User doesn't exist

---

#### `GET /v1/admin/analytics`
Get platform analytics (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Query Parameters:**
- `startDate` (date, optional): Start date (YYYY-MM-DD)
- `endDate` (date, optional): End date (YYYY-MM-DD)

**Response: 200 OK**
```json
{
  "users": {
    "total": 487,
    "active": 412,
    "new": 23
  },
  "connections": {
    "total": 5234,
    "average": 10.7
  },
  "messages": {
    "total": 12456,
    "average": 25.6
  },
  "rsvps": {
    "total": 3890,
    "averagePerUser": 8.0
  },
  "sessions": {
    "total": 45,
    "averageCapacity": 85.3
  },
  "checkins": {
    "total": 412,
    "walkIns": 23
  },
  "projects": {
    "total": 35,
    "averageInterest": 12.5
  },
  "opportunities": {
    "total": 18,
    "averageInterest": 8.2
  },
  "dateRange": {
    "startDate": "2026-01-10",
    "endDate": "2026-01-28"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin

---

#### `GET /v1/admin/analytics/export`
Export analytics to CSV (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Query Parameters:**
- `type` (string, required): Export type ("users", "connections", "messages", "rsvps")
- `startDate` (date, optional): Start date
- `endDate` (date, optional): End date

**Response: 200 OK**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="analytics_users_2026-01-28.csv"

User ID,Email,Full Name,Organization,Roles,Connections,Messages,RSVPs,Created At
uuid-1,john.doe@example.com,John Doe,NPS,"student",25,50,8,2026-01-10T08:00:00Z
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin

---

### 7.2 Smartsheet Integration

#### `POST /v1/admin/smartsheet/import`
Import data from Smartsheet (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Required Role:** `admin`

**Request Body:**
```json
{
  "sheetName": "industry_partners",
  "sheetId": "smartsheet-id-12345"
}
```

**Valid Sheet Names:**
- `industry_partners` (download from Smartsheet)
- `research_projects` (download from Smartsheet)
- `sessions` (download from Smartsheet)

**Response: 202 Accepted**
```json
{
  "syncJob": {
    "id": "sync-job-uuid",
    "syncType": "import",
    "sheetName": "industry_partners",
    "direction": "download",
    "status": "pending",
    "startedAt": "2026-01-28T17:00:00Z"
  },
  "message": "Import job started. Check status at /v1/admin/smartsheet/sync/{syncJobId}"
}
```

**Errors:**
- `400 Bad Request`: Invalid sheet name or sheet ID
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `429 Too Many Requests`: Import already in progress

---

#### `POST /v1/admin/smartsheet/export`
Export data to Smartsheet (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Required Role:** `admin`

**Request Body:**
```json
{
  "sheetName": "registrations",
  "sheetId": "smartsheet-id-67890"
}
```

**Valid Sheet Names:**
- `registrations` (upload to Smartsheet)
- `connections` (upload to Smartsheet)

**Response: 202 Accepted**
```json
{
  "syncJob": {
    "id": "sync-job-uuid",
    "syncType": "export",
    "sheetName": "registrations",
    "direction": "upload",
    "status": "pending",
    "startedAt": "2026-01-28T17:05:00Z"
  },
  "message": "Export job started. Check status at /v1/admin/smartsheet/sync/{syncJobId}"
}
```

**Errors:**
- `400 Bad Request`: Invalid sheet name or sheet ID
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `429 Too Many Requests`: Export already in progress

---

#### `GET /v1/admin/smartsheet/sync/{syncJobId}`
Get Smartsheet sync job status

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Path Parameters:**
- `syncJobId` (UUID, required): Sync job ID

**Response: 200 OK (In Progress)**
```json
{
  "syncJob": {
    "id": "sync-job-uuid",
    "syncType": "import",
    "sheetName": "industry_partners",
    "direction": "download",
    "status": "in_progress",
    "totalRows": 100,
    "processedCount": 45,
    "errorCount": 0,
    "startedAt": "2026-01-28T17:00:00Z"
  }
}
```

**Response: 200 OK (Completed)**
```json
{
  "syncJob": {
    "id": "sync-job-uuid",
    "syncType": "import",
    "sheetName": "industry_partners",
    "direction": "download",
    "status": "success",
    "totalRows": 100,
    "processedCount": 100,
    "errorCount": 0,
    "startedAt": "2026-01-28T17:00:00Z",
    "completedAt": "2026-01-28T17:05:00Z"
  }
}
```

**Response: 200 OK (Failed)**
```json
{
  "syncJob": {
    "id": "sync-job-uuid",
    "syncType": "import",
    "sheetName": "industry_partners",
    "direction": "download",
    "status": "failed",
    "totalRows": 100,
    "processedCount": 45,
    "errorCount": 55,
    "errorDetails": "Smartsheet API rate limit exceeded",
    "startedAt": "2026-01-28T17:00:00Z",
    "completedAt": "2026-01-28T17:03:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin
- `404 Not Found`: Sync job doesn't exist

---

#### `GET /v1/admin/smartsheet/sync/history`
Get Smartsheet sync history (admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `admin`

**Query Parameters:**
- `sheetName` (string, optional): Filter by sheet name
- `syncType` (string, optional): Filter by sync type ("import" or "export")
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Response: 200 OK**
```json
{
  "syncHistory": [
    {
      "id": "sync-job-uuid",
      "syncType": "import",
      "sheetName": "industry_partners",
      "direction": "download",
      "status": "success",
      "totalRows": 100,
      "processedCount": 100,
      "errorCount": 0,
      "triggeredBy": {
        "id": "admin-user-uuid",
        "fullName": "Admin User"
      },
      "startedAt": "2026-01-28T17:00:00Z",
      "completedAt": "2026-01-28T17:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not an admin

---

### 7.3 Staff Check-In

#### `POST /v1/staff/checkin`
Check in an attendee (staff or admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Required Role:** `staff` or `admin`

**Request Body:**
```json
{
  "userId": "attendee-user-uuid",
  "checkInMethod": "qr_scan"
}
```

**Check-In Methods:**
- `qr_scan`: QR code scanned
- `manual_search`: Found via search

**Response: 201 Created**
```json
{
  "checkIn": {
    "id": "checkin-uuid",
    "user": {
      "id": "attendee-user-uuid",
      "fullName": "John Doe",
      "organization": "NPS",
      "email": "john.doe@example.com"
    },
    "checkedInBy": {
      "id": "staff-user-uuid",
      "fullName": "Staff Member"
    },
    "checkInMethod": "qr_scan",
    "isWalkIn": false,
    "checkedInAt": "2026-01-28T08:30:00Z"
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid user ID or method
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not staff or admin
- `409 Conflict`: User already checked in

---

#### `POST /v1/staff/walkin`
Register and check in walk-in attendee (staff or admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Required Role:** `staff` or `admin`

**Request Body:**
```json
{
  "email": "walkin@example.com",
  "fullName": "Walk-In Attendee",
  "organization": "Company Name",
  "role": "industry"
}
```

**Response: 201 Created**
```json
{
  "user": {
    "id": "new-user-uuid",
    "email": "walkin@example.com",
    "fullName": "Walk-In Attendee",
    "organization": "Company Name",
    "roles": ["industry"],
    "temporaryPassword": "TempPass123!",
    "createdAt": "2026-01-28T08:35:00Z"
  },
  "checkIn": {
    "id": "checkin-uuid",
    "userId": "new-user-uuid",
    "checkedInBy": {
      "id": "staff-user-uuid",
      "fullName": "Staff Member"
    },
    "checkInMethod": "walk_in",
    "isWalkIn": true,
    "checkedInAt": "2026-01-28T08:35:00Z"
  },
  "message": "Walk-in registered and checked in. Temporary password emailed to user."
}
```

**Errors:**
- `400 Bad Request`: Invalid or missing fields
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not staff or admin
- `409 Conflict`: Email already exists

---

#### `GET /v1/staff/checkins`
Get check-in list (staff or admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `staff` or `admin`

**Query Parameters:**
- `search` (string, optional): Search by name or email
- `checkInMethod` (string, optional): Filter by method
- `isWalkIn` (boolean, optional): Filter walk-ins only
- `page` (integer, optional): Page number
- `limit` (integer, optional): Results per page

**Response: 200 OK**
```json
{
  "checkIns": [
    {
      "id": "checkin-uuid",
      "user": {
        "id": "user-uuid",
        "fullName": "John Doe",
        "organization": "NPS",
        "email": "john.doe@example.com"
      },
      "checkedInBy": {
        "id": "staff-user-uuid",
        "fullName": "Staff Member"
      },
      "checkInMethod": "qr_scan",
      "isWalkIn": false,
      "checkedInAt": "2026-01-28T08:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 412,
    "totalPages": 9
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not staff or admin

---

#### `GET /v1/staff/checkins/stats`
Get real-time check-in statistics (staff or admin only)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Required Role:** `staff` or `admin`

**Response: 200 OK**
```json
{
  "stats": {
    "totalRegistered": 487,
    "totalCheckedIn": 412,
    "checkedInPercentage": 84.6,
    "checkInsLastHour": 45,
    "walkInsTotal": 23,
    "walkInsPercentage": 5.6,
    "checkInsByRole": {
      "student": 150,
      "faculty": 80,
      "industry": 132,
      "staff": 27,
      "admin": 23
    }
  },
  "updatedAt": "2026-01-28T09:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not staff or admin

---

## 8. Offline Queue

#### `POST /v1/offline/queue`
Submit offline operations for processing

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "operations": [
    {
      "operationType": "qr_scan",
      "operationData": {
        "qrCodeData": "scanned-user-uuid",
        "collaborativeIntents": ["research"],
        "timestamp": "2026-01-28T14:30:00Z"
      },
      "deviceId": "device-uuid"
    },
    {
      "operationType": "message",
      "operationData": {
        "conversationId": "conversation-uuid",
        "content": "Offline message",
        "timestamp": "2026-01-28T14:35:00Z"
      },
      "deviceId": "device-uuid"
    }
  ]
}
```

**Response: 202 Accepted**
```json
{
  "queuedOperations": [
    {
      "id": "queue-item-uuid-1",
      "operationType": "qr_scan",
      "status": "pending",
      "createdAt": "2026-01-28T15:00:00Z"
    },
    {
      "id": "queue-item-uuid-2",
      "operationType": "message",
      "status": "pending",
      "createdAt": "2026-01-28T15:00:00Z"
    }
  ],
  "message": "Operations queued for processing. Check status at /v1/offline/queue/status"
}
```

**Errors:**
- `400 Bad Request`: Invalid operation data
- `401 Unauthorized`: Invalid token

---

#### `GET /v1/offline/queue/status`
Get offline queue status

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "queueItems": [
    {
      "id": "queue-item-uuid-1",
      "operationType": "qr_scan",
      "status": "completed",
      "retryCount": 0,
      "createdAt": "2026-01-28T15:00:00Z",
      "processedAt": "2026-01-28T15:01:00Z"
    },
    {
      "id": "queue-item-uuid-2",
      "operationType": "message",
      "status": "failed",
      "retryCount": 3,
      "lastError": "Rate limit exceeded",
      "createdAt": "2026-01-28T15:00:00Z"
    }
  ]
}
```

**Errors:**
- `401 Unauthorized`: Invalid token

---

## Authentication & Authorization

### JWT Token Structure

#### Access Token

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "user-uuid",
  "email": "john.doe@example.com",
  "roles": ["student"],
  "iat": 1706443200,
  "exp": 1706446800
}
```

**Expiry:** 1 hour (3600 seconds)

---

#### Refresh Token

**Payload:**
```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "iat": 1706443200,
  "exp": 1709121600
}
```

**Expiry:** 30 days (2592000 seconds)

**Storage:**
- Stored in database with user ID
- Invalidated on logout
- Can be revoked by admin

---

### Authorization Headers

All authenticated endpoints require:

```
Authorization: Bearer <accessToken>
```

**Example:**
```
GET /v1/users/me HTTP/1.1
Host: api.converge-nps.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Role-Based Access Control (RBAC)

**Roles:**
1. `student` - Students attending event
2. `faculty` - Faculty members
3. `industry` - Industry participants
4. `staff` - Event staff (check-in, support)
5. `admin` - Full administrative access

**Permission Matrix:**

| Endpoint | student | faculty | industry | staff | admin |
|----------|---------|---------|----------|-------|-------|
| `/v1/users/me` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/v1/connections` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/v1/sessions` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/v1/messages` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/v1/staff/checkin` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/v1/admin/*` | ❌ | ❌ | ❌ | ❌ | ✅ |

**Implementation:**
- JWT token contains user roles in payload
- Middleware checks roles before processing request
- Database RLS policies enforce row-level access
- API layer validates role-based permissions

---

### Session Management

**Session Duration:**
- Active session: 30 minutes of inactivity
- Warning at 2 minutes before timeout
- Option to extend session

**Session Persistence:**
- Maximum: 30 days (refresh token expiry)
- Refresh token rotation on each refresh
- Old refresh token invalidated

**Session Invalidation:**
- User logout: Invalidate refresh token
- Admin suspend: Invalidate all user sessions
- Password reset: Invalidate all sessions

---

## Rate Limiting Strategy

### Global Rate Limits

**Per User:**
- 1000 requests per hour across all endpoints
- Tracked by user ID from JWT token

**Per IP Address (Unauthenticated):**
- 100 requests per hour (for `/v1/auth/*` endpoints)

**Implementation:**
- Redis-based rate limiting (recommended)
- Database-based fallback (for MVP simplicity)
- Sliding window algorithm

---

### Feature-Specific Rate Limits

#### Connections
- **50 connections per day** (database trigger enforced)
- Resets at midnight UTC

#### Messaging
- **40 messages per day** (database trigger enforced)
- **50 conversations per day** (database trigger enforced)
- Resets at midnight UTC

#### Profile Updates
- **20 updates per day** (database trigger enforced)

#### Opportunity Posting
- **10 opportunities per day** (database trigger enforced)

#### Authentication
- **Login**: 5 attempts per 15 minutes per IP
- **Password Reset**: 3 requests per hour per email
- **Email Verification**: 5 requests per hour per email

---

### Rate Limit Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1706446800
```

**When rate limit exceeded:**

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 3600

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 50 connections per day. Resets at 2026-01-29T00:00:00Z.",
    "retryAfter": 3600
  }
}
```

---

### Rate Limiting Implementation

**Option 1: Redis (Recommended for Production)**

```typescript
import Redis from 'ioredis';

const redis = new Redis();

async function checkRateLimit(userId: string, limit: number, windowSeconds: number): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  return current <= limit;
}
```

**Option 2: Database (MVP Fallback)**

Database triggers enforce rate limits (see DATABASE_SCHEMA.md):
- Connection rate limit: 50/day
- Message rate limit: 40/day
- Profile update limit: 20/day

---

## Error Handling

### Standard Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context (optional)"
    },
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid-for-tracing"
  }
}
```

---

### Error Categories & Codes

#### 400 Bad Request - Validation Errors

**Error Code:** `VALIDATION_ERROR`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    },
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

**Common Validation Errors:**
- `INVALID_EMAIL`: Email format invalid
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `REQUIRED_FIELD_MISSING`: Required field not provided
- `INVALID_UUID`: UUID format invalid
- `INVALID_DATE_FORMAT`: Date format incorrect

---

#### 401 Unauthorized - Authentication Errors

**Error Code:** `UNAUTHORIZED`

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token",
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

**Common Auth Errors:**
- `INVALID_CREDENTIALS`: Wrong email/password
- `TOKEN_EXPIRED`: Access token expired
- `TOKEN_INVALID`: Malformed or invalid token
- `EMAIL_NOT_VERIFIED`: Email verification required

---

#### 403 Forbidden - Authorization Errors

**Error Code:** `FORBIDDEN`

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource",
    "details": {
      "requiredRole": "admin",
      "userRoles": ["student"]
    },
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

**Common Authorization Errors:**
- `INSUFFICIENT_PERMISSIONS`: Missing required role
- `PRIVACY_VIOLATION`: User privacy settings prevent action
- `ACCOUNT_SUSPENDED`: Account suspended by admin

---

#### 404 Not Found - Resource Errors

**Error Code:** `NOT_FOUND`

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {
      "resourceType": "user",
      "resourceId": "user-uuid"
    },
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

---

#### 409 Conflict - Business Logic Errors

**Error Code:** `CONFLICT`

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Connection already exists with this user",
    "details": {
      "existingConnectionId": "connection-uuid"
    },
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

**Common Conflict Errors:**
- `DUPLICATE_RESOURCE`: Resource already exists (email, connection, etc.)
- `SCHEDULE_CONFLICT`: RSVP conflicts with existing RSVP
- `CAPACITY_EXCEEDED`: Session at capacity

---

#### 429 Too Many Requests - Rate Limit Errors

**Error Code:** `RATE_LIMIT_EXCEEDED`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 40 messages per day",
    "details": {
      "limit": 40,
      "remaining": 0,
      "resetAt": "2026-01-29T00:00:00Z"
    },
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

---

#### 500 Internal Server Error - System Errors

**Error Code:** `INTERNAL_SERVER_ERROR`

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

**Note:** Never expose internal implementation details in 500 errors. Log full error server-side.

---

#### 503 Service Unavailable - Maintenance Errors

**Error Code:** `SERVICE_UNAVAILABLE`

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable. Scheduled maintenance in progress.",
    "details": {
      "estimatedDowntime": "30 minutes",
      "retryAfter": 1800
    },
    "timestamp": "2026-01-28T10:00:00Z",
    "requestId": "req-uuid"
  }
}
```

---

### Error Code Registry

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_EMAIL` | 400 | Email format invalid |
| `WEAK_PASSWORD` | 400 | Password doesn't meet requirements |
| `REQUIRED_FIELD_MISSING` | 400 | Required field not provided |
| `INVALID_UUID` | 400 | UUID format invalid |
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `TOKEN_INVALID` | 401 | Malformed token |
| `EMAIL_NOT_VERIFIED` | 401 | Email verification required |
| `FORBIDDEN` | 403 | Permission denied |
| `INSUFFICIENT_PERMISSIONS` | 403 | Missing required role |
| `PRIVACY_VIOLATION` | 403 | Privacy settings prevent action |
| `ACCOUNT_SUSPENDED` | 403 | Account suspended |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `SCHEDULE_CONFLICT` | 409 | RSVP time conflict |
| `CAPACITY_EXCEEDED` | 409 | Session at capacity |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error |
| `SERVICE_UNAVAILABLE` | 503 | Service down for maintenance |

---

## Real-Time Features

### WebSocket Connection

#### Connection Endpoint

**URL:**
```
wss://api.converge-nps.com/v1/ws
```

**Authentication:**
Send access token immediately after connection:

```json
{
  "type": "auth",
  "payload": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Server Response (Success):**
```json
{
  "type": "auth_success",
  "payload": {
    "userId": "user-uuid",
    "connectedAt": "2026-01-28T10:00:00Z"
  }
}
```

**Server Response (Failure):**
```json
{
  "type": "auth_error",
  "payload": {
    "error": "Invalid or expired token"
  }
}
```

---

### Message Format

All WebSocket messages follow this format:

```json
{
  "type": "MESSAGE_TYPE",
  "payload": {
    // Message-specific data
  }
}
```

---

### Client → Server Messages

#### Send Message

```json
{
  "type": "message:send",
  "payload": {
    "conversationId": "conversation-uuid",
    "content": "Hello, this is a real-time message!"
  }
}
```

**Server Acknowledgment:**
```json
{
  "type": "message:sent",
  "payload": {
    "messageId": "message-uuid",
    "conversationId": "conversation-uuid",
    "status": "sent",
    "timestamp": "2026-01-28T10:05:00Z"
  }
}
```

---

#### Typing Indicator

```json
{
  "type": "typing:start",
  "payload": {
    "conversationId": "conversation-uuid"
  }
}
```

```json
{
  "type": "typing:stop",
  "payload": {
    "conversationId": "conversation-uuid"
  }
}
```

---

#### Mark as Read

```json
{
  "type": "message:read",
  "payload": {
    "messageId": "message-uuid"
  }
}
```

---

### Server → Client Messages

#### New Message

```json
{
  "type": "message:new",
  "payload": {
    "message": {
      "id": "message-uuid",
      "conversationId": "conversation-uuid",
      "sender": {
        "id": "sender-uuid",
        "fullName": "Jane Smith",
        "avatarUrl": "https://cdn.converge-nps.com/avatars/sender-uuid.jpg"
      },
      "content": "Hey, just saw your presentation!",
      "createdAt": "2026-01-28T10:10:00Z"
    }
  }
}
```

---

#### Message Delivered

```json
{
  "type": "message:delivered",
  "payload": {
    "messageId": "message-uuid",
    "deliveredAt": "2026-01-28T10:10:00Z"
  }
}
```

---

#### Message Read

```json
{
  "type": "message:read",
  "payload": {
    "messageId": "message-uuid",
    "readBy": {
      "userId": "reader-uuid",
      "fullName": "John Doe",
      "readAt": "2026-01-28T10:11:00Z"
    }
  }
}
```

---

#### Typing Indicator

```json
{
  "type": "typing:user",
  "payload": {
    "conversationId": "conversation-uuid",
    "user": {
      "id": "user-uuid",
      "fullName": "Jane Smith"
    },
    "isTyping": true
  }
}
```

---

#### Connection Status

```json
{
  "type": "connection:status",
  "payload": {
    "userId": "user-uuid",
    "status": "online"
  }
}
```

**Status Values:**
- `online`: User connected
- `offline`: User disconnected
- `away`: User inactive for 5+ minutes

---

### Connection Management

#### Heartbeat/Ping

**Client → Server (every 30 seconds):**
```json
{
  "type": "ping"
}
```

**Server → Client:**
```json
{
  "type": "pong",
  "payload": {
    "timestamp": "2026-01-28T10:15:00Z"
  }
}
```

---

#### Reconnection

**Exponential Backoff Strategy:**
- Initial retry: 1 second
- Max retry delay: 30 seconds
- Max retries: 10

**Reconnection Flow:**
1. Client detects connection loss
2. Wait for backoff period
3. Attempt reconnection
4. Re-authenticate with token
5. Resume message subscriptions

---

### Error Messages

```json
{
  "type": "error",
  "payload": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Message rate limit exceeded",
    "retryAfter": 3600
  }
}
```

---

### WebSocket Implementation Notes

**Technology Options:**
- **Socket.IO**: Higher-level abstraction, auto-reconnection, room management
- **Native WebSockets**: Simpler, lower overhead, more control

**Recommendation:** Socket.IO for MVP (easier implementation, better mobile support)

**Scaling Considerations:**
- Use Redis pub/sub for multi-server deployments
- Sticky sessions or shared state via Redis
- Horizontal scaling via load balancer with WebSocket support

---

## Pagination & Filtering

### Pagination Strategy

**Chosen Approach: Offset-Based Pagination**

**Rationale:**
- Simpler to implement and understand
- Works well with SQL `LIMIT` and `OFFSET`
- Sufficient for MVP scale (500 users)
- Familiar pattern for frontend developers

**Alternative Considered:**
- Cursor-based pagination: Better for large datasets, but adds complexity for MVP

---

### Standard Pagination Parameters

All list endpoints support these query parameters:

- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Results per page (default: 50, max: 100)

**Example Request:**
```
GET /v1/connections?page=2&limit=20
```

---

### Pagination Response Format

All paginated responses include a `pagination` object:

```json
{
  "connections": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

**Fields:**
- `page`: Current page number
- `limit`: Results per page
- `total`: Total number of results
- `totalPages`: Total number of pages

---

### Filtering

#### Standard Filter Parameters

**Search:**
- `search` (string): Keyword search across relevant fields

**Sort:**
- `sort` (string): Sort field and direction (e.g., `date`, `name`)
- Default sort varies by endpoint

**Date Range:**
- `startDate` (ISO date): Filter from date
- `endDate` (ISO date): Filter to date

**Status/Type Filters:**
- Endpoint-specific (e.g., `type`, `status`, `role`)

---

#### Filter Examples

**Connections:**
```
GET /v1/connections?search=Smith&intent=research&sort=date&page=1&limit=20
```

**Sessions:**
```
GET /v1/sessions?day=2026-01-28&type=workshop&featured=true&search=AI&page=1
```

**Projects:**
```
GET /v1/projects?department=Computer%20Science&stage=prototype&researchArea=AI&page=1
```

**Messages:**
```
GET /v1/conversations/{conversationId}/messages?before=2026-01-28T15:00:00Z&limit=50
```

---

### Sorting

#### Standard Sort Fields

- `date` or `createdAt`: Sort by creation date (DESC by default)
- `name` or `title`: Sort alphabetically (ASC)
- `updatedAt`: Sort by last update (DESC)

**Example:**
```
GET /v1/connections?sort=name&page=1
```

**Custom Sort (if needed):**
```
GET /v1/connections?sort=-createdAt  // DESC (default)
GET /v1/connections?sort=+name       // ASC
```

---

### Performance Optimization

**Database Indexes:**
All filter fields have database indexes (see DATABASE_SCHEMA.md)

**Caching:**
- Cache session list (24-hour TTL)
- Cache industry partners (24-hour TTL)
- Cache projects (24-hour TTL)

**Query Optimization:**
- Limit JOIN depth
- Use `SELECT` only needed fields
- Implement query timeout (5 seconds max)

---

## Performance Optimizations

### Response Caching

#### HTTP Cache Headers

**Static Resources:**
```
Cache-Control: public, max-age=31536000, immutable
```

**Dynamic Resources (Sessions, Partners, Projects):**
```
Cache-Control: public, max-age=86400
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

**User-Specific Resources (Profile, Connections, Messages):**
```
Cache-Control: private, max-age=0, must-revalidate
```

---

#### Conditional Requests (ETag)

**Client First Request:**
```
GET /v1/sessions HTTP/1.1
Host: api.converge-nps.com
```

**Server Response:**
```
HTTP/1.1 200 OK
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Cache-Control: public, max-age=3600
Content-Type: application/json

{...}
```

**Client Subsequent Request:**
```
GET /v1/sessions HTTP/1.1
Host: api.converge-nps.com
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

**Server Response (Not Modified):**
```
HTTP/1.1 304 Not Modified
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

**Benefits:**
- Reduces bandwidth usage
- Faster response times
- Better mobile performance

---

### Field Selection (Sparse Fieldsets)

**Query Parameter:** `fields`

**Example Request:**
```
GET /v1/users/{userId}?fields=id,fullName,organization,avatarUrl
```

**Response:**
```json
{
  "id": "user-uuid",
  "fullName": "Jane Smith",
  "organization": "DARPA",
  "avatarUrl": "https://cdn.converge-nps.com/avatars/user-uuid.jpg"
}
```

**Benefits:**
- Smaller response payloads
- Faster serialization
- Reduced bandwidth usage
- Better mobile performance

---

### Batch Operations

#### Batch Connections Check

**Endpoint:** `POST /v1/connections/batch-check`

**Request:**
```json
{
  "userIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"]
}
```

**Response:**
```json
{
  "connections": [
    {
      "userId": "user-uuid-1",
      "connected": true,
      "connectionId": "connection-uuid-1"
    },
    {
      "userId": "user-uuid-2",
      "connected": false
    },
    {
      "userId": "user-uuid-3",
      "connected": true,
      "connectionId": "connection-uuid-3"
    }
  ]
}
```

**Benefits:**
- Single request instead of N requests
- Reduced latency
- Better UX (faster UI updates)

---

### Compression

**Response Compression:**
```
Accept-Encoding: gzip, deflate, br
```

**Server Response:**
```
Content-Encoding: gzip
```

**Recommendation:**
- Use Brotli compression (better than gzip)
- Fallback to gzip for older clients
- Compress responses > 1KB

---

### CDN for Static Assets

**CDN URL:**
```
https://cdn.converge-nps.com/
```

**Assets:**
- User avatars
- Industry partner logos
- QR code images
- App static files (JS, CSS, images)

**CDN Configuration:**
- Global edge locations
- Automatic image optimization
- WebP conversion for supported browsers
- Lazy loading for images

---

### Database Query Optimization

**Connection Pooling:**
- Pool size: 20 connections per app instance
- Max lifetime: 30 minutes
- Idle timeout: 10 minutes

**Query Optimization:**
- Use prepared statements
- Implement query timeout (5 seconds)
- Index all foreign keys and filter fields
- Use `EXPLAIN ANALYZE` for slow queries

**Database Caching:**
- Shared buffers: 256MB
- Effective cache size: 1GB
- Work memory: 16MB

---

### API Response Times

**Target Performance (p95):**
- GET requests: < 200ms
- POST/PATCH requests: < 500ms
- File uploads: < 2 seconds

**Monitoring:**
- Log all requests > 1 second
- Alert on p95 > 500ms
- Track slow queries

---

## API Documentation Strategy

### OpenAPI/Swagger Specification

**OpenAPI Version:** 3.0.3

**Specification File:**
```yaml
openapi: 3.0.3
info:
  title: Converge-NPS API
  description: Enterprise Event Networking Platform for NPS Tech Accelerator 2026
  version: 1.0.0
  contact:
    name: API Support
    email: support@converge-nps.com
servers:
  - url: https://api.converge-nps.com/v1
    description: Production
  - url: https://api.staging.converge-nps.com/v1
    description: Staging
  - url: http://localhost:3000/api/v1
    description: Development
```

---

### Auto-Generated Documentation

**Tool:** Swagger UI / Redoc

**Hosted At:**
```
https://docs.converge-nps.com/api
```

**Features:**
- Interactive API explorer
- Try-it-out functionality
- Code examples in multiple languages
- Schema definitions
- Authentication instructions

---

### Interactive API Explorer

**Features:**
1. **Live Testing:** Test endpoints directly from docs
2. **Authentication:** Input JWT token for authenticated endpoints
3. **Request Builder:** Form-based request builder
4. **Response Viewer:** Formatted JSON response viewer
5. **Code Generation:** Auto-generate client code (curl, JavaScript, Python)

---

### Code Examples

**Example: Register User (JavaScript)**
```javascript
const response = await fetch('https://api.converge-nps.com/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    fullName: 'John Doe',
    organization: 'Naval Postgraduate School',
    role: 'student'
  })
});

const data = await response.json();
console.log(data);
```

**Example: Get Connections (curl)**
```bash
curl -X GET "https://api.converge-nps.com/v1/connections?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example: Send Message (Python)**
```python
import requests

url = "https://api.converge-nps.com/v1/conversations/{conversationId}/messages"
headers = {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN",
    "Content-Type": "application/json"
}
data = {
    "content": "Hello from Python!"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

### API Versioning Documentation

**Version History:**

| Version | Release Date | Status | Notes |
|---------|--------------|--------|-------|
| v1 | 2026-01-15 | Active | MVP release for Tech Accelerator 2026 |

**Deprecation Policy:**
- 6-month notice for breaking changes
- 12-month support for deprecated versions
- Migration guides provided

---

### Postman Collection

**Published Collection:**
```
https://www.postman.com/converge-nps/workspace/api
```

**Features:**
- Pre-configured requests for all endpoints
- Environment variables (dev, staging, production)
- Example responses
- Pre-request scripts for authentication
- Test scripts for validation

---

### SDK Generation

**Planned SDKs:**
1. **JavaScript/TypeScript** (Priority 1 - Frontend)
2. **Python** (Priority 2 - Admin scripts)
3. **Swift** (Future - Native iOS if needed)

**Auto-Generation Tool:** OpenAPI Generator

**Example TypeScript SDK:**
```typescript
import { ConvergeClient } from '@converge-nps/sdk';

const client = new ConvergeClient({
  baseUrl: 'https://api.converge-nps.com/v1',
  accessToken: 'YOUR_ACCESS_TOKEN'
});

// Get user profile
const profile = await client.users.getMe();

// Create connection
const connection = await client.connections.create({
  connectionMethod: 'qr_scan',
  qrCodeData: 'scanned-user-uuid',
  collaborativeIntents: ['research', 'funding']
});

// Send message
const message = await client.messages.send({
  conversationId: 'conversation-uuid',
  content: 'Hello from SDK!'
});
```

---

## Design Decisions

### 1. REST vs GraphQL

**Decision:** REST API

**Rationale:**
- **Simplicity:** Faster to implement for 12-week MVP timeline
- **Caching:** Built-in HTTP caching (ETag, Cache-Control)
- **Tooling:** Better tooling support (OpenAPI, Postman)
- **Team Familiarity:** Most developers know REST
- **Mobile Performance:** Simpler request structure better for mobile networks
- **No Complex Queries:** App doesn't need flexible querying

**Tradeoff:** GraphQL would enable flexible querying but adds complexity

---

### 2. JWT vs Session-Based Authentication

**Decision:** JWT with Refresh Tokens

**Rationale:**
- **Stateless:** No server-side session storage required
- **Scalability:** Easier to scale horizontally
- **Mobile-Friendly:** Works well with mobile apps
- **Standard:** Industry-standard approach
- **Flexibility:** Can include user roles in token

**Implementation:**
- Access token: 1 hour expiry
- Refresh token: 30 days expiry
- Refresh tokens stored in database (can be revoked)

**Tradeoff:** Cannot invalidate access tokens before expiry (mitigated by short expiry)

---

### 3. Offset vs Cursor Pagination

**Decision:** Offset-Based Pagination

**Rationale:**
- **Simplicity:** Easier to implement and understand
- **SQL Support:** Works naturally with `LIMIT` and `OFFSET`
- **MVP Scale:** Sufficient for 500 users and expected data volume
- **Familiarity:** Standard pattern for developers

**Tradeoff:** Cursor pagination is better for large datasets, but offset is sufficient for MVP

---

### 4. Rate Limiting Implementation

**Decision:** Database-Level Rate Limiting (MVP) + Redis (Production)

**Rationale:**
- **MVP:** Database triggers enforce rate limits (simple, no external dependencies)
- **Production:** Redis for better performance and distributed rate limiting
- **Security:** Cannot be bypassed via API layer
- **Reliability:** Works even if multiple app instances don't coordinate

**Implementation:**
- Database triggers for feature limits (connections, messages)
- Middleware for API-level limits (1000 req/hour)
- Redis for production scaling

---

### 5. WebSocket for Real-Time Messaging

**Decision:** Socket.IO (not native WebSockets)

**Rationale:**
- **Auto-Reconnection:** Built-in reconnection logic
- **Fallback:** Falls back to HTTP long-polling if WebSocket unavailable
- **Room Management:** Built-in room/channel support for conversation subscriptions
- **Mobile Support:** Better mobile browser support
- **Ease of Use:** Higher-level abstraction, faster development

**Tradeoff:** Slightly higher overhead than native WebSockets, but better developer experience

---

### 6. Error Response Format

**Decision:** Standardized error format with error codes

**Rationale:**
- **Consistency:** All errors follow same structure
- **Client Handling:** Error codes enable programmatic error handling
- **Debugging:** Request ID for tracing errors
- **Details:** Optional details field for validation errors
- **Standard:** Follows industry best practices

---

### 7. Field Selection (Sparse Fieldsets)

**Decision:** Support `fields` query parameter for field selection

**Rationale:**
- **Performance:** Smaller payloads for mobile clients
- **Flexibility:** Clients can request only needed fields
- **Bandwidth:** Reduces bandwidth usage
- **Standard:** Common REST pattern (JSON API spec)

**Example:** `/v1/users/{userId}?fields=id,fullName,avatarUrl`

---

### 8. Batch Operations

**Decision:** Support batch endpoints for common multi-fetch scenarios

**Rationale:**
- **Performance:** Single request instead of N requests
- **Latency:** Reduces round-trip time
- **UX:** Faster UI updates
- **Mobile:** Better for high-latency mobile networks

**Example:** `POST /v1/connections/batch-check` to check multiple connections at once

---

### 9. API Versioning

**Decision:** URL path versioning (`/v1/`)

**Rationale:**
- **Clarity:** Explicit version in URL
- **Caching:** Easy to cache at CDN level
- **Routing:** Simple to route at load balancer level
- **Discovery:** Easy for developers to understand

**Alternative Considered:** Header-based versioning (more flexible but less discoverable)

---

### 10. Privacy-Aware API Design

**Decision:** API responses respect database-level privacy settings

**Rationale:**
- **Security:** Privacy enforced at database level (RLS + views)
- **Consistency:** All clients get same privacy enforcement
- **Simplicity:** API layer doesn't need privacy logic
- **Defense-in-Depth:** Multiple layers of privacy protection

**Implementation:**
- Use `profiles_safe` and `industry_partners_safe` views
- API returns null for hidden fields
- Frontend hides UI elements based on privacy flags

---

## Summary

### API Architecture Highlights

**Total Endpoints:** 52 endpoints, 104 HTTP methods

**Key Design Patterns:**
1. RESTful resource-based URLs
2. JWT authentication with refresh tokens
3. Role-based access control (RBAC)
4. Database-level rate limiting
5. WebSocket for real-time messaging
6. Offset-based pagination
7. Standardized error responses
8. HTTP caching with ETag
9. Field selection for performance
10. Privacy-aware responses

**Authentication:** JWT with 1-hour access tokens and 30-day refresh tokens

**Rate Limiting:**
- Global: 1000 requests/hour per user
- Connections: 50/day
- Messages: 40/day
- Profile updates: 20/day
- Database-level enforcement

**Performance:**
- Target p95 response time: < 500ms
- HTTP caching with ETag
- CDN for static assets
- Field selection support
- Batch operations

**Real-Time:**
- WebSocket endpoint for messaging
- Socket.IO for auto-reconnection
- Typing indicators and read receipts
- Presence tracking

**Documentation:**
- OpenAPI 3.0.3 specification
- Interactive API explorer (Swagger UI)
- Auto-generated SDKs (TypeScript, Python)
- Postman collection

---

### Concerns & Recommendations

**Concerns:**

1. **Database Rate Limiting:** Database triggers add overhead to inserts. Consider Redis for production.
2. **WebSocket Scaling:** Socket.IO requires Redis pub/sub for multi-server deployments.
3. **Offline Queue Processing:** Simple retry mechanism may need enhancement for production.
4. **File Upload Size:** 2MB avatar limit may be too restrictive for high-res images.

**Recommendations:**

1. **Add Redis:** For production, add Redis for rate limiting and WebSocket scaling.
2. **Monitoring:** Implement comprehensive API monitoring (response times, error rates, rate limit hits).
3. **Testing:** Load test all endpoints with 2x expected traffic (1000 concurrent users).
4. **Documentation:** Keep OpenAPI spec up-to-date with every API change.
5. **Security Audit:** Conduct security audit before production launch.
6. **CDN:** Configure CDN for all static assets (avatars, logos, QR codes).
7. **Database Indexes:** Verify all indexes are created (see DATABASE_SCHEMA.md).
8. **Error Tracking:** Integrate Sentry or similar for client and server error tracking.

---

**Document Status:** ✅ Ready for Review
**Next Steps:**
1. Review API design with Security & Privacy Engineer
2. Generate OpenAPI specification
3. Implement API endpoints (backend engineers)
4. Generate TypeScript SDK for frontend
5. Set up API documentation site
6. Load testing with 2x expected traffic

---

**Last Updated:** 2025-12-02
**Version:** 1.0
**Author:** Architect Agent
