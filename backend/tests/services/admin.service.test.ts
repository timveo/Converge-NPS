import { PrismaClient } from '@prisma/client';
import * as adminService from '../../src/services/admin.service';

// Mock Prisma
const prisma = new PrismaClient();

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'AI/ML Workshop',
        description: 'Introduction to machine learning',
        speaker: 'Dr. Smith',
        startTime: new Date('2026-01-28T10:00:00Z'),
        endTime: new Date('2026-01-28T11:00:00Z'),
        location: 'Room 101',
        track: 'AI/ML',
        capacity: 50,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.sessions.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await adminService.createSession({
        title: 'AI/ML Workshop',
        description: 'Introduction to machine learning',
        speaker: 'Dr. Smith',
        startTime: '2026-01-28T10:00:00Z',
        endTime: '2026-01-28T11:00:00Z',
        location: 'Room 101',
        track: 'AI/ML',
        capacity: 50,
      });

      expect(result).toEqual(mockSession);
      expect(prisma.sessions.create).toHaveBeenCalled();
    });

    it('should throw error if end time is before start time', async () => {
      await expect(
        adminService.createSession({
          title: 'Test Session',
          description: 'Test description',
          speaker: 'Test Speaker',
          startTime: '2026-01-28T11:00:00Z',
          endTime: '2026-01-28T10:00:00Z', // Before start time
          location: 'Room 101',
          track: 'AI/ML',
        })
      ).rejects.toThrow('End time must be after start time');
    });

    it('should throw error on location conflict', async () => {
      const conflictingSession = {
        id: 'existing-session',
        startTime: new Date('2026-01-28T09:30:00Z'),
        endTime: new Date('2026-01-28T10:30:00Z'),
      };

      (prisma.sessions.findMany as jest.Mock).mockResolvedValue([conflictingSession]);

      await expect(
        adminService.createSession({
          title: 'Test Session',
          description: 'Test description',
          speaker: 'Test Speaker',
          startTime: '2026-01-28T10:00:00Z',
          endTime: '2026-01-28T11:00:00Z',
          location: 'Room 101',
          track: 'AI/ML',
        })
      ).rejects.toThrow('Location conflict');
    });
  });

  describe('updateSession', () => {
    it('should update a session successfully', async () => {
      const existingSession = {
        id: 'session-1',
        startTime: new Date('2026-01-28T10:00:00Z'),
        endTime: new Date('2026-01-28T11:00:00Z'),
        location: 'Room 101',
      };

      const updatedSession = {
        ...existingSession,
        title: 'Updated Title',
      };

      (prisma.sessions.findUnique as jest.Mock).mockResolvedValue(existingSession);
      (prisma.sessions.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sessions.update as jest.Mock).mockResolvedValue(updatedSession);

      const result = await adminService.updateSession('session-1', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      expect(prisma.sessions.update).toHaveBeenCalled();
    });

    it('should throw error if session not found', async () => {
      (prisma.sessions.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        adminService.updateSession('non-existent', { title: 'Test' })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should cancel session if it has RSVPs', async () => {
      const sessionWithRsvps = {
        id: 'session-1',
        _count: { rsvps: 5 },
      };

      (prisma.sessions.findUnique as jest.Mock).mockResolvedValue(sessionWithRsvps);
      (prisma.sessions.update as jest.Mock).mockResolvedValue({
        ...sessionWithRsvps,
        status: 'cancelled',
      });

      const result = await adminService.deleteSession('session-1');

      expect(result.cancelled).toBe(true);
      expect(prisma.sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'cancelled' },
      });
    });

    it('should delete session if it has no RSVPs', async () => {
      const sessionWithoutRsvps = {
        id: 'session-1',
        _count: { rsvps: 0 },
      };

      (prisma.sessions.findUnique as jest.Mock).mockResolvedValue(sessionWithoutRsvps);
      (prisma.sessions.delete as jest.Mock).mockResolvedValue(sessionWithoutRsvps);

      const result = await adminService.deleteSession('session-1');

      expect(result.deleted).toBe(true);
      expect(prisma.sessions.delete).toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 'user-1', fullName: 'Alice', email: 'alice@test.com', role: 'student' },
        { id: 'user-2', fullName: 'Bob', email: 'bob@test.com', role: 'faculty' },
      ];

      (prisma.profiles.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.profiles.count as jest.Mock).mockResolvedValue(2);

      const result = await adminService.listUsers({ limit: 10, offset: 0 });

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(2);
    });

    it('should filter users by role', async () => {
      const studentUsers = [
        { id: 'user-1', fullName: 'Alice', email: 'alice@test.com', role: 'student' },
      ];

      (prisma.profiles.findMany as jest.Mock).mockResolvedValue(studentUsers);
      (prisma.profiles.count as jest.Mock).mockResolvedValue(1);

      const result = await adminService.listUsers({ role: 'student' });

      expect(result.users).toEqual(studentUsers);
      expect(prisma.profiles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'student' },
        })
      );
    });

    it('should filter users by search query', async () => {
      const searchResults = [
        { id: 'user-1', fullName: 'Alice Johnson', email: 'alice@test.com' },
      ];

      (prisma.profiles.findMany as jest.Mock).mockResolvedValue(searchResults);
      (prisma.profiles.count as jest.Mock).mockResolvedValue(1);

      const result = await adminService.listUsers({ search: 'Alice' });

      expect(result.users).toEqual(searchResults);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const user = {
        id: 'user-1',
        fullName: 'Alice',
        email: 'alice@test.com',
        role: 'student',
      };

      (prisma.profiles.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.profiles.update as jest.Mock).mockResolvedValue({
        ...user,
        role: 'staff',
      });

      const result = await adminService.updateUserRole('user-1', { role: 'staff' });

      expect(result.role).toBe('staff');
      expect(prisma.profiles.update).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (prisma.profiles.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        adminService.updateUserRole('non-existent', { role: 'staff' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('suspendUser', () => {
    it('should suspend user successfully', async () => {
      const user = {
        id: 'user-1',
        role: 'student',
      };

      (prisma.profiles.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.profiles.update as jest.Mock).mockResolvedValue({
        ...user,
        profileVisibility: 'private',
        allowQrScanning: false,
        allowMessaging: false,
      });

      const result = await adminService.suspendUser('user-1', 'Violating terms');

      expect(result.suspended).toBe(true);
      expect(prisma.profiles.update).toHaveBeenCalled();
    });

    it('should not allow suspending admin users', async () => {
      const adminUser = {
        id: 'admin-1',
        role: 'admin',
      };

      (prisma.profiles.findUnique as jest.Mock).mockResolvedValue(adminUser);

      await expect(
        adminService.suspendUser('admin-1', 'Test reason')
      ).rejects.toThrow('Cannot suspend admin users');
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      (prisma.profiles.count as jest.Mock).mockResolvedValue(100);
      (prisma.sessions.count as jest.Mock).mockResolvedValue(10);
      (prisma.connections.count as jest.Mock).mockResolvedValue(50);
      (prisma.messages.count as jest.Mock).mockResolvedValue(200);
      (prisma.researchProjects.count as jest.Mock).mockResolvedValue(15);
      (prisma.profiles.groupBy as jest.Mock).mockResolvedValue([
        { role: 'student', _count: 70 },
        { role: 'faculty', _count: 20 },
        { role: 'industry', _count: 10 },
      ]);
      (prisma.sessions.groupBy as jest.Mock).mockResolvedValue([
        { track: 'AI/ML', _count: 5 },
        { track: 'Cybersecurity', _count: 5 },
      ]);

      const result = await adminService.getDashboardStats();

      expect(result.overview.totalUsers).toBe(100);
      expect(result.overview.totalSessions).toBe(10);
      expect(result.usersByRole).toHaveLength(3);
      expect(result.sessionsByTrack).toHaveLength(2);
    });
  });

  describe('getRsvpStats', () => {
    it('should return RSVP statistics', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'AI Workshop',
          capacity: 50,
          _count: { rsvps: 40 },
        },
        {
          id: 'session-2',
          title: 'Security Talk',
          capacity: 30,
          _count: { rsvps: 30 },
        },
      ];

      const mockRsvpsByStatus = [
        { status: 'attending', _count: 60 },
        { status: 'maybe', _count: 10 },
      ];

      (prisma.sessions.findMany as jest.Mock).mockResolvedValue(mockSessions);
      (prisma.rsvps.groupBy as jest.Mock).mockResolvedValue(mockRsvpsByStatus);

      const result = await adminService.getRsvpStats();

      expect(result.bySession).toHaveLength(2);
      expect(result.bySession[0].fillRate).toBe(80); // 40/50 * 100
      expect(result.bySession[1].fillRate).toBe(100); // 30/30 * 100
      expect(result.byStatus).toHaveLength(2);
    });
  });

  describe('getActivityReport', () => {
    it('should return activity report for specified days', async () => {
      (prisma.profiles.count as jest.Mock).mockResolvedValue(10);
      (prisma.connections.count as jest.Mock).mockResolvedValue(20);
      (prisma.messages.count as jest.Mock).mockResolvedValue(50);
      (prisma.rsvps.count as jest.Mock).mockResolvedValue(30);
      (prisma.researchProjects.count as jest.Mock).mockResolvedValue(5);

      const result = await adminService.getActivityReport(7);

      expect(result.period).toBe('7 days');
      expect(result.activity.newUsers).toBe(10);
      expect(result.activity.newConnections).toBe(20);
      expect(result.activity.newMessages).toBe(50);
    });
  });
});
