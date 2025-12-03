/**
 * Staff Service
 *
 * Handles staff operations (check-in, etc.)
 */

import prisma from '../config/database';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';
import { CheckInMethod } from '@prisma/client';

/**
 * Check in attendee
 */
export async function checkInAttendee(
  staffId: string,
  userId: string,
  checkInMethod: CheckInMethod,
  isWalkIn: boolean = false
) {
  // Check if user exists
  const user = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if already checked in
  const existing = await prisma.checkIn.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new ConflictError('User already checked in');
  }

  // Create check-in record
  const checkIn = await prisma.checkIn.create({
    data: {
      userId,
      checkedInBy: staffId,
      checkInMethod,
      isWalkIn,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          userRoles: {
            select: { role: true },
          },
        },
      },
    },
  });

  return checkIn;
}

/**
 * Get check-in statistics
 */
export async function getCheckInStats() {
  const [
    totalCheckedIn,
    byMethod,
    walkIns,
    byRole,
    recentCheckIns,
  ] = await Promise.all([
    // Total checked in
    prisma.checkIn.count(),

    // By check-in method
    prisma.checkIn.groupBy({
      by: ['checkInMethod'],
      _count: true,
    }),

    // Walk-ins count
    prisma.checkIn.count({
      where: { isWalkIn: true },
    }),

    // By user role (approximate - counts unique check-ins with roles)
    prisma.checkIn.findMany({
      include: {
        user: {
          include: {
            userRoles: true,
          },
        },
      },
    }),

    // Recent check-ins (last 50)
    prisma.checkIn.findMany({
      take: 50,
      orderBy: { checkedInAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            organization: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    }),
  ]);

  // Count by role
  const roleCounts: Record<string, number> = {};
  byRole.forEach(checkIn => {
    checkIn.user.userRoles.forEach(userRole => {
      const role = userRole.role;
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
  });

  return {
    totalCheckedIn,
    walkIns,
    byMethod: byMethod.map(m => ({
      method: m.checkInMethod,
      count: m._count,
    })),
    byRole: Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
    })),
    recent: recentCheckIns,
  };
}

/**
 * Search for attendees (for manual check-in)
 */
export async function searchAttendees(query: string, limit: number = 10) {
  const users = await prisma.profile.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { organization: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: {
      id: true,
      fullName: true,
      email: true,
      organization: true,
      department: true,
      userRoles: {
        select: { role: true },
      },
    },
  });

  // Add check-in status
  const userIds = users.map(u => u.id);
  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId: { in: userIds },
    },
    select: { userId: true, checkedInAt: true },
  });

  const checkInMap = new Map(checkIns.map(c => [c.userId, c.checkedInAt]));

  return users.map(user => ({
    ...user,
    checkedIn: checkInMap.has(user.id),
    checkedInAt: checkInMap.get(user.id) || null,
  }));
}
