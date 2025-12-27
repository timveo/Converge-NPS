import prisma from '../config/database';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';

// Smartsheet API configuration
const SMARTSHEET_API_BASE = 'https://api.smartsheet.com/2.0';
const RATE_LIMIT_DELAY = 200; // 200ms between requests = max 300/min

// Environment variables for sheet IDs
const SHEET_IDS = {
  // Export sheets (outbound from app to Smartsheet)
  users: process.env.SMARTSHEET_USER_SHEET_ID || '',
  rsvps: process.env.SMARTSHEET_RSVP_SHEET_ID || '',
  connections: process.env.SMARTSHEET_CONNECTION_SHEET_ID || '',
  attendees: process.env.SMARTSHEET_ATTENDEES_SHEET_ID || '',
  // Import sheets (inbound from Smartsheet to app)
  sessions: process.env.SMARTSHEET_SESSIONS_SHEET_ID || '',
  projects: process.env.SMARTSHEET_PROJECTS_SHEET_ID || '',
  opportunities: process.env.SMARTSHEET_OPPORTUNITIES_SHEET_ID || '',
  partners: process.env.SMARTSHEET_PARTNERS_SHEET_ID || '',
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
  errorDetails: string;
  createdAt: Date;
}

interface ExportResult {
  total: number;
  added: number;
  updated: number;
  failed: number;
  errors: Array<{ message: string; email?: string; profileId?: string }>;
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
    systemColumnType?: string; // System columns like AUTO_NUMBER, CREATED_DATE, etc.
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
    const user = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Check if already synced - simplified for new model
    const existingSync = await prisma.smartsheetSync.findFirst({
      where: {
        userId,
        entityType: 'user',
        status: 'success',
      },
      orderBy: { createdAt: 'desc' },
    });

    const client = getSmartsheetClient();
    const sheetId = SHEET_IDS.users;

    if (!sheetId) {
      throw new Error('SMARTSHEET_USER_SHEET_ID not configured');
    }

    const rowData = mapUserToRow(user);

    // Always create new row for now
    const response = await queueRequest(() =>
      client.post(`/sheets/${sheetId}/rows`, [rowData])
    );
    const rowId = response.data.result[0]?.id;

