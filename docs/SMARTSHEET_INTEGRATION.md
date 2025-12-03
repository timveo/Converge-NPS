# Smartsheet Integration Architecture

**Version**: 1.0
**Date**: December 3, 2025
**Status**: Implementation Ready

---

## 📋 Overview

Converge-NPS integrates with Smartsheet to provide real-time data synchronization for event management. This enables stakeholders to view and analyze event data in familiar Smartsheet dashboards while maintaining the Converge-NPS app as the primary data source.

### Integration Goals

1. **One-way sync** (App → Smartsheet): Primary data flow
2. **Real-time updates**: Sync on data changes
3. **Error resilience**: Retry logic and error tracking
4. **Admin visibility**: UI to monitor sync status
5. **Performance**: Batch operations, rate limiting

---

## 🏗️ Architecture

### Data Flow

```
Converge-NPS Database
        ↓
  Sync Service (Node.js)
        ↓
  Smartsheet API
        ↓
  Smartsheet Sheets
```

### Sync Strategy

**Push-based (Recommended)**:
- Trigger sync after database writes
- Use webhook/event system
- Real-time data availability

**Pull-based (Fallback)**:
- Scheduled cron jobs
- Batch sync every 15-60 minutes
- Less real-time but more resilient

**Hybrid Approach** (Implemented):
- Push-based for critical updates (registrations, RSVPs)
- Pull-based for bulk operations (connections, analytics)
- Manual sync trigger from admin UI

---

## 📊 Smartsheet Schema

### Sheet 1: User Registrations

| Column | Type | Description |
|--------|------|-------------|
| User ID | Text | Unique user identifier |
| Full Name | Text | User's full name |
| Email | Text | User's email address |
| Role | Dropdown | student, faculty, industry, staff, admin |
| Organization | Text | User's organization |
| Registration Date | Date | When user registered |
| Profile Status | Dropdown | public, connections_only, private |
| QR Scanning Enabled | Checkbox | Can scan QR codes |
| Messaging Enabled | Checkbox | Can send messages |
| LinkedIn | Text | LinkedIn profile URL |
| GitHub | Text | GitHub profile URL |
| Sync Status | Dropdown | synced, pending, error |
| Last Synced | Date | Last successful sync timestamp |

### Sheet 2: Session RSVPs

| Column | Type | Description |
|--------|------|-------------|
| RSVP ID | Text | Unique RSVP identifier |
| User ID | Text | User who RSVPed |
| User Name | Text | User's full name |
| User Email | Text | User's email |
| Session ID | Text | Session identifier |
| Session Title | Text | Session name |
| Session Date | Date | Session start date |
| Session Time | Text | Session start time |
| Session Track | Dropdown | AI/ML, Cybersecurity, etc. |
| RSVP Status | Dropdown | attending, maybe, cancelled |
| RSVP Date | Date | When RSVP was created |
| Sync Status | Dropdown | synced, pending, error |
| Last Synced | Date | Last successful sync timestamp |

### Sheet 3: Connections

| Column | Type | Description |
|--------|------|-------------|
| Connection ID | Text | Unique connection identifier |
| Scanner Name | Text | Person who initiated connection |
| Scanner Email | Text | Scanner's email |
| Scanner Role | Text | Scanner's role |
| Scanned Name | Text | Person who was connected |
| Scanned Email | Text | Scanned person's email |
| Scanned Role | Text | Scanned person's role |
| Connection Method | Dropdown | qr_scan, manual_entry |
| Connection Date | Date | When connection was made |
| Sync Status | Dropdown | synced, pending, error |
| Last Synced | Date | Last successful sync timestamp |

### Sheet 4: Session Analytics

| Column | Type | Description |
|--------|------|-------------|
| Session ID | Text | Unique session identifier |
| Session Title | Text | Session name |
| Speaker | Text | Speaker name |
| Track | Dropdown | AI/ML, Cybersecurity, etc. |
| Start Time | Date | Session start |
| Location | Text | Session location |
| Capacity | Number | Max attendees |
| RSVPs (Attending) | Number | Confirmed attendees |
| RSVPs (Maybe) | Number | Maybe attendees |
| RSVPs (Cancelled) | Number | Cancelled RSVPs |
| Fill Rate | Percentage | Attending / Capacity |
| Status | Dropdown | scheduled, in_progress, completed, cancelled |
| Last Updated | Date | Last data update |

---

## 🔧 Implementation

### 1. Smartsheet Service Module

**File**: `backend/src/services/smartsheet.service.ts`

