/**
 * Partner Service
 *
 * Handles industry partner operations
 */

import prisma from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import { z } from 'zod';

// Query schema for filtering partners
export const partnerFiltersSchema = z.object({
  organizationType: z.string().optional(),
  technologyFocus: z.string().optional(),
  seeking: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PartnerFilters = z.infer<typeof partnerFiltersSchema>;

/**
 * List all industry partners with optional filters
 */
export async function listPartners(filters: PartnerFilters) {
  const { organizationType, technologyFocus, seeking, search, page, limit } = filters;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (organizationType) {
    where.organizationType = organizationType;
  }

  if (technologyFocus) {
    where.technologyFocusAreas = {
      has: technologyFocus,
    };
  }

  if (seeking) {
    where.seeking = {
      has: seeking,
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { pocFirstName: { contains: search, mode: 'insensitive' } },
      { pocLastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        // Organization type field
        organizationType: true,
        researchAreas: true,
        seeking: true,
        collaborationPitch: true,
        pocUserId: true,
        pocFirstName: true,
        pocLastName: true,
        pocEmail: true,
        pocRank: true,
        isFeatured: true,
        createdAt: true,
        poc: {
          select: {
            isCheckedIn: true,
          },
        },
      },
    }),
    prisma.partner.count({ where }),
  ]);

  // Flatten the poc.isCheckedIn into pocIsCheckedIn
  const partnersWithCheckedIn = partners.map((partner) => ({
    ...partner,
    pocIsCheckedIn: partner.poc?.isCheckedIn ?? false,
    poc: undefined, // Remove the nested poc object
  }));

  return {
    partners: partnersWithCheckedIn,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get partner by ID
 */
export async function getPartnerById(partnerId: string, userId?: string) {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      websiteUrl: true,
      organizationType: true,
      researchAreas: true,
      seeking: true,
      collaborationPitch: true,
      pocUserId: true,
      pocFirstName: true,
      pocLastName: true,
      pocEmail: true,
      pocRank: true,
      isFeatured: true,
      createdAt: true,
      updatedAt: true,
      poc: {
        select: {
          isCheckedIn: true,
        },
      },
    },
  });

  if (!partner) {
    throw new NotFoundError('Partner not found');
  }

  // Partner privacy logic removed - simplified model

  // Check if user has favorited this partner
  let isFavorited = false;
  if (userId) {
    const favorite = await prisma.partnerFavorite.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId,
        },
      },
    });
    isFavorited = !!favorite;
  }

  return {
    ...partner,
    pocIsCheckedIn: partner.poc?.isCheckedIn ?? false,
    poc: undefined,
    isFavorited,
  };
}

/**
 * Favorite a partner
 */
export async function favoritePartner(userId: string, partnerId: string, notes?: string) {
  // Check if partner exists
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
  });

  if (!partner) {
    throw new NotFoundError('Partner not found');
  }

  // Check if already favorited
  const existing = await prisma.partnerFavorite.findUnique({
    where: {
      userId_partnerId: {
        userId,
        partnerId,
      },
    },
  });

  if (existing) {
    throw new Error('Partner already favorited');
  }

  const favorite = await prisma.partnerFavorite.create({
    data: {
      userId,
      partnerId,
    },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          organizationType: true,
          researchAreas: true,
          collaborationPitch: true,
        },
      },
    },
  });

  return favorite;
}

/**
 * Remove favorite
 */
export async function unfavoritePartner(userId: string, partnerId: string) {
  const favorite = await prisma.partnerFavorite.findUnique({
    where: {
      userId_partnerId: {
        userId,
        partnerId,
      },
    },
  });

  if (!favorite) {
    throw new NotFoundError('Favorite not found');
  }

  await prisma.partnerFavorite.delete({
    where: {
      userId_partnerId: {
        userId,
        partnerId,
      },
    },
  });
}

/**
 * Get user's favorited partners
 */
export async function getUserFavorites(userId: string) {
  const favorites = await prisma.partnerFavorite.findMany({
    where: { userId },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
          organizationType: true,
          researchAreas: true,
          seeking: true,
          collaborationPitch: true,
          isFeatured: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return favorites;
}
