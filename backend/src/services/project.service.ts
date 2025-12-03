import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

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
    where.submittedBy = filters.submittedBy;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search } },
    ];
  }

  const projects = await prisma.researchProjects.findMany({
    where,
    include: {
      submitter: {
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
  const project = await prisma.researchProjects.findUnique({
    where: { id: projectId },
    include: {
      submitter: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          role: true,
          bio: true,
          linkedin: true,
          github: true,
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
  const project = await prisma.researchProjects.findUnique({
    where: { id: data.projectId },
    include: {
      submitter: {
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
  const existingInterest = await prisma.projectInterests.findFirst({
    where: {
      userId,
      projectId: data.projectId,
    },
  });

  if (existingInterest) {
    throw new Error('Interest already expressed for this project');
  }

  // Cannot express interest in own project
  if (project.submittedBy === userId) {
    throw new Error('Cannot express interest in your own project');
  }

  // Create interest
  const interest = await prisma.projectInterests.create({
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
  const project = await prisma.researchProjects.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (project.submittedBy !== requestingUserId) {
    throw new Error('Only project submitter can view interests');
  }

  const interests = await prisma.projectInterests.findMany({
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
          linkedin: true,
          github: true,
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
  const interests = await prisma.projectInterests.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          submitter: {
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
  const interest = await prisma.projectInterests.findUnique({
    where: { id: interestId },
  });

  if (!interest) {
    throw new Error('Interest not found');
  }

  if (interest.userId !== userId) {
    throw new Error('Unauthorized to withdraw this interest');
  }

  await prisma.projectInterests.delete({
    where: { id: interestId },
  });

  return { success: true };
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

  const opportunities = await prisma.industryOpportunities.findMany({
    where,
    include: {
      poster: {
        select: {
          id: true,
          fullName: true,
          organization: true,
          role: true,
        },
      },
      _count: {
        select: { applications: true },
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
  const opportunity = await prisma.industryOpportunities.findUnique({
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
      applications: userId ? {
        where: { userId },
        take: 1,
      } : false,
      _count: {
        select: { applications: true },
      },
    },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  return {
    ...opportunity,
    applicationCount: opportunity._count.applications,
    userApplication: opportunity.applications?.[0] || null,
  };
}

/**
 * Apply to opportunity
 */
export async function applyToOpportunity(userId: string, data: {
  opportunityId: string;
  coverLetter?: string;
  resumeUrl?: string;
}) {
  // Check if opportunity exists
  const opportunity = await prisma.industryOpportunities.findUnique({
    where: { id: data.opportunityId },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  if (opportunity.status !== 'open') {
    throw new Error('Opportunity is not open for applications');
  }

  // Check if already applied
  const existingApplication = await prisma.opportunityApplications.findFirst({
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
  const application = await prisma.opportunityApplications.create({
    data: {
      userId,
      opportunityId: data.opportunityId,
      coverLetter: data.coverLetter,
      resumeUrl: data.resumeUrl,
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