**Key Functions**:
```typescript
// Initialize Smartsheet client
export function initSmartsheetClient(): SmartsheetClient;

// User sync
export async function syncUserToSmartsheet(userId: string): Promise<SyncResult>;
export async function syncAllUsers(): Promise<BatchSyncResult>;

// RSVP sync
export async function syncRsvpToSmartsheet(rsvpId: string): Promise<SyncResult>;
export async function syncAllRsvps(): Promise<BatchSyncResult>;

// Connection sync
export async function syncConnectionToSmartsheet(connectionId: string): Promise<SyncResult>;
export async function syncAllConnections(): Promise<BatchSyncResult>;

// Analytics sync (scheduled)
export async function syncSessionAnalytics(): Promise<SyncResult>;

// Sync status
export async function getSyncStatus(): Promise<SyncStatus>;
export async function getFailedSyncs(): Promise<FailedSync[]>;
export async function retrySyncItem(syncId: string): Promise<SyncResult>;
```

### 2. Database Schema Updates

**New Table**: `smartsheet_sync_log`

```prisma
model SmartsheetSyncLog {
  id            String   @id @default(uuid())
  entityType    String   // 'user', 'rsvp', 'connection', 'analytics'
  entityId      String
  sheetId       String
  rowId         String?  // Smartsheet row ID
  status        String   // 'success', 'pending', 'error'
  errorMessage  String?
  retryCount    Int      @default(0)
  lastAttempt   DateTime @default(now())
  createdAt     DateTime @default(now())

  @@index([entityType, entityId])
  @@index([status])
}
```

### 3. Webhook Integration

**Trigger Points**:
- User registration → Sync user
- RSVP create/update → Sync RSVP
- Connection created → Sync connection
- Session updated → Sync analytics

**Implementation**:
```typescript
// After user registration
await prisma.profiles.create({ data: userData });
await queueSmartsheetSync('user', userId);

// After RSVP
await prisma.rsvps.create({ data: rsvpData });
await queueSmartsheetSync('rsvp', rsvpId);
```

### 4. Retry Logic

**Strategy**:
- Immediate retry on failure
- Exponential backoff (5s, 30s, 5m, 30m, 2h)
- Max 5 retry attempts
- Manual retry from admin UI

**Implementation**:
```typescript
async function syncWithRetry(
  entityType: string,
  entityId: string,
  maxRetries: number = 5
): Promise<SyncResult> {
  let attempt = 0;
  let lastError: Error;

  while (attempt < maxRetries) {
    try {
      return await performSync(entityType, entityId);
    } catch (error) {
      lastError = error;
      attempt++;

      // Exponential backoff
      const delay = Math.min(300000, 5000 * Math.pow(2, attempt));
      await sleep(delay);
    }
  }

  throw lastError;
}
```

### 5. Rate Limiting

Smartsheet API limits:
- **300 requests/minute** per access token
- **100 API calls/minute** per IP

**Implementation**:
- Use rate limiter (e.g., `bottleneck`)
- Queue requests
- Batch operations where possible

```typescript
const limiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 200, // 200ms between requests = max 300/min
});

const rateLimitedSync = limiter.wrap(syncToSmartsheet);
```

### 6. Admin API Endpoints

**New Routes**: `/api/v1/admin/smartsheet`

```typescript
GET    /api/v1/admin/smartsheet/status        // Get sync status
GET    /api/v1/admin/smartsheet/failed        // Get failed syncs
POST   /api/v1/admin/smartsheet/sync/:type    // Trigger manual sync
POST   /api/v1/admin/smartsheet/retry/:id     // Retry failed sync
DELETE /api/v1/admin/smartsheet/clear-failed  // Clear failed sync logs
```

### 7. Admin UI

**New Page**: `/admin/smartsheet`

**Features**:
- Sync status dashboard (total, pending, failed)
- Last sync timestamps per entity type
- Failed sync list with retry buttons
- Manual sync triggers
- Sync history/logs
- Configuration (sheet IDs, sync intervals)

---

## 🔒 Security

### API Key Management

**Environment Variables**:
```env
SMARTSHEET_API_KEY=your-api-key
SMARTSHEET_USER_SHEET_ID=sheet-id-1
SMARTSHEET_RSVP_SHEET_ID=sheet-id-2
SMARTSHEET_CONNECTION_SHEET_ID=sheet-id-3
SMARTSHEET_ANALYTICS_SHEET_ID=sheet-id-4
```

**Best Practices**:
- Store API key in environment variables (never in code)
- Use Railway secrets for production
- Rotate API keys regularly
- Log all API requests for audit

### Data Privacy

**PII Handling**:
- Only sync necessary fields to Smartsheet
- Respect user privacy settings
- Don't sync private profiles (unless admin override)
- Log who triggered syncs

**Permissions**:
- Only admin/staff can trigger manual syncs
- Only admin/staff can view sync logs
- Regular users cannot access Smartsheet integration

---

## 📈 Monitoring

### Metrics to Track

1. **Sync Success Rate**: % of successful syncs
2. **Sync Latency**: Time from trigger to completion
3. **Failed Syncs**: Count of failed syncs
4. **Retry Rate**: % of syncs requiring retry
5. **API Usage**: Smartsheet API calls per hour

### Alerts

**Critical**:
- Sync success rate < 90% (15 min window)
- Smartsheet API errors (5xx responses)
- API rate limit exceeded

