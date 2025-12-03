import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();

// Smartsheet API configuration
const SMARTSHEET_API_BASE = 'https://api.smartsheet.com/2.0';
const RATE_LIMIT_DELAY = 200; // 200ms between requests = max 300/min

// Environment variables for sheet IDs
const SHEET_IDS = {
  // Export sheets (outbound from app to Smartsheet)
  users: process.env.SMARTSHEET_USER_SHEET_ID || '',
  rsvps: process.env.SMARTSHEET_RSVP_SHEET_ID || '',
  connections: process.env.SMARTSHEET_CONNECTION_SHEET_ID || '',
  analytics: process.env.SMARTSHEET_ANALYTICS_SHEET_ID || '',

  // Import sheets (inbound from Smartsheet to app)
  sessions: process.env.SMARTSHEET_SESSIONS_SHEET_ID || '',
  projects: process.env.SMARTSHEET_PROJECTS_SHEET_ID || '',
  opportunities: process.env.SMARTSHEET_OPPORTUNITIES_SHEET_ID || '',
  partners: process.env.SMARTSHEET_PARTNERS_SHEET_ID || '',
  attendees: process.env.SMARTSHEET_ATTENDEES_SHEET_ID || '',
};

// Types
interface SyncResult {
  success: boolean;
  entityType: string;
  entityId: string;
  rowId?: string;
  error?: string;
}

interface BatchSyncResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

interface SyncStatus {
  users: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    lastSync: Date | null;
  };
  rsvps: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    lastSync: Date | null;
  };
  connections: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    lastSync: Date | null;
  };
}

interface FailedSync {
  id: string;
  entityType: string;
  entityId: string;
  errorMessage: string;
  retryCount: number;
  lastAttempt: Date;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; message: string; data?: any }>;
}

interface SmartsheetRow {
  id: string;
  rowNumber: number;
  cells: Array<{
    columnId: string;
    value?: any;
    displayValue?: string;
  }>;
}

interface SmartsheetSheet {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  rows: SmartsheetRow[];
}

// Rate limiter using simple queue
let requestQueue: Array<() => Promise<any>> = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
      } catch (error) {
        console.error('Queue request failed:', error);
      }
      // Rate limiting: wait between requests
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  isProcessing = false;
}

function queueRequest<T>(request: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
}

