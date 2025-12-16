/**
 * Connection Service Unit Tests
 * Tests for connection creation, management, and recommendations
 */

import { ConnectionService } from '../../src/services/connection.service';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    connection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    qrCode: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('ConnectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConnection', () => {
    const validConnectionData = {
      userId: 'user-1',
      connectedUserId: 'user-2',
      collaborativeIntents: ['Research', 'Mentorship'],
      notes: 'Met at conference',
      connectionMethod: 'qr_scan' as const,
    };

    const mockConnectedUser = {
      id: 'user-2',
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      allowQrScanning: true,
    };

    it('should create connection successfully', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockConnectedUser);
      (prisma.connection.create as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        ...validConnectionData,
        connectedUser: mockConnectedUser,
      });
      (prisma.qrCode.update as jest.Mock).mockResolvedValue({});

      const result = await ConnectionService.createConnection(validConnectionData);

      expect(result.id).toBe('connection-1');
      expect(prisma.connection.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if connection already exists', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(ConnectionService.createConnection(validConnectionData)).rejects.toThrow(
        'Connection already exists'
      );
    });

    it('should throw ForbiddenError if connecting to self', async () => {
      const selfConnectionData = {
        ...validConnectionData,
        connectedUserId: 'user-1', // Same as userId
      };

      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ConnectionService.createConnection(selfConnectionData)).rejects.toThrow(
        'Cannot connect to yourself'
      );
    });

    it('should throw NotFoundError if connected user does not exist', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ConnectionService.createConnection(validConnectionData)).rejects.toThrow(
        'Connected user not found'
      );
    });

    it('should throw ForbiddenError if user has disabled QR scanning', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        ...mockConnectedUser,
        allowQrScanning: false,
      });

      await expect(ConnectionService.createConnection(validConnectionData)).rejects.toThrow(
        'User has disabled QR code scanning'
      );
    });

    it('should allow manual entry even if QR scanning is disabled', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        ...mockConnectedUser,
        allowQrScanning: false,
      });
      (prisma.connection.create as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        ...validConnectionData,
        connectionMethod: 'manual_entry',
        connectedUser: mockConnectedUser,
      });

      const result = await ConnectionService.createConnection({
        ...validConnectionData,
        connectionMethod: 'manual_entry',
      });

      expect(result.id).toBe('connection-1');
    });

    it('should increment QR code scan count for QR scan connections', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockConnectedUser);
      (prisma.connection.create as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        ...validConnectionData,
        connectedUser: mockConnectedUser,
      });
      (prisma.qrCode.update as jest.Mock).mockResolvedValue({});

      await ConnectionService.createConnection(validConnectionData);

      expect(prisma.qrCode.update).toHaveBeenCalledWith({
        where: { userId: 'user-2' },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getConnection', () => {
    it('should get connection by ID', async () => {
      const mockConnection = {
        id: 'connection-1',
        userId: 'user-1',
        connectedUserId: 'user-2',
        connectedUser: { fullName: 'Jane Smith' },
      };

      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(mockConnection);

      const result = await ConnectionService.getConnection('connection-1', 'user-1');

      expect(result.id).toBe('connection-1');
    });

    it('should throw NotFoundError if connection not found', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ConnectionService.getConnection('nonexistent', 'user-1')).rejects.toThrow(
        'Connection not found'
      );
    });

    it('should throw ForbiddenError if user does not own connection', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        userId: 'other-user',
      });

      await expect(ConnectionService.getConnection('connection-1', 'user-1')).rejects.toThrow(
        'Not authorized to view this connection'
      );
    });
  });

  describe('getConnections', () => {
    it('should get paginated connections', async () => {
      const mockConnections = [
        { id: 'connection-1', connectedUser: { fullName: 'Jane Smith' } },
        { id: 'connection-2', connectedUser: { fullName: 'John Doe' } },
      ];

      (prisma.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);
      (prisma.connection.count as jest.Mock).mockResolvedValue(2);

      const result = await ConnectionService.getConnections({
        userId: 'user-1',
        page: 1,
        limit: 20,
      });

      expect(result.connections).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by search term', async () => {
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.connection.count as jest.Mock).mockResolvedValue(0);

      await ConnectionService.getConnections({
        userId: 'user-1',
        search: 'Smith',
      });

      expect(prisma.connection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            connectedUser: {
              OR: [
                { fullName: { contains: 'Smith', mode: 'insensitive' } },
                { organization: { contains: 'Smith', mode: 'insensitive' } },
                { email: { contains: 'Smith', mode: 'insensitive' } },
              ],
            },
          }),
        })
      );
    });

    it('should filter by intent', async () => {
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.connection.count as jest.Mock).mockResolvedValue(0);

      await ConnectionService.getConnections({
        userId: 'user-1',
        intent: 'Research',
      });

      expect(prisma.connection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            collaborativeIntents: { has: 'Research' },
          }),
        })
      );
    });

    it('should sort by createdAt', async () => {
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.connection.count as jest.Mock).mockResolvedValue(0);

      await ConnectionService.getConnections({
        userId: 'user-1',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(prisma.connection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should sort by fullName', async () => {
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.connection.count as jest.Mock).mockResolvedValue(0);

      await ConnectionService.getConnections({
        userId: 'user-1',
        sortBy: 'fullName',
        sortOrder: 'asc',
      });

      expect(prisma.connection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { connectedUser: { fullName: 'asc' } },
        })
      );
    });
  });

  describe('updateConnection', () => {
    it('should update connection successfully', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        userId: 'user-1',
      });
      (prisma.connection.update as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        notes: 'Updated notes',
        connectedUser: { fullName: 'Jane Smith' },
      });

      const result = await ConnectionService.updateConnection('connection-1', 'user-1', {
        notes: 'Updated notes',
      });

      expect(result.notes).toBe('Updated notes');
    });

    it('should throw NotFoundError if connection not found', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ConnectionService.updateConnection('nonexistent', 'user-1', { notes: 'test' })
      ).rejects.toThrow('Connection not found');
    });

    it('should throw ForbiddenError if user does not own connection', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        userId: 'other-user',
      });

      await expect(
        ConnectionService.updateConnection('connection-1', 'user-1', { notes: 'test' })
      ).rejects.toThrow('Not authorized to update this connection');
    });
  });

  describe('deleteConnection', () => {
    it('should delete connection successfully', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        userId: 'user-1',
      });
      (prisma.connection.delete as jest.Mock).mockResolvedValue({});

      await ConnectionService.deleteConnection('connection-1', 'user-1');

      expect(prisma.connection.delete).toHaveBeenCalledWith({
        where: { id: 'connection-1' },
      });
    });

    it('should throw NotFoundError if connection not found', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ConnectionService.deleteConnection('nonexistent', 'user-1')).rejects.toThrow(
        'Connection not found'
      );
    });

    it('should throw ForbiddenError if user does not own connection', async () => {
      (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        userId: 'other-user',
      });

      await expect(ConnectionService.deleteConnection('connection-1', 'user-1')).rejects.toThrow(
        'Not authorized to delete this connection'
      );
    });
  });

  describe('exportConnections', () => {
    it('should export connections as CSV', async () => {
      const mockConnections = [
        {
          connectedUser: {
            fullName: 'Jane Smith',
            email: 'jane@example.com',
            phone: '555-0123',
            organization: 'NPS',
            department: 'CS',
            role: 'Student',
            hideContactInfo: false,
          },
          collaborativeIntents: ['Research', 'Mentorship'],
          notes: 'Great contact',
          createdAt: new Date('2024-03-15'),
          connectionMethod: 'qr_scan',
        },
      ];

      (prisma.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

      const result = await ConnectionService.exportConnections('user-1');

      expect(result).toContain('Name');
      expect(result).toContain('Email');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('jane@example.com');
    });

    it('should hide contact info when hideContactInfo is true', async () => {
      const mockConnections = [
        {
          connectedUser: {
            fullName: 'Jane Smith',
            email: 'jane@example.com',
            phone: '555-0123',
            organization: 'NPS',
            department: 'CS',
            role: 'Student',
            hideContactInfo: true,
          },
          collaborativeIntents: [],
          notes: '',
          createdAt: new Date('2024-03-15'),
          connectionMethod: 'qr_scan',
        },
      ];

      (prisma.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

      const result = await ConnectionService.exportConnections('user-1');

      expect(result).toContain('Jane Smith');
      expect(result).not.toContain('jane@example.com');
      expect(result).not.toContain('555-0123');
    });
  });

  describe('getConnectionByQRCode', () => {
    it('should get connection by QR code data', async () => {
      (prisma.qrCode.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-2',
        qrCodeData: 'qr-code-data',
        isActive: true,
      });

      const result = await ConnectionService.getConnectionByQRCode('qr-code-data');

      expect(result?.userId).toBe('user-2');
    });

    it('should return null if QR code not found', async () => {
      (prisma.qrCode.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await ConnectionService.getConnectionByQRCode('invalid-qr');

      expect(result).toBeNull();
    });
  });

  describe('getRecommendations', () => {
    const mockCurrentUser = {
      organization: 'NPS',
      department: 'CS',
      accelerationInterests: ['AI', 'ML'],
      userRoles: [{ role: 'student' }],
    };

    it('should get connection recommendations', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'user-2',
          fullName: 'Jane Smith',
          organization: 'NPS',
          department: 'CS',
          accelerationInterests: ['AI'],
          userRoles: [{ role: 'faculty' }],
        },
      ]);

      const result = await ConnectionService.getRecommendations('user-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].matchScore).toBeGreaterThan(0);
      expect(result[0].matchReasons.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ConnectionService.getRecommendations('nonexistent', 10)).rejects.toThrow(
        'User not found'
      );
    });

    it('should exclude already connected users', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([
        { connectedUserId: 'user-2' },
      ]);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);

      await ConnectionService.getRecommendations('user-1', 10);

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              notIn: ['user-2'],
            }),
          }),
        })
      );
    });

    it('should score recommendations based on shared attributes', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'user-2',
          fullName: 'Same Org and Dept',
          organization: 'NPS',
          department: 'CS',
          accelerationInterests: ['AI', 'ML'],
          userRoles: [],
        },
        {
          id: 'user-3',
          fullName: 'Different Everything',
          organization: 'Other',
          department: 'Other',
          accelerationInterests: ['Other'],
          userRoles: [],
        },
      ]);

      const result = await ConnectionService.getRecommendations('user-1', 10);

      // User with same org and dept should have higher score
      expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore);
    });
  });
});
