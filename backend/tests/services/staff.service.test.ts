/**
 * Staff Service Unit Tests
 * Tests for check-in, stats, recent check-ins, and walk-in registration
 */

import * as staffService from '../../src/services/staff.service';
import prisma from '../../src/config/database';

describe('StaffService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkInAttendee', () => {
    const staffId = 'staff-123';
    const userId = 'user-456';

    it('should check in a user successfully', async () => {
      const mockUser = {
        id: userId,
        fullName: 'John Doe',
        email: 'john@example.com',
        organization: 'NPS',
        isCheckedIn: false,
      };

      const mockUpdatedUser = {
        ...mockUser,
        isCheckedIn: true,
        isWalkIn: false,
        userRoles: [{ role: 'student' }],
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.profile.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await staffService.checkInAttendee(staffId, userId);

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isCheckedIn: true,
          checkedInById: staffId,
        },
        select: expect.objectContaining({
          id: true,
          fullName: true,
          email: true,
          organization: true,
          isCheckedIn: true,
          isWalkIn: true,
        }),
      });
      expect(result.isCheckedIn).toBe(true);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(staffService.checkInAttendee(staffId, userId)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw ConflictError if user is already checked in', async () => {
      const mockUser = {
        id: userId,
        fullName: 'John Doe',
        isCheckedIn: true,
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(staffService.checkInAttendee(staffId, userId)).rejects.toThrow(
        'User already checked in'
      );
    });
  });

  describe('getCheckInStats', () => {
    it('should return correct stats', async () => {
      (prisma.profile.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalRegistered
        .mockResolvedValueOnce(75)  // checkedIn
        .mockResolvedValueOnce(10); // walkIns

      const result = await staffService.getCheckInStats();

      expect(result).toEqual({
        totalRegistered: 100,
        checkedIn: 75,
        walkIns: 10,
      });
      expect(prisma.profile.count).toHaveBeenCalledTimes(3);
    });

    it('should return zeros when no profiles exist', async () => {
      (prisma.profile.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await staffService.getCheckInStats();

      expect(result).toEqual({
        totalRegistered: 0,
        checkedIn: 0,
        walkIns: 0,
      });
    });
  });

  describe('getRecentCheckIns', () => {
    it('should return recent check-ins ordered by updatedAt', async () => {
      const mockCheckIns = [
        { id: '1', fullName: 'John Doe', organization: 'NPS', updatedAt: new Date('2024-01-02') },
        { id: '2', fullName: 'Jane Smith', organization: 'Navy', updatedAt: new Date('2024-01-01') },
      ];

      (prisma.profile.findMany as jest.Mock).mockResolvedValue(mockCheckIns);

      const result = await staffService.getRecentCheckIns(50);

      expect(prisma.profile.findMany).toHaveBeenCalledWith({
        where: { isCheckedIn: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          fullName: true,
          organization: true,
          updatedAt: true,
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
    });

    it('should respect limit parameter', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);

      await staffService.getRecentCheckIns(10);

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should return empty array when no check-ins exist', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);

      const result = await staffService.getRecentCheckIns();

      expect(result).toEqual([]);
    });
  });

  describe('searchAttendees', () => {
    it('should search by name, email, or organization', async () => {
      const mockUsers = [
        {
          id: '1',
          fullName: 'John Doe',
          email: 'john@example.com',
          organization: 'NPS',
          department: 'Engineering',
          isWalkIn: false,
          createdAt: new Date(),
          userRoles: [{ role: 'student' }],
        },
      ];

      (prisma.profile.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await staffService.searchAttendees('john', 10);

      expect(prisma.profile.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { fullName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { organization: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: expect.objectContaining({
          id: true,
          fullName: true,
          email: true,
        }),
      });
      expect(result).toHaveLength(1);
    });

    it('should use default limit of 10', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);

      await staffService.searchAttendees('test');

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe('registerWalkIn', () => {
    const staffId = 'staff-123';
    const walkInData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      organization: 'DARPA',
      participantType: 'industry',
    };

    it('should register a walk-in attendee successfully', async () => {
      const mockProfile = {
        id: 'new-user-123',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        organization: 'DARPA',
        isWalkIn: true,
        isCheckedIn: true,
        createdAt: new Date(),
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const txMock = {
          profile: {
            create: jest.fn().mockResolvedValue(mockProfile),
          },
          userPassword: {
            create: jest.fn().mockResolvedValue({}),
          },
          userRole: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(txMock);
      });

      const result = await staffService.registerWalkIn(staffId, walkInData);

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
      expect(result.fullName).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
    });

    it('should throw ConflictError if email already exists', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'jane@example.com',
      });

      await expect(staffService.registerWalkIn(staffId, walkInData)).rejects.toThrow(
        'A user with this email already exists'
      );
    });

    it('should convert email to lowercase', async () => {
      const mockProfile = {
        id: 'new-user-123',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        organization: 'DARPA',
        createdAt: new Date(),
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const txMock = {
          profile: {
            create: jest.fn().mockResolvedValue(mockProfile),
          },
          userPassword: {
            create: jest.fn().mockResolvedValue({}),
          },
          userRole: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(txMock);
      });

      await staffService.registerWalkIn(staffId, {
        ...walkInData,
        email: 'JANE@EXAMPLE.COM',
      });

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
    });

    it('should combine first and last name into fullName', async () => {
      const mockProfile = {
        id: 'new-user-123',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        organization: 'DARPA',
        createdAt: new Date(),
      };

      let createdProfileData: any = null;

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const txMock = {
          profile: {
            create: jest.fn().mockImplementation((args) => {
              createdProfileData = args.data;
              return Promise.resolve(mockProfile);
            }),
          },
          userPassword: {
            create: jest.fn().mockResolvedValue({}),
          },
          userRole: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(txMock);
      });

      await staffService.registerWalkIn(staffId, walkInData);

      expect(createdProfileData.fullName).toBe('Jane Doe');
    });
  });
});
