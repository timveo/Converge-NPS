/**
 * Auth Controller Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';

// Mock the AuthService
jest.mock('../../src/services/auth.service');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      cookies: {},
      user: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockReq.body = {
        email: 'test@nps.edu',
        password: 'SecurePass123!',
        fullName: 'Test User',
      };

      (AuthService.register as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        verificationToken: 'token-abc',
      });

      await AuthController.register(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Registration successful. Please check your email to verify your account.',
          userId: 'user-123',
        })
      );
    });

    it('should pass validation errors to next', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'short',
      };

      await AuthController.register(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      mockReq.body = {
        email: 'test@nps.edu',
        password: 'SecurePass123!',
        fullName: 'Test User',
      };

      const error = new Error('User already exists');
      (AuthService.register as jest.Mock).mockRejectedValue(error);

      await AuthController.register(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockReq.body = {
        email: 'test@nps.edu',
        password: 'SecurePass123!',
      };

      (AuthService.login as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@nps.edu' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await AuthController.login(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          accessToken: 'access-token',
        })
      );
    });

    it('should pass login errors to next', async () => {
      mockReq.body = {
        email: 'test@nps.edu',
        password: 'wrong-password',
      };

      const error = new Error('Invalid credentials');
      (AuthService.login as jest.Mock).mockRejectedValue(error);

      await AuthController.login(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens from cookie', async () => {
      mockReq.cookies = { refreshToken: 'old-refresh-token' };

      (AuthService.refreshAccessToken as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await AuthController.refresh(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.cookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token refreshed',
          accessToken: 'new-access-token',
        })
      );
    });

    it('should refresh tokens from body', async () => {
      mockReq.body = { refreshToken: 'old-refresh-token' };

      (AuthService.refreshAccessToken as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await AuthController.refresh(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if no refresh token', async () => {
      mockReq.cookies = {};
      mockReq.body = {};

      await AuthController.refresh(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'MISSING_REFRESH_TOKEN',
          }),
        })
      );
    });

    it('should pass refresh errors to next', async () => {
      mockReq.cookies = { refreshToken: 'invalid-token' };

      const error = new Error('Invalid refresh token');
      (AuthService.refreshAccessToken as jest.Mock).mockRejectedValue(error);

      await AuthController.refresh(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should logout user with refresh token', async () => {
      mockReq.cookies = { refreshToken: 'refresh-token' };
      mockReq.user = { id: 'user-123' } as any;

      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      await AuthController.logout(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(AuthService.logout).toHaveBeenCalledWith('refresh-token');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/auth/refresh' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });

    it('should logout user without refresh token', async () => {
      mockReq.cookies = {};
      mockReq.body = {};

      await AuthController.logout(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(AuthService.logout).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('forgotPassword', () => {
    it('should request password reset successfully', async () => {
      mockReq.body = { email: 'test@nps.edu' };

      (AuthService.requestPasswordReset as jest.Mock).mockResolvedValue('reset-token');

      await AuthController.forgotPassword(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'If the email exists, a password reset link has been sent.',
        })
      );
    });

    it('should return success even if email does not exist', async () => {
      mockReq.body = { email: 'nonexistent@nps.edu' };

      (AuthService.requestPasswordReset as jest.Mock).mockResolvedValue(null);

      await AuthController.forgotPassword(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockReq.body = {
        token: 'valid-reset-token',
        password: 'NewSecurePass123!',
      };

      (AuthService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      await AuthController.resetPassword(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password reset successful. Please login with your new password.',
        })
      );
    });

    it('should pass reset errors to next', async () => {
      mockReq.body = {
        token: 'invalid-token',
        password: 'NewSecurePass123!',
      };

      const error = new Error('Invalid reset token');
      (AuthService.resetPassword as jest.Mock).mockRejectedValue(error);

      await AuthController.resetPassword(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockReq.body = { token: 'valid-verification-token' };

      (AuthService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      await AuthController.verifyEmail(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email verified successfully. You can now log in.',
        })
      );
    });

    it('should pass verification errors to next', async () => {
      mockReq.body = { token: 'invalid-token' };

      const error = new Error('Invalid verification token');
      (AuthService.verifyEmail as jest.Mock).mockRejectedValue(error);

      await AuthController.verifyEmail(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email', async () => {
      mockReq.body = { email: 'test@nps.edu' };

      (AuthService.resendVerification as jest.Mock).mockResolvedValue('new-verification-token');

      await AuthController.resendVerification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Verification email sent.',
        })
      );
    });
  });

  describe('me', () => {
    it('should return current user', async () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@nps.edu',
        roles: ['student'],
      } as any;

      await AuthController.me(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockReq.user,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await AuthController.me(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
    });
  });
});
