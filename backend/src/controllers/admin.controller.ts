import { Request, Response } from 'express';
import * as adminService from '../services/admin.service';

// Middleware to check admin/staff role
export function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || !req.user.roles || !req.user.roles.some(role => ['admin', 'staff'].includes(role))) {
    return res.status(403).json({
      success: false,
      error: 'Admin or staff access required',
    });
  }
  next();
}

// Session Management

/**
 * POST /v1/admin/sessions
 * Create new session
 */
export async function createSession(req: Request, res: Response) {
  try {
    const data = adminService.createSessionSchema.parse(req.body) as any;
    const session = await adminService.createSession(data);

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid session data',
        details: error.errors,
      });
    }

    if (error.message.includes('conflict') || error.message.includes('time')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create session',
    });
  }
}

/**
 * PATCH /v1/admin/sessions/:id
 * Update session
 */
export async function updateSession(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = adminService.updateSessionSchema.parse(req.body) as any;
    const session = await adminService.updateSession(id, data);

    res.json({
      success: true,
      data: session,
      message: 'Session updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid session data',
        details: error.errors,
      });
    }

    if (error.message === 'Session not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('conflict') || error.message.includes('time')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update session',
    });
  }
}

/**
 * DELETE /v1/admin/sessions/:id
 * Delete or cancel session
 */
export async function deleteSession(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await adminService.deleteSession(id);

    res.json({
      success: true,
      data: result,
      message: result.deleted ? 'Session deleted' : 'Session cancelled (had RSVPs)',
    });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
    });
  }
}

// User Management

/**
 * GET /v1/admin/users
 * List all users
 */
export async function listUsers(req: Request, res: Response) {
  try {
    const filters = {
      role: req.query.role as string,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await adminService.listUsers(filters);

    res.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
}

/**
 * GET /v1/admin/users/:id
 * Get user details
 */
export async function getUserDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await adminService.getUserDetails(id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
}

/**
 * PATCH /v1/admin/users/:id/role
 * Update user role
 */
export async function updateUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = adminService.updateUserRoleSchema.parse(req.body) as any;
    const user = await adminService.updateUserRole(id, data);

    res.json({
      success: true,
      data: user,
      message: 'User role updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        details: error.errors,
      });
    }

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
    });
  }
}

/**
 * POST /v1/admin/users/:id/suspend
 * Suspend user account
 */
export async function suspendUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Suspension reason required',
      });
    }

    const result = await adminService.suspendUser(id, reason);

    res.json({
      success: true,
      data: result,
      message: 'User suspended successfully',
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Cannot suspend')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to suspend user',
    });
  }
}

// Analytics

/**
 * GET /v1/admin/stats
 * Get dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const stats = await adminService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
    });
  }
}

/**
 * GET /v1/admin/stats/rsvps
 * Get RSVP statistics
 */
export async function getRsvpStats(req: Request, res: Response) {
  try {
    const stats = await adminService.getRsvpStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSVP stats',
    });
  }
}

/**
 * GET /v1/admin/stats/activity
 * Get activity report
 */
export async function getActivityReport(req: Request, res: Response) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    const report = await adminService.getActivityReport(days);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity report',
    });
  }
}

/**
 * GET /v1/admin/audit-logs
 * Get audit logs
 */
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const filters = {
      eventType: req.query.eventType as string,
      userId: req.query.userId as string,
      resourceType: req.query.resourceType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await adminService.getAuditLogs(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
    });
  }
}
