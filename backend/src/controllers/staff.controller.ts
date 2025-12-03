/**
 * Staff Controller
 *
 * Handles staff operations (check-in, etc.)
 */

import { Request, Response, NextFunction } from 'express';
import * as staffService from '../services/staff.service';
import { CheckInMethod } from '@prisma/client';
import logger from '../utils/logger';
import { z } from 'zod';

// Validation schema for check-in
const checkInSchema = z.object({
  userId: z.string().uuid(),
  checkInMethod: z.enum(['qr_scan', 'manual_search', 'walk_in']),
  isWalkIn: z.boolean().optional().default(false),
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

    const checkIn = await staffService.checkInAttendee(
      req.user.id,
      data.userId,
      data.checkInMethod as CheckInMethod,
      data.isWalkIn
    );

    logger.info('Attendee checked in', {
      staffId: req.user.id,
      userId: data.userId,
      method: data.checkInMethod,
    });

    res.status(201).json({
      message: 'Attendee checked in successfully',
      data: checkIn,
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

    res.status(200).json({
      data: stats,
    });
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
