import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();

// Smartsheet API configuration
const SMARTSHEET_API_BASE = 'https://api.smartsheet.com/2.0';
const RATE_LIMIT_DELAY = 200; // 200ms between requests = max 300/min

// Environment variables for sheet IDs
const SHEET_IDS = {
  users: process.env.SMARTSHEET_USER_SHEET_ID || '',
  rsvps: process.env.SMARTSHEET_RSVP_SHEET_ID || '',
  connections: process.env.SMARTSHEET_CONNECTION_SHEET_ID || '',
  analytics: process.env.SMARTSHEET_ANALYTICS_SHEET_ID || '',
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
