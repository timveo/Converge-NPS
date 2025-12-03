/**
 * Connection Service
 *
 * Database operations for user connections (QR scan, manual entry, notes)
 */

import { PrismaClient, Connection } from '@prisma/client';
import { NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export interface CreateConnectionData {
  userId: string;
  connectedUserId: string;
  collaborativeIntents: string[];
  notes?: string | null;
  connectionMethod: 'qr_scan' | 'manual_entry';
}

export interface UpdateConnectionData {
  collaborativeIntents?: string[];
  notes?: string | null;
  followUpReminder?: Date | null;
}

export class ConnectionService {
  /**
   * Create connection (QR scan or manual entry)
   */
  static async createConnection(data: CreateConnectionData): Promise<Connection> {
    const { userId, connectedUserId, collaborativeIntents, notes, connectionMethod } = data;

    // Check if connection already exists
    const existing = await prisma.connection.findUnique({
      where: {
        userId_connectedUserId: {
          userId,
          connectedUserId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Connection already exists');
    }

    // Check if connecting to self
    if (userId === connectedUserId) {
      throw new ForbiddenError('Cannot connect to yourself');
    }

    // Check if connected user exists and allows connections
    const connectedUser = await prisma.profile.findUnique({
      where: { id: connectedUserId },
    });

    if (!connectedUser) {
      throw new NotFoundError('Connected user not found');
    }

    // Check privacy settings (for QR scan)
    if (connectionMethod === 'qr_scan' && !connectedUser.allowQrScanning) {
      throw new ForbiddenError('User has disabled QR code scanning');
    }

    // Create connection
    const connection = await prisma.connection.create({
      data: {
        userId,
        connectedUserId,
        collaborativeIntents,
        notes,
        connectionMethod,
      },
      include: {
        connectedUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            organization: true,
            department: true,
            role: true,
            bio: true,
            avatarUrl: true,
            linkedinUrl: true,
            websiteUrl: true,
            hideContactInfo: true,
          },
        },
      },
    });

    // Increment QR code scan count if QR scan
    if (connectionMethod === 'qr_scan') {
      await prisma.qrCode.update({
        where: { userId: connectedUserId },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      });
    }

    return connection;
  }

  /**
   * Get connection by ID
   */
  static async getConnection(connectionId: string, userId: string): Promise<Connection> {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        connectedUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            organization: true,
            department: true,
            role: true,
            bio: true,
            avatarUrl: true,
            linkedinUrl: true,
            websiteUrl: true,
            hideContactInfo: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Ensure user owns this connection
    if (connection.userId !== userId) {
      throw new ForbiddenError('Not authorized to view this connection');
    }

    return connection;
  }

  /**
   * Get all connections for a user
   */
  static async getConnections(query: {
    userId: string;
    search?: string;
    intent?: string;
    sortBy?: 'createdAt' | 'fullName';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    connections: Connection[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      userId,
      search,
      intent,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: any = { userId };

    // Search filter
    if (search) {
      where.connectedUser = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { organization: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Intent filter
    if (intent) {
      where.collaborativeIntents = {
        has: intent,
      };
    }

    // Sorting
    const orderBy: any = {};
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'fullName') {
      orderBy.connectedUser = {
        fullName: sortOrder,
      };
    }

    const [connections, total] = await Promise.all([
      prisma.connection.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          connectedUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              organization: true,
              department: true,
              role: true,
              bio: true,
              avatarUrl: true,
              linkedinUrl: true,
              websiteUrl: true,
              hideContactInfo: true,
            },
          },
        },
      }),
      prisma.connection.count({ where }),
    ]);

    return {
      connections,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update connection
   */
  static async updateConnection(
    connectionId: string,
    userId: string,
    data: UpdateConnectionData
  ): Promise<Connection> {
    // Verify ownership
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    if (connection.userId !== userId) {
      throw new ForbiddenError('Not authorized to update this connection');
    }

    // Update connection
    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data,
      include: {
        connectedUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            organization: true,
            department: true,
            role: true,
            bio: true,
            avatarUrl: true,
            linkedinUrl: true,
            websiteUrl: true,
            hideContactInfo: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete connection
   */
  static async deleteConnection(connectionId: string, userId: string): Promise<void> {
    // Verify ownership
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    if (connection.userId !== userId) {
      throw new ForbiddenError('Not authorized to delete this connection');
    }

    // Delete connection
    await prisma.connection.delete({
      where: { id: connectionId },
    });
  }

  /**
   * Export connections as CSV (for user)
   */
  static async exportConnections(userId: string): Promise<string> {
    const connections = await prisma.connection.findMany({
      where: { userId },
      include: {
        connectedUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Organization',
      'Department',
      'Role',
      'Collaborative Intents',
      'Notes',
      'Connected At',
      'Connection Method',
    ];

    const rows = connections.map(c => {
      const user = c.connectedUser;
      return [
        user.fullName || '',
        user.hideContactInfo ? '' : (user.email || ''),
        user.hideContactInfo ? '' : (user.phone || ''),
        user.organization || '',
        user.department || '',
        user.role || '',
        c.collaborativeIntents.join('; '),
        c.notes || '',
        c.createdAt.toISOString(),
        c.connectionMethod,
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Get connection by QR code data
   */
  static async getConnectionByQRCode(qrCodeData: string): Promise<{ userId: string } | null> {
    const qrCode = await prisma.qrCode.findFirst({
      where: {
        qrCodeData,
        isActive: true,
      },
    });

    if (!qrCode) {
      return null;
    }

    return { userId: qrCode.userId };
  }
}
