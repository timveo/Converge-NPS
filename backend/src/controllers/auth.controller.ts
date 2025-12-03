/**
 * Authentication Controller
 *
 * Handles authentication endpoints (register, login, logout, password reset, etc.)
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from '../types/schemas';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * POST /auth/register
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const data = RegisterSchema.parse(req.body);

      // Register user
      const { userId, verificationToken } = await AuthService.register(data);

      // TODO: Send verification email
      // await sendEmail(data.email, 'Verify your email', {
      //   verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
      // });

      logger.info('User registered', { userId, email: data.email });

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId,
        // For development only (remove in production)
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const { email, password } = LoginSchema.parse(req.body);

      // Login user
      const { user, accessToken, refreshToken } = await AuthService.login(email, password);

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/auth/refresh',
      });

      logger.info('User logged in', { userId: user.id, email: user.email });

      res.status(200).json({
        message: 'Login successful',
        user,
        accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token required',
          },
        });
      }

      // Refresh tokens
      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshAccessToken(refreshToken);

      // Set new refresh token in cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/auth/refresh',
      });

      res.status(200).json({
        message: 'Token refreshed',
        accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken', { path: '/auth/refresh' });

      logger.info('User logged out', { userId: req.user?.id });

      res.status(200).json({
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   * Request password reset
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = ForgotPasswordSchema.parse(req.body);

      const resetToken = await AuthService.requestPasswordReset(email);

      if (resetToken) {
        // TODO: Send password reset email
        // await sendEmail(email, 'Reset your password', {
        //   resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        // });

        logger.info('Password reset requested', { email });
      }

      // Always return success (prevent email enumeration)
      res.status(200).json({
        message: 'If the email exists, a password reset link has been sent.',
        // For development only (remove in production)
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   * Reset password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = ResetPasswordSchema.parse(req.body);

      await AuthService.resetPassword(token, password);

      logger.info('Password reset successful');

      res.status(200).json({
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-email
   * Verify email address
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = VerifyEmailSchema.parse(req.body);

      await AuthService.verifyEmail(token);

      logger.info('Email verified');

      res.status(200).json({
        message: 'Email verified successfully. You can now log in.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/resend-verification
   * Resend verification email
   */
  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = ForgotPasswordSchema.parse(req.body); // Reuse schema

      const verificationToken = await AuthService.resendVerification(email);

      // TODO: Send verification email
      // await sendEmail(email, 'Verify your email', {
      //   verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
      // });

      logger.info('Verification email resent', { email });

      res.status(200).json({
        message: 'Verification email sent.',
        // For development only (remove in production)
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me
   * Get current user
   */
  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
      }

      res.status(200).json({
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  }
}
