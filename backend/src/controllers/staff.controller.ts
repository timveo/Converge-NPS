/**
 * Staff Controller
 *
 * Handles staff operations (walk-in registration, etc.)
 */

import { Request, Response, NextFunction } from 'express';
import * as staffService from '../services/staff.service';
import logger from '../utils/logger';
import { z } from 'zod';

// Validation schema for check-in
const checkInSchema = z.object({
  userId: z.string().uuid(),
});

// Validation schema for walk-in registration
const walkInSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().max(255),
  organization: z.string().min(1).max(200),
  participantType: z.enum(['student', 'faculty', 'industry', 'alumni', 'guest']),
});

/**
 * POST /staff/checkin
 * Check in an attendee
 */
export async function checkInAttendee(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const data = checkInSchema.parse(req.body);

    const result = await staffService.checkInAttendee(req.user.id, data.userId);

    logger.info('Attendee checked in', {
      staffId: req.user.id,
      userId: data.userId,
    });

    res.status(200).json({
      message: 'Attendee checked in successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid check-in data',
          details: error.errors,
        },
      });
    }
    next(error);
  }
}

/**
 * GET /staff/checkin/stats
 * Get check-in statistics
 */
export async function getCheckInStats(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const stats = await staffService.getCheckInStats();

    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /staff/checkin/recent
 * Get recent check-ins
 */
export async function getRecentCheckIns(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const recentCheckIns = await staffService.getRecentCheckIns(limit);

    res.status(200).json({ data: recentCheckIns });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /staff/search
 * Search for attendees
 */
export async function searchAttendees(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query must be at least 2 characters',
        },
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const results = await staffService.searchAttendees(query, limit);

    res.status(200).json({
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /staff/walkin
 * Register and check in a walk-in attendee
 */
export async function registerWalkIn(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const data = walkInSchema.parse(req.body) as {
      firstName: string;
      lastName: string;
      email: string;
      organization: string;
      participantType: string;
    };

    const result = await staffService.registerWalkIn(req.user.id, data);

    logger.info('Walk-in attendee registered and checked in', {
      staffId: req.user.id,
      userId: result.id,
      email: result.email,
    });

    res.status(201).json({
      message: 'Walk-in attendee registered and checked in successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid walk-in registration data',
          details: error.errors,
        },
      });
    }
    next(error);
  }
}