// Initialize Smartsheet client
function getSmartsheetClient(): AxiosInstance {
  const apiKey = process.env.SMARTSHEET_API_KEY;

  if (!apiKey) {
    throw new Error('SMARTSHEET_API_KEY environment variable is not set');
  }

  return axios.create({
    baseURL: SMARTSHEET_API_BASE,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

// Map user data to Smartsheet row
function mapUserToRow(user: any) {
  return {
    cells: [
      { columnId: 'userId', value: user.id },
      { columnId: 'fullName', value: user.fullName },
      { columnId: 'email', value: user.email },
      { columnId: 'role', value: user.role },
      { columnId: 'organization', value: user.organization || '' },
      { columnId: 'registrationDate', value: user.createdAt.toISOString() },
      { columnId: 'profileStatus', value: user.profileVisibility },
      { columnId: 'qrScanningEnabled', value: user.allowQrScanning },
      { columnId: 'messagingEnabled', value: user.allowMessaging },
      { columnId: 'linkedin', value: user.linkedin || '' },
      { columnId: 'github', value: user.github || '' },
      { columnId: 'syncStatus', value: 'synced' },
      { columnId: 'lastSynced', value: new Date().toISOString() },
    ],
  };
}

// Map RSVP data to Smartsheet row
function mapRsvpToRow(rsvp: any) {
  return {
    cells: [
      { columnId: 'rsvpId', value: rsvp.id },
      { columnId: 'userId', value: rsvp.userId },
      { columnId: 'userName', value: rsvp.user?.fullName || '' },
      { columnId: 'userEmail', value: rsvp.user?.email || '' },
      { columnId: 'sessionId', value: rsvp.sessionId },
      { columnId: 'sessionTitle', value: rsvp.session?.title || '' },
      { columnId: 'sessionDate', value: rsvp.session?.startTime ? new Date(rsvp.session.startTime).toISOString() : '' },
      { columnId: 'sessionTime', value: rsvp.session?.startTime ? new Date(rsvp.session.startTime).toLocaleTimeString() : '' },
      { columnId: 'sessionTrack', value: rsvp.session?.track || '' },
      { columnId: 'rsvpStatus', value: rsvp.status },
      { columnId: 'rsvpDate', value: rsvp.createdAt.toISOString() },
      { columnId: 'syncStatus', value: 'synced' },
      { columnId: 'lastSynced', value: new Date().toISOString() },
    ],
  };
}

// Map connection data to Smartsheet row
function mapConnectionToRow(connection: any) {
  return {
    cells: [
      { columnId: 'connectionId', value: connection.id },
      { columnId: 'scannerName', value: connection.scanner?.fullName || '' },
      { columnId: 'scannerEmail', value: connection.scanner?.email || '' },
      { columnId: 'scannerRole', value: connection.scanner?.role || '' },
      { columnId: 'scannedName', value: connection.scanned?.fullName || '' },
      { columnId: 'scannedEmail', value: connection.scanned?.email || '' },
      { columnId: 'scannedRole', value: connection.scanned?.role || '' },
      { columnId: 'connectionMethod', value: connection.method },
      { columnId: 'connectionDate', value: connection.createdAt.toISOString() },
      { columnId: 'syncStatus', value: 'synced' },
      { columnId: 'lastSynced', value: new Date().toISOString() },
    ],
  };
}

// Sync user to Smartsheet
export async function syncUserToSmartsheet(userId: string): Promise<SyncResult> {
  try {
    // Get user from database
    const user = await prisma.profiles.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Check if already synced
    const existingSync = await prisma.smartsheetSyncLog.findFirst({
      where: {
        entityType: 'user',
        entityId: userId,
        status: 'success',
      },
      orderBy: { lastAttempt: 'desc' },
    });

    const client = getSmartsheetClient();
    const sheetId = SHEET_IDS.users;

    if (!sheetId) {
      throw new Error('SMARTSHEET_USER_SHEET_ID not configured');
    }

    const rowData = mapUserToRow(user);

    let rowId: string | undefined;

    if (existingSync?.rowId) {
      // Update existing row
      await queueRequest(() =>
        client.put(`/sheets/${sheetId}/rows`, {
          id: existingSync.rowId,
          ...rowData,
        })
      );
      rowId = existingSync.rowId;
    } else {
      // Create new row
      const response = await queueRequest(() =>
        client.post(`/sheets/${sheetId}/rows`, [rowData])
      );
      rowId = response.data.result[0]?.id;
    }

    // Log success
    await prisma.smartsheetSyncLog.create({
      data: {
        entityType: 'user',
        entityId: userId,
        sheetId,
        rowId,
        status: 'success',
        lastAttempt: new Date(),
      },
    });

    return {
      success: true,
      entityType: 'user',
      entityId: userId,
      rowId,
    };
  } catch (error: any) {
    // Log failure
    await prisma.smartsheetSyncLog.create({
      data: {
        entityType: 'user',
        entityId: userId,
        sheetId: SHEET_IDS.users,
        status: 'error',
        errorMessage: error.message,
        retryCount: 0,
        lastAttempt: new Date(),
      },
    });

    return {
      success: false,
      entityType: 'user',
      entityId: userId,
      error: error.message,
    };
  }
}

// Sync all users
export async function syncAllUsers(): Promise<BatchSyncResult> {
  const users = await prisma.profiles.findMany();

  const results: SyncResult[] = [];

  for (const user of users) {
    const result = await syncUserToSmartsheet(user.id);
    results.push(result);
  }

  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    errors: results.filter(r => !r.success).map(r => r.error || 'Unknown error'),
  };
}

// Sync RSVP to Smartsheet
export async function syncRsvpToSmartsheet(rsvpId: string): Promise<SyncResult> {
  try {
    // Get RSVP with relations
    const rsvp = await prisma.rsvps.findUnique({
      where: { id: rsvpId },
      include: {
        user: true,
        session: true,
      },
    });

    if (!rsvp) {
      throw new Error(`RSVP ${rsvpId} not found`);
    }

    const existingSync = await prisma.smartsheetSyncLog.findFirst({
      where: {
        entityType: 'rsvp',
        entityId: rsvpId,
        status: 'success',
      },
      orderBy: { lastAttempt: 'desc' },
    });

    const client = getSmartsheetClient();
    const sheetId = SHEET_IDS.rsvps;

    if (!sheetId) {
      throw new Error('SMARTSHEET_RSVP_SHEET_ID not configured');
    }

    const rowData = mapRsvpToRow(rsvp);

    let rowId: string | undefined;

    if (existingSync?.rowId) {
      await queueRequest(() =>
        client.put(`/sheets/${sheetId}/rows`, {
          id: existingSync.rowId,
          ...rowData,
        })
      );
      rowId = existingSync.rowId;
    } else {
      const response = await queueRequest(() =>
        client.post(`/sheets/${sheetId}/rows`, [rowData])
      );
      rowId = response.data.result[0]?.id;
    }

    await prisma.smartsheetSyncLog.create({
      data: {
        entityType: 'rsvp',
        entityId: rsvpId,
        sheetId,
        rowId,
        status: 'success',
        lastAttempt: new Date(),
      },
    });

    return {
      success: true,
      entityType: 'rsvp',
      entityId: rsvpId,
      rowId,
    };
  } catch (error: any) {
    await prisma.smartsheetSyncLog.create({
      data: {
        entityType: 'rsvp',
        entityId: rsvpId,
        sheetId: SHEET_IDS.rsvps,
        status: 'error',
        errorMessage: error.message,
        retryCount: 0,
        lastAttempt: new Date(),
      },
    });

    return {
      success: false,
      entityType: 'rsvp',
      entityId: rsvpId,
      error: error.message,
    };
  }
}

// Sync all RSVPs
export async function syncAllRsvps(): Promise<BatchSyncResult> {
  const rsvps = await prisma.rsvps.findMany();

  const results: SyncResult[] = [];

  for (const rsvp of rsvps) {
    const result = await syncRsvpToSmartsheet(rsvp.id);
    results.push(result);
  }

  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    errors: results.filter(r => !r.success).map(r => r.error || 'Unknown error'),
  };
}

// Sync connection to Smartsheet
export async function syncConnectionToSmartsheet(connectionId: string): Promise<SyncResult> {
  try {
    const connection = await prisma.connections.findUnique({
      where: { id: connectionId },
      include: {
        scanner: true,
        scanned: true,
      },
    });

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const existingSync = await prisma.smartsheetSyncLog.findFirst({
      where: {
        entityType: 'connection',
        entityId: connectionId,
        status: 'success',
      },
      orderBy: { lastAttempt: 'desc' },
    });

    const client = getSmartsheetClient();
    const sheetId = SHEET_IDS.connections;

    if (!sheetId) {
      throw new Error('SMARTSHEET_CONNECTION_SHEET_ID not configured');
    }

    const rowData = mapConnectionToRow(connection);

    let rowId: string | undefined;

    if (existingSync?.rowId) {
      await queueRequest(() =>
        client.put(`/sheets/${sheetId}/rows`, {
          id: existingSync.rowId,
          ...rowData,
        })
      );
      rowId = existingSync.rowId;
    } else {
      const response = await queueRequest(() =>
        client.post(`/sheets/${sheetId}/rows`, [rowData])
      );
      rowId = response.data.result[0]?.id;
    }

    await prisma.smartsheetSyncLog.create({
      data: {
        entityType: 'connection',
        entityId: connectionId,
        sheetId,
        rowId,
        status: 'success',
        lastAttempt: new Date(),
      },
    });

    return {
      success: true,
      entityType: 'connection',
      entityId: connectionId,
      rowId,
    };
  } catch (error: any) {
    await prisma.smartsheetSyncLog.create({
      data: {
        entityType: 'connection',
        entityId: connectionId,
        sheetId: SHEET_IDS.connections,
        status: 'error',
        errorMessage: error.message,
        retryCount: 0,
        lastAttempt: new Date(),
      },
    });

    return {
      success: false,
      entityType: 'connection',
      entityId: connectionId,
      error: error.message,
    };
  }
}

// Sync all connections
export async function syncAllConnections(): Promise<BatchSyncResult> {
  const connections = await prisma.connections.findMany();

  const results: SyncResult[] = [];

  for (const connection of connections) {
    const result = await syncConnectionToSmartsheet(connection.id);
    results.push(result);
  }

  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    errors: results.filter(r => !r.success).map(r => r.error || 'Unknown error'),
  };
}

