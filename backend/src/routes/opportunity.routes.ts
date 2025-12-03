/**
 * Opportunity Routes
 *
 * All industry opportunity-related endpoints
 */

import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Industry Opportunities routes
 */

// GET /v1/opportunities/bookmarks - Get user's bookmarked opportunities (must come before /:id)
router.get('/bookmarks', authenticate, projectController.getOpportunityBookmarks);

// GET /v1/opportunities - List opportunities
router.get('/', authenticate, projectController.listOpportunities);

// GET /v1/opportunities/:id - Get opportunity details
router.get('/:id', authenticate, projectController.getOpportunity);

// POST /v1/opportunities/:id/bookmark - Bookmark opportunity
router.post('/:id/bookmark', authenticate, projectController.bookmarkOpportunity);

// DELETE /v1/opportunities/:id/bookmark - Remove bookmark
router.delete('/:id/bookmark', authenticate, projectController.unbookmarkOpportunity);

// POST /v1/opportunities/:id/apply - Apply to opportunity
router.post('/:id/apply', authenticate, projectController.applyToOpportunity);

export default router;