**Warning**:
- Sync success rate < 95%
- Failed syncs not retried after 1 hour
- API usage > 80% of limit

### Logging

**Log Levels**:
```typescript
logger.info('Sync started', { entityType, entityId });
logger.debug('Smartsheet API request', { method, url, data });
logger.warn('Sync retry', { attempt, nextRetry });
logger.error('Sync failed', { error, entityType, entityId });
```

---

## 🧪 Testing Strategy

### Unit Tests

**Test Coverage**:
- `smartsheet.service.ts`: All functions
- Row mapping functions
- Error handling
- Retry logic

**Example**:
```typescript
describe('syncUserToSmartsheet', () => {
  it('should sync user successfully', async () => {
    const result = await syncUserToSmartsheet('user-001');
    expect(result.status).toBe('success');
  });

  it('should handle API errors', async () => {
    // Mock API error
    await expect(syncUserToSmartsheet('invalid')).rejects.toThrow();
  });
});
```

### Integration Tests

**Test Scenarios**:
- Create user → verify Smartsheet row created
- Update RSVP → verify Smartsheet row updated
- Failed sync → verify logged and retried
- Rate limiting → verify queuing works

### Manual Testing

**Checklist**:
- [ ] User registration creates Smartsheet row
- [ ] RSVP creates/updates Smartsheet row
- [ ] Connection creates Smartsheet row
- [ ] Failed sync appears in admin UI
- [ ] Retry button works
- [ ] Manual sync works
- [ ] Analytics sync runs on schedule

---

## 🚀 Deployment

### Setup Steps

1. **Create Smartsheet Sheets**:
   - Create 4 sheets with columns as defined above
   - Note sheet IDs from URLs
   - Share sheets with service account

2. **Get API Key**:
   - Go to Smartsheet Account → Apps & Integrations
   - Generate API Access Token
   - Copy token securely

3. **Configure Environment**:
   ```bash
   # Add to Railway environment variables
   SMARTSHEET_API_KEY=your-token
   SMARTSHEET_USER_SHEET_ID=123456789
   SMARTSHEET_RSVP_SHEET_ID=987654321
   SMARTSHEET_CONNECTION_SHEET_ID=456789123
   SMARTSHEET_ANALYTICS_SHEET_ID=321654987
   ```

4. **Run Migrations**:
   ```bash
   npx prisma migrate dev --name add_smartsheet_sync_log
   ```

5. **Deploy Backend**:
   ```bash
   git push origin main
   # Railway auto-deploys
   ```

6. **Initial Sync**:
   - Login as admin
   - Navigate to `/admin/smartsheet`
   - Click "Sync All Users", "Sync All RSVPs", etc.
   - Verify data appears in Smartsheet

---

## 📚 Smartsheet API Reference

### Key Endpoints Used

**Add Rows**:
```
POST https://api.smartsheet.com/2.0/sheets/{sheetId}/rows
```

**Update Rows**:
```
PUT https://api.smartsheet.com/2.0/sheets/{sheetId}/rows
```

**Get Sheet**:
```
GET https://api.smartsheet.com/2.0/sheets/{sheetId}
```

**Authentication**:
```
Authorization: Bearer {access_token}
```

### Rate Limits

- 300 requests/minute per token
- 100 requests/minute per IP
- Use `Retry-After` header on 429 responses

### Error Codes

- `200`: Success
- `400`: Bad Request (invalid data)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (no access)
- `404`: Not Found (invalid sheet ID)
- `429`: Too Many Requests (rate limit)
- `500`: Server Error (Smartsheet issue)

---

## 🔄 Future Enhancements

1. **Bi-directional Sync**: Smartsheet → Database
2. **Conflict Resolution**: Handle simultaneous updates
3. **Delta Sync**: Only sync changed fields
4. **Bulk Operations**: Batch multiple rows per request
5. **Real-time Webhooks**: Smartsheet webhooks for instant updates
6. **Data Validation**: Validate Smartsheet data before sync
7. **Custom Reports**: Generate Smartsheet reports from app
8. **Attachments**: Sync QR codes as attachments

---

## 📞 Support

### Troubleshooting

**"Sync failed: 401 Unauthorized"**
- Check API key is valid
- Verify key has access to sheets

**"Sync failed: 404 Not Found"**
- Verify sheet IDs are correct
- Check sheets haven't been deleted

**"Sync failed: 429 Rate Limit"**
- Wait for rate limit to reset
- Reduce sync frequency
- Contact Smartsheet support for higher limits

**"Syncs stuck in 'pending'"**
- Check backend logs for errors
- Restart backend service
- Manually retry from admin UI

### Resources

- [Smartsheet API Docs](https://smartsheet-platform.github.io/api-docs/)
- [Node.js SDK](https://github.com/smartsheet-platform/smartsheet-javascript-sdk)
- [Rate Limiting](https://smartsheet-platform.github.io/api-docs/#rate-limiting)

---

**Next Steps**: Implement Smartsheet service module

**Version History**:
- v1.0 (2025-12-03): Initial architecture document
