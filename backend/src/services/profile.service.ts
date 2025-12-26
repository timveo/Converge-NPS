/**
 * Profile Service
 *
 * Database operations for user profiles
 */

import { Profile } from '@prisma/client';
import prisma from '../config/database';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import crypto from 'crypto';

export interface UpdateProfileData {
  fullName?: string;
  phone?: string | null;
  rank?: string | null;
  organization?: string | null;
  department?: string | null;
  role?: string | null;
  bio?: string | null;
  accelerationInterests?: string[];
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
}

export interface UpdatePrivacyData {
  profileVisibility?: 'public' | 'private';
  allowQrScanning?: boolean;
  allowMessaging?: boolean;
  hideContactInfo?: boolean;
}

export class ProfileService {
  /**
   * Get profile by ID (respects privacy settings)
   */
  static async getProfile(profileId: string, requesterId: string): Promise<Partial<Profile>> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        userRoles: true,
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Check privacy
    if (profile.profileVisibility === 'private' && profile.id !== requesterId) {
      // Only admins can view private profiles
      const requesterRoles = await prisma.userRole.findMany({
        where: { userId: requesterId },
      });

      const isAdmin = requesterRoles.some(r => r.role === 'admin');

      if (!isAdmin) {
        throw new ForbiddenError('This profile is private');
      }
    }

    // Hide contact info if requested
    const safeProfile: any = { ...profile };

    if (profile.hideContactInfo && profile.id !== requesterId) {
      safeProfile.email = null;
      safeProfile.phone = null;
      safeProfile.linkedinUrl = null;
      safeProfile.websiteUrl = null;
    }

    return safeProfile;
  }

  /**
   * Update profile
   */
  static async updateProfile(userId: string, data: UpdateProfileData): Promise<Profile> {
    const profile = await prisma.profile.update({
      where: { id: userId },
      data,
    });

    return profile;
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacy(userId: string, data: UpdatePrivacyData): Promise<Profile> {
    const profile = await prisma.profile.update({
      where: { id: userId },
      data,
    });

    return profile;
  }

  /**
   * Update onboarding status
   */
  static async updateOnboarding(userId: string, step: number, completed?: boolean): Promise<Profile> {
    const profile = await prisma.profile.update({
      where: { id: userId },
      data: {
        onboardingStep: step,
        onboardingCompleted: completed ?? undefined,
      },
    });

    return profile;
  }

  /**
   * Get QR code for user
   */
  static async getQRCode(userId: string): Promise<{ qrCodeData: string; scanCount: number }> {
    // Find or create QR code
    let qrCode = await prisma.qrCode.findUnique({
      where: { userId },
    });

    if (!qrCode || !qrCode.isActive) {
      // Generate new QR code
      const qrCodeData = crypto.randomUUID(); // Use user's UUID or generate new one

      qrCode = await prisma.qrCode.upsert({
        where: { userId },
        create: {
          userId,
          qrCodeData,
          isActive: true,
        },
        update: {
          qrCodeData,
          isActive: true,
          generatedAt: new Date(),
        },
      });
    }

    return {
      qrCodeData: qrCode.qrCodeData,
      scanCount: qrCode.scanCount,
    };
  }

  /**
   * Regenerate QR code
   */
  static async regenerateQRCode(userId: string): Promise<{ qrCodeData: string }> {
    const qrCodeData = crypto.randomUUID();

    const qrCode = await prisma.qrCode.upsert({
      where: { userId },
      create: {
        userId,
        qrCodeData,
        isActive: true,
      },
      update: {
        qrCodeData,
        isActive: true,
        generatedAt: new Date(),
        scanCount: 0, // Reset scan count
      },
    });

    return {
      qrCodeData: qrCode.qrCodeData,
    };
  }

  /**
   * Upload avatar (stores URL only, actual upload handled by separate service)
   */
  static async uploadAvatar(userId: string, avatarUrl: string): Promise<Profile> {
    const profile = await prisma.profile.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return profile;
  }

  /**
   * Search profiles (for admin/staff)
   */
  static async searchProfiles(query: {
    search?: string;
    organization?: string;
    department?: string;
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<{ profiles: Partial<Profile>[]; total: number; page: number; totalPages: number }> {
    const { search, organization, department, role, page = 1, limit = 20 } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (organization) {
      where.organization = { contains: organization, mode: 'insensitive' };
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }

    if (role) {
      where.role = { contains: role, mode: 'insensitive' };
    }

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: true,
        },
      }),
      prisma.profile.count({ where }),
    ]);

    return {
      profiles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get checked-in participants (public profiles only)
   */
  static async getCheckedInParticipants(query: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ participants: Partial<Profile>[]; total: number; page: number; totalPages: number }> {
    const { search, page = 1, limit = 20 } = query;

    const where: any = {
      isCheckedIn: true,
      profileVisibility: 'public',
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
      ];
      // Keep other conditions when searching
      where.AND = [
        { isCheckedIn: true },
        { profileVisibility: 'public' },
      ];
      delete where.isCheckedIn;
      delete where.profileVisibility;
    }

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' }, // Most recently checked in first
        select: {
          id: true,
          fullName: true,
          organization: true,
          department: true,
          role: true,
          avatarUrl: true,
          bio: true,
          accelerationInterests: true,
          hideContactInfo: true,
          linkedinUrl: true,
          websiteUrl: true,
        },
      }),
      prisma.profile.count({ where }),
    ]);

    // Respect hideContactInfo setting
    const participants = profiles.map((p) => {
      if (p.hideContactInfo) {
        return {
          ...p,
          linkedinUrl: null,
          websiteUrl: null,
        };
      }
      return p;
    });

    return {
      participants,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
