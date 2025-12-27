/**
 * Session Service Unit Tests
 * Tests for session listing, RSVPs, and schedule management
 */

import {
  listSessions,
  getSessionById,
  createRsvp,
  updateRsvp,
  deleteRsvp,
  getUserRsvps,
  getSessionAttendees,
  checkScheduleConflicts,
} from '../../src/services/session.service';

// Mock database
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
  },
}));

import prisma from '../../src/config/database';

describe('Session Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listSessions', () => {
    it('should list all sessions without filters', async () => {
      const mockSessions = [
        { id: 'session-1', title: 'AI Workshop', _count: { rsvps: 10 } },
        { id: 'session-2', title: 'Cybersecurity Basics', _count: { rsvps: 5 } },
      ];

      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

      const result = await listSessions({});

      expect(result).toEqual(mockSessions);
      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { rsvps: true } } },
        orderBy: { startTime: 'asc' },
      });
    });

    it('should filter sessions by date', async () => {
      const mockSessions = [{ id: 'session-1', title: 'Morning Session' }];
      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

      await listSessions({ date: '2024-03-15' });

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          startTime: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should filter sessions by track', async () => {
      (prisma.session.findMany as jest.Mock).mockResolvedValue([]);

      await listSessions({ track: 'AI/ML' });

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: { track: 'AI/ML' },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should filter sessions by status', async () => {
      (prisma.session.findMany as jest.Mock).mockResolvedValue([]);

      await listSessions({ status: 'scheduled' });

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: { status: 'scheduled' },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should filter sessions by search term', async () => {
      (prisma.session.findMany as jest.Mock).mockResolvedValue([]);

      await listSessions({ search: 'machine learning' });

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'machine learning', mode: 'insensitive' } },
            { description: { contains: 'machine learning', mode: 'insensitive' } },
            { speaker: { contains: 'machine learning', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  describe('getSessionById', () => {
    it('should get session by ID', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'AI Workshop',
        _count: { rsvps: 10 },
        rsvps: [],
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      const result = await getSessionById('session-1');

      expect(result.id).toBe('session-1');
      expect(result.attendeeCount).toBe(10);
    });

    it('should include user RSVP when userId provided', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'AI Workshop',
        _count: { rsvps: 10 },
        rsvps: [{ id: 'rsvp-1', userId: 'user-1', status: 'confirmed' }],
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      const result = await getSessionById('session-1', 'user-1');

      expect(result.userRsvp).toEqual({ id: 'rsvp-1', userId: 'user-1', status: 'confirmed' });
    });

    it('should throw error if session not found', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getSessionById('nonexistent')).rejects.toThrow('Session not found');
    });
  });

  describe('createRsvp', () => {
    const mockSession = {
      id: 'session-1',
      title: 'AI Workshop',
      capacity: 50,
      startTime: new Date('2024-03-15T09:00:00'),
      endTime: new Date('2024-03-15T10:00:00'),
    };

    it('should create RSVP successfully', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rsvp.create as jest.Mock).mockResolvedValue({
        id: 'rsvp-1',
        userId: 'user-1',
        sessionId: 'session-1',
        status: 'confirmed',
        session: mockSession,
      });

      const result = await createRsvp('user-1', {
        sessionId: 'session-1',
        status: 'confirmed',
      });

      expect(result.id).toBe('rsvp-1');
      expect(result.status).toBe('confirmed');
    });

    it('should throw error if session not found', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createRsvp('user-1', { sessionId: 'nonexistent' })).rejects.toThrow(
        'Session not found'
      );
    });

    it('should throw error if session is at full capacity', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue({ ...mockSession, capacity: 10 });
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);

      await expect(
        createRsvp('user-1', { sessionId: 'session-1', status: 'confirmed' })
      ).rejects.toThrow('Session is at full capacity');
    });

    it('should throw error if RSVP already exists', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-rsvp' });

      await expect(createRsvp('user-1', { sessionId: 'session-1' })).rejects.toThrow(
        'RSVP already exists for this session'
      );
    });

    it('should throw error on schedule conflict', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([
        {
          session: {
            title: 'Conflicting Session',
            startTime: new Date('2024-03-15T09:30:00'),
            endTime: new Date('2024-03-15T10:30:00'),
          },
        },
      ]);

      await expect(
        createRsvp('user-1', { sessionId: 'session-1', status: 'confirmed' })
      ).rejects.toThrow('Schedule conflict with: Conflicting Session');
    });

    it('should allow overlap when one session is a showcase and the other a demo', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        ...mockSession,
        title: 'AI Demo',
      });
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([
        {
          session: {
            title: 'Showcase: Future Tech',
            startTime: new Date('2024-03-15T09:30:00'),
            endTime: new Date('2024-03-15T10:30:00'),
          },
        },
      ]);
      (prisma.rsvp.create as jest.Mock).mockResolvedValue({
        id: 'rsvp-1',
        sessionId: mockSession.id,
        status: 'confirmed',
        session: mockSession,
      });

      const result = await createRsvp('user-1', { sessionId: 'session-1', status: 'confirmed' });

      expect(result.id).toBe('rsvp-1');
      expect(prisma.rsvp.create).toHaveBeenCalled();
    });

    it('should ignore sessions that only touch at boundaries (back-to-back)', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([
        {
          session: {
            title: 'Previous Session',
            startTime: new Date('2024-03-15T08:00:00'),
            endTime: new Date('2024-03-15T09:00:00'),
          },
        },
      ]);
      (prisma.rsvp.create as jest.Mock).mockResolvedValue({
        id: 'rsvp-1',
        sessionId: mockSession.id,
        status: 'confirmed',
        session: mockSession,
      });

      const result = await createRsvp('user-1', { sessionId: 'session-1', status: 'confirmed' });

      expect(result.id).toBe('rsvp-1');
      expect(prisma.rsvp.create).toHaveBeenCalled();
    });
  });

  describe('updateRsvp', () => {
    const mockRsvp = {
      id: 'rsvp-1',
      userId: 'user-1',
      sessionId: 'session-1',
      status: 'waitlisted',
      session: {
        id: 'session-1',
        capacity: 50,
        startTime: new Date('2024-03-15T09:00:00'),
        endTime: new Date('2024-03-15T10:00:00'),
      },
    };

    it('should update RSVP status', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue(mockRsvp);
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rsvp.update as jest.Mock).mockResolvedValue({
        ...mockRsvp,
        status: 'confirmed',
      });

      const result = await updateRsvp('user-1', 'rsvp-1', { status: 'confirmed' });

      expect(result.status).toBe('confirmed');
    });

    it('should throw error if RSVP not found', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateRsvp('user-1', 'nonexistent', { status: 'confirmed' })).rejects.toThrow(
        'RSVP not found'
      );
    });

    it('should throw error if user does not own RSVP', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue({
        ...mockRsvp,
        userId: 'other-user',
      });

      await expect(updateRsvp('user-1', 'rsvp-1', { status: 'confirmed' })).rejects.toThrow(
        'Unauthorized to update this RSVP'
      );
    });

    it('should check capacity when changing to confirmed', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue({
        ...mockRsvp,
        session: { ...mockRsvp.session, capacity: 10 },
      });
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);

      await expect(updateRsvp('user-1', 'rsvp-1', { status: 'confirmed' })).rejects.toThrow(
        'Session is at full capacity'
      );
    });

    it('should check for conflicts when changing to confirmed', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue(mockRsvp);
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([
        {
          session: {
            title: 'Conflicting Session',
            startTime: new Date('2024-03-15T09:30:00'),
            endTime: new Date('2024-03-15T10:30:00'),
          },
        },
      ]);

      await expect(updateRsvp('user-1', 'rsvp-1', { status: 'confirmed' })).rejects.toThrow(
        'Schedule conflict with: Conflicting Session'
      );
    });

    it('should allow status change when overlap is showcase/demo', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue({
        ...mockRsvp,
        session: { ...mockRsvp.session, title: 'Demo: AI' },
      });
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([
        {
          session: {
            title: 'Showcase Innovation',
            startTime: new Date('2024-03-15T09:30:00'),
            endTime: new Date('2024-03-15T10:30:00'),
          },
        },
      ]);
      (prisma.rsvp.update as jest.Mock).mockResolvedValue({
        ...mockRsvp,
        status: 'confirmed',
      });

      const result = await updateRsvp('user-1', 'rsvp-1', { status: 'confirmed' });

      expect(result.status).toBe('confirmed');
      expect(prisma.rsvp.update).toHaveBeenCalled();
    });

    it('should allow status change when overlapping sessions are back-to-back only', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue(mockRsvp);
      (prisma.rsvp.count as jest.Mock).mockResolvedValue(10);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([
        {
          session: {
            title: 'Previous Session',
            startTime: new Date('2024-03-15T08:00:00'),
            endTime: new Date('2024-03-15T09:00:00'),
          },
        },
      ]);
      (prisma.rsvp.update as jest.Mock).mockResolvedValue({
        ...mockRsvp,
        status: 'confirmed',
      });

      const result = await updateRsvp('user-1', 'rsvp-1', { status: 'confirmed' });

      expect(result.status).toBe('confirmed');
      expect(prisma.rsvp.update).toHaveBeenCalled();
    });
  });

  describe('deleteRsvp', () => {
    it('should delete RSVP successfully', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue({
        id: 'rsvp-1',
        userId: 'user-1',
      });
      (prisma.rsvp.delete as jest.Mock).mockResolvedValue({});

      const result = await deleteRsvp('user-1', 'rsvp-1');

      expect(result.success).toBe(true);
      expect(prisma.rsvp.delete).toHaveBeenCalledWith({ where: { id: 'rsvp-1' } });
    });

    it('should throw error if RSVP not found', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteRsvp('user-1', 'nonexistent')).rejects.toThrow('RSVP not found');
    });

    it('should throw error if user does not own RSVP', async () => {
      (prisma.rsvp.findUnique as jest.Mock).mockResolvedValue({
        id: 'rsvp-1',
        userId: 'other-user',
      });

      await expect(deleteRsvp('user-1', 'rsvp-1')).rejects.toThrow(
        'Unauthorized to delete this RSVP'
      );
    });
  });

  describe('getUserRsvps', () => {
    it('should get user RSVPs', async () => {
      const mockRsvps = [
        { id: 'rsvp-1', session: { title: 'Session 1' } },
        { id: 'rsvp-2', session: { title: 'Session 2' } },
      ];

      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue(mockRsvps);

      const result = await getUserRsvps('user-1');

      expect(result).toEqual(mockRsvps);
    });

    it('should filter by status', async () => {
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([]);

      await getUserRsvps('user-1', { status: 'confirmed' });

      expect(prisma.rsvp.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'confirmed' },
        include: { session: true },
        orderBy: { session: { startTime: 'asc' } },
      });
    });

    it('should filter upcoming sessions', async () => {
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([]);

      await getUserRsvps('user-1', { upcoming: true });

      expect(prisma.rsvp.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          session: { startTime: { gte: expect.any(Date) } },
        },
        include: { session: true },
        orderBy: { session: { startTime: 'asc' } },
      });
    });
  });

  describe('getSessionAttendees', () => {
    it('should get session attendees for admin', async () => {
      const mockAttendees = [
        { id: 'rsvp-1', user: { fullName: 'John Doe' } },
        { id: 'rsvp-2', user: { fullName: 'Jane Smith' } },
      ];

      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue(mockAttendees);

      const result = await getSessionAttendees('session-1', 'admin');

      expect(result).toEqual(mockAttendees);
    });

    it('should get session attendees for staff', async () => {
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([]);

      await getSessionAttendees('session-1', 'staff');

      expect(prisma.rsvp.findMany).toHaveBeenCalled();
    });

    it('should throw error for unauthorized role', async () => {
      await expect(getSessionAttendees('session-1', 'student')).rejects.toThrow(
        'Unauthorized to view attendee list'
      );
    });
  });

  describe('checkScheduleConflicts', () => {
    const mockSession = {
      id: 'session-1',
      startTime: new Date('2024-03-15T09:00:00'),
      endTime: new Date('2024-03-15T10:00:00'),
    };

    it('should return no conflicts when schedule is clear', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkScheduleConflicts('user-1', 'session-1');

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
    });

    it('should return conflicts when found', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue([
        {
          session: {
            id: 'conflict-session',
            title: 'Conflicting Session',
            startTime: mockSession.startTime,
            endTime: mockSession.endTime,
            location: 'Room A',
          },
        },
      ]);

      const result = await checkScheduleConflicts('user-1', 'session-1');

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].title).toBe('Conflicting Session');
    });

    it('should throw error if session not found', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(checkScheduleConflicts('user-1', 'nonexistent')).rejects.toThrow(
        'Session not found'
      );
    });
  });
});
