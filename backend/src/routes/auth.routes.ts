/**
 * Authentication Routes
 *
 * All authentication-related endpoints
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', AuthController.register);

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', AuthController.login);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', AuthController.refresh);

/**
 * POST /auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', authenticateToken, AuthController.logout);

/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', AuthController.forgotPassword);

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', AuthController.resetPassword);

/**
 * POST /auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', AuthController.verifyEmail);

/**
 * POST /auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', AuthController.resendVerification);

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, AuthController.me);

export default router;
