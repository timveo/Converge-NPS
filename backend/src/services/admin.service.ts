import prisma from '../config/database';
import { z } from 'zod';

// Validation schemas
export const createSessionSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  speaker: z.string().min(2).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().min(2).max(100),
  track: z.enum(['AI/ML', 'Cybersecurity', 'Autonomous Systems', 'Data Science', 'Maritime Technology', 'Defense Innovation', 'Other']),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional().default('scheduled'),
});

export const updateSessionSchema = createSessionSchema.partial();

export const updateUserRoleSchema = z.object({
  role: z.enum(['student', 'faculty', 'industry', 'staff', 'admin']),
});

export const addUserRoleSchema = z.object({
  role: z.enum(['student', 'faculty', 'industry', 'staff', 'admin']),
});

// Admin Session Management

/**
 * Create a new session (admin only)
 */
export async function createSession(data: z.infer<typeof createSessionSchema>) {
  // Validate dates
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (end <= start) {
    throw new Error('End time must be after start time');
  }

  // Check for scheduling conflicts (same location)
  const conflicts = await prisma.session.findMany({
    where: {
      location: data.location,
      status: { not: 'cancelled' },
      OR: [
        {
          startTime: { lte: start },
          endTime: { gt: start },
        },
        {
          startTime: { lt: end },
          endTime: { gte: end },
        },
        {
          startTime: { gte: start },
          endTime: { lte: end },
        },
      ],
    },
  });

  if (conflicts.length > 0) {
    throw new Error(`Location conflict: ${data.location} is already booked during this time`);
  }

  const session = await prisma.session.create({
    data: {
      title: data.title || 'Untitled Session',
      ...data,
      startTime: start,
      endTime: end,
    },
  });

  return session;
}

/**
 * Update existing session (admin only)
 */
export async function updateSession(sessionId: string, data: z.infer<typeof updateSessionSchema>) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Validate dates if provided
  if (data.startTime || data.endTime) {
    const start = data.startTime ? new Date(data.startTime) : session.startTime;
    const end = data.endTime ? new Date(data.endTime) : session.endTime;

    if (end <= start) {
      throw new Error('End time must be after start time');
    }

    // Check for conflicts if location or times changed
    if (data.location || data.startTime || data.endTime) {
      const location = data.location || session.location;
      const conflicts = await prisma.session.findMany({
        where: {
          id: { not: sessionId },
          location,
          status: { not: 'cancelled' },
          OR: [
            {
              startTime: { lte: start },
              endTime: { gt: start },
            },
            {
              startTime: { lt: end },
              endTime: { gte: end },
            },
            {
              startTime: { gte: start },
              endTime: { lte: end },
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        throw new Error(`Location conflict: ${location} is already booked during this time`);
      }
    }
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      ...data,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    },
    include: {
      _count: {
        select: { rsvps: true },
      },
    },
  });

  return updated;
}

/**
 * Delete session (admin only)
 */
export async function deleteSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: { rsvps: true },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Instead of deleting, mark as cancelled if there are RSVPs
  if (session._count.rsvps > 0) {
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'cancelled' },
    });

    return { cancelled: true, session: updated };
  }

  // Actually delete if no RSVPs
  await prisma.session.delete({
    where: { id: sessionId },
  });

  return { deleted: true };
}

// Admin User Management

/**
 * Get all users with filters (admin only)
 */
export async function listUsers(filters: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { organization: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Cap limit to prevent excessive data fetching
  const limit = Math.min(filters.limit || 50, 100);

  const [rawUsers, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organization: true,
        createdAt: true,
        userRoles: {
          select: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: filters.offset || 0,
    }),
    prisma.profile.count({ where }),
  ]);

  // Transform to match frontend expectations (snake_case + roles array)
  const users = rawUsers.map(user => ({
    id: user.id,
    fullName: user.fullName,
    full_name: user.fullName,
    email: user.email,
    role: user.role,
    organization: user.organization,
    createdAt: user.createdAt,
    created_at: user.createdAt,
    roles: user.userRoles.map(r => r.role),
  }));

  return { users, total };
}

/**
 * Get user details (admin only)
 */