// Get sync status
export async function getSyncStatus(): Promise<SyncStatus> {
  const [
    totalUsers,
    totalRsvps,
    totalConnections,
    userSyncs,
    rsvpSyncs,
    connectionSyncs,
  ] = await Promise.all([
    prisma.profiles.count(),
    prisma.rsvps.count(),
    prisma.connections.count(),
    prisma.smartsheetSyncLog.groupBy({
      by: ['status'],
      where: { entityType: 'user' },
      _count: true,
    }),
    prisma.smartsheetSyncLog.groupBy({
      by: ['status'],
      where: { entityType: 'rsvp' },
      _count: true,
    }),
    prisma.smartsheetSyncLog.groupBy({
      by: ['status'],
      where: { entityType: 'connection' },
      _count: true,
    }),
  ]);

  const getUserSyncCount = (status: string) =>
    userSyncs.find(s => s.status === status)?._count || 0;
  const getRsvpSyncCount = (status: string) =>
    rsvpSyncs.find(s => s.status === status)?._count || 0;
  const getConnectionSyncCount = (status: string) =>
    connectionSyncs.find(s => s.status === status)?._count || 0;

  const [lastUserSync, lastRsvpSync, lastConnectionSync] = await Promise.all([
    prisma.smartsheetSyncLog.findFirst({
      where: { entityType: 'user', status: 'success' },
      orderBy: { lastAttempt: 'desc' },
    }),
    prisma.smartsheetSyncLog.findFirst({
      where: { entityType: 'rsvp', status: 'success' },
      orderBy: { lastAttempt: 'desc' },
    }),
    prisma.smartsheetSyncLog.findFirst({
      where: { entityType: 'connection', status: 'success' },
      orderBy: { lastAttempt: 'desc' },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      synced: getUserSyncCount('success'),
      pending: getUserSyncCount('pending'),
      failed: getUserSyncCount('error'),
      lastSync: lastUserSync?.lastAttempt || null,
    },
    rsvps: {
      total: totalRsvps,
      synced: getRsvpSyncCount('success'),
      pending: getRsvpSyncCount('pending'),
      failed: getRsvpSyncCount('error'),
      lastSync: lastRsvpSync?.lastAttempt || null,
    },
    connections: {
      total: totalConnections,
      synced: getConnectionSyncCount('success'),
      pending: getConnectionSyncCount('pending'),
      failed: getConnectionSyncCount('error'),
      lastSync: lastConnectionSync?.lastAttempt || null,
    },
  };
}

// Get failed syncs
export async function getFailedSyncs(): Promise<FailedSync[]> {
  const failed = await prisma.smartsheetSyncLog.findMany({
    where: { status: 'error' },
    orderBy: { lastAttempt: 'desc' },
    take: 100,
  });

  return failed.map(f => ({
    id: f.id,
    entityType: f.entityType,
    entityId: f.entityId,
    errorMessage: f.errorMessage || 'Unknown error',
    retryCount: f.retryCount,
    lastAttempt: f.lastAttempt,
  }));
}

// Retry failed sync
export async function retrySyncItem(syncLogId: string): Promise<SyncResult> {
  const syncLog = await prisma.smartsheetSyncLog.findUnique({
    where: { id: syncLogId },
  });

  if (!syncLog) {
    return {
      success: false,
      entityType: 'unknown',
      entityId: 'unknown',
      error: 'Sync log not found',
    };
  }

  // Increment retry count
  await prisma.smartsheetSyncLog.update({
    where: { id: syncLogId },
    data: { retryCount: syncLog.retryCount + 1 },
  });

  // Retry based on entity type
  switch (syncLog.entityType) {
    case 'user':
      return syncUserToSmartsheet(syncLog.entityId);
    case 'rsvp':
      return syncRsvpToSmartsheet(syncLog.entityId);
    case 'connection':
      return syncConnectionToSmartsheet(syncLog.entityId);
    default:
      return {
        success: false,
        entityType: syncLog.entityType,
        entityId: syncLog.entityId,
        error: 'Unknown entity type',
      };
  }
}

// Clear all failed syncs
export async function clearFailedSyncs(): Promise<number> {
  const result = await prisma.smartsheetSyncLog.deleteMany({
    where: { status: 'error' },
  });

  return result.count;
}

// =============================================================================
// DATA IMPORT FUNCTIONS
// =============================================================================

// Helper function to get cell value by column name
function getCellValue(row: SmartsheetRow, columns: any[], columnName: string): any {
  const column = columns.find(col => col.title === columnName);
  if (!column) return null;

  const cell = row.cells.find(c => c.columnId === column.id);
  return cell?.value ?? cell?.displayValue ?? null;
}

// Helper function to fetch sheet data
async function fetchSheetData(sheetId: string): Promise<SmartsheetSheet> {
  const client = getSmartsheetClient();

  const response = await queueRequest(() =>
    client.get(`/sheets/${sheetId}`)
  );

  return response.data;
}

// Helper function to parse date string
function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

// Helper function to parse array from string
function parseArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  // Try to parse as JSON array
  if (typeof value === 'string') {
    // Check if it looks like JSON
    if (value.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fall through to comma-separated parsing
      }
    }

    // Parse as comma-separated values
    return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  return [];
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// =============================================================================
// IMPORT SESSIONS
// =============================================================================

export async function importSessions(): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const sheetId = SHEET_IDS.sessions;
    if (!sheetId) {
      throw new Error('SMARTSHEET_SESSIONS_SHEET_ID not configured');
    }

    const sheet = await fetchSheetData(sheetId);

    for (const row of sheet.rows) {
      try {
        const title = getCellValue(row, sheet.columns, 'Title') || getCellValue(row, sheet.columns, 'Session Title');
        const description = getCellValue(row, sheet.columns, 'Description');
        const speaker = getCellValue(row, sheet.columns, 'Speaker Name') || getCellValue(row, sheet.columns, 'Speaker');
        const location = getCellValue(row, sheet.columns, 'Location') || getCellValue(row, sheet.columns, 'Room');
        const sessionType = getCellValue(row, sheet.columns, 'Session Type') || getCellValue(row, sheet.columns, 'Type');
        const startTime = parseDate(getCellValue(row, sheet.columns, 'Start Time'));
        const endTime = parseDate(getCellValue(row, sheet.columns, 'End Time'));
        const capacity = parseInt(getCellValue(row, sheet.columns, 'Capacity')) || 50;

        // Validation
        if (!title) {
          result.errors.push({ row: row.rowNumber, message: 'Missing required field: Title' });
          result.failed++;
          continue;
        }

        if (!startTime || !endTime) {
          result.errors.push({ row: row.rowNumber, message: 'Invalid or missing start/end time', data: { title } });
          result.failed++;
          continue;
        }

        if (startTime >= endTime) {
          result.errors.push({ row: row.rowNumber, message: 'Start time must be before end time', data: { title } });
          result.failed++;
          continue;
        }

        // Check if session already exists (by title and start time)
        const existing = await prisma.session.findFirst({
          where: {
            title,
            startTime,
          },
        });

        const sessionData = {
          title,
          description,
          speaker,
          location,
          sessionType,
          startTime,
          endTime,
          capacity,
          requiresRsvp: true,
          isFeatured: false,
        };

        if (existing) {
          // Update existing session
          await prisma.session.update({
            where: { id: existing.id },
            data: sessionData,
          });
          result.updated++;
        } else {
          // Create new session
          await prisma.session.create({
            data: sessionData,
          });
          result.imported++;
        }
      } catch (error: any) {
        result.errors.push({
          row: row.rowNumber,
          message: error.message,
          data: { rowId: row.id },
        });
        result.failed++;
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to import sessions: ${error.message}`);
  }
}

// =============================================================================
// IMPORT PROJECTS
// =============================================================================

export async function importProjects(): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const sheetId = SHEET_IDS.projects;
    if (!sheetId) {
      throw new Error('SMARTSHEET_PROJECTS_SHEET_ID not configured');
    }

    const sheet = await fetchSheetData(sheetId);

    for (const row of sheet.rows) {
      try {
        const title = getCellValue(row, sheet.columns, 'Project Title') || getCellValue(row, sheet.columns, 'Title');
        const description = getCellValue(row, sheet.columns, 'Description');
        const piName = getCellValue(row, sheet.columns, 'PI Name') || getCellValue(row, sheet.columns, 'Principal Investigator');
        const piEmail = getCellValue(row, sheet.columns, 'PI Email');
        const department = getCellValue(row, sheet.columns, 'Department');
        const researchStage = getCellValue(row, sheet.columns, 'Research Stage') || getCellValue(row, sheet.columns, 'Stage');
        const classification = getCellValue(row, sheet.columns, 'Classification') || 'Unclassified';
        const keywords = parseArray(getCellValue(row, sheet.columns, 'Keywords') || getCellValue(row, sheet.columns, 'Tags'));
        const researchAreas = parseArray(getCellValue(row, sheet.columns, 'Research Areas'));
        const seeking = parseArray(getCellValue(row, sheet.columns, 'Seeking') || getCellValue(row, sheet.columns, 'Looking For'));
        const students = parseArray(getCellValue(row, sheet.columns, 'Students') || getCellValue(row, sheet.columns, 'Team Members'));

        // Validation
        if (!title) {
          result.errors.push({ row: row.rowNumber, message: 'Missing required field: Title' });
          result.failed++;
          continue;
        }

        if (!description) {
          result.errors.push({ row: row.rowNumber, message: 'Missing required field: Description', data: { title } });
          result.failed++;
          continue;
        }

        // Find or create PI profile
        let piId: string | null = null;

        if (piEmail && isValidEmail(piEmail)) {
          let piProfile = await prisma.profile.findUnique({
            where: { email: piEmail },
          });

          if (!piProfile && piName) {
            // Create placeholder profile for PI
            piProfile = await prisma.profile.create({
              data: {
                id: undefined, // Let DB generate
                fullName: piName,
                email: piEmail,
                organization: department || undefined,
                profileVisibility: 'public',
                allowQrScanning: true,
                allowMessaging: true,
                hideContactInfo: false,
              },
            });
          }

          if (piProfile) {
            piId = piProfile.id;
          }
        }

        if (!piId) {
          result.errors.push({ row: row.rowNumber, message: 'Could not find or create PI profile', data: { title, piEmail } });
          result.failed++;
          continue;
        }

        // Map research stage to ProjectStage enum
        let stage: any = 'concept';
        if (researchStage) {
          const stageMap: Record<string, string> = {
            'concept': 'concept',
            'prototype': 'prototype',
            'pilot ready': 'pilot_ready',
            'pilot_ready': 'pilot_ready',
            'deployed': 'deployed',
          };
          stage = stageMap[researchStage.toLowerCase()] || 'concept';
        }

        // Check if project already exists
        const existing = await prisma.project.findFirst({
          where: {
            title,
            piId,
          },
        });

        const projectData = {
          title,
          description,
          piId,
          department,
          stage,
          classification,
          keywords,
          researchAreas,
          seeking,
          students,
        };

        if (existing) {
          await prisma.project.update({
            where: { id: existing.id },
            data: projectData,
          });
          result.updated++;
        } else {
          await prisma.project.create({
            data: projectData,
          });
          result.imported++;
        }
      } catch (error: any) {
        result.errors.push({
          row: row.rowNumber,
          message: error.message,
          data: { rowId: row.id },
        });
        result.failed++;
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to import projects: ${error.message}`);
  }
}

// =============================================================================
// IMPORT OPPORTUNITIES
// =============================================================================

export async function importOpportunities(): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const sheetId = SHEET_IDS.opportunities;
    if (!sheetId) {
      throw new Error('SMARTSHEET_OPPORTUNITIES_SHEET_ID not configured');
    }

    const sheet = await fetchSheetData(sheetId);

    // Get admin user to use as poster
    const adminUser = await prisma.userRole.findFirst({
      where: { role: 'admin' },
      include: { user: true },
    });

    if (!adminUser) {
      throw new Error('No admin user found. Please create an admin user first.');
    }

    for (const row of sheet.rows) {
      try {
        const title = getCellValue(row, sheet.columns, 'Title') || getCellValue(row, sheet.columns, 'Opportunity Title');
        const description = getCellValue(row, sheet.columns, 'Description');
        const organization = getCellValue(row, sheet.columns, 'Organization') || getCellValue(row, sheet.columns, 'Sponsor Organization');
        const opportunityType = getCellValue(row, sheet.columns, 'Type') || getCellValue(row, sheet.columns, 'Opportunity Type');
        const deadline = parseDate(getCellValue(row, sheet.columns, 'Deadline') || getCellValue(row, sheet.columns, 'Application Deadline'));
        const contactEmail = getCellValue(row, sheet.columns, 'Contact Email');
        const requirements = getCellValue(row, sheet.columns, 'Requirements') || getCellValue(row, sheet.columns, 'Eligibility');
        const benefits = getCellValue(row, sheet.columns, 'Benefits');
        const location = getCellValue(row, sheet.columns, 'Location');
        const duration = getCellValue(row, sheet.columns, 'Duration');
        const dodAlignment = parseArray(getCellValue(row, sheet.columns, 'DoD Alignment') || getCellValue(row, sheet.columns, 'DoD Priority Areas'));

        // Validation
        if (!title) {
          result.errors.push({ row: row.rowNumber, message: 'Missing required field: Title' });
          result.failed++;
          continue;
        }

        // Map opportunity type to OpportunityType enum
        let type: any = 'funding';
        if (opportunityType) {
          const typeMap: Record<string, string> = {
            'funding': 'funding',
            'internship': 'internship',
            'competition': 'competition',
          };
          type = typeMap[opportunityType.toLowerCase()] || 'funding';
        }

        // Validate email if provided
        if (contactEmail && !isValidEmail(contactEmail)) {
          result.errors.push({ row: row.rowNumber, message: 'Invalid contact email', data: { title, contactEmail } });
          result.failed++;
          continue;
        }

        // Check if opportunity already exists
        const existing = await prisma.opportunity.findFirst({
          where: {
            title,
            sponsorOrganization: organization,
          },
        });

        const opportunityData = {
          title,
          description,
          type,
          sponsorOrganization: organization,
          postedBy: adminUser.userId,
          requirements,
          benefits,
          location,
          duration,
          deadline,
          dodAlignment,
          status: 'active' as any,
          featured: false,
        };

        if (existing) {
          await prisma.opportunity.update({
            where: { id: existing.id },
            data: opportunityData,
          });
          result.updated++;
        } else {
          await prisma.opportunity.create({
            data: opportunityData,
          });
          result.imported++;
        }
      } catch (error: any) {
        result.errors.push({
          row: row.rowNumber,
          message: error.message,
          data: { rowId: row.id },
        });
        result.failed++;
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to import opportunities: ${error.message}`);
  }
}

// =============================================================================
// IMPORT PARTNERS
// =============================================================================

export async function importPartners(): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const sheetId = SHEET_IDS.partners;
    if (!sheetId) {
      throw new Error('SMARTSHEET_PARTNERS_SHEET_ID not configured');
    }

    const sheet = await fetchSheetData(sheetId);

    for (const row of sheet.rows) {
      try {
        const companyName = getCellValue(row, sheet.columns, 'Company Name') || getCellValue(row, sheet.columns, 'Organization');
        const description = getCellValue(row, sheet.columns, 'Description');
        const organizationType = getCellValue(row, sheet.columns, 'Organization Type') || getCellValue(row, sheet.columns, 'Type');
        const website = getCellValue(row, sheet.columns, 'Website') || getCellValue(row, sheet.columns, 'Website URL');
        const technologyFocus = parseArray(getCellValue(row, sheet.columns, 'Technology Focus') || getCellValue(row, sheet.columns, 'Focus Areas'));
        const seekingCollaboration = parseArray(getCellValue(row, sheet.columns, 'Seeking Collaboration') || getCellValue(row, sheet.columns, 'Looking For'));
        const boothLocation = getCellValue(row, sheet.columns, 'Booth Location') || getCellValue(row, sheet.columns, 'Booth');
        const contactName = getCellValue(row, sheet.columns, 'Contact Name') || getCellValue(row, sheet.columns, 'Primary Contact');
        const contactTitle = getCellValue(row, sheet.columns, 'Contact Title');
        const contactEmail = getCellValue(row, sheet.columns, 'Contact Email');
        const contactPhone = getCellValue(row, sheet.columns, 'Contact Phone');
        const dodSponsors = getCellValue(row, sheet.columns, 'DoD Sponsors') || getCellValue(row, sheet.columns, 'Government Sponsors');

        // Validation
        if (!companyName) {
          result.errors.push({ row: row.rowNumber, message: 'Missing required field: Company Name' });
          result.failed++;
          continue;
        }

        // Validate email if provided
        if (contactEmail && !isValidEmail(contactEmail)) {
          result.errors.push({ row: row.rowNumber, message: 'Invalid contact email', data: { companyName, contactEmail } });
          result.failed++;
          continue;
        }

        // Check if partner already exists
        const existing = await prisma.industryPartner.findUnique({
          where: { companyName },
        });

        const partnerData = {
          companyName,
          description,
          organizationType,
          websiteUrl: website,
          technologyFocusAreas: technologyFocus,
          seekingCollaboration,
          boothLocation,
          primaryContactName: contactName,
          primaryContactTitle: contactTitle,
          primaryContactEmail: contactEmail,
          primaryContactPhone: contactPhone,
          dodSponsors,
          hideContactInfo: false,
        };

        if (existing) {
          await prisma.industryPartner.update({
            where: { id: existing.id },
            data: partnerData,
          });
          result.updated++;
        } else {
          await prisma.industryPartner.create({
            data: partnerData,
          });
          result.imported++;
        }
      } catch (error: any) {
        result.errors.push({
          row: row.rowNumber,
          message: error.message,
          data: { rowId: row.id },
        });
        result.failed++;
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to import partners: ${error.message}`);
  }
}

