import { Request, Response } from 'express';
import * as sessionService from '../services/session.service';
import logger from '../utils/logger';

/**
 * GET /v1/sessions
 * List all sessions with optional filters
 */
export async function listSessions(req: Request, res: Response) {
  try {
    const filters = sessionService.sessionFiltersSchema.parse(req.query);
    const sessions = await sessionService.listSessions(filters);

    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
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
      error: 'Failed to fetch sessions',
    });
  }
}

/**
 * GET /v1/sessions/:id
 * Get session details with RSVP status
 */
export async function getSession(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const session = await sessionService.getSessionById(id, userId);

    res.json({
      success: true,
      data: session,
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
      error: 'Failed to fetch session',
    });
  }
}

/**
 * POST /v1/sessions/:id/rsvp
 * Create RSVP for session
 */
export async function createRsvp(req: Request, res: Response) {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user!.id;

    const data = {
      sessionId,
      ...sessionService.createRsvpSchema.parse(req.body),
    };

    const rsvp = await sessionService.createRsvp(userId, data);

    logger.info('RSVP created', {
      userId,
      sessionId,
      rsvpId: rsvp.id,
      status: rsvp.status,
    });

    res.status(201).json({
      success: true,
      data: rsvp,
      message: 'RSVP created successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid RSVP data',
        details: error.errors,
      });
    }

    if (error.message.includes('not found') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('capacity') || error.message.includes('conflict')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create RSVP',
    });
  }
}

/**
 * PATCH /v1/rsvps/:id
 * Update RSVP status
 */
export async function updateRsvp(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const data = sessionService.updateRsvpSchema.parse(req.body) as any;

    const rsvp = await sessionService.updateRsvp(userId, id, data);

    logger.info('RSVP updated', {
      userId,
      rsvpId: id,
      newStatus: rsvp.status,
    });

    res.json({
      success: true,
      data: rsvp,
      message: 'RSVP updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid RSVP data',
        details: error.errors,
      });
    }

    if (error.message === 'RSVP not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message === 'Unauthorized to update this RSVP') {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('capacity') || error.message.includes('conflict')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update RSVP',
    });
  }
}

/**
 * DELETE /v1/rsvps/:id
 * Delete RSVP
 */
export async function deleteRsvp(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await sessionService.deleteRsvp(userId, id);

    logger.info('RSVP deleted', {
      userId,
      rsvpId: id,
    });

    res.json({
      success: true,
      message: 'RSVP deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'RSVP not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message === 'Unauthorized to delete this RSVP') {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete RSVP',
    });
  }
}

/**
 * GET /v1/rsvps/me
 * Get current user's RSVPs
 */
export async function getMyRsvps(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const filters = {
      status: req.query.status as any,
      upcoming: req.query.upcoming === 'true',
    };

    const rsvps = await sessionService.getUserRsvps(userId, filters);

    res.json({
      success: true,
      data: rsvps,
      count: rsvps.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSVPs',
    });
  }
}

/**
 * GET /v1/sessions/:id/attendees
 * Get session attendees (admin/staff only)
 */
export async function getAttendees(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userRole = req.user!.roles[0]; // Get first role

    const attendees = await sessionService.getSessionAttendees(id, userRole);

    res.json({
      success: true,
      data: attendees,
      count: attendees.length,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendees',
    });
  }
}

/**
 * GET /v1/sessions/my-schedule
 * Get current user's schedule (RSVP'd sessions)
 */
export async function getMySchedule(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const filters = {
      status: 'confirmed' as any,
      upcoming: true,
    };

    const rsvps = await sessionService.getUserRsvps(userId, filters);

    res.json({
      success: true,
      data: rsvps,
      count: rsvps.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schedule',
    });
  }
}

/**
 * GET /v1/sessions/:id/conflicts
 * Check for schedule conflicts
 */
export async function checkConflicts(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await sessionService.checkScheduleConflicts(userId, id);

    res.json({
      success: true,
      data: result,
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
      error: 'Failed to check conflicts',
    });
  }
}