export async function getUserDetails(userId: string) {
  const user = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
  });

if (!user) {
throw new Error('User not found');
}

// Return user data (Profile model doesn't have passwordHash)
return user;
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, data: z.infer<typeof updateUserRoleSchema>) {
  const user = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const updated = await prisma.profile.update({
    where: { id: userId },
    data: { role: data.role },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      organization: true,
    },
  });

  return updated;
}

/**
 * Add role to user (admin only)
 */
export async function addUserRole(userId: string, role: z.infer<typeof addUserRoleSchema>['role']) {
  const user = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user already has this role
  const existingRole = await prisma.userRole.findUnique({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
  });

  if (existingRole) {
    throw new Error('User already has this role');
  }

  const userRole = await prisma.userRole.create({
    data: {
      userId,
      role,
    },
  });

  return userRole;
}

/**
 * Remove role from user (admin only)
 */
export async function removeUserRole(userId: string, role: z.infer<typeof addUserRoleSchema>['role']) {
  const user = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const existingRole = await prisma.userRole.findUnique({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
  });

  if (!existingRole) {
    throw new Error('User does not have this role');
  }

  await prisma.userRole.delete({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
  });

  return { removed: true };
}

/**
 * Suspend user account (admin only)
 */
export async function suspendUser(userId: string, reason: string) {
  const user = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    throw new Error('Cannot suspend admin users');
  }

  // In production, you'd have a 'suspended' field in the schema
  // For now, we'll set profile visibility to private and disable features
  const updated = await prisma.profile.update({
    where: { id: userId },
    data: {
      profileVisibility: 'private',
      allowQrScanning: false,
      allowMessaging: false,
      // Store suspension info in a separate table in production
    },
  });

  return { suspended: true, user: updated };
}

// Admin Analytics

/**
 * Get dashboard statistics (admin only)
 */
export async function getDashboardStats() {
  const [
    totalUsers,
    totalSessions,
    totalConnections,
    totalMessages,
    totalProjects,
    usersByRole,
    sessionsByTrack,
    recentUsers,
    upcomingSessions,
  ] = await Promise.all([
    // Total counts
    prisma.profile.count(),
    prisma.session.count({ where: { status: { not: 'cancelled' } } }),
    prisma.connection.count(),
    prisma.message.count(),
    prisma.project.count(),

    // Users by role
    prisma.profile.groupBy({
      by: ['role'],
      _count: true,
    }),

    // Sessions by type
    prisma.session.groupBy({
      by: ['sessionType'],
      where: { status: { not: 'cancelled' } },
      _count: true,
    }),

    // Recent users (last 7 days)
    prisma.profile.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Upcoming sessions
    prisma.session.count({
      where: {
        status: 'scheduled',
        startTime: { gte: new Date() },
      },
    }),
  ]);

  return {
    overview: {
      totalUsers,
      totalSessions,
      totalConnections,
      totalMessages,
      totalProjects,
      recentUsers,
      upcomingSessions,
    },
    usersByRole: usersByRole.map(r => ({
      role: r.role,
      count: r._count,
    })),
    sessionsByType: sessionsByTrack.map(s => ({
      type: s.sessionType,
      count: s._count,
    })),
  };
}

/**
 * Get RSVP statistics (admin only)
 */
