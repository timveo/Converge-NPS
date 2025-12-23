/**
 * Staff Controller Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import * as staffController from '../../src/controllers/staff.controller';
import * as staffService from '../../src/services/staff.service';

// Mock the staff service
jest.mock('../../src/services/staff.service');

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

describe('StaffController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      user: { id: 'staff-123', email: 'staff@example.com', roles: ['staff'] },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('checkInAttendee', () => {
    const validUserId = '550e8400-e29b-41d4-a716-446655440000';

    it('should check in an attendee successfully', async () => {
      mockReq.body = { userId: validUserId };

      const mockResult = {
        id: validUserId,
        fullName: 'John Doe',
        email: 'john@example.com',
        organization: 'NPS',
        isCheckedIn: true,
        isWalkIn: false,
        userRoles: [{ role: 'student' }],
      };

      (staffService.checkInAttendee as jest.Mock).mockResolvedValue(mockResult);

      await staffController.checkInAttendee(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(staffService.checkInAttendee).toHaveBeenCalledWith('staff-123', validUserId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Attendee checked in successfully',
        data: mockResult,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = { userId: 'user-456' };

      await staffController.checkInAttendee(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    });

    it('should return 400 for invalid userId', async () => {
      mockReq.body = { userId: 'not-a-uuid' };

      await staffController.checkInAttendee(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should pass service errors to next', async () => {
      mockReq.body = { userId: '550e8400-e29b-41d4-a716-446655440000' };

      const error = new Error('User not found');
      (staffService.checkInAttendee as jest.Mock).mockRejectedValue(error);

      await staffController.checkInAttendee(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCheckInStats', () => {
    it('should return check-in stats', async () => {
      const mockStats = {
        totalRegistered: 100,
        checkedIn: 75,
        walkIns: 10,
      };

      (staffService.getCheckInStats as jest.Mock).mockResolvedValue(mockStats);

      await staffController.getCheckInStats(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(staffService.getCheckInStats).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await staffController.getCheckInStats(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should pass errors to next', async () => {
      const error = new Error('Database error');
      (staffService.getCheckInStats as jest.Mock).mockRejectedValue(error);

      await staffController.getCheckInStats(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getRecentCheckIns', () => {
    it('should return recent check-ins', async () => {
      const mockRecentCheckIns = [
        { id: '1', name: 'John Doe', organization: 'NPS', checkedInAt: new Date() },
        { id: '2', name: 'Jane Smith', organization: 'Navy', checkedInAt: new Date() },
      ];

      (staffService.getRecentCheckIns as jest.Mock).mockResolvedValue(mockRecentCheckIns);

      await staffController.getRecentCheckIns(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(staffService.getRecentCheckIns).toHaveBeenCalledWith(50);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ data: mockRecentCheckIns });
    });

    it('should respect limit query parameter', async () => {
      mockReq.query = { limit: '10' };

      (staffService.getRecentCheckIns as jest.Mock).mockResolvedValue([]);

      await staffController.getRecentCheckIns(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(staffService.getRecentCheckIns).toHaveBeenCalledWith(10);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await staffController.getRecentCheckIns(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('searchAttendees', () => {
    it('should search for attendees', async () => {
      mockReq.query = { q: 'john' };

      const mockResults = [
        { id: '1', fullName: 'John Doe', email: 'john@example.com' },
      ];

      (staffService.searchAttendees as jest.Mock).mockResolvedValue(mockResults);

      await staffController.searchAttendees(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(staffService.searchAttendees).toHaveBeenCalledWith('john', 10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ data: mockResults });
    });

    it('should return 400 if query is too short', async () => {
      mockReq.query = { q: 'a' };

      await staffController.searchAttendees(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query must be at least 2 characters',
        },
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.query = { q: 'john' };

      await staffController.searchAttendees(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('registerWalkIn', () => {
    const validWalkInData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      organization: 'DARPA',
      participantType: 'industry',
    };

    it('should register a walk-in attendee successfully', async () => {
      mockReq.body = validWalkInData;

      const mockResult = {
        id: 'new-user-123',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        organization: 'DARPA',
        createdAt: new Date(),
      };

      (staffService.registerWalkIn as jest.Mock).mockResolvedValue(mockResult);

      await staffController.registerWalkIn(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(staffService.registerWalkIn).toHaveBeenCalledWith('staff-123', validWalkInData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Walk-in attendee registered and checked in successfully',
        data: mockResult,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = validWalkInData;

      await staffController.registerWalkIn(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = {
        firstName: 'Jane',
        // missing other required fields
      };

      await staffController.registerWalkIn(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should return 400 for invalid email', async () => {
      mockReq.body = {
        ...validWalkInData,
        email: 'not-an-email',
      };

      await staffController.registerWalkIn(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid participant type', async () => {
      mockReq.body = {
        ...validWalkInData,
        participantType: 'invalid-type',
      };

      await staffController.registerWalkIn(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should pass service errors to next', async () => {
      mockReq.body = validWalkInData;

      const error = new Error('Email already exists');
      (staffService.registerWalkIn as jest.Mock).mockRejectedValue(error);

      await staffController.registerWalkIn(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
