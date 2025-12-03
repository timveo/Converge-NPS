import request from 'supertest';
import { createApp } from '../../src/app';
import * as adminService from '../../src/services/admin.service';

// Mock the admin service
jest.mock('../../src/services/admin.service');
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
}));

const app = createApp();

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/admin/sessions', () => {
    it('should create session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'AI Workshop',
        description: 'Test description',
        speaker: 'Dr. Smith',
        startTime: new Date('2026-01-28T10:00:00Z'),
        endTime: new Date('2026-01-28T11:00:00Z'),
        location: 'Room 101',
        track: 'AI/ML',
        capacity: 50,
        status: 'scheduled',
      };

      (adminService.createSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .send({
          title: 'AI Workshop',
          description: 'Test description',
          speaker: 'Dr. Smith',
          startTime: '2026-01-28T10:00:00Z',
          endTime: '2026-01-28T11:00:00Z',
          location: 'Room 101',
          track: 'AI/ML',
          capacity: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('AI Workshop');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .send({
          title: 'AI', // Too short
          description: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 409 for scheduling conflict', async () => {
      (adminService.createSession as jest.Mock).mockRejectedValue(
        new Error('Location conflict: Room 101 is already booked during this time')
      );

      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .send({
          title: 'AI Workshop',
          description: 'Test description with enough length',
          speaker: 'Dr. Smith',
          startTime: '2026-01-28T10:00:00Z',
          endTime: '2026-01-28T11:00:00Z',
          location: 'Room 101',
          track: 'AI/ML',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('conflict');
    });
  });

  describe('PATCH /api/v1/admin/sessions/:id', () => {
    it('should update session successfully', async () => {
      const updatedSession = {
        id: 'session-1',
        title: 'Updated Title',
      };

      (adminService.updateSession as jest.Mock).mockResolvedValue(updatedSession);

      const response = await request(app)
        .patch('/api/v1/admin/sessions/session-1')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('should return 404 if session not found', async () => {
      (adminService.updateSession as jest.Mock).mockRejectedValue(
        new Error('Session not found')
      );

      const response = await request(app)
        .patch('/api/v1/admin/sessions/non-existent')
        .send({ title: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/admin/sessions/:id', () => {
    it('should delete session successfully', async () => {
      (adminService.deleteSession as jest.Mock).mockResolvedValue({ deleted: true });

      const response = await request(app).delete('/api/v1/admin/sessions/session-1');

      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);
    });

    it('should cancel session if it has RSVPs', async () => {
      (adminService.deleteSession as jest.Mock).mockResolvedValue({
        cancelled: true,
        session: { id: 'session-1', status: 'cancelled' },
      });

      const response = await request(app).delete('/api/v1/admin/sessions/session-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('cancelled');
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return paginated users', async () => {
      const mockResult = {
        users: [
          { id: 'user-1', fullName: 'Alice', email: 'alice@test.com' },
          { id: 'user-2', fullName: 'Bob', email: 'bob@test.com' },
        ],
        total: 2,
      };

      (adminService.listUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/admin/users?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by role', async () => {
      const mockResult = {
        users: [{ id: 'user-1', fullName: 'Alice', role: 'student' }],
        total: 1,
      };

      (adminService.listUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/admin/users?role=student');

      expect(response.status).toBe(200);
      expect(response.body.data[0].role).toBe('student');
    });
  });

  describe('PATCH /api/v1/admin/users/:id/role', () => {
    it('should update user role successfully', async () => {
      const updatedUser = {
        id: 'user-1',
        fullName: 'Alice',
        email: 'alice@test.com',
        role: 'staff',
      };

      (adminService.updateUserRole as jest.Mock).mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/api/v1/admin/users/user-1/role')
        .send({ role: 'staff' });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('staff');
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .patch('/api/v1/admin/users/user-1/role')
        .send({ role: 'invalid_role' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/admin/users/:id/suspend', () => {
    it('should suspend user successfully', async () => {
      (adminService.suspendUser as jest.Mock).mockResolvedValue({
        suspended: true,
        user: { id: 'user-1' },
      });

      const response = await request(app)
        .post('/api/v1/admin/users/user-1/suspend')
        .send({ reason: 'Violating terms' });

      expect(response.status).toBe(200);
      expect(response.body.data.suspended).toBe(true);
    });

    it('should return 400 if reason is missing', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users/user-1/suspend')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('reason required');
    });

    it('should return 403 for admin users', async () => {
      (adminService.suspendUser as jest.Mock).mockRejectedValue(
        new Error('Cannot suspend admin users')
      );

      const response = await request(app)
        .post('/api/v1/admin/users/admin-1/suspend')
        .send({ reason: 'Test' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        overview: {
          totalUsers: 100,
          totalSessions: 10,
          totalConnections: 50,
          totalMessages: 200,
          totalProjects: 15,
        },
        usersByRole: [
          { role: 'student', count: 70 },
          { role: 'faculty', count: 20 },
        ],
        sessionsByTrack: [
          { track: 'AI/ML', count: 5 },
          { track: 'Cybersecurity', count: 5 },
        ],
      };

      (adminService.getDashboardStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app).get('/api/v1/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.overview.totalUsers).toBe(100);
      expect(response.body.data.usersByRole).toHaveLength(2);
    });
  });

  describe('GET /api/v1/admin/stats/rsvps', () => {
    it('should return RSVP statistics', async () => {
      const mockStats = {
        bySession: [
          {
            sessionId: 'session-1',
            sessionTitle: 'AI Workshop',
            capacity: 50,
            attending: 40,
            fillRate: 80,
          },
        ],
        byStatus: [
          { status: 'attending', count: 60 },
          { status: 'maybe', count: 10 },
        ],
      };

      (adminService.getRsvpStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app).get('/api/v1/admin/stats/rsvps');

      expect(response.status).toBe(200);
      expect(response.body.data.bySession).toHaveLength(1);
      expect(response.body.data.byStatus).toHaveLength(2);
    });
  });

  describe('GET /api/v1/admin/stats/activity', () => {
    it('should return activity report with default 7 days', async () => {
      const mockReport = {
        period: '7 days',
        since: new Date().toISOString(),
        activity: {
          newUsers: 10,
          newConnections: 20,
          newMessages: 50,
          newRsvps: 30,
          newProjects: 5,
        },
      };

      (adminService.getActivityReport as jest.Mock).mockResolvedValue(mockReport);

      const response = await request(app).get('/api/v1/admin/stats/activity');

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe('7 days');
      expect(response.body.data.activity.newUsers).toBe(10);
    });

    it('should accept custom days parameter', async () => {
      const mockReport = {
        period: '30 days',
        activity: { newUsers: 50 },
      };

      (adminService.getActivityReport as jest.Mock).mockResolvedValue(mockReport);

      const response = await request(app).get('/api/v1/admin/stats/activity?days=30');

      expect(response.status).toBe(200);
      expect(adminService.getActivityReport).toHaveBeenCalledWith(30);
    });
  });
});
