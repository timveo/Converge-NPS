import { Request, Response } from 'express';
import * as recommendationService from '../services/recommendation.service';
import logger from '../utils/logger';

/**
 * POST /v1/recommendations
 * Get personalized AI recommendations for the current user
 */
export async function getRecommendations(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { type } = req.body;

    // Validate type if provided
    const validTypes = ['session', 'opportunity', 'project', 'industry_partner'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const recommendations = await recommendationService.getPersonalizedRecommendations(
      userId,
      type
    );

    res.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    logger.error('Error getting recommendations', {
      error: error.message,
      userId: req.user?.id,
    });

    if (error.message === 'User profile not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    // Handle rate limiting from AI provider
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
    });
  }
}

/**
 * GET /v1/connections/recommendations
 * Get connection recommendations (rule-based, not AI)
 */
export async function getConnectionRecommendations(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getConnectionRecommendations(
      userId,
      limit
    );

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    logger.error('Error getting connection recommendations', {
      error: error.message,
      userId: req.user?.id,
    });

    if (error.message === 'User profile not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get connection recommendations',
    });
  }
}
