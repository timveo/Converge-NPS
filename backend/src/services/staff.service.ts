/**
 * Staff Service
 *
 * Handles staff operations (walk-in registration, etc.)
 */

import prisma from '../config/database';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';
import { AppRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';

/**
 * Check in an attendee (updates Profile.isCheckedIn)
 */
export async function checkInAttendee(staffId: string, userId: string) {
  const user = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isCheckedIn) {
    throw new ConflictError('User already checked in');
  }

  const updated = await prisma.profile.update({
    where: { id: userId },
    data: {
      isCheckedIn: true,
      checkedInById: staffId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      organization: true,
      isCheckedIn: true,
      isWalkIn: true,
      userRoles: {
        select: { role: true },
      },
    },
  });

  return updated;
}

/**
 * Get check-in statistics
 */
export async function getCheckInStats() {
  const [totalRegistered, checkedIn, walkIns] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { isCheckedIn: true } }),
    prisma.profile.count({ where: { isWalkIn: true } }),
  ]);

  return {
    totalRegistered,
    checkedIn,
    walkIns,
  };
}

/**
 * Get recent check-ins
 */
export async function getRecentCheckIns(limit: number = 50) {
  const recentCheckIns = await prisma.profile.findMany({
    where: { isCheckedIn: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      fullName: true,
      organization: true,
      updatedAt: true,
    },
  });

  return recentCheckIns.map(p => ({
    id: p.id,
    name: p.fullName,
    organization: p.organization,
    checkedInAt: p.updatedAt,
  }));
}

/**
 * Search for attendees
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
      isWalkIn: true,
      createdAt: true,
      userRoles: {
        select: { role: true },
      },
    },
  });

  return users;
}

/**
 * Register a walk-in attendee
 */
export async function registerWalkIn(
  staffId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    organization: string;
    participantType: string;
  }
) {
  // Check if email already exists
  const existingUser = await prisma.profile.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  
  // Generate a random password for walk-in (they can reset later if needed)
  const randomPassword = randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(randomPassword, 12);

  // Create the profile in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create profile with isWalkIn = true and isCheckedIn = true
    const profileId = randomUUID();
    const profile = await tx.profile.create({
      data: {
        id: profileId,
        email: data.email.toLowerCase(),
        fullName,
        organization: data.organization,
        isWalkIn: true,
        isCheckedIn: true,
        checkedInById: staffId,
      },
    });

    // Create password record in separate table
    await tx.userPassword.create({
      data: {
        userId: profileId,
        passwordHash: hashedPassword,
      },
    });

    // Add user role - map participant types to AppRole
    const roleMap: Record<string, AppRole> = {
      student: 'student' as AppRole,
      faculty: 'faculty' as AppRole,
      industry: 'industry' as AppRole,
      alumni: 'participant' as AppRole,
      guest: 'participant' as AppRole,
    };
    const appRole: AppRole = roleMap[data.participantType] || ('participant' as AppRole);
    
    await tx.userRole.create({
      data: {
        userId: profile.id,
        role: appRole,
      },
    });

    return profile;
  });

  return {
    id: result.id,
    fullName: result.fullName,
    email: result.email,
    organization: result.organization,
    createdAt: result.createdAt,
  };
}
