import { Router } from 'express';
import * as recommendationController from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Recommendation routes
 */

// POST /v1/recommendations - Get personalized AI recommendations
router.post('/', authenticate, recommendationController.getRecommendations);

export default router;
