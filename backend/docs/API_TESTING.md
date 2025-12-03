# Smartsheet API Testing Guide

This guide provides ready-to-use curl commands and Postman examples for testing the Smartsheet integration endpoints.

---

## Prerequisites

1. **Backend server running**: `npm run dev`
2. **Admin JWT token**: Get by logging in as admin
3. **Smartsheet configured**: API key and sheet IDs in `.env`

---

## Getting an Admin JWT Token

### Login Request

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@converge.mil",
    "password": "your-password"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": "...",
      "email": "admin@converge.mil",
      "roles": ["admin"]
    }
  }
}
```

Save the `accessToken` for use in subsequent requests.

---

## Import Endpoints

### 1. Import Sessions

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

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

---

### 2. Import Projects

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "imported": 8,
    "updated": 2,
    "skipped": 0,
    "failed": 1,
    "errors": [
      {
        "row": 7,
        "message": "Invalid email format",
        "data": {
          "title": "Quantum Computing Project",
          "piEmail": "invalid-email"
        }
      }
    ]
  },
  "message": "Import complete: 8 new, 2 updated, 1 failed out of 11 total rows"
}
```

---

### 3. Import Opportunities

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/opportunities \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "imported": 12,
    "updated": 1,
    "skipped": 0,
    "failed": 0,
    "errors": []
  },
  "message": "Import complete: 12 new, 1 updated, 0 failed out of 13 total rows"
}
```

---

### 4. Import Partners

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/partners \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "imported": 20,
    "updated": 5,
    "skipped": 0,
    "failed": 0,
    "errors": []
  },
  "message": "Import complete: 20 new, 5 updated, 0 failed out of 25 total rows"
}
```

---

### 5. Import Attendees

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/attendees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "imported": 150,
    "updated": 25,
    "skipped": 0,
    "failed": 3,
    "errors": [
      {
        "row": 23,
        "message": "Invalid email format",
        "data": {
          "fullName": "John Doe",
          "email": "not-an-email"
        }
      },
      {
        "row": 45,
        "message": "Missing required field: Email",
        "data": {
          "fullName": "Jane Smith"
        }
      },
      {
        "row": 89,
        "message": "Duplicate email address",
        "data": {
          "fullName": "Bob Johnson",
          "email": "bob@existing.com"
        }
      }
    ]
  },
  "message": "Import complete: 150 new, 25 updated, 3 failed out of 178 total rows"
}
```

---

### 6. Import All Data

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "sessions": {
      "imported": 15,
      "updated": 3,
      "failed": 2,
      "errors": [...]
    },
    "projects": {
      "imported": 8,
      "updated": 2,
      "failed": 0,
      "errors": []
    },
    "opportunities": {
      "imported": 12,
      "updated": 1,
      "failed": 1,
      "errors": [...]
    },
    "partners": {
      "imported": 20,
      "updated": 5,
      "failed": 0,
      "errors": []
    },
    "attendees": {
      "imported": 150,
      "updated": 25,
      "failed": 3,
      "errors": [...]
    }
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

---

## Export Endpoints

### Get Sync Status

```bash
curl -X GET http://localhost:3000/api/v1/admin/smartsheet/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "synced": 145,
      "pending": 3,
      "failed": 2,
      "lastSync": "2024-12-03T14:30:00Z"
    },
    "rsvps": {
      "total": 350,
      "synced": 340,
      "pending": 8,
      "failed": 2,
      "lastSync": "2024-12-03T14:25:00Z"
    },
    "connections": {
      "total": 120,
      "synced": 118,
      "pending": 2,
      "failed": 0,
      "lastSync": "2024-12-03T14:20:00Z"
    }
  }
}
```

---

### Trigger Export Sync

**Sync Users:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/sync/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sync RSVPs:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/sync/rsvps \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sync Connections:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/sync/connections \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "total": 150,
    "successful": 148,
    "failed": 2,
    "errors": [
      "User abc123: Rate limit exceeded",
      "User def456: Network error"
    ]
  },
  "message": "Synced 148 of 150 users"
}
```

