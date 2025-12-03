import { Request, Response } from 'express';
import * as projectService from '../services/project.service';

/**
 * GET /v1/projects
 * List research projects with filters
 */
export async function listProjects(req: Request, res: Response) {
  try {
    const filters = projectService.projectFiltersSchema.parse(req.query);
    const projects = await projectService.listProjects(filters);

    res.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid filters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
}

/**
 * GET /v1/projects/:id
 * Get project details
 */
export async function getProject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = await projectService.getProjectById(id, userId);

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    if (error.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
}

/**
 * POST /v1/projects/:id/interest
 * Express interest in project
 */
export async function expressInterest(req: Request, res: Response) {
  try {
    const { id: projectId } = req.params;
    const userId = req.user!.id;

    const data = projectService.createProjectInterestSchema.parse({
      projectId,
      ...req.body,
    });

    const interest = await projectService.expressInterest(userId, data);

    res.status(201).json({
      success: true,
      data: interest,
      message: 'Interest expressed successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: error.errors,
      });
    }

    if (error.message.includes('not found') || error.message.includes('already')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('own project')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to express interest',
    });
  }
}

/**
 * GET /v1/projects/:id/interests
 * Get interests for a project (submitter only)
 */
export async function getProjectInterests(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const interests = await projectService.getProjectInterests(id, userId);

    res.json({
      success: true,
      data: interests,
      count: interests.length,
    });
  } catch (error: any) {
    if (error.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('submitter')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch interests',
    });
  }
}

/**
 * GET /v1/interests/me
 * Get user's expressed interests
 */
export async function getMyInterests(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const interests = await projectService.getUserInterests(userId);

    res.json({
      success: true,
      data: interests,
      count: interests.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch interests',
    });
  }
}

/**
 * DELETE /v1/interests/:id
 * Withdraw interest
 */
export async function withdrawInterest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await projectService.withdrawInterest(userId, id);

    res.json({
      success: true,
      message: 'Interest withdrawn successfully',
    });
  } catch (error: any) {
    if (error.message === 'Interest not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to withdraw interest',
    });
  }
}

/**
 * GET /v1/opportunities
 * List industry opportunities
 */
export async function listOpportunities(req: Request, res: Response) {
  try {
    const filters = {
      type: req.query.type as string,
      category: req.query.category as string,
      status: req.query.status as string,
      search: req.query.search as string,
      postedBy: req.query.postedBy as string,
    };

    const opportunities = await projectService.listOpportunities(filters);

    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities',
    });
  }
}

/**
 * GET /v1/opportunities/:id
 * Get opportunity details
 */
export async function getOpportunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const opportunity = await projectService.getOpportunityById(id, userId);

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error: any) {
    if (error.message === 'Opportunity not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity',
    });
  }
}

/**
 * POST /v1/opportunities/:id/apply
 * Apply to opportunity
 */
export async function applyToOpportunity(req: Request, res: Response) {
  try {
    const { id: opportunityId } = req.params;
    const userId = req.user!.id;

    const application = await projectService.applyToOpportunity(userId, {
      opportunityId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: application,
      message: 'Application submitted successfully',
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('already') || error.message.includes('not open')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('own opportunity')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
    });
  }
}
