# Smartsheet Integration - Quick Start Guide

## 5-Minute Setup

### Step 1: Get Your Smartsheet API Token

1. Go to https://app.smartsheet.com
2. Click your profile → **Apps & Integrations**
3. Click **API Access** → **Generate new access token**
4. Name it "Converge-NPS" and copy the token
5. Save it securely (you won't see it again)

### Step 2: Get Your Sheet IDs

For each sheet you want to import:

1. Open the sheet in Smartsheet
2. Look at the URL: `https://app.smartsheet.com/sheets/XXXXXXXXXX`
3. Copy the numeric ID from the URL

### Step 3: Configure Environment

Add to your `.env` file:

```bash
SMARTSHEET_API_KEY="paste-your-token-here"

# Import Sheets
SMARTSHEET_SESSIONS_SHEET_ID="your-sessions-sheet-id"
SMARTSHEET_PROJECTS_SHEET_ID="your-projects-sheet-id"
SMARTSHEET_OPPORTUNITIES_SHEET_ID="your-opportunities-sheet-id"
SMARTSHEET_PARTNERS_SHEET_ID="your-partners-sheet-id"
SMARTSHEET_ATTENDEES_SHEET_ID="your-attendees-sheet-id"
```

### Step 4: Set Up Your Smartsheet Columns

#### Sessions Sheet Columns
```
Title | Description | Speaker Name | Location | Session Type | Start Time | End Time | Capacity
```

#### Projects Sheet Columns
```
Project Title | Description | PI Name | PI Email | Department | Research Stage | Keywords
```

#### Opportunities Sheet Columns
```
Title | Description | Organization | Type | Deadline | Contact Email | Requirements
```

#### Partners Sheet Columns
```
Company Name | Description | Organization Type | Website | Technology Focus | Contact Name | Contact Email
```

#### Attendees Sheet Columns
```
Full Name | Email | Phone | Organization | Role | LinkedIn
```

### Step 5: Test Import

Start your server and test with curl:

```bash
# Import sessions
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Or import everything at once
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Column Name Alternatives

The system accepts these alternative column names:

- **Session Title** or **Title**
- **Speaker Name** or **Speaker**
- **Room** or **Location**
- **Type** or **Session Type**
- **Principal Investigator** or **PI Name**
- **Tags** or **Keywords**
- **Looking For** or **Seeking**
- **Opportunity Title** or **Title**
- **Email Address** or **Email**
- **Primary Contact** or **Contact Name**

## API Endpoints

All endpoints require admin authentication: `/api/v1/admin/smartsheet/import/{type}`

- `/sessions` - Import event sessions
- `/projects` - Import research projects
- `/opportunities` - Import funding/internship opportunities
- `/partners` - Import industry partners
- `/attendees` - Import registered users
- `/all` - Import everything at once

## Example Response

```json
{
  "success": true,
  "data": {
    "imported": 15,
    "updated": 3,
    "failed": 2,
    "errors": [
      {
        "row": 5,
        "message": "Missing required field: Title"
      }
    ]
  },
  "message": "Import complete: 15 new, 3 updated, 2 failed"
}
```

## Validation Rules

### Required Fields

- **Sessions**: Title, Start Time, End Time
- **Projects**: Title, Description, PI Email
- **Opportunities**: Title
- **Partners**: Company Name
- **Attendees**: Full Name, Email

### Data Formats

- **Dates**: Use ISO format `2024-03-15T09:00:00Z` or `2024-03-15 09:00`
- **Arrays**: Comma-separated values `AI, Machine Learning, IoT` or JSON `["AI", "ML"]`
- **Emails**: Must be valid format `user@domain.com`

## Troubleshooting

### "SMARTSHEET_API_KEY not set"
→ Add `SMARTSHEET_API_KEY` to your `.env` file

### "Sheet ID not configured"
→ Add the appropriate `SMARTSHEET_*_SHEET_ID` to your `.env`

### "No admin user found"
→ Create an admin user first:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('your-user-id', 'admin');
```

### "Invalid email format"
→ Fix the email in your Smartsheet and re-import

### "Missing required field"
→ Ensure all required columns have values in Smartsheet

## Need More Help?

See the full documentation: [`SMARTSHEET_INTEGRATION.md`](./SMARTSHEET_INTEGRATION.md)

## Security Reminders

- Never commit `.env` files to version control
- Rotate API tokens periodically
- Use a dedicated Smartsheet service account
- Limit sheet access to necessary team members