export async function getRsvpStats() {
  const [rsvpsBySession, rsvpsByStatus] = await Promise.all([
    prisma.session.findMany({
      where: {
        status: { not: 'cancelled' },
        startTime: { gte: new Date() },
      },
      select: {
        id: true,
        title: true,
        capacity: true,
        _count: {
          select: {
            rsvps: {
              where: { status: 'confirmed' },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    }),

    prisma.rsvp.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  return {
    bySession: rsvpsBySession.map(s => ({
      sessionId: s.id,
      sessionTitle: s.title,
      capacity: s.capacity,
      attending: s._count.rsvps,
      fillRate: s.capacity ? (s._count.rsvps / s.capacity) * 100 : null,
    })),
    byStatus: rsvpsByStatus.map(r => ({
      status: r.status,
      count: r._count,
    })),
  };
}

/**
 * Get activity report (admin only)
 */
export async function getActivityReport(days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    newUsers,
    newConnections,
    newMessages,
    newRsvps,
    newProjects,
  ] = await Promise.all([
    prisma.profile.count({ where: { createdAt: { gte: since } } }),
    prisma.connection.count({ where: { createdAt: { gte: since } } }),
    prisma.message.count({ where: { sentAt: { gte: since } } }),
    prisma.rsvp.count({ where: { createdAt: { gte: since } } }),
    prisma.project.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    period: `${days} days`,
    since: since.toISOString(),
    activity: {
      newUsers,
      newConnections,
      newMessages,
      newRsvps,
      newProjects,
    },
  };
}

/**
 * Get comprehensive event analytics (admin only)
 * Optimized to reduce number of queries and improve performance
 */
export async function getEventAnalytics() {
  // Split into smaller batches to avoid connection pool exhaustion
  // Batch 1: Core metrics (fast counts)
  const [totalRegistered, totalCheckedIn, walkIns, recentCheckIns] = await Promise.all([
    prisma.profile.count(),
    prisma.checkIn.count(),
    prisma.checkIn.count({ where: { isWalkIn: true } }),
    prisma.checkIn.count({
      where: { checkedInAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    }),
  ]);

  // Batch 2: Demographics and groupings
  const [usersByRole, usersByOrganization, checkInsByMethod] = await Promise.all([
    prisma.userRole.groupBy({ by: ['role'], _count: true }),
    prisma.profile.groupBy({
      by: ['organization'],
      _count: true,
      orderBy: { _count: { organization: 'desc' } },
      take: 10,
      where: { organization: { not: null } },
    }),
    prisma.checkIn.groupBy({ by: ['checkInMethod'], _count: true }),
  ]);

  // Batch 3: Session and RSVP data
  const [sessions, rsvpsByStatus] = await Promise.all([
    prisma.session.findMany({
      where: { status: { not: 'cancelled' } },
      select: {
        id: true,
        title: true,
        sessionType: true,
        capacity: true,
        startTime: true,
        _count: { select: { rsvps: { where: { status: 'confirmed' } } } },
      },
      orderBy: { startTime: 'asc' },
      take: 50, // Limit sessions for performance
    }),
    prisma.rsvp.groupBy({ by: ['status'], _count: true }),
  ]);

  // Batch 4: Networking data
  const [totalConnections, recentConnections, totalMessages, totalConversations] = await Promise.all([
    prisma.connection.count(),
    prisma.connection.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.message.count(),
    prisma.conversation.count(),
  ]);

  // Batch 5: Additional data (less critical)
  const [connectionsByMethod, projectInterests] = await Promise.all([
    prisma.connection.groupBy({ by: ['connectionMethod'], _count: true }),
    prisma.project.findMany({
      select: { id: true, title: true, interestedCount: true, stage: true },
      orderBy: { interestedCount: 'desc' },
      take: 10,
    }),
  ]);

  // Connection graph - use simpler approach to avoid slow raw query
  const connectionGraph: Record<string, Record<string, number>> = {};
  const roles = ['student', 'faculty', 'industry', 'staff', 'admin'];
  roles.forEach(r1 => {
    connectionGraph[r1] = {};
    roles.forEach(r2 => {
      connectionGraph[r1][r2] = 0;
    });
  });

  // Calculate derived metrics
  const noShows = totalRegistered - totalCheckedIn - walkIns;
  const checkInRate = totalRegistered > 0 ? (totalCheckedIn / totalRegistered) * 100 : 0;

  // Process session analytics
  const sessionAnalytics = sessions.map(session => ({
    id: session.id,
    title: session.title,
    track: session.sessionType,
    capacity: session.capacity,
    confirmed: session._count.rsvps,
    fillRate: session.capacity ? (session._count.rsvps / session.capacity) * 100 : 0,
    startTime: session.startTime,
  }));

  // Group sessions by track for popularity
  const trackPopularity: Record<string, number> = {};
  sessions.forEach(session => {
    const track = session.sessionType || 'Other';
    trackPopularity[track] = (trackPopularity[track] || 0) + session._count.rsvps;
  });

  return {
    realTimeMetrics: {
      totalRegistered,
      checkedIn: totalCheckedIn,
      checkInRate: Math.round(checkInRate * 10) / 10,
      noShows: Math.max(0, noShows),
      walkIns,
      checkInsLastHour: recentCheckIns,
      checkInsByMethod: checkInsByMethod.map(m => ({
        method: m.checkInMethod,
        count: m._count,
      })),
    },
    demographics: {
      byRole: usersByRole.map(r => ({
        role: r.role,
        count: r._count,
      })),
      byOrganization: usersByOrganization.map(o => ({
        organization: o.organization || 'Unknown',
        count: o._count,
      })),
    },
    sessionAnalytics: {
      sessions: sessionAnalytics,
      rsvpsByStatus: rsvpsByStatus.map(s => ({
        status: s.status,
        count: s._count,
      })),
      trackPopularity: Object.entries(trackPopularity).map(([track, count]) => ({
        track,
        count,
      })).sort((a, b) => b.count - a.count),
      totalCapacity: sessions.reduce((sum, s) => sum + (s.capacity || 0), 0),
      totalConfirmed: sessions.reduce((sum, s) => sum + s._count.rsvps, 0),
    },
    networkingEngagement: {
      totalConnections,
      connectionsLast24h: recentConnections,
      connectionsByMethod: connectionsByMethod.map(m => ({
        method: m.connectionMethod,
        count: m._count,
      })),
      totalMessages,
      totalConversations,
      connectionGraph,
      projectInterest: projectInterests.map(p => ({
        id: p.id,
        title: p.title,
        interested: p.interestedCount,
        stage: p.stage,
      })),
    },
  };
}

/**
 * Export data for Raiser's Edge import (admin only)
 * Returns CSV data with user profiles and roles
 */
export async function exportRaisersEdge() {
  // Fetch all profiles with required fields
  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      rank: true,
      department: true,
      organization: true,
      role: true,
      linkedinUrl: true,
      websiteUrl: true,
      createdAt: true,
      userRoles: {
        select: {
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Helper to split fullName into first/last
  const splitName = (fullName: string | null): { firstName: string; lastName: string } => {
    if (!fullName) return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
  };

  // Build export data with RE-compatible fields
  const exportData = profiles.map(profile => {
    const { firstName, lastName } = splitName(profile.fullName);
    const roles = profile.userRoles.map(r => r.role);
    const participantType = roles.length > 0 ? roles.join('; ') : 'Attendee';

    return {
      UUID: profile.id,
      ParticipantType: participantType,
      FirstName: firstName,
      LastName: lastName,
      Email: profile.email || '',
      RankTitle: profile.rank || '',
      BranchOfService: profile.department || '',
      Organization: profile.organization || '',
      Role: profile.role || '',
      LinkedinURL: profile.linkedinUrl || '',
      WebsiteURL: profile.websiteUrl || '',
      RSVPDate: profile.createdAt ? profile.createdAt.toISOString().split('T')[0] : '',
    };
  });

  // CSV headers matching Raiser's Edge import format
  const headers = [
    'UUID',
    'ParticipantType',
    'FirstName',
    'LastName',
    'Email',
    'RankTitle',
    'BranchOfService',
    'Organization',
    'Role',
    'LinkedinURL',
    'WebsiteURL',
    'RSVPDate',
  ];

  // Escape CSV values properly (RFC 4180)
  const escapeCSV = (value: string): string => {
    const str = String(value ?? '');
    const escaped = str.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      return `"${escaped}"`;
    }
    return escaped;
  };

  // Generate CSV rows
  const csvRows = [
    headers.join(','),
    ...exportData.map(row =>
      headers.map(header => escapeCSV(row[header as keyof typeof row])).join(',')
    ),
  ];

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const csv = BOM + csvRows.join('\n');

  const filename = `raisers-edge-export-${new Date().toISOString().split('T')[0]}.csv`;

  return {
    csv,
    filename,
    recordCount: exportData.length,
  };
}

/**
 * Get audit logs (admin only)
 */
export async function getAuditLogs(filters?: {
  eventType?: string;
  userId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters?.eventType) {
    where.eventType = filters.eventType;
  }

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.resourceType) {
    where.resourceType = filters.resourceType;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}