// =============================================================================
// IMPORT ATTENDEES
// =============================================================================

export async function importAttendees(): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const sheetId = SHEET_IDS.attendees;
    if (!sheetId) {
      throw new Error('SMARTSHEET_ATTENDEES_SHEET_ID not configured');
    }

    const sheet = await fetchSheetData(sheetId);

    for (const row of sheet.rows) {
      try {
        const fullName = getCellValue(row, sheet.columns, 'Full Name') || getCellValue(row, sheet.columns, 'Name');
        const email = getCellValue(row, sheet.columns, 'Email') || getCellValue(row, sheet.columns, 'Email Address');
        const phone = getCellValue(row, sheet.columns, 'Phone') || getCellValue(row, sheet.columns, 'Phone Number');
        const rank = getCellValue(row, sheet.columns, 'Rank');
        const organization = getCellValue(row, sheet.columns, 'Organization') || getCellValue(row, sheet.columns, 'Company');
        const department = getCellValue(row, sheet.columns, 'Department');
        const role = getCellValue(row, sheet.columns, 'Role') || getCellValue(row, sheet.columns, 'Position');
        const linkedinUrl = getCellValue(row, sheet.columns, 'LinkedIn') || getCellValue(row, sheet.columns, 'LinkedIn URL');
        const websiteUrl = getCellValue(row, sheet.columns, 'Website');

        // Validation
        if (!fullName) {
          result.errors.push({ row: row.rowNumber, message: 'Missing required field: Full Name' });
          result.failed++;
          continue;
        }

        if (!email) {
          result.errors.push({ row: row.rowNumber, message: 'Missing required field: Email', data: { fullName } });
          result.failed++;
          continue;
        }

        if (!isValidEmail(email)) {
          result.errors.push({ row: row.rowNumber, message: 'Invalid email format', data: { fullName, email } });
          result.failed++;
          continue;
        }

        // Check if profile already exists
        const existing = await prisma.profile.findUnique({
          where: { email },
        });

        const profileData = {
          fullName,
          email,
          phone,
          rank,
          organization,
          department,
          role,
          linkedinUrl,
          websiteUrl,
          profileVisibility: 'public' as any,
          allowQrScanning: true,
          allowMessaging: true,
          hideContactInfo: false,
        };

        if (existing) {
          await prisma.profile.update({
            where: { id: existing.id },
            data: profileData,
          });
          result.updated++;
        } else {
          const newProfile = await prisma.profile.create({
            data: profileData,
          });

          // Generate QR code for new profile
          const qrCodeData = `converge-nps://profile/${newProfile.id}`;
          await prisma.qrCode.create({
            data: {
              userId: newProfile.id,
              qrCodeData,
              isActive: true,
            },
          });

          result.imported++;
        }
      } catch (error: any) {
        result.errors.push({
          row: row.rowNumber,
          message: error.message,
          data: { rowId: row.id },
        });
        result.failed++;
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to import attendees: ${error.message}`);
  }
}
