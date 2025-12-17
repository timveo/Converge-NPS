import prisma from '../config/database';
import { z } from 'zod';

// Validation schemas
export const projectFiltersSchema = z.object({
  category: z.enum([
    'AI/ML',
    'Cybersecurity',
    'Autonomous Systems',
    'Data Science',
    'Maritime Technology',
    'Defense Innovation',
    'Other'
  ]).optional(),
  status: z.enum(['proposed', 'active', 'completed', 'on_hold']).optional(),
  search: z.string().optional(),
  submittedBy: z.string().uuid().optional(),
});

export const createProjectInterestSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(10).max(1000).optional(),
});

// Project service functions

/**
 * List research projects with filters
 */
export async function listProjects(filters: {
  category?: string;
  status?: string;
  search?: string;
  submittedBy?: string;
}) {
  const where: any = {};

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.submittedBy) {
    where.piId = filters.submittedBy;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { keywords: { has: filters.search } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      piId: true,
      piRole: true,
      department: true,
      stage: true,
      classification: true,
      researchAreas: true,
      keywords: true,
      students: true,
      seeking: true,
      demoSchedule: true,
      interestedCount: true,
      pocUserId: true,
      pocFirstName: true,
      pocLastName: true,
      pocEmail: true,
      pocRank: true,
      createdAt: true,
      updatedAt: true,
      pi: {
        select: {
          id: true,
          fullName: true,
          organization: true,
          role: true,
        },
      },
      _count: {
        select: { interests: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return projects;
}

/**
 * Get project by ID with interest status
 */
export async function getProjectById(projectId: string, userId?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      pi: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          role: true,
          bio: true,
          linkedinUrl: true,
          websiteUrl: true,
        },
      },
      interests: userId ? {
        where: { userId },
        take: 1,
      } : false,
      _count: {
        select: { interests: true },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  return {
    ...project,
    interestCount: project._count.interests,
    userInterest: project.interests?.[0] || null,
  };
}

/**
 * Express interest in a project
 */
export async function expressInterest(userId: string, data: {
  projectId: string;
  message?: string;
}) {
  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    include: {
      pi: {
        select: {
          id: true,
          allowMessaging: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Check if already expressed interest
  const existingInterest = await prisma.projectInterest.findFirst({
    where: {
      userId,
      projectId: data.projectId,
    },
  });

  if (existingInterest) {
    throw new Error('Interest already expressed for this project');
  }

  // Cannot express interest in own project
  if (project.piId === userId) {
    throw new Error('Cannot express interest in your own project');
  }

  // Create interest
  const interest = await prisma.projectInterest.create({
    data: {
      userId,
      projectId: data.projectId,
      message: data.message,
    },
    include: {
      project: true,
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
  });

  return interest;
}

/**
 * Get interests for a project (submitter only)
 */
export async function getProjectInterests(projectId: string, requestingUserId: string) {
  // Check if project exists and user is submitter
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (project.piId !== requestingUserId) {
    throw new Error('Only project PI can view interests');
  }

  const interests = await prisma.projectInterest.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          role: true,
          bio: true,
          linkedinUrl: true,
          websiteUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return interests;
}

/**
 * Get user's expressed interests
 */
export async function getUserInterests(userId: string) {
  const interests = await prisma.projectInterest.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          pi: {
            select: {
              id: true,
              fullName: true,
              organization: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return interests;
}

/**
 * Withdraw interest from project
 */
export async function withdrawInterest(userId: string, interestId: string) {
  const interest = await prisma.projectInterest.findUnique({
    where: { id: interestId },
  });

  if (!interest) {
    throw new Error('Interest not found');
  }

  if (interest.userId !== userId) {
    throw new Error('Unauthorized to withdraw this interest');
  }

  await prisma.projectInterest.delete({
    where: { id: interestId },
  });

  return { success: true };
}

/**
 * Bookmark a project
 */
export async function bookmarkProject(userId: string, projectId: string, notes?: string) {
  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Check if already bookmarked
  const existing = await prisma.projectBookmark.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  if (existing) {
    throw new Error('Project already bookmarked');
  }

  const bookmark = await prisma.projectBookmark.create({
    data: {
      userId,
      projectId,
      notes: notes || null,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          description: true,
          stage: true,
          researchAreas: true,
        },
      },
    },
  });

  return bookmark;
}

/**
 * Remove project bookmark
 */
export async function unbookmarkProject(userId: string, projectId: string) {
  const bookmark = await prisma.projectBookmark.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  if (!bookmark) {
    throw new Error('Bookmark not found');
  }

  await prisma.projectBookmark.delete({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });
}

/**
 * Get user's bookmarked projects
 */
export async function getUserProjectBookmarks(userId: string) {
  const bookmarks = await prisma.projectBookmark.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          pi: {
            select: {
              id: true,
              fullName: true,
              organization: true,
              department: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookmarks;
}

/**
 * List industry opportunities with filters
 */
export async function listOpportunities(filters: {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  postedBy?: string;
}) {
  const where: any = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.postedBy) {
    where.postedBy = filters.postedBy;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { companyName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      sponsorOrganization: true,
      sponsorContactId: true,
      postedBy: true,
      requirements: true,
      benefits: true,
      location: true,
      duration: true,
      deadline: true,
      dodAlignment: true,
      status: true,
      featured: true,
      pocUserId: true,
      pocFirstName: true,
      pocLastName: true,
      pocEmail: true,
      pocRank: true,
      createdAt: true,
      updatedAt: true,
      poster: {
        select: {
          id: true,
          fullName: true,
          organization: true,
          role: true,
        },
      },
      _count: {
        select: { interests: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return opportunities;
}

/**
 * Get opportunity by ID
 */
export async function getOpportunityById(opportunityId: string, userId?: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      poster: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          role: true,
        },
      },
      interests: userId ? {
        where: { userId },
        take: 1,
      } : false,
      _count: {
        select: { interests: true },
      },
    },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  return {
    ...opportunity,
    applicationCount: opportunity._count.interests,
    userApplication: opportunity.interests?.[0] || null,
  };
}

/**
 * Apply to opportunity
 */
export async function applyToOpportunity(userId: string, data: {
  opportunityId: string;
  message?: string;
}) {
  // Check if opportunity exists
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: data.opportunityId },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  if (opportunity.status !== 'active') {
    throw new Error('Opportunity is not open for applications');
  }

  // Check if already applied
  const existingApplication = await prisma.opportunityInterest.findFirst({
    where: {
      userId,
      opportunityId: data.opportunityId,
    },
  });

  if (existingApplication) {
    throw new Error('Already applied to this opportunity');
  }

  // Cannot apply to own opportunity
  if (opportunity.postedBy === userId) {
    throw new Error('Cannot apply to your own opportunity');
  }

  // Create application
  const application = await prisma.opportunityInterest.create({
    data: {
      userId,
      opportunityId: data.opportunityId,
      message: data.message,
      status: 'interested',
    },
    include: {
      opportunity: true,
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
  });

  return application;
}

/**
 * Bookmark an opportunity
 */
export async function bookmarkOpportunity(userId: string, opportunityId: string) {
  // Check if opportunity exists
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  // Check if already bookmarked (using OpportunityInterest as bookmark)
  const existing = await prisma.opportunityInterest.findUnique({
    where: {
      userId_opportunityId: {
        opportunityId,
        userId,
      },
    },
  });

  if (existing) {
    throw new Error('Opportunity already bookmarked');
  }

  const bookmark = await prisma.opportunityInterest.create({
    data: {
      userId,
      opportunityId,
      status: 'bookmarked',
    },
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          deadline: true,
          status: true,
        },
      },
    },
  });

  return bookmark;
}

/**
 * Remove opportunity bookmark
 */
export async function unbookmarkOpportunity(userId: string, opportunityId: string) {
  const bookmark = await prisma.opportunityInterest.findUnique({
    where: {
      userId_opportunityId: {
        opportunityId,
        userId,
      },
    },
  });

  if (!bookmark) {
    throw new Error('Bookmark not found');
  }

  await prisma.opportunityInterest.delete({
    where: {
      userId_opportunityId: {
        opportunityId,
        userId,
      },
    },
  });
}

/**
 * Get user's bookmarked opportunities
 */
export async function getUserOpportunityBookmarks(userId: string) {
  const bookmarks = await prisma.opportunityInterest.findMany({
    where: {
      userId,
      status: 'bookmarked',
    },
    include: {
      opportunity: {
        include: {
          poster: {
            select: {
              id: true,
              fullName: true,
              organization: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookmarks;
}