---

### Get Failed Syncs

```bash
curl -X GET http://localhost:3000/api/v1/admin/smartsheet/failed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "sync-log-id-1",
      "entityType": "user",
      "entityId": "user-id-123",
      "errorMessage": "Rate limit exceeded",
      "retryCount": 2,
      "lastAttempt": "2024-12-03T14:30:00Z"
    },
    {
      "id": "sync-log-id-2",
      "entityType": "rsvp",
      "entityId": "rsvp-id-456",
      "errorMessage": "Invalid sheet ID",
      "retryCount": 1,
      "lastAttempt": "2024-12-03T14:25:00Z"
    }
  ]
}
```

---

### Retry Failed Sync

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/retry/sync-log-id-1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "entityType": "user",
    "entityId": "user-id-123",
    "rowId": "smartsheet-row-id"
  },
  "message": "Sync retry successful"
}
```

---

### Clear Failed Syncs

```bash
curl -X DELETE http://localhost:3000/api/v1/admin/smartsheet/clear-failed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "count": 5
  },
  "message": "Cleared 5 failed syncs"
}
```

---

## Error Responses

### Authentication Error

```bash
# Missing token
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions
```

**Response (401):**

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "No authentication token provided"
}
```

---

### Authorization Error

```bash
# Non-admin user
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
  -H "Authorization: Bearer NON_ADMIN_TOKEN"
```

**Response (403):**

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Admin or staff role required"
}
```

---

### Configuration Error

```bash
# Missing sheet ID
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (500):**

```json
{
  "success": false,
  "error": "Failed to import sessions",
  "details": "SMARTSHEET_SESSIONS_SHEET_ID not configured"
}
```

---

### Rate Limit Error

**Response (429):**

```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Postman Collection

### Import Collection

Create a new Postman collection with these settings:

**Collection Variables:**
- `baseUrl`: `http://localhost:3000`
- `authToken`: `{{token}}` (set after login)

**Requests:**

1. **Login**
   - Method: POST
   - URL: `{{baseUrl}}/api/v1/auth/login`
   - Body:
     ```json
     {
       "email": "admin@converge.mil",
       "password": "password"
     }
     ```
   - Test Script:
     ```javascript
     pm.test("Status is 200", function() {
       pm.response.to.have.status(200);
     });

     pm.test("Has access token", function() {
       var jsonData = pm.response.json();
       pm.expect(jsonData.data.accessToken).to.exist;
       pm.collectionVariables.set("token", jsonData.data.accessToken);
     });
     ```

2. **Import Sessions**
   - Method: POST
   - URL: `{{baseUrl}}/api/v1/admin/smartsheet/import/sessions`
   - Headers: `Authorization: Bearer {{token}}`
   - Test Script:
     ```javascript
     pm.test("Status is 200", function() {
       pm.response.to.have.status(200);
     });

     pm.test("Import successful", function() {
       var jsonData = pm.response.json();
       pm.expect(jsonData.success).to.be.true;
       pm.expect(jsonData.data).to.have.property("imported");
       pm.expect(jsonData.data).to.have.property("updated");
       pm.expect(jsonData.data).to.have.property("failed");
     });
     ```

3. **Import All**
   - Method: POST
   - URL: `{{baseUrl}}/api/v1/admin/smartsheet/import/all`
   - Headers: `Authorization: Bearer {{token}}`
   - Test Script:
     ```javascript
     pm.test("Status is 200", function() {
       pm.response.to.have.status(200);
     });

     pm.test("All imports run", function() {
       var jsonData = pm.response.json();
       pm.expect(jsonData.data).to.have.property("sessions");
       pm.expect(jsonData.data).to.have.property("projects");
       pm.expect(jsonData.data).to.have.property("opportunities");
       pm.expect(jsonData.data).to.have.property("partners");
       pm.expect(jsonData.data).to.have.property("attendees");
     });
     ```

---

## Testing Workflow

