import prisma from '../config/database';
import { z } from 'zod';

// Validation schemas
export const sessionFiltersSchema = z.object({
  date: z.string().optional(),
  track: z.enum(['AI/ML', 'Cybersecurity', 'Autonomous Systems', 'Data Science', 'Other']).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  search: z.string().optional(),
});

export const createRsvpSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['confirmed', 'waitlisted', 'cancelled']).optional().default('confirmed'),
});

export const updateRsvpSchema = z.object({
  status: z.enum(['confirmed', 'waitlisted', 'cancelled']),
});

// Session service functions

/**
 * Get list of sessions with optional filters
 */
export async function listSessions(filters: {
  date?: string;
  track?: string;
  status?: string;
  search?: string;
}) {
  const where: any = {};

  if (filters.date) {
    const startOfDay = new Date(filters.date);
    const endOfDay = new Date(filters.date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    where.startTime = {
      gte: startOfDay,
      lt: endOfDay,
    };
  }

  if (filters.track) {
    where.track = filters.track;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { speaker: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      _count: {
        select: { rsvps: true },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  return sessions;
}

/**
 * Get session by ID with RSVP counts
 */
export async function getSessionById(sessionId: string, userId?: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: {
          rsvps: {
            where: { status: 'confirmed' }
          }
        },
      },
      rsvps: userId ? {
        where: { userId },
        take: 1,
      } : false,
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  return {
    ...session,
    attendeeCount: session._count.rsvps,
    userRsvp: session.rsvps?.[0] || null,
  };
}

/**
 * Create RSVP for a session
 */
function canSessionsOverlap(a?: { title?: string | null }, b?: { title?: string | null }) {
  if (!a || !b) return false;
  const aTitle = a.title?.toLowerCase() || '';
  const bTitle = b.title?.toLowerCase() || '';
  return (
    (aTitle.includes('showcase') && bTitle.includes('demo')) ||
    (aTitle.includes('demo') && bTitle.includes('showcase'))
  );
}

function sessionsTrulyOverlap(
  a?: { startTime?: Date | null; endTime?: Date | null },
  b?: { startTime?: Date | null; endTime?: Date | null }
) {
  if (!a?.startTime || !a?.endTime || !b?.startTime || !b?.endTime) return false;
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

export async function createRsvp(
  userId: string,
  data: {
    sessionId: string;
    status?: 'confirmed' | 'waitlisted' | 'cancelled';
  }
) {
  // Check if session exists
  const session = await prisma.session.findUnique({
    where: { id: data.sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Check capacity
  if (data.status === 'confirmed' && session.capacity) {
    const attendingCount = await prisma.rsvp.count({
      where: {
        sessionId: data.sessionId,
        status: 'confirmed' as any,
      },
    });
    if (attendingCount >= session.capacity) {
      throw new Error('Session is at full capacity');
    }
  }

  // Check for existing RSVP
  const existingRsvp = await prisma.rsvp.findFirst({
    where: {
      userId,
      sessionId: data.sessionId,
    },
  });

  if (existingRsvp) {
    throw new Error('RSVP already exists for this session');
  }

  // Check for conflicts
  const conflicts = await prisma.rsvp.findMany({
    where: {
      userId,
      status: 'confirmed' as any,
      session: {
        OR: [
          {
            startTime: {
              lte: session.startTime,
            },
            endTime: {
              gte: session.startTime,
            },
          },
          {
            startTime: {
              lte: session.endTime,
            },
            endTime: {
              gte: session.endTime,
            },
          },
        ],
      },
    },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (conflicts.length > 0 && data.status === 'confirmed') {
    const blockingConflict = conflicts.find(
      (conflict) =>
        sessionsTrulyOverlap(conflict.session, session) &&
        !canSessionsOverlap(conflict.session, session)
    );
    if (blockingConflict) {
      throw new Error(`Schedule conflict with: ${blockingConflict.session.title}`);
    }
  }

  // Create RSVP
  const rsvp = await prisma.rsvp.create({
    data: {
      userId,
      sessionId: data.sessionId,
      status: (data.status || 'confirmed') as any,
    },
    include: {
      session: true,
    },
  });

  return rsvp;
}

/**
 * Update RSVP status
 */
export async function updateRsvp(userId: string, rsvpId: string, data: {
  status: 'confirmed' | 'waitlisted' | 'cancelled';
}) {
  // Find existing RSVP
  const existingRsvp = await prisma.rsvp.findUnique({
    where: { id: rsvpId },
    include: { session: true },
  });

  if (!existingRsvp) {
    throw new Error('RSVP not found');
  }

  if (existingRsvp.userId !== userId) {
    throw new Error('Unauthorized to update this RSVP');
  }

  // Check capacity if changing to attending
  if (data.status === 'confirmed' && (existingRsvp.status as any) !== 'confirmed') {
    const session = existingRsvp.session;
    if (session.capacity) {
      const attendingCount = await prisma.rsvp.count({
        where: {
          sessionId: session.id,
          status: 'confirmed' as any,
        },
      });

      if (attendingCount >= session.capacity) {
        throw new Error('Session is at full capacity');
      }
    }

    // Check for conflicts
    const conflicts = await prisma.rsvp.findMany({
      where: {
        userId,
        status: 'confirmed' as any,
        sessionId: { not: existingRsvp.sessionId },
        session: {
          OR: [
            {
              startTime: {
                lte: existingRsvp.session.startTime,
              },
              endTime: {
                gte: existingRsvp.session.startTime,
              },
            },
            {
              startTime: {
                lte: existingRsvp.session.endTime,
              },
              endTime: {
                gte: existingRsvp.session.endTime,
              },
            },
          ],
        },
      },
      include: {
        session: {
          select: {
            title: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    const blockingConflict = conflicts.find(
      (conflict) =>
        sessionsTrulyOverlap(conflict.session, existingRsvp.session) &&
        !canSessionsOverlap(conflict.session, existingRsvp.session)
    );
    if (blockingConflict) {
      throw new Error(`Schedule conflict with: ${blockingConflict.session.title}`);
    }
  }

  // Update RSVP
  const updatedRsvp = await prisma.rsvp.update({
    where: { id: rsvpId },
    data: { status: data.status as any },
    include: { session: true },
  });

  return updatedRsvp;
}

/**
 * Delete RSVP
 */
export async function deleteRsvp(userId: string, rsvpId: string) {
  const rsvp = await prisma.rsvp.findUnique({
    where: { id: rsvpId },
  });

  if (!rsvp) {
    throw new Error('RSVP not found');
  }

  if (rsvp.userId !== userId) {
    throw new Error('Unauthorized to delete this RSVP');
  }

  await prisma.rsvp.delete({
    where: { id: rsvpId },
  });

  return { success: true };
}

/**
 * Get user's RSVPs
 */
export async function getUserRsvps(userId: string, filters?: {
  status?: 'confirmed' | 'waitlisted' | 'cancelled';
  upcoming?: boolean;
}) {
  const where: any = { userId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.upcoming) {
    where.session = {
      startTime: { gte: new Date() },
    };
  }

  const rsvps = await prisma.rsvp.findMany({
    where,
    include: {
      session: true,
    },
    orderBy: {
      session: {
        startTime: 'asc',
      },
    },
  });

  return rsvps;
}

/**
 * Get session attendees (for organizers)
 */
export async function getSessionAttendees(sessionId: string, userRole: string) {
  if (!['admin', 'staff'].includes(userRole)) {
    throw new Error('Unauthorized to view attendee list');
  }

  const attendees = await prisma.rsvp.findMany({
    where: {
      sessionId,
      status: 'confirmed' as any,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return attendees;
}

/**
 * Check for schedule conflicts
 */
export async function checkScheduleConflicts(userId: string, sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  const conflicts = await prisma.rsvp.findMany({
    where: {
      userId,
      status: 'confirmed' as any,
      session: {
        OR: [
          {
            startTime: {
              lte: session.startTime,
            },
            endTime: {
              gte: session.startTime,
            },
          },
          {
            startTime: {
              lte: session.endTime,
            },
            endTime: {
              gte: session.endTime,
            },
          },
        ],
      },
    },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      },
    },
  });

  return {
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts.map(c => c.session),
  };
}
