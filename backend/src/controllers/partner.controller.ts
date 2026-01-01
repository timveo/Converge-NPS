/**
 * Partner Controller
 *
 * Handles industry partner endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as partnerService from '../services/partner.service';
import logger from '../utils/logger';

/**
 * GET /partners
 * List all industry partners with filters
 */
export async function listPartners(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = partnerService.partnerFiltersSchema.parse(req.query);
    const userId = req.user?.id;
    const result = await partnerService.listPartners(filters, userId);

    res.status(200).json({
      data: result.partners,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid filters',
          details: error.errors,
        },
      });
    }
    next(error);
  }
}

/**
 * GET /partners/:id
 * Get partner details
 */
export async function getPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const partner = await partnerService.getPartnerById(id, userId);

    res.status(200).json({
      data: partner,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /partners/:id/favorite
 * Favorite a partner
 */
export async function favoritePartner(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      logger.error('Favorite partner failed: Not authenticated');
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const { id: partnerId } = req.params;
    const { notes } = req.body;

    const favorite = await partnerService.favoritePartner(req.user.id, partnerId, notes);

    logger.info('Partner favorited', {
      userId: req.user.id,
      partnerId,
      favoriteId: favorite.id,
    });

    res.status(201).json({
      message: 'Partner favorited successfully',
      data: favorite,
    });
  } catch (error: any) {
    if (error.message === 'Partner already favorited') {
      logger.warn('Partner already favorited', {
        userId: req.user?.id,
        partnerId: req.params.id,
      });
      return res.status(409).json({
        error: {
          code: 'ALREADY_FAVORITED',
          message: error.message,
        },
      });
    }
    logger.error('Failed to favorite partner', {
      error: error.message,
      userId: req.user?.id,
      partnerId: req.params.id,
    });
    next(error);
  }
}

/**
 * DELETE /partners/:id/favorite
 * Remove favorite
 */
export async function unfavoritePartner(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      logger.error('Unfavorite partner failed: Not authenticated');
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const { id: partnerId } = req.params;

    await partnerService.unfavoritePartner(req.user.id, partnerId);

    logger.info('Partner unfavorited', { userId: req.user.id, partnerId });

    res.status(200).json({
      message: 'Partner unfavorited successfully',
    });
  } catch (error: any) {
    logger.error('Failed to unfavorite partner', {
      error: error.message,
      userId: req.user?.id,
      partnerId: req.params.id,
    });
    next(error);
  }
}

/**
 * GET /partners/favorites
 * Get user's favorited partners
 */
export async function getFavorites(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const favorites = await partnerService.getUserFavorites(req.user.id);

    res.status(200).json({
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
}
