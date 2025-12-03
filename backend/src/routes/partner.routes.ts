/**
 * Partner Routes
 *
 * All industry partner-related endpoints
 */

import { Router } from 'express';
import * as partnerController from '../controllers/partner.controller';
import { authenticateToken, optionalAuthentication } from '../middleware/auth';

const router = Router();

/**
 * GET /partners/favorites
 * Get user's favorited partners (must come before /:id route)
 */
router.get('/favorites', authenticateToken, partnerController.getFavorites);

/**
 * GET /partners
 * List all industry partners with filters
 */
router.get('/', optionalAuthentication, partnerController.listPartners);

/**
 * GET /partners/:id
 * Get partner details
 */
router.get('/:id', optionalAuthentication, partnerController.getPartner);

/**
 * POST /partners/:id/favorite
 * Favorite a partner
 */
router.post('/:id/favorite', authenticateToken, partnerController.favoritePartner);

/**
 * DELETE /partners/:id/favorite
 * Remove favorite
 */
router.delete('/:id/favorite', authenticateToken, partnerController.unfavoritePartner);

export default router;
