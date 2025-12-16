/**
 * Connection Controller Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionController } from '../../src/controllers/connection.controller';
import { ConnectionService } from '../../src/services/connection.service';
import prisma from '../../src/config/database';

// Cast prisma to any for mock methods
const prismaMock = prisma as any;

// Mock the ConnectionService
jest.mock('../../src/services/connection.service');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ConnectionController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('qrScan', () => {
    it('should create connection via QR scan', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = {
        qrCodeData: 'QR123ABC',
        collaborativeIntents: ['research', 'mentorship'],
        notes: 'Met at conference',
      };

      (ConnectionService.getConnectionByQRCode as jest.Mock).mockResolvedValue({
        userId: 'user-456',
      });

      const mockConnection = {
        id: 'conn-1',
        userId: '11111111-1111-1111-1111-111111111111',
        connectedUserId: '22222222-2222-2222-2222-222222222222',
        connectedUser: {
          id: '22222222-2222-2222-2222-222222222222',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      // Mock Prisma calls for bidirectional creation
      prismaMock.connection.create
        .mockResolvedValueOnce(mockConnection)
        .mockResolvedValueOnce({ id: 'conn-2' });
      
      prismaMock.qrCode.update.mockResolvedValue({});

      await ConnectionController.qrScan(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ConnectionService.getConnectionByQRCode).toHaveBeenCalledWith('QR123ABC');
      expect(prismaMock.connection.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.qrCode.update).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: expect.any(Date),
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Connection created successfully',
        connection: mockConnection,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.qrScan(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 if QR code not found', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = {
        qrCodeData: 'INVALID_QR',
        collaborativeIntents: [],
      };

      (ConnectionService.getConnectionByQRCode as jest.Mock).mockResolvedValue(null);

      await ConnectionController.qrScan(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_QR_CODE' }),
        })
      );
    });

    it('should pass errors to next', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = {
        qrCodeData: 'QR123ABC',
        collaborativeIntents: [],
      };

      (ConnectionService.getConnectionByQRCode as jest.Mock).mockResolvedValue({
        userId: 'user-456',
      });

      const error = new Error('Connection error');
      prismaMock.connection.create.mockRejectedValue(error);

      await ConnectionController.qrScan(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('manualEntry', () => {
    it('should create connection via manual entry', async () => {
      mockReq.user = { id: '11111111-1111-1111-1111-111111111111' } as any;
      mockReq.body = {
        connectedUserId: '22222222-2222-2222-2222-222222222222',
        collaborativeIntents: ['networking'],
        notes: 'Met at event',
        connectionMethod: 'manual_entry',
      };

      const mockConnection = {
        id: 'conn-1',
        userId: 'user-123',
        connectedUserId: 'user-456',
        connectedUser: {
          id: 'user-456',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      // Mock Prisma calls for bidirectional creation
      prismaMock.connection.create
        .mockResolvedValueOnce(mockConnection)
        .mockResolvedValueOnce({ id: 'conn-2' });

      await ConnectionController.manualEntry(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(prismaMock.connection.create).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Connection created successfully',
        connection: mockConnection,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.manualEntry(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('manualCodeLookup', () => {
    it('should return profile for a valid manual code (public profile)', async () => {
      mockReq.user = { id: '11111111-1111-1111-1111-111111111111' } as any;
      mockReq.body = { code: 'A7F3D9C2' };

      prismaMock.$queryRaw.mockResolvedValue([{ id: '22222222-2222-2222-2222-222222222222' }]);
      prismaMock.profile.findUnique.mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        organization: 'Org',
        department: null,
        role: 'Attendee',
        bio: null,
        avatarUrl: null,
        linkedinUrl: null,
        websiteUrl: null,
        hideContactInfo: false,
        profileVisibility: 'public',
      });

      await ConnectionController.manualCodeLookup(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prismaMock.profile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '22222222-2222-2222-2222-222222222222' },
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        profile: expect.objectContaining({
          id: '22222222-2222-2222-2222-222222222222',
          fullName: 'Jane Doe',
        }),
      });
    });

    it('should return 404 if no user found for manual code', async () => {
      mockReq.user = { id: '11111111-1111-1111-1111-111111111111' } as any;
      mockReq.body = { code: 'NOPE' };

      prismaMock.$queryRaw.mockResolvedValue([]);

      await ConnectionController.manualCodeLookup(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_MANUAL_CODE' }),
        })
      );
    });

    it('should return limited profile for private profile (non-self requester)', async () => {
      mockReq.user = { id: '11111111-1111-1111-1111-111111111111' } as any;
      mockReq.body = { code: 'A7F3D9C2' };

      prismaMock.$queryRaw.mockResolvedValue([{ id: '22222222-2222-2222-2222-222222222222' }]);
      prismaMock.profile.findUnique.mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        organization: 'Org',
        department: null,
        role: 'Attendee',
        bio: null,
        avatarUrl: null,
        linkedinUrl: null,
        websiteUrl: null,
        hideContactInfo: false,
        profileVisibility: 'private',
      });

      await ConnectionController.manualCodeLookup(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        profile: expect.objectContaining({
          id: '22222222-2222-2222-2222-222222222222',
          profileVisibility: 'private',
          fullName: null,
          email: null,
        }),
      });
    });
  });

  describe('createByUserId', () => {
    it('should create connection by user ID', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { connectedUserId: 'user-456' };

      const mockConnection = {
        id: 'conn-1',
        userId: 'user-123',
        connectedUserId: 'user-456',
        connectedUser: {
          id: 'user-456',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      // Mock Prisma calls for bidirectional creation
      prismaMock.connection.create
        .mockResolvedValueOnce(mockConnection)
        .mockResolvedValueOnce({ id: 'conn-2' });

      await ConnectionController.createByUserId(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(prismaMock.connection.create).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Connection created successfully',
        connection: mockConnection,
      });
    });

    it('should return 400 if connectedUserId missing', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = {};

      await ConnectionController.createByUserId(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
        })
      );
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.createByUserId(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getConnections', () => {
    it('should get all connections', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.query = {};

      const mockResult = {
        connections: [{ id: 'conn-1' }],
        total: 1,
        page: 1,
      };
      (ConnectionService.getConnections as jest.Mock).mockResolvedValue(mockResult);

      await ConnectionController.getConnections(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.getConnections(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getConnection', () => {
    it('should get connection by ID', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conn-1' };

      const mockConnection = { id: 'conn-1', userId: 'user-123' };
      (ConnectionService.getConnection as jest.Mock).mockResolvedValue(mockConnection);

      await ConnectionController.getConnection(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ConnectionService.getConnection).toHaveBeenCalledWith('conn-1', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ connection: mockConnection });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'conn-1' };

      await ConnectionController.getConnection(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('updateConnection', () => {
    it('should update connection', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conn-1' };
      mockReq.body = { notes: 'Updated notes' };

      const updatedConnection = {
        id: 'conn-1',
        notes: 'Updated notes',
      };
      (ConnectionService.updateConnection as jest.Mock).mockResolvedValue(updatedConnection);

      await ConnectionController.updateConnection(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ConnectionService.updateConnection).toHaveBeenCalledWith('conn-1', 'user-123', { notes: 'Updated notes' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Connection updated successfully',
        connection: updatedConnection,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.updateConnection(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('deleteConnection', () => {
    it('should delete connection', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conn-1' };

      prismaMock.connection.findUnique.mockResolvedValue({
        id: 'conn-1',
        userId: 'user-123',
        connectedUserId: 'user-456',
      });
      prismaMock.connection.delete.mockResolvedValue({});
      prismaMock.connection.deleteMany.mockResolvedValue({ count: 1 });

      await ConnectionController.deleteConnection(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(prismaMock.connection.findUnique).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
      });
      expect(prismaMock.connection.delete).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
      });
      expect(prismaMock.connection.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-456', connectedUserId: 'user-123' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Connection deleted successfully',
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.deleteConnection(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('exportConnections', () => {
    it('should export connections as CSV', async () => {
      mockReq.user = { id: 'user-123' } as any;

      const csvData = 'name,email\nJohn,john@example.com';
      (ConnectionService.exportConnections as jest.Mock).mockResolvedValue(csvData);

      await ConnectionController.exportConnections(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ConnectionService.exportConnections).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalledWith(csvData);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.exportConnections(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getRecommendations', () => {
    it('should get connection recommendations', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.query = { limit: '5' };

      const mockRecommendations = [
        { id: 'user-456', fullName: 'Recommended User' },
      ];
      (ConnectionService.getRecommendations as jest.Mock).mockResolvedValue(mockRecommendations);

      await ConnectionController.getRecommendations(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ConnectionService.getRecommendations).toHaveBeenCalledWith('user-123', 5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockRecommendations,
      });
    });

    it('should use default limit of 10', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.query = {};

      (ConnectionService.getRecommendations as jest.Mock).mockResolvedValue([]);

      await ConnectionController.getRecommendations(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ConnectionService.getRecommendations).toHaveBeenCalledWith('user-123', 10);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ConnectionController.getRecommendations(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
