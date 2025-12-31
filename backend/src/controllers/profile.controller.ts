/**
 * Profile Controller
 *
 * Handles user profile endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileSchema, UpdatePrivacySchema, UpdateOnboardingSchema } from '../types/schemas';
import logger from '../utils/logger';

export class ProfileController {
  /**
   * GET /users/me
   * Get current user's profile
   */
  static async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const profile = await ProfileService.getProfile(req.user.id, req.user.id);

      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/me
   * Update current user's profile
   */
  static async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const data = UpdateProfileSchema.parse(req.body) as any;

      const profile = await ProfileService.updateProfile(req.user.id, data);

      logger.info('Profile updated', { userId: req.user.id });

      res.status(200).json({
        message: 'Profile updated successfully',
        profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/me/privacy
   * Update privacy settings
   */
  static async updatePrivacy(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const data = UpdatePrivacySchema.parse(req.body) as any;

      const profile = await ProfileService.updatePrivacy(req.user.id, data);

      logger.info('Privacy settings updated', { userId: req.user.id });

      res.status(200).json({
        message: 'Privacy settings updated successfully',
        profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/me/onboarding
   * Update onboarding status
   */
  static async updateOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { onboardingStep, onboardingCompleted } = UpdateOnboardingSchema.parse(req.body) as any;

      const profile = await ProfileService.updateOnboarding(req.user.id, onboardingStep, onboardingCompleted);

      logger.info('Onboarding updated', { userId: req.user.id, step: onboardingStep });

      res.status(200).json({
        message: 'Onboarding status updated',
        profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/:userId
   * Get another user's profile (respects privacy)
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { userId } = req.params;

      const profile = await ProfileService.getProfile(userId, req.user.id);

      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/qr-code
   * Get user's QR code
   */
  static async getQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const qrCode = await ProfileService.getQRCode(req.user.id);

      res.status(200).json({ qrCode });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/me/qr-code/regenerate
   * Regenerate QR code
   */
  static async regenerateQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const qrCode = await ProfileService.regenerateQRCode(req.user.id);

      logger.info('QR code regenerated', { userId: req.user.id });

      res.status(200).json({
        message: 'QR code regenerated successfully',
        qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/me/avatar
   * Upload avatar (URL only, actual upload handled elsewhere)
   */
  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { avatarUrl } = req.body;

      if (!avatarUrl || typeof avatarUrl !== 'string') {
        return res.status(400).json({
          error: { code: 'INVALID_AVATAR_URL', message: 'Valid avatar URL required' },
        });
      }

      const profile = await ProfileService.uploadAvatar(req.user.id, avatarUrl);

      logger.info('Avatar uploaded', { userId: req.user.id });

      res.status(200).json({
        message: 'Avatar uploaded successfully',
        profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/search
   * Search profiles (admin/staff only)
   */
  static async searchProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { search, organization, department, role, page, limit } = req.query;

      const result = await ProfileService.searchProfiles({
        search: search as string | undefined,
        organization: organization as string | undefined,
        department: department as string | undefined,
        role: role as string | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/participants
   * Get checked-in event participants (public profiles only)
   * Excludes users already connected to the requester
   */
  static async getParticipants(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { search, page, limit, checkedInOnly } = req.query;

      const result = await ProfileService.getCheckedInParticipants({
        search: search as string | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        requesterId: req.user.id,
        checkedInOnly: checkedInOnly === 'true',
      });

      res.status(200).json({
        success: true,
        data: result.participants,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        privateProfileMatch: result.privateProfileMatch,
      });
    } catch (error) {
      next(error);
    }
  }
}
