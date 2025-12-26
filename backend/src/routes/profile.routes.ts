/**
 * Profile Routes
 *
 * All user profile-related endpoints
 */

import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All profile routes require authentication
router.use(authenticateToken);

/**
 * GET /users/me
 * Get current user's profile
 */
router.get('/me', ProfileController.getMyProfile);

/**
 * PATCH /users/me
 * Update current user's profile
 */
router.patch('/me', ProfileController.updateMyProfile);

/**
 * PATCH /users/me/privacy
 * Update privacy settings
 */
router.patch('/me/privacy', ProfileController.updatePrivacy);

/**
 * PATCH /users/me/onboarding
 * Update onboarding status
 */
router.patch('/me/onboarding', ProfileController.updateOnboarding);

/**
 * GET /users/me/qr-code
 * Get user's QR code
 */
router.get('/me/qr-code', ProfileController.getQRCode);

/**
 * POST /users/me/qr-code/regenerate
 * Regenerate QR code
 */
router.post('/me/qr-code/regenerate', ProfileController.regenerateQRCode);

/**
 * POST /users/me/avatar
 * Upload avatar URL
 */
router.post('/me/avatar', ProfileController.uploadAvatar);

/**
 * GET /users/search
 * Search profiles (admin/staff only)
 */
router.get('/search', requireRole('admin', 'staff'), ProfileController.searchProfiles);

/**
 * GET /users/participants
 * Get checked-in event participants (public profiles)
 */
router.get('/participants', ProfileController.getParticipants);

/**
 * GET /users/:userId
 * Get another user's profile (respects privacy)
 */
router.get('/:userId', ProfileController.getProfile);

export default router;