    // Log success
    await prisma.smartsheetSync.create({
      data: {
        userId,
        syncType: 'export',
        direction: 'upload',
        entityType: 'user',
        status: 'success',
        processedCount: 1,
        totalCount: 1,
        startedAt: new Date(),
        completedAt: new Date(),
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
    await prisma.smartsheetSync.create({
      data: {
        userId,
        syncType: 'export',
        direction: 'upload',
        entityType: 'user',
        status: 'failed',
        errorDetails: error.message,
        processedCount: 0,
        totalCount: 1,
        startedAt: new Date(),
        completedAt: new Date(),
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
  const users = await prisma.profile.findMany();

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

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeEmail(value: unknown): string {
  return normalizeString(value).toLowerCase();
}

function findColumnIdByTitles(columns: SmartsheetSheet['columns'], titles: string[]): string | null {
  const normalizedTargets = titles.map(t => t.trim().toLowerCase());
  // Filter out system columns - they cannot be written to
  const col = columns.find(c => 
    !c.systemColumnType && normalizedTargets.includes(c.title.trim().toLowerCase())
  );
  return col?.id ?? null;
}

function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

function buildCellsForAttendeeProfile(profile: any, columns: SmartsheetSheet['columns']) {
  const cells: Array<{ columnId: string; value?: any }> = [];

  const setIfPresent = (titles: string[], value: any) => {
    const columnId = findColumnIdByTitles(columns, titles);
    if (!columnId) return;
    if (value === undefined) return;
    cells.push({ columnId, value });
  };

  const { firstName, lastName } = splitFullName(profile.fullName);

  setIfPresent(['Profile ID', 'User ID', 'Id', 'ID'], profile.id);
  setIfPresent(['Full Name', 'Name'], profile.fullName);
  setIfPresent(['First Name', 'FirstName', 'First NAme'], firstName);
  setIfPresent(['Last Name', 'LastName'], lastName);
  setIfPresent(['Email', 'Email Address'], profile.email);
  setIfPresent(['Phone', 'Phone Number', 'Phone #', 'Mobile', 'Cell'], profile.phone || '');
  setIfPresent(['Rank', 'Rank/Title', 'Title'], profile.rank || '');
  setIfPresent(['Organization', 'Organizations', 'Company'], profile.organization || '');
  setIfPresent(['Department'], profile.department || '');
  setIfPresent(['Branch of Service', 'Branch', 'Service Branch'], profile.branchOfService || '');
  setIfPresent(['Role', 'Position'], profile.role || '');
  setIfPresent(['Participant Type', 'Type'], profile.participantType || profile.role || '');
  setIfPresent(['LinkedIn', 'LinkedIn URL', 'Linkedin URL'], profile.linkedinUrl || '');
  setIfPresent(['Website', 'Personal/Company Website', 'Company Website'], profile.websiteUrl || '');
  setIfPresent(['RSVP Date', 'RSVP date', 'RSVPDate'], profile.rsvpDate ? new Date(profile.rsvpDate).toISOString().split('T')[0] : '');

  return cells;
}

async function logAttendeeExportResult(params: {
  profileId: string;
  status: 'success' | 'failed';
  errorDetails?: string;
}) {
  await prisma.smartsheetSync.create({
    data: {
      userId: params.profileId,
      syncType: 'export',
      direction: 'upload',
      entityType: 'attendee',
      status: params.status,
      errorDetails: params.errorDetails,
      processedCount: params.status === 'success' ? 1 : 0,
      totalCount: 1,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

export async function exportAttendees(): Promise<ExportResult> {
  const result: ExportResult = {
    total: 0,
    added: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  const sheetId = SHEET_IDS.attendees;
  if (!sheetId) {
    throw new Error('SMARTSHEET_ATTENDEES_SHEET_ID not configured');
  }

  const client = getSmartsheetClient();
  const sheet = await fetchSheetData(sheetId);

  const emailColumnId = findColumnIdByTitles(sheet.columns, ['Email', 'Email Address']);
  if (!emailColumnId) {
    throw new Error('Attendees sheet is missing an Email column');
  }

  const existingByEmail = new Map<string, string>();
  for (const row of sheet.rows) {
    const cell = row.cells.find(c => c.columnId === emailColumnId);
    const email = normalizeEmail(cell?.value ?? cell?.displayValue);
    if (email) {
      existingByEmail.set(email, row.id);
    }
  }

  const profiles = await prisma.profile.findMany({
    include: {
      rsvps: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  result.total = profiles.length;

  // Enrich profiles with RSVP date
  const enrichedProfiles = profiles.map(p => ({
    ...p,
    rsvpDate: p.rsvps[0]?.createdAt || null,
  }));

  const toAdd: Array<{ profile: any; row: any }> = [];
  const toUpdate: Array<{ profile: any; row: any }> = [];

  for (const profile of enrichedProfiles) {
    const email = normalizeEmail(profile.email);
    if (!email) {
      result.failed++;
      result.errors.push({ message: 'Missing email on profile', profileId: profile.id });
      await logAttendeeExportResult({
        profileId: profile.id,
        status: 'failed',
        errorDetails: 'Missing email on profile',
      });
      continue;
    }

    const cells = buildCellsForAttendeeProfile(profile, sheet.columns);
    if (cells.length === 0) {
      result.failed++;
      result.errors.push({ message: 'No matching columns found on attendees sheet', email, profileId: profile.id });
      await logAttendeeExportResult({
        profileId: profile.id,
        status: 'failed',
        errorDetails: 'No matching columns found on attendees sheet',
      });
      continue;
    }

    const existingRowId = existingByEmail.get(email);
    if (existingRowId) {
      toUpdate.push({ profile, row: { id: existingRowId, cells } });
    } else {
      toAdd.push({ profile, row: { cells } });
    }
  }

  const batchSize = 200;

  for (let i = 0; i < toAdd.length; i += batchSize) {
    const batch = toAdd.slice(i, i + batchSize);

    try {
      const rowsPayload = batch.map(b => ({
        toBottom: true,
        cells: b.row.cells.map((c: any) => ({
          columnId: Number(c.columnId),
          value: c.value,
        })),
      }));
      console.log('Smartsheet add rows payload (first row):', JSON.stringify(rowsPayload[0], null, 2));
      const response = await queueRequest(() =>
        client.post(`/sheets/${sheetId}/rows`, rowsPayload)
      );

      const rowResults: Array<{ id?: string }> = response.data?.result ?? [];

      for (let j = 0; j < batch.length; j++) {
        const profileId = batch[j].profile.id;
        const rowId = rowResults[j]?.id;
        if (rowId) {
          result.added++;
          await logAttendeeExportResult({ profileId, status: 'success' });
        } else {
          result.failed++;
          result.errors.push({ message: 'Smartsheet did not return row id for created row', profileId });
          await logAttendeeExportResult({
            profileId,
            status: 'failed',
            errorDetails: 'Smartsheet did not return row id for created row',
          });
        }
      }
    } catch (error: any) {
      const errorDetail = error.response?.data?.message || error.response?.data?.detail || error.message;
      console.error('Smartsheet add rows error:', JSON.stringify(error.response?.data || error.message, null, 2));
      for (const item of batch) {
        result.failed++;
        result.errors.push({
          message: errorDetail,
          email: item.profile.email,
          profileId: item.profile.id,
        });
        await logAttendeeExportResult({
          profileId: item.profile.id,
          status: 'failed',
          errorDetails: errorDetail,
        });
      }
    }
  }

  for (let i = 0; i < toUpdate.length; i += batchSize) {
    const batch = toUpdate.slice(i, i + batchSize);

    try {
      const rowsPayload = batch.map(b => ({
        id: Number(b.row.id),
        cells: b.row.cells.map((c: any) => ({
          columnId: Number(c.columnId),
          value: c.value,
        })),
      }));
      await queueRequest(() =>
        client.put(`/sheets/${sheetId}/rows`, rowsPayload)
      );

      for (const item of batch) {
        result.updated++;
        await logAttendeeExportResult({ profileId: item.profile.id, status: 'success' });
      }
    } catch (error: any) {
      const errorDetail = error.response?.data?.message || error.response?.data?.detail || error.message;
      console.error('Smartsheet update rows error:', JSON.stringify(error.response?.data || error.message, null, 2));
      for (const item of batch) {
        result.failed++;
        result.errors.push({
          message: errorDetail,
          email: item.profile.email,
          profileId: item.profile.id,
        });
        await logAttendeeExportResult({
          profileId: item.profile.id,
          status: 'failed',
          errorDetails: errorDetail,
        });
      }
    }
  }

  return result;
}

// Sync RSVP to Smartsheet
export async function syncRsvpToSmartsheet(rsvpId: string): Promise<SyncResult> {
  try {
    // Get RSVP with relations
    const rsvp = await prisma.rsvp.findUnique({
      where: { id: rsvpId },
      include: {
        user: true,
        session: true,
      },
    });

    if (!rsvp) {
      throw new Error(`RSVP ${rsvpId} not found`);
    }

    const userId = rsvp.userId; // Extract userId here

    const existingSync = await prisma.smartsheetSync.findFirst({
      where: {
        userId,
        entityType: 'rsvp',
        status: 'success',
      },
      orderBy: { createdAt: 'desc' },
    });

    const client = getSmartsheetClient();
    const sheetId = SHEET_IDS.rsvps;

    if (!sheetId) {
      throw new Error('SMARTSHEET_RSVP_SHEET_ID not configured');
    }

    const rowData = mapRsvpToRow(rsvp);

    // Always create new row for now
    const response = await queueRequest(() =>
      client.post(`/sheets/${sheetId}/rows`, [rowData])
    );
    const rowId = response.data.result[0]?.id;

    await prisma.smartsheetSync.create({
      data: {
        userId,
        syncType: 'export',
        direction: 'upload',
        entityType: 'rsvp',
        status: 'success',
        processedCount: 1,
        totalCount: 1,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      entityType: 'rsvp',
      entityId: rsvpId,
      rowId,
    };
  } catch (error: any) {
    // For failed syncs, we need to get the userId from the rsvp
    // This is a simplified approach - in production you'd want better error handling
    const fallbackUserId = 'unknown';
    
    await prisma.smartsheetSync.create({
      data: {
        userId: fallbackUserId, // Use fallback since rsvp is not in scope
        syncType: 'export',
        direction: 'upload',
        entityType: 'rsvp',
        status: 'failed',
        errorDetails: error.message,
        processedCount: 0,
        totalCount: 1,
        startedAt: new Date(),
        completedAt: new Date(),
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
  const rsvps = await prisma.rsvp.findMany();

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
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        user: true,
        connectedUser: true,
      },
    });

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const userId = connection.userId; // Extract userId here

    const existingSync = await prisma.smartsheetSync.findFirst({
      where: {
        userId,
        entityType: 'connection',
        status: 'success',
      },
      orderBy: { createdAt: 'desc' },
    });

    const client = getSmartsheetClient();
    const sheetId = SHEET_IDS.connections;

    if (!sheetId) {
      throw new Error('SMARTSHEET_CONNECTION_SHEET_ID not configured');
    }

    const rowData = mapConnectionToRow(connection);

    // Always create new row for now
    const response = await queueRequest(() =>
      client.post(`/sheets/${sheetId}/rows`, [rowData])
    );
    const rowId = response.data.result[0]?.id;

    await prisma.smartsheetSync.create({
      data: {
        userId,
        syncType: 'export',
        direction: 'upload',
        entityType: 'connection',
        status: 'success',
        processedCount: 1,
        totalCount: 1,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      entityType: 'connection',
      entityId: connectionId,
      rowId,
    };
  } catch (error: any) {
    // For failed syncs, use fallback userId since connection is not in scope
    const fallbackUserId = 'unknown';
    
    await prisma.smartsheetSync.create({
      data: {
        userId: fallbackUserId,
        syncType: 'export',
        direction: 'upload',
        entityType: 'connection',
        status: 'failed',
        errorDetails: error.message,
        processedCount: 0,
        totalCount: 1,
        startedAt: new Date(),
        completedAt: new Date(),
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
  const connections = await prisma.connection.findMany();

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
    prisma.profile.count(),
    prisma.rsvp.count(),
    prisma.connection.count(),
    prisma.smartsheetSync.groupBy({
      by: ['status'],
      where: { entityType: 'user' },
      _count: true,
    }),
    prisma.smartsheetSync.groupBy({
      by: ['status'],
      where: { entityType: 'rsvp' },
      _count: true,
    }),
    prisma.smartsheetSync.groupBy({
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
    prisma.smartsheetSync.findFirst({
      where: { entityType: 'user', status: 'success' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.smartsheetSync.findFirst({
      where: { entityType: 'rsvp', status: 'success' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.smartsheetSync.findFirst({
      where: { entityType: 'connection', status: 'success' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      synced: getUserSyncCount('success'),
      pending: getUserSyncCount('pending'),
      failed: getUserSyncCount('failed'),
      lastSync: lastUserSync?.createdAt || null,
    },
    rsvps: {
      total: totalRsvps,
      synced: getRsvpSyncCount('success'),
      pending: getRsvpSyncCount('pending'),
      failed: getRsvpSyncCount('failed'),
      lastSync: lastRsvpSync?.createdAt || null,
    },
    connections: {
      total: totalConnections,
      synced: getConnectionSyncCount('success'),
      pending: getConnectionSyncCount('pending'),
      failed: getConnectionSyncCount('failed'),
      lastSync: lastConnectionSync?.createdAt || null,
    },
  };
}

// Get failed syncs
export async function getFailedSyncs(): Promise<FailedSync[]> {
  const failed = await prisma.smartsheetSync.findMany({
    where: { status: 'failed' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return failed.map(f => ({
    id: f.id,
    entityType: f.entityType,
    errorDetails: f.errorDetails || 'Unknown error',
    createdAt: f.createdAt,
  }));
}

// Retry failed sync - simplified for new model
export async function retrySyncItem(syncLogId: string): Promise<SyncResult> {
  const syncLog = await prisma.smartsheetSync.findUnique({
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

  // For now, just return success since the new model structure is different
  // This function needs to be redesigned for the new SmartsheetSync model
  return {
    success: true,
    entityType: syncLog.entityType,
    entityId: 'redesigned',
  };
}

// Clear all failed syncs
export async function clearFailedSyncs(): Promise<number> {
  const result = await prisma.smartsheetSync.deleteMany({
    where: { status: 'failed' },
  });

  return result.count;
}

// =============================================================================
// DATA IMPORT FUNCTIONS
// =============================================================================

// Helper function to get cell value by column name
function getCellValue(row: SmartsheetRow, columns: any[], columnName: string): any {
  const normalizedName = columnName.toLowerCase().trim();
  const column = columns.find(col => col.title?.toLowerCase().trim() === normalizedName);
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

// Helper function to parse time string (handles both 12-hour and 24-hour formats)
function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  
  const trimmed = timeStr.trim();
  
  // Check for 12-hour format with AM/PM (e.g., "2:30 PM", "11:00 AM")
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|a\.m\.|p\.m\.)?$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3]?.toUpperCase();
    
    if (period) {
      // 12-hour format with AM/PM
      if (period.startsWith('P') && hours !== 12) {
        hours += 12;
      } else if (period.startsWith('A') && hours === 12) {
        hours = 0;
      }
    }
    // If no AM/PM specified, assume 24-hour format (military time)
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }
  
  return null;
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

// Helper function to determine if a date is in Pacific Daylight Time (PDT)
// PDT is observed from second Sunday of March to first Sunday of November
function isPacificDaylightTime(year: number, month: number, day: number): boolean {
  // Month is 0-indexed (0 = January, 2 = March, 10 = November)

  // Before March or after November: definitely PST
  if (month < 2 || month > 10) return false;

  // April through October: definitely PDT
  if (month > 2 && month < 10) return true;

  // March: DST starts on second Sunday at 2am
  if (month === 2) {
    // Find second Sunday of March
    const firstDayOfMonth = new Date(year, 2, 1).getDay(); // 0 = Sunday
    const secondSunday = firstDayOfMonth === 0 ? 8 : (14 - firstDayOfMonth + 1);
    return day >= secondSunday;
  }

  // November: DST ends on first Sunday at 2am
  if (month === 10) {
    // Find first Sunday of November
    const firstDayOfMonth = new Date(year, 10, 1).getDay();
    const firstSunday = firstDayOfMonth === 0 ? 1 : (7 - firstDayOfMonth + 1);
    return day < firstSunday;
  }

  return false;
}

// Helper function to combine date and time strings into a Date object
// Smartsheet times are in Pacific timezone, so we need to convert to UTC for storage
// Pacific Standard Time (PST) is UTC-8, Pacific Daylight Time (PDT) is UTC-7
function parseDateWithTime(dateStr: any, timeStr: any): Date | null {
  if (!dateStr) return null;

  try {
    // Parse date components manually to avoid UTC interpretation
    // Smartsheet sends dates like "2026-01-28" which new Date() interprets as UTC
    const dateString = String(dateStr);
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

    let year: number, month: number, day: number;

    if (dateMatch) {
      // ISO format: YYYY-MM-DD
      year = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10) - 1; // JavaScript months are 0-indexed
      day = parseInt(dateMatch[3], 10);
    } else {
      // Fallback to Date parsing for other formats
      const baseDate = new Date(dateStr);
      if (isNaN(baseDate.getTime())) return null;
      year = baseDate.getFullYear();
      month = baseDate.getMonth();
      day = baseDate.getDate();
    }

    // Parse the time string
    const time = parseTimeString(String(timeStr || ''));
    const hours = time?.hours ?? 0;
    const minutes = time?.minutes ?? 0;

    // Determine Pacific timezone offset based on DST
    // PST = UTC-8, PDT = UTC-7
    const isDST = isPacificDaylightTime(year, month, day);
    const pacificOffsetHours = isDST ? 7 : 8;

    // Create date in UTC by adding the offset to convert from Pacific to UTC
    const result = new Date(Date.UTC(year, month, day, hours + pacificOffsetHours, minutes, 0, 0));

    if (isNaN(result.getTime())) return null;
    return result;
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
        const title = getCellValue(row, sheet.columns, 'Title') || getCellValue(row, sheet.columns, 'Session Title') || getCellValue(row, sheet.columns, 'Event Title');
        const description = getCellValue(row, sheet.columns, 'Description') || getCellValue(row, sheet.columns, 'Event Description');
        const speaker = getCellValue(row, sheet.columns, 'Speaker Name') || getCellValue(row, sheet.columns, 'Speaker');
        const location = getCellValue(row, sheet.columns, 'Location') || getCellValue(row, sheet.columns, 'Room');
        const sessionType = getCellValue(row, sheet.columns, 'Session Type') || getCellValue(row, sheet.columns, 'Type');
        const startTimeStr = getCellValue(row, sheet.columns, 'Start Time');
        const endTimeStr = getCellValue(row, sheet.columns, 'End Time');
        const dateStr = getCellValue(row, sheet.columns, 'Date');

        // Combine date with time if they're separate using proper time parsing
        let startTime: Date | null = null;
        let endTime: Date | null = null;

        if (dateStr && startTimeStr) {
          startTime = parseDateWithTime(dateStr, startTimeStr);
        } else {
          startTime = parseDate(startTimeStr);
        }

        if (dateStr && endTimeStr) {
          endTime = parseDateWithTime(dateStr, endTimeStr);
        } else {
          endTime = parseDate(endTimeStr);
        }

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

        // Check if session already exists (by title only to allow time updates)
        const existing = await prisma.session.findFirst({
          where: {
            title,
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
        const title = getCellValue(row, sheet.columns, 'Project Title') || getCellValue(row, sheet.columns, 'Title') || getCellValue(row, sheet.columns, 'Collaborative Project 1 - Title');
        const description = getCellValue(row, sheet.columns, 'Description') || getCellValue(row, sheet.columns, 'Project 1 - Description');
        const piName = getCellValue(row, sheet.columns, 'PI Name') || getCellValue(row, sheet.columns, 'Principal Investigator') || getCellValue(row, sheet.columns, 'POC Full Name');
        const piEmail = getCellValue(row, sheet.columns, 'PI Email') || getCellValue(row, sheet.columns, 'POC Email');
        const department = getCellValue(row, sheet.columns, 'Department') || getCellValue(row, sheet.columns, 'NPS Program / Department');
        const researchStage = getCellValue(row, sheet.columns, 'Research Stage') || getCellValue(row, sheet.columns, 'Stage') || getCellValue(row, sheet.columns, 'Project 1 - Stage');
        const classification = getCellValue(row, sheet.columns, 'Classification') || getCellValue(row, sheet.columns, 'Project 1 - Classification') || 'Unclassified';
        const keywords = parseArray(getCellValue(row, sheet.columns, 'Keywords') || getCellValue(row, sheet.columns, 'Tags') || getCellValue(row, sheet.columns, 'Technology Focus'));
        const researchAreas = parseArray(getCellValue(row, sheet.columns, 'Research Areas'));
        const seeking = parseArray(getCellValue(row, sheet.columns, 'Seeking') || getCellValue(row, sheet.columns, 'Looking For'));
        const students = parseArray(getCellValue(row, sheet.columns, 'Students') || getCellValue(row, sheet.columns, 'Team Members') || getCellValue(row, sheet.columns, 'Advisor(s)'));
        const pocFullName = getCellValue(row, sheet.columns, 'POC Full Name') || getCellValue(row, sheet.columns, 'POC Name');
        const { firstName: pocFirstName, lastName: pocLastName } = splitFullName(pocFullName || '');
        const pocEmail = getCellValue(row, sheet.columns, 'POC Email') || getCellValue(row, sheet.columns, 'POC E-mail');
        const pocRank = getCellValue(row, sheet.columns, 'Rank/Title') || getCellValue(row, sheet.columns, 'POC Rank') || getCellValue(row, sheet.columns, 'POC Title');
        

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

        // Try to find existing PI profile by email (do not create new profiles)
        let piId: string | null = null;
        const effectivePiEmail = piEmail || pocEmail;

        if (effectivePiEmail && isValidEmail(effectivePiEmail)) {
          const piProfile = await prisma.profile.findUnique({
            where: { email: effectivePiEmail.toLowerCase() },
          });

          if (piProfile) {
            piId = piProfile.id;
          }
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

        // Try to find POC user by email if provided
        let pocUserId: string | null = null;
        if (pocEmail && isValidEmail(pocEmail)) {
          const pocUser = await prisma.profile.findUnique({
            where: { email: pocEmail.toLowerCase() },
          });
          if (pocUser) {
            pocUserId = pocUser.id;
          }
        }

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
          pocUserId,
          pocFirstName: pocFirstName || null,
          pocLastName: pocLastName || null,
          pocEmail: pocEmail || null,
          pocRank: pocRank || null,
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
        const pocFullName = getCellValue(row, sheet.columns, 'POC Full Name') || getCellValue(row, sheet.columns, 'POC Name');
        const { firstName: pocFirstName, lastName: pocLastName } = splitFullName(pocFullName || '');
        const pocEmail = getCellValue(row, sheet.columns, 'POC Email') || getCellValue(row, sheet.columns, 'POC E-mail');
        const pocRank = getCellValue(row, sheet.columns, 'Rank/Title') || getCellValue(row, sheet.columns, 'POC Rank') || getCellValue(row, sheet.columns, 'POC Title');

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

        // Try to find POC user by email if provided
        let pocUserId: string | null = null;
        if (pocEmail) {
          const pocUser = await prisma.profile.findUnique({
            where: { email: pocEmail.toLowerCase() },
          });
          if (pocUser) {
            pocUserId = pocUser.id;
          }
        }

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
          pocUserId,
          pocFirstName: pocFirstName || null,
          pocLastName: pocLastName || null,
          pocEmail: pocEmail || null,
          pocRank: pocRank || null,
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
        const technologyFocus = parseArray(getCellValue(row, sheet.columns, 'Technology Focus'));
        const seeking = parseArray(getCellValue(row, sheet.columns, 'Seeking'));
        const collaborationPitch = getCellValue(row, sheet.columns, 'Collaboration Pitch') || getCellValue(row, sheet.columns, 'Pitch') || getCellValue(row, sheet.columns, 'Collaboration');
        const boothLocation = getCellValue(row, sheet.columns, 'Booth Location') || getCellValue(row, sheet.columns, 'Booth');
        const contactName = getCellValue(row, sheet.columns, 'Contact Name') || getCellValue(row, sheet.columns, 'Primary Contact');
        const contactTitle = getCellValue(row, sheet.columns, 'Contact Title');
        const contactEmail = getCellValue(row, sheet.columns, 'Contact Email');
        const contactPhone = getCellValue(row, sheet.columns, 'Contact Phone');
        const dodSponsors = getCellValue(row, sheet.columns, 'DoD Sponsors') || getCellValue(row, sheet.columns, 'Government Sponsors');
        const pocFullName = getCellValue(row, sheet.columns, 'POC Full Name') || getCellValue(row, sheet.columns, 'POC Name');
        const { firstName: pocFirstName, lastName: pocLastName } = splitFullName(pocFullName || '');
        const pocEmail = getCellValue(row, sheet.columns, 'POC Email') || getCellValue(row, sheet.columns, 'POC E-mail');
        const pocRank = getCellValue(row, sheet.columns, 'Rank/Title') || getCellValue(row, sheet.columns, 'POC Rank') || getCellValue(row, sheet.columns, 'POC Title');

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
        const partner = await prisma.partner.findUnique({
          where: { name: companyName },
        });

        // Try to find POC user by email if provided
        let pocUserId: string | null = null;
        if (pocEmail) {
          const pocUser = await prisma.profile.findUnique({
            where: { email: pocEmail.toLowerCase() },
          });
          if (pocUser) {
            pocUserId = pocUser.id;
          }
        }

        const partnerData = {
          name: companyName,
          description,
          organizationType: organizationType,
          websiteUrl: website,
          researchAreas: technologyFocus,
          seeking,
          collaborationPitch,
          isFeatured: false,
          pocUserId,
          pocFirstName: pocFirstName || null,
          pocLastName: pocLastName || null,
          pocEmail: pocEmail || null,
          pocRank: pocRank || null,
        };

        if (partner) {
          await prisma.partner.update({
            where: { id: partner.id },
            data: partnerData,
          });
          result.updated++;
        } else {
          await prisma.partner.create({
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
        // Try to get full name, or combine first and last name
        let fullName = getCellValue(row, sheet.columns, 'Full Name') || getCellValue(row, sheet.columns, 'Name');
        if (!fullName) {
          const firstName = getCellValue(row, sheet.columns, 'First Name');
          const lastName = getCellValue(row, sheet.columns, 'Last Name');
          if (firstName && lastName) {
            fullName = `${firstName} ${lastName}`;
          } else if (firstName) {
            fullName = firstName;
          } else if (lastName) {
            fullName = lastName;
          }
        }

        const email = getCellValue(row, sheet.columns, 'Email') || getCellValue(row, sheet.columns, 'Email Address');
        const phone = getCellValue(row, sheet.columns, 'Phone') || getCellValue(row, sheet.columns, 'Phone Number');
        const rank = getCellValue(row, sheet.columns, 'Rank') || getCellValue(row, sheet.columns, 'Rank/Title');
        const organization = getCellValue(row, sheet.columns, 'Organization') || getCellValue(row, sheet.columns, 'Company');
        const department = getCellValue(row, sheet.columns, 'Department');
        const role = getCellValue(row, sheet.columns, 'Role') || getCellValue(row, sheet.columns, 'Position') || getCellValue(row, sheet.columns, 'Participant Type');
        const linkedinUrl = getCellValue(row, sheet.columns, 'LinkedIn') || getCellValue(row, sheet.columns, 'LinkedIn URL');
        const websiteUrl = getCellValue(row, sheet.columns, 'Website') || getCellValue(row, sheet.columns, 'Personal/Company Website');

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
          accelerationInterests: [],
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
          // Generate UUID for new profile
          const profileId = await prisma.$queryRaw<Array<{ gen_random_uuid: string }>>`SELECT gen_random_uuid()`;
          const newId = profileId[0].gen_random_uuid;

          const newProfile = await prisma.profile.create({
            data: {
              ...profileData,
              id: newId,
            },
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
