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
  seekingCollaboration: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PartnerFilters = z.infer<typeof partnerFiltersSchema>;

/**
 * List all industry partners with optional filters
 */
export async function listPartners(filters: PartnerFilters) {
  const { organizationType, technologyFocus, seekingCollaboration, search, page, limit } = filters;

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

  if (seekingCollaboration) {
    where.seekingCollaboration = {
      has: seekingCollaboration,
    };
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { primaryContactName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [partners, total] = await Promise.all([
    prisma.industryPartner.findMany({
      where,
      skip,
      take: limit,
      orderBy: { companyName: 'asc' },
      select: {
        id: true,
        companyName: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        organizationType: true,
        technologyFocusAreas: true,
        seekingCollaboration: true,
        boothLocation: true,
        hideContactInfo: true,
        createdAt: true,
      },
    }),
    prisma.industryPartner.count({ where }),
  ]);

  return {
    partners,
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
  const partner = await prisma.industryPartner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      companyName: true,
      description: true,
      logoUrl: true,
      websiteUrl: true,
      organizationType: true,
      primaryContactName: true,
      primaryContactTitle: true,
      primaryContactEmail: true,
      primaryContactPhone: true,
      technologyFocusAreas: true,
      seekingCollaboration: true,
      dodSponsors: true,
      boothLocation: true,
      teamMembers: true,
      hideContactInfo: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!partner) {
    throw new NotFoundError('Partner not found');
  }

  // Hide contact info if privacy setting is enabled
  if (partner.hideContactInfo) {
    partner.primaryContactEmail = null;
    partner.primaryContactPhone = null;
  }

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
    isFavorited,
  };
}

/**
 * Favorite a partner
 */
export async function favoritePartner(userId: string, partnerId: string, notes?: string) {
  // Check if partner exists
  const partner = await prisma.industryPartner.findUnique({
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
      notes: notes || null,
    },
    include: {
      partner: {
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          organizationType: true,
          technologyFocusAreas: true,
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
          companyName: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
          organizationType: true,
          technologyFocusAreas: true,
          seekingCollaboration: true,
          boothLocation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return favorites;
}
