/**
 * Session Controller Unit Tests
 */

// Mock the database before importing anything else
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    rsvp: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $on: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock the sessionService
jest.mock('../../src/services/session.service');

import { Request, Response } from 'express';
import * as sessionController from '../../src/controllers/session.controller';
import * as sessionService from '../../src/services/session.service';

describe('Session Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

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
    };

    // Mock schema parsers
    (sessionService.sessionFiltersSchema as any) = {
      parse: jest.fn((data) => data),
    };
    (sessionService.createRsvpSchema as any) = {
      parse: jest.fn((data) => data),
    };
    (sessionService.updateRsvpSchema as any) = {
      parse: jest.fn((data) => data),
    };
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      mockReq.query = {};

      const mockSessions = [
        { id: 'session-1', title: 'AI Workshop' },
        { id: 'session-2', title: 'Cybersecurity 101' },
      ];

      (sessionService.listSessions as jest.Mock).mockResolvedValue(mockSessions);

      await sessionController.listSessions(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSessions,
        count: 2,
      });
    });

    it('should filter sessions', async () => {
      mockReq.query = { track: 'AI/ML', status: 'scheduled' };

      (sessionService.listSessions as jest.Mock).mockResolvedValue([]);

      await sessionController.listSessions(mockReq as Request, mockRes as Response);

      expect(sessionService.sessionFiltersSchema.parse).toHaveBeenCalledWith(mockReq.query);
    });

    it('should return 400 for invalid filters', async () => {
      mockReq.query = {};

      (sessionService.sessionFiltersSchema.parse as jest.Mock).mockImplementation(() => {
        const error: any = new Error('Validation error');
        error.name = 'ZodError';
        error.errors = [{ message: 'Invalid filter' }];
        throw error;
      });

      await sessionController.listSessions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid filters',
        })
      );
    });

    it('should return 500 for service errors', async () => {
      mockReq.query = {};

      (sessionService.listSessions as jest.Mock).mockRejectedValue(new Error('Database error'));

      await sessionController.listSessions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch sessions',
      });
    });
  });

  describe('getSession', () => {
    it('should get session by ID', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;

      const mockSession = {
        id: 'session-1',
        title: 'AI Workshop',
        attendeeCount: 10,
      };

      (sessionService.getSessionById as jest.Mock).mockResolvedValue(mockSession);

      await sessionController.getSession(mockReq as Request, mockRes as Response);

      expect(sessionService.getSessionById).toHaveBeenCalledWith('session-1', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSession,
      });
    });

    it('should get session without user', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = undefined;

      (sessionService.getSessionById as jest.Mock).mockResolvedValue({ id: 'session-1' });

      await sessionController.getSession(mockReq as Request, mockRes as Response);

      expect(sessionService.getSessionById).toHaveBeenCalledWith('session-1', undefined);
    });

    it('should return 404 if session not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      (sessionService.getSessionById as jest.Mock).mockRejectedValue(new Error('Session not found'));

      await sessionController.getSession(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session not found',
      });
    });

    it('should return 500 for service errors', async () => {
      mockReq.params = { id: 'session-1' };

      (sessionService.getSessionById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await sessionController.getSession(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createRsvp', () => {
    it('should create RSVP successfully', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'confirmed' };

      const mockRsvp = {
        id: 'rsvp-1',
        userId: 'user-123',
        sessionId: 'session-1',
        status: 'confirmed',
      };

      (sessionService.createRsvp as jest.Mock).mockResolvedValue(mockRsvp);

      await sessionController.createRsvp(mockReq as Request, mockRes as Response);

      expect(sessionService.createRsvp).toHaveBeenCalledWith('user-123', {
        sessionId: 'session-1',
        status: 'confirmed',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRsvp,
        message: 'RSVP created successfully',
      });
    });

    it('should return 400 for invalid RSVP data', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.createRsvpSchema.parse as jest.Mock).mockImplementation(() => {
        const error: any = new Error('Validation error');
        error.name = 'ZodError';
        error.errors = [{ message: 'Invalid status' }];
        throw error;
      });

      await sessionController.createRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid RSVP data',
        })
      );
    });

    it('should return 400 if session not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'confirmed' };

      (sessionService.createRsvp as jest.Mock).mockRejectedValue(new Error('Session not found'));

      await sessionController.createRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if RSVP already exists', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'confirmed' };

      (sessionService.createRsvp as jest.Mock).mockRejectedValue(
        new Error('RSVP already exists for this session')
      );

      await sessionController.createRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 409 for capacity conflicts', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'confirmed' };

      (sessionService.createRsvp as jest.Mock).mockRejectedValue(
        new Error('Session is at full capacity')
      );

      await sessionController.createRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should return 409 for schedule conflicts', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'confirmed' };

      (sessionService.createRsvp as jest.Mock).mockRejectedValue(
        new Error('Schedule conflict with: Other Session')
      );

      await sessionController.createRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should return 500 for service errors', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'confirmed' };

      (sessionService.createRsvp as jest.Mock).mockRejectedValue(new Error('Database error'));

      await sessionController.createRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateRsvp', () => {
    it('should update RSVP successfully', async () => {
      mockReq.params = { id: 'rsvp-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'cancelled' };

      const updatedRsvp = {
        id: 'rsvp-1',
        status: 'cancelled',
      };

      (sessionService.updateRsvp as jest.Mock).mockResolvedValue(updatedRsvp);

      await sessionController.updateRsvp(mockReq as Request, mockRes as Response);

      expect(sessionService.updateRsvp).toHaveBeenCalledWith('user-123', 'rsvp-1', { status: 'cancelled' });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedRsvp,
        message: 'RSVP updated successfully',
      });
    });

    it('should return 400 for invalid data', async () => {
      mockReq.params = { id: 'rsvp-1' };
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.updateRsvpSchema.parse as jest.Mock).mockImplementation(() => {
        const error: any = new Error('Validation error');
        error.name = 'ZodError';
        error.errors = [];
        throw error;
      });

      await sessionController.updateRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if RSVP not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'cancelled' };

      (sessionService.updateRsvp as jest.Mock).mockRejectedValue(new Error('RSVP not found'));

      await sessionController.updateRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      mockReq.params = { id: 'rsvp-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'cancelled' };

      (sessionService.updateRsvp as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to update this RSVP')
      );

      await sessionController.updateRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 409 for conflicts', async () => {
      mockReq.params = { id: 'rsvp-1' };
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { status: 'confirmed' };

      (sessionService.updateRsvp as jest.Mock).mockRejectedValue(
        new Error('Session is at full capacity')
      );

      await sessionController.updateRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });

  describe('deleteRsvp', () => {
    it('should delete RSVP successfully', async () => {
      mockReq.params = { id: 'rsvp-1' };
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.deleteRsvp as jest.Mock).mockResolvedValue({ success: true });

      await sessionController.deleteRsvp(mockReq as Request, mockRes as Response);

      expect(sessionService.deleteRsvp).toHaveBeenCalledWith('user-123', 'rsvp-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'RSVP deleted successfully',
      });
    });

    it('should return 404 if RSVP not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.deleteRsvp as jest.Mock).mockRejectedValue(new Error('RSVP not found'));

      await sessionController.deleteRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      mockReq.params = { id: 'rsvp-1' };
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.deleteRsvp as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to delete this RSVP')
      );

      await sessionController.deleteRsvp(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getMyRsvps', () => {
    it('should get user RSVPs', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.query = { status: 'confirmed', upcoming: 'true' };

      const mockRsvps = [
        { id: 'rsvp-1', session: { title: 'Session 1' } },
        { id: 'rsvp-2', session: { title: 'Session 2' } },
      ];

      (sessionService.getUserRsvps as jest.Mock).mockResolvedValue(mockRsvps);

      await sessionController.getMyRsvps(mockReq as Request, mockRes as Response);

      expect(sessionService.getUserRsvps).toHaveBeenCalledWith('user-123', {
        status: 'confirmed',
        upcoming: true,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRsvps,
        count: 2,
      });
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.query = {};

      (sessionService.getUserRsvps as jest.Mock).mockRejectedValue(new Error('Database error'));

      await sessionController.getMyRsvps(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAttendees', () => {
    it('should get session attendees for admin', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123', roles: ['admin'] } as any;

      const mockAttendees = [
        { id: 'rsvp-1', user: { fullName: 'User 1' } },
        { id: 'rsvp-2', user: { fullName: 'User 2' } },
      ];

      (sessionService.getSessionAttendees as jest.Mock).mockResolvedValue(mockAttendees);

      await sessionController.getAttendees(mockReq as Request, mockRes as Response);

      expect(sessionService.getSessionAttendees).toHaveBeenCalledWith('session-1', 'admin');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAttendees,
        count: 2,
      });
    });

    it('should return 403 for unauthorized role', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;

      (sessionService.getSessionAttendees as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to view attendee list')
      );

      await sessionController.getAttendees(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getMySchedule', () => {
    it('should get user schedule', async () => {
      mockReq.user = { id: 'user-123' } as any;

      const mockSchedule = [
        { id: 'rsvp-1', session: { title: 'Session 1', startTime: new Date() } },
      ];

      (sessionService.getUserRsvps as jest.Mock).mockResolvedValue(mockSchedule);

      await sessionController.getMySchedule(mockReq as Request, mockRes as Response);

      expect(sessionService.getUserRsvps).toHaveBeenCalledWith('user-123', {
        status: 'confirmed',
        upcoming: true,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSchedule,
        count: 1,
      });
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.getUserRsvps as jest.Mock).mockRejectedValue(new Error('Database error'));

      await sessionController.getMySchedule(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('checkConflicts', () => {
    it('should check schedule conflicts', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;

      const conflictResult = {
        hasConflicts: false,
        conflicts: [],
      };

      (sessionService.checkScheduleConflicts as jest.Mock).mockResolvedValue(conflictResult);

      await sessionController.checkConflicts(mockReq as Request, mockRes as Response);

      expect(sessionService.checkScheduleConflicts).toHaveBeenCalledWith('user-123', 'session-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: conflictResult,
      });
    });

    it('should return conflicts when found', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;

      const conflictResult = {
        hasConflicts: true,
        conflicts: [{ id: 'conflict-session', title: 'Conflicting Session' }],
      };

      (sessionService.checkScheduleConflicts as jest.Mock).mockResolvedValue(conflictResult);

      await sessionController.checkConflicts(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: conflictResult,
      });
    });

    it('should return 404 if session not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.checkScheduleConflicts as jest.Mock).mockRejectedValue(
        new Error('Session not found')
      );

      await sessionController.checkConflicts(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 for service errors', async () => {
      mockReq.params = { id: 'session-1' };
      mockReq.user = { id: 'user-123' } as any;

      (sessionService.checkScheduleConflicts as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await sessionController.checkConflicts(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
