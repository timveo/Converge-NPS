import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Research Projects routes
 */

// GET /v1/projects/bookmarks - Get user's bookmarked projects (must come before /:id)
router.get('/bookmarks', authenticate, projectController.getProjectBookmarks);

// GET /v1/projects - List projects
router.get('/', authenticate, projectController.listProjects);

// GET /v1/projects/:id - Get project details
router.get('/:id', authenticate, projectController.getProject);

// POST /v1/projects/:id/bookmark - Bookmark project
router.post('/:id/bookmark', authenticate, projectController.bookmarkProject);

// DELETE /v1/projects/:id/bookmark - Remove bookmark
router.delete('/:id/bookmark', authenticate, projectController.unbookmarkProject);

// POST /v1/projects/:id/interest - Express interest
router.post('/:id/interest', authenticate, projectController.expressInterest);

// GET /v1/projects/:id/interests - Get project interests (submitter only)
router.get('/:id/interests', authenticate, projectController.getProjectInterests);

/**
 * Project Interests routes
 */

// GET /v1/interests/me - Get my interests
router.get('/interests/me', authenticate, projectController.getMyInterests);

// DELETE /v1/interests/:id - Withdraw interest
router.delete('/interests/:id', authenticate, projectController.withdrawInterest);

/**
 * Industry Opportunities routes
 */

// GET /v1/opportunities/bookmarks - Get user's bookmarked opportunities (must come before /:id)
router.get('/opportunities/bookmarks', authenticate, projectController.getOpportunityBookmarks);

// GET /v1/opportunities - List opportunities
router.get('/opportunities', authenticate, projectController.listOpportunities);

// GET /v1/opportunities/:id - Get opportunity details
router.get('/opportunities/:id', authenticate, projectController.getOpportunity);

// POST /v1/opportunities/:id/bookmark - Bookmark opportunity
router.post('/opportunities/:id/bookmark', authenticate, projectController.bookmarkOpportunity);

// DELETE /v1/opportunities/:id/bookmark - Remove bookmark
router.delete('/opportunities/:id/bookmark', authenticate, projectController.unbookmarkOpportunity);

// POST /v1/opportunities/:id/apply - Apply to opportunity
router.post('/opportunities/:id/apply', authenticate, projectController.applyToOpportunity);

export default router;
