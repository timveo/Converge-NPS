# Smartsheet Integration Guide

## Overview

The Converge-NPS application integrates with Smartsheet for bi-directional data synchronization:

- **Import (Inbound)**: Load event data from Smartsheet into the application
- **Export (Outbound)**: Sync user activity and analytics back to Smartsheet

This guide covers the complete setup and usage of the Smartsheet integration.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Data Import](#data-import)
4. [Data Export](#data-export)
5. [Column Mappings](#column-mappings)
6. [API Endpoints](#api-endpoints)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Smartsheet Account

You need a Smartsheet account with:
- Access to create and manage sheets
- API access enabled (available on all paid plans)

### 2. API Token

Generate a Smartsheet API token:

1. Log in to [Smartsheet](https://app.smartsheet.com)
2. Click your profile icon → **Apps & Integrations**
3. Click **API Access**
4. Click **Generate new access token**
5. Give it a name (e.g., "Converge-NPS Integration")
6. Copy the token (save it securely - it won't be shown again)

### 3. Sheet IDs

For each Smartsheet you want to integrate, get its Sheet ID:

1. Open the sheet in Smartsheet
2. Look at the URL: `https://app.smartsheet.com/sheets/{SHEET_ID}`
3. Copy the Sheet ID from the URL

---

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Smartsheet API Configuration
SMARTSHEET_API_KEY="your-api-token-here"

# Import Sheets (Inbound: Smartsheet → App)
SMARTSHEET_SESSIONS_SHEET_ID="1234567890123456"
SMARTSHEET_PROJECTS_SHEET_ID="2345678901234567"
SMARTSHEET_OPPORTUNITIES_SHEET_ID="3456789012345678"
SMARTSHEET_PARTNERS_SHEET_ID="4567890123456789"
SMARTSHEET_ATTENDEES_SHEET_ID="5678901234567890"

# Export Sheets (Outbound: App → Smartsheet)
SMARTSHEET_USER_SHEET_ID="6789012345678901"
SMARTSHEET_RSVP_SHEET_ID="7890123456789012"
SMARTSHEET_CONNECTION_SHEET_ID="8901234567890123"
SMARTSHEET_ANALYTICS_SHEET_ID="9012345678901234"
```

### Required Admin User

For importing opportunities, ensure you have at least one admin user in the database:

```sql
-- Create admin user if needed
INSERT INTO user_roles (user_id, role)
VALUES ('your-admin-user-id', 'admin');
```

---

## Data Import

### Overview

The import functionality reads data from Smartsheet and creates or updates records in the application database.

### Import Types

1. **Sessions** - Event schedule and sessions
2. **Projects** - Research projects
3. **Opportunities** - Funding/internship/competition opportunities
4. **Partners** - Industry partners and exhibitors
5. **Attendees** - Registered attendees/users

### Import Behavior

- **Existing Records**: If a matching record exists, it will be **updated** with new data
- **New Records**: If no match is found, a **new record** is created
- **Validation**: All data is validated before import
- **Error Handling**: Failed rows are logged with detailed error messages

### Matching Logic

Each data type uses different fields to identify existing records:

- **Sessions**: Matched by `title` + `startTime`
- **Projects**: Matched by `title` + `piId`
- **Opportunities**: Matched by `title` + `sponsorOrganization`
- **Partners**: Matched by `companyName` (unique)
- **Attendees**: Matched by `email` (unique)

---

## Data Export

### Overview

The export functionality syncs application data back to Smartsheet for reporting and analytics.

### Export Types

1. **Users** - User profiles and registrations
2. **RSVPs** - Session registrations
3. **Connections** - Networking connections made at the event
4. **Analytics** - Custom analytics data

### Export Behavior

- **Rate Limited**: Respects Smartsheet's rate limit (300 calls/minute)
- **Batch Processing**: Handles large datasets efficiently
- **Retry Logic**: Failed syncs can be retried manually or automatically
- **Sync Log**: All sync attempts are logged for auditing

---

## Column Mappings

### Sessions Sheet

Required columns in your Smartsheet:

| Smartsheet Column | Database Field | Required | Type | Notes |
|-------------------|----------------|----------|------|-------|
| Title (or Session Title) | title | Yes | Text | Session name |
| Description | description | No | Text | Session details |
| Speaker Name (or Speaker) | speaker | No | Text | Presenter name |
| Location (or Room) | location | No | Text | Room/venue |
| Session Type (or Type) | sessionType | No | Text | e.g., "Workshop", "Panel" |
| Start Time | startTime | Yes | Date/Time | Must be valid ISO date |
| End Time | endTime | Yes | Date/Time | Must be after start time |
| Capacity | capacity | No | Number | Default: 50 |

**Example Sheet Structure:**
```
Title                  | Start Time          | End Time            | Location | Speaker
Opening Keynote        | 2024-03-15 09:00   | 2024-03-15 10:00   | Room A   | Dr. Smith
Research Workshop      | 2024-03-15 10:30   | 2024-03-15 12:00   | Room B   | Prof. Jones
```

---

### Projects Sheet

Required columns in your Smartsheet:

| Smartsheet Column | Database Field | Required | Type | Notes |
|-------------------|----------------|----------|------|-------|
| Project Title (or Title) | title | Yes | Text | Project name |
| Description | description | Yes | Text | Project details |
| PI Name (or Principal Investigator) | piName | Yes | Text | PI full name |
| PI Email | piEmail | Yes | Email | Used to find/create PI profile |
| Department | department | No | Text | Department name |
| Research Stage (or Stage) | stage | No | Text | concept, prototype, pilot_ready, deployed |
| Classification | classification | No | Text | Default: "Unclassified" |
| Keywords (or Tags) | keywords | No | Text | Comma-separated or JSON array |
| Research Areas | researchAreas | No | Text | Comma-separated or JSON array |
| Seeking (or Looking For) | seeking | No | Text | What the project needs |
| Students (or Team Members) | students | No | Text | Comma-separated list |

**Example Sheet Structure:**
```
Project Title          | PI Name    | PI Email           | Description            | Stage      | Keywords
AI for Logistics       | Dr. Smith  | smith@navy.mil     | Using AI to optimize...| prototype  | AI, Logistics, ML
Quantum Sensors        | Prof. Jones| jones@navy.mil     | Next-gen sensors...    | concept    | Quantum, Sensors
```

**Stage Values:**
- `concept` - Early ideation phase
- `prototype` - Working prototype exists
- `pilot_ready` or `pilot ready` - Ready for pilot testing
- `deployed` - Fully deployed and operational

---

### Opportunities Sheet

Required columns in your Smartsheet:

| Smartsheet Column | Database Field | Required | Type | Notes |
|-------------------|----------------|----------|------|-------|
| Title (or Opportunity Title) | title | Yes | Text | Opportunity name |
| Description | description | No | Text | Details |
| Organization (or Sponsor Organization) | sponsorOrganization | No | Text | Sponsoring org |
| Type (or Opportunity Type) | type | No | Text | funding, internship, competition |
| Deadline (or Application Deadline) | deadline | No | Date | Application deadline |
| Contact Email | contactEmail | No | Email | Must be valid email format |
| Requirements (or Eligibility) | requirements | No | Text | Eligibility criteria |
| Benefits | benefits | No | Text | What's offered |
| Location | location | No | Text | Physical location |
| Duration | duration | No | Text | Time commitment |
| DoD Alignment (or DoD Priority Areas) | dodAlignment | No | Text | Comma-separated list |

**Example Sheet Structure:**
```
Title                  | Type       | Organization    | Deadline     | Description
SBIR Phase I           | funding    | Navy            | 2024-06-30   | Small Business...
Summer Internship      | internship | DoD Lab         | 2024-03-15   | 10-week program...
Innovation Challenge   | competition| DARPA           | 2024-05-01   | Pitch competition...
```

**Type Values:**
- `funding` - Grants, contracts, awards
- `internship` - Internship opportunities
- `competition` - Competitions and challenges

---

### Partners Sheet

Required columns in your Smartsheet:

| Smartsheet Column | Database Field | Required | Type | Notes |
|-------------------|----------------|----------|------|-------|
| Company Name (or Organization) | companyName | Yes | Text | Must be unique |
| Description | description | No | Text | Company overview |
| Organization Type (or Type) | organizationType | No | Text | e.g., "Small Business", "Large Corp" |
| Website (or Website URL) | websiteUrl | No | URL | Company website |
| Technology Focus (or Focus Areas) | technologyFocusAreas | No | Text | Comma-separated list |
| Seeking Collaboration (or Looking For) | seekingCollaboration | No | Text | What they're seeking |
| Booth Location (or Booth) | boothLocation | No | Text | Exhibition booth |
| Contact Name (or Primary Contact) | primaryContactName | No | Text | Main contact |
| Contact Title | primaryContactTitle | No | Text | Contact's title |
| Contact Email | primaryContactEmail | No | Email | Must be valid |
| Contact Phone | primaryContactPhone | No | Text | Phone number |
| DoD Sponsors (or Government Sponsors) | dodSponsors | No | Text | Government relationships |

**Example Sheet Structure:**
```
Company Name       | Technology Focus      | Booth Location | Contact Name  | Contact Email
Acme Defense       | AI, Cybersecurity    | Booth 101      | John Doe      | john@acme.com
TechCorp Solutions | Robotics, IoT        | Booth 202      | Jane Smith    | jane@techcorp.com
```

---

### Attendees Sheet

Required columns in your Smartsheet:

| Smartsheet Column | Database Field | Required | Type | Notes |
|-------------------|----------------|----------|------|-------|
| Full Name (or Name) | fullName | Yes | Text | Attendee name |
| Email (or Email Address) | email | Yes | Email | Must be unique and valid |
| Phone (or Phone Number) | phone | No | Text | Phone number |
| Rank | rank | No | Text | Military rank |
| Organization (or Company) | organization | No | Text | Organization name |
| Department | department | No | Text | Department |
| Role (or Position) | role | No | Text | Job title |
| LinkedIn (or LinkedIn URL) | linkedinUrl | No | URL | LinkedIn profile |
| Website | websiteUrl | No | URL | Personal/org website |

**Example Sheet Structure:**
```
Full Name      | Email              | Organization | Role           | Phone
John Doe       | john@navy.mil      | US Navy      | Program Manager| 555-0100
Jane Smith     | jane@defense.gov   | DoD          | Analyst        | 555-0101
```

**Notes:**
- New attendees automatically get QR codes generated
- Email is used for duplicate detection
- Profiles default to public visibility

---

## API Endpoints

All endpoints require authentication and admin role.

### Import Endpoints

#### Import Sessions
```http
POST /api/v1/admin/smartsheet/import/sessions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 15,
    "updated": 3,
    "skipped": 0,
    "failed": 2,
    "errors": [
      {
        "row": 5,
        "message": "Missing required field: Title"
      },
      {
        "row": 12,
        "message": "Invalid or missing start/end time",
        "data": { "title": "Research Panel" }
      }
    ]
  },
  "message": "Import complete: 15 new, 3 updated, 2 failed out of 20 total rows"
}
```

#### Import Projects
```http
POST /api/v1/admin/smartsheet/import/projects
```

#### Import Opportunities
```http
POST /api/v1/admin/smartsheet/import/opportunities
```

#### Import Partners
```http
POST /api/v1/admin/smartsheet/import/partners
```

#### Import Attendees
```http
POST /api/v1/admin/smartsheet/import/attendees
```

#### Import All Data
```http
POST /api/v1/admin/smartsheet/import/all
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": { "imported": 15, "updated": 3, "failed": 2, "errors": [...] },
    "projects": { "imported": 8, "updated": 2, "failed": 0, "errors": [] },
    "opportunities": { "imported": 12, "updated": 1, "failed": 1, "errors": [...] },
    "partners": { "imported": 20, "updated": 5, "failed": 0, "errors": [] },
    "attendees": { "imported": 150, "updated": 25, "failed": 3, "errors": [...] }
  },
  "summary": {
    "totalImported": 205,
    "totalUpdated": 36,
    "totalFailed": 6
  },
  "errors": [],
  "message": "All data imported successfully: 205 new, 36 updated"
}
```

### Export Endpoints

#### Sync Status
```http
GET /api/v1/admin/smartsheet/status
```

#### Trigger Export
```http
POST /api/v1/admin/smartsheet/sync/:type
```

Types: `users`, `rsvps`, `connections`

#### Get Failed Syncs
```http
GET /api/v1/admin/smartsheet/failed
```

#### Retry Failed Sync
```http
POST /api/v1/admin/smartsheet/retry/:id
```

#### Clear Failed Syncs
```http
DELETE /api/v1/admin/smartsheet/clear-failed
```

---

## Error Handling

### Common Errors

#### 1. Missing API Key
```json
{
  "success": false,
  "error": "Failed to import sessions",
  "details": "SMARTSHEET_API_KEY environment variable is not set"
}
```

**Solution**: Set the `SMARTSHEET_API_KEY` in your `.env` file.

#### 2. Invalid Sheet ID
```json
{
  "success": false,
  "error": "Failed to import sessions",
  "details": "SMARTSHEET_SESSIONS_SHEET_ID not configured"
}
```

**Solution**: Set the correct Sheet ID in your `.env` file.

#### 3. Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": "Too many requests. Please wait and try again."
}
```

**Solution**: The system automatically queues requests to respect rate limits. If you see this error, wait a few minutes before retrying.

#### 4. Invalid Data Format
```json
{
  "data": {
    "errors": [
      {
        "row": 5,
        "message": "Invalid email format",
        "data": { "fullName": "John Doe", "email": "invalid-email" }
      }
    ]
  }
}
```

**Solution**: Fix the data in the Smartsheet row and re-run the import.

### Validation Rules

#### Email Validation
- Must match pattern: `user@domain.com`
- Required for: Attendees, some project PIs

#### Date Validation
- Must be valid ISO 8601 date/time
- End time must be after start time (for sessions)
- Examples: `2024-03-15T09:00:00Z`, `2024-03-15 09:00`

#### Enum Validation
- **Session Types**: Any text value
- **Project Stages**: `concept`, `prototype`, `pilot_ready`, `deployed`
- **Opportunity Types**: `funding`, `internship`, `competition`
- **Opportunity Status**: `active`, `closed`, `draft`

---

## Best Practices

### 1. Sheet Setup

- **Use consistent column names**: Stick to the exact column names listed in this guide
- **Add validation**: Use Smartsheet's data validation to enforce formats
- **Lock rows**: Lock header rows to prevent accidental changes
- **Color coding**: Use conditional formatting to highlight issues

### 2. Data Preparation

- **Clean data first**: Remove test data, duplicates, and incomplete rows
- **Test with sample data**: Import a few rows first to verify mapping
- **Backup your sheets**: Create a copy before making bulk changes

### 3. Import Strategy

**For Initial Setup:**
1. Import partners first (no dependencies)
2. Import attendees (creates user profiles)
3. Import sessions (needed for RSVPs)
4. Import projects (needs PI profiles)
5. Import opportunities last

**For Regular Updates:**
- Use "Import All" for convenience
- Run imports during off-peak hours
- Monitor error logs after each import

### 4. Monitoring

- **Check import results**: Review the `errors` array after each import
- **Validate data**: Spot-check imported records in the app
- **Export logs**: Export sync logs for audit trails

### 5. Security

- **Protect API keys**: Never commit `.env` files to version control
- **Use service accounts**: Create a dedicated Smartsheet user for API access
- **Limit access**: Only share sheets with necessary team members
- **Rotate keys**: Periodically regenerate API tokens

---

## Troubleshooting

### Import returns empty data

**Problem**: Import succeeds but no records are created/updated.

**Solutions**:
1. Verify Sheet ID is correct
2. Check that sheet has data rows (not just headers)
3. Ensure API key has read access to the sheet
4. Check column names match exactly (case-sensitive in some cases)

### Some rows fail to import

**Problem**: Import partially succeeds with errors.

**Solutions**:
1. Review the `errors` array in the response
2. Fix data issues in Smartsheet
3. Re-run the import (only failed rows will need fixing)

### Rate limit errors

**Problem**: Getting 429 errors from Smartsheet.

**Solutions**:
1. The system automatically rate-limits to 300 calls/minute
2. If you're hitting limits, reduce parallel operations
3. Consider implementing a scheduled import instead of on-demand

### Duplicate records created

**Problem**: Records are being duplicated instead of updated.

**Solutions**:
1. Check the matching logic for your data type
2. Ensure unique fields (email, company name) are truly unique in Smartsheet
3. Clean up duplicates in the database
4. Re-run import with cleaned data

### No admin user found error

**Problem**: Importing opportunities fails with "No admin user found".

**Solution**:
```sql
-- Find a user ID
SELECT id FROM profiles LIMIT 1;

-- Make them an admin
INSERT INTO user_roles (user_id, role)
VALUES ('user-id-from-above', 'admin');
```

---

## Support

### Getting Help

1. **Check logs**: Review application logs for detailed error messages
2. **API documentation**: [Smartsheet API Docs](https://smartsheet.redoc.ly/)
3. **Database schema**: See `prisma/schema.prisma` for data models

### Reporting Issues

When reporting issues, include:
- Import type (sessions, projects, etc.)
- Error message and response
- Sample data (with sensitive info removed)
- Sheet column configuration

---

## Appendix

### Rate Limits

Smartsheet API rate limits:
- **300 calls per minute** per API token
- The system enforces a 200ms delay between requests (max 300/min)
- Bulk operations are automatically batched

### Data Types

The system intelligently parses:
- **Arrays**: Comma-separated strings or JSON arrays
- **Dates**: ISO 8601 or common formats
- **Booleans**: true/false, yes/no, 1/0
- **Numbers**: Integer or decimal

### Column Name Flexibility

Many columns support alternate names:
- "Session Title" or "Title"
- "Principal Investigator" or "PI Name"
- "Email Address" or "Email"

The system will try multiple common variations.

---

## Change Log

### Version 1.0.0 (2024-03-01)
- Initial release
- Support for 5 import types
- Export functionality for users, RSVPs, connections
- Comprehensive error handling and validation