### 1. Initial Setup Test

```bash
# 1. Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@converge.mil","password":"password"}' \
  | jq -r '.data.accessToken')

# 2. Test single import
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### 2. Full Import Test

```bash
# Import all data types
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/all \
  -H "Authorization: Bearer $TOKEN" | jq > import_results.json

# Review results
cat import_results.json | jq '.data.summary'
```

---

### 3. Verify Database

```sql
-- Check imported data
SELECT COUNT(*) FROM sessions;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM opportunities;
SELECT COUNT(*) FROM industry_partners;
SELECT COUNT(*) FROM profiles;

-- Check recent imports
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5;
SELECT * FROM projects ORDER BY created_at DESC LIMIT 5;
```

---

### 4. Error Testing

**Test with invalid token:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Unauthorized
```

**Test with missing configuration:**
```bash
# Temporarily unset SMARTSHEET_SESSIONS_SHEET_ID
# Expected: 500 with "not configured" error
```

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test import endpoint performance
ab -n 10 -c 1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/v1/admin/smartsheet/status
```

### Rate Limit Testing

```bash
# Rapid fire requests (should queue automatically)
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
    -H "Authorization: Bearer $TOKEN" &
done
wait
```

---

## Automated Testing Script

Save as `test-imports.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
ADMIN_EMAIL="admin@converge.mil"
ADMIN_PASSWORD="password"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get auth token
echo "Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.data.accessToken')

if [ "$TOKEN" == "null" ]; then
  echo -e "${RED}Failed to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}Logged in successfully${NC}"

# Test each import endpoint
endpoints=("sessions" "projects" "opportunities" "partners" "attendees")

for endpoint in "${endpoints[@]}"; do
  echo "Testing import/$endpoint..."
  response=$(curl -s -X POST "$BASE_URL/api/v1/admin/smartsheet/import/$endpoint" \
    -H "Authorization: Bearer $TOKEN")

  success=$(echo $response | jq -r '.success')

  if [ "$success" == "true" ]; then
    imported=$(echo $response | jq -r '.data.imported')
    updated=$(echo $response | jq -r '.data.updated')
    failed=$(echo $response | jq -r '.data.failed')
    echo -e "${GREEN}✓ $endpoint: $imported new, $updated updated, $failed failed${NC}"
  else
    error=$(echo $response | jq -r '.error')
    echo -e "${RED}✗ $endpoint: $error${NC}"
  fi

  # Wait to respect rate limits
  sleep 1
done

echo -e "\n${GREEN}Testing complete!${NC}"
```

**Usage:**
```bash
chmod +x test-imports.sh
./test-imports.sh
```

---

## Debugging Tips

### Enable Verbose Output

```bash
curl -v -X POST http://localhost:3000/api/v1/admin/smartsheet/import/sessions \
  -H "Authorization: Bearer $TOKEN"
```

### Save Response to File

```bash
curl -X POST http://localhost:3000/api/v1/admin/smartsheet/import/all \
  -H "Authorization: Bearer $TOKEN" \
  -o import_response.json

# Pretty print
cat import_response.json | jq '.' > import_response_pretty.json
```

### Check Backend Logs

```bash
# If using pm2
pm2 logs converge-backend

# If running with npm
# Logs will be in console
```

---

## Common Issues

### Issue: 401 Unauthorized
**Solution**: Get a fresh auth token

### Issue: 403 Forbidden
**Solution**: Ensure user has admin role in database

### Issue: 500 Sheet ID not configured
**Solution**: Add sheet ID to `.env` file

### Issue: 500 Failed to fetch sheet
**Solution**: Verify Smartsheet API key and sheet permissions

---

## Next Steps

After successful testing:

1. Verify imported data in database
2. Test with production Smartsheet data (in staging first)
3. Set up monitoring for import jobs
4. Document your production sheet IDs
5. Train admin users on import process

---

*For more information, see [SMARTSHEET_INTEGRATION.md](./SMARTSHEET_INTEGRATION.md)*
