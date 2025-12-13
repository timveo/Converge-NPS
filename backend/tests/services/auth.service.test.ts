/**
 * Auth Service Unit Tests
 * Tests for registration, login, token refresh, and password reset
 */

import { AuthService } from '../../src/services/auth.service';
import { PrismaClient } from '@prisma/client';
import * as authUtils from '../../src/utils/auth';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    profile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userPassword: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    emailVerification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

// Get mocked prisma instance
const prisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterData = {
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
      organization: 'NPS',
      department: 'Engineering',
      role: 'Student',
    };

    it('should register a new user successfully', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.create as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.userPassword.create as jest.Mock).mockResolvedValue({});
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (prisma.userRole.create as jest.Mock).mockResolvedValue({});

      const result = await AuthService.register(validRegisterData);

      expect(result.userId).toBeDefined();
      expect(result.verificationToken).toBeDefined();
      expect(prisma.profile.create).toHaveBeenCalled();
      expect(prisma.userPassword.create).toHaveBeenCalled();
      expect(prisma.userRole.create).toHaveBeenCalled();
    });

    it('should convert email to lowercase', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.create as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.userPassword.create as jest.Mock).mockResolvedValue({});
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (prisma.userRole.create as jest.Mock).mockResolvedValue({});

      await AuthService.register({
        ...validRegisterData,
        email: 'JOHN@EXAMPLE.COM',
      });

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
    });

    it('should throw ConflictError if email already exists', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'john@example.com',
      });

      await expect(AuthService.register(validRegisterData)).rejects.toThrow(
        'Email already registered'
      );
    });

    it('should assign default student role', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.create as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.userPassword.create as jest.Mock).mockResolvedValue({});
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (prisma.userRole.create as jest.Mock).mockResolvedValue({});

      await AuthService.register(validRegisterData);

      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'student',
        }),
      });
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      fullName: 'John Doe',
      userRoles: [{ role: 'student' }],
    };

    const mockPasswordRecord = {
      userId: 'user-123',
      passwordHash: '$2b$12$hashedpassword',
    };

    it('should login successfully with valid credentials', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userPassword.findUnique as jest.Mock).mockResolvedValue(mockPasswordRecord);
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue({ verifiedAt: new Date() });
      (prisma.userSession.create as jest.Mock).mockResolvedValue({});

      jest.spyOn(authUtils, 'verifyPassword').mockResolvedValue(true);

      const result = await AuthService.login('john@example.com', 'SecurePass123!');

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login('nonexistent@example.com', 'password')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw UnauthorizedError for missing password record', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userPassword.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login('john@example.com', 'password')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userPassword.findUnique as jest.Mock).mockResolvedValue(mockPasswordRecord);

      jest.spyOn(authUtils, 'verifyPassword').mockResolvedValue(false);

      await expect(AuthService.login('john@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should convert email to lowercase for login', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userPassword.findUnique as jest.Mock).mockResolvedValue(mockPasswordRecord);
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue({ verifiedAt: new Date() });
      (prisma.userSession.create as jest.Mock).mockResolvedValue({});

      jest.spyOn(authUtils, 'verifyPassword').mockResolvedValue(true);

      await AuthService.login('JOHN@EXAMPLE.COM', 'SecurePass123!');

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        include: { userRoles: true },
      });
    });

    it('should create user session on successful login', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userPassword.findUnique as jest.Mock).mockResolvedValue(mockPasswordRecord);
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue({ verifiedAt: new Date() });
      (prisma.userSession.create as jest.Mock).mockResolvedValue({});

      jest.spyOn(authUtils, 'verifyPassword').mockResolvedValue(true);

      await AuthService.login('john@example.com', 'SecurePass123!');

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          refreshTokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('refreshAccessToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      userRoles: [{ role: 'student' }],
    };

    it('should refresh access token successfully', async () => {
      const mockRefreshToken = authUtils.generateRefreshToken('user-123');

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ user_id: 'user-123' }]);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await AuthService.refreshAccessToken(mockRefreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      await expect(AuthService.refreshAccessToken('invalid-token')).rejects.toThrow();
    });

    it('should throw UnauthorizedError when session not found', async () => {
      const mockRefreshToken = authUtils.generateRefreshToken('user-123');

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await expect(AuthService.refreshAccessToken(mockRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should throw UnauthorizedError when user not found', async () => {
      const mockRefreshToken = authUtils.generateRefreshToken('user-123');

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ user_id: 'user-123' }]);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await expect(AuthService.refreshAccessToken(mockRefreshToken)).rejects.toThrow(
        'User not found'
      );
    });

    it('should invalidate old refresh token on rotation', async () => {
      const mockRefreshToken = authUtils.generateRefreshToken('user-123');

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ user_id: 'user-123' }]);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await AuthService.refreshAccessToken(mockRefreshToken);

      // Verify old token is deleted
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should delete refresh token on logout', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await AuthService.logout('some-refresh-token');

      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should return empty string for non-existent email (prevent enumeration)', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.requestPasswordReset('nonexistent@example.com');

      expect(result).toBe('');
    });

    it('should return reset token for existing user', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
      });
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await AuthService.requestPasswordReset('john@example.com');

      expect(result).toBeDefined();
      expect(result.length).toBe(64); // 32 bytes hex
    });

    it('should convert email to lowercase', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await AuthService.requestPasswordReset('JOHN@EXAMPLE.COM');

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ user_id: 'user-123' }]);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await expect(AuthService.resetPassword('valid-token', 'NewSecurePass123!')).resolves.not.toThrow();
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await expect(AuthService.resetPassword('invalid-token', 'NewPass123!')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should invalidate all sessions after password reset', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ user_id: 'user-123' }]);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await AuthService.resetPassword('valid-token', 'NewSecurePass123!');

      // Should have multiple executeRaw calls: update password, mark token used, delete sessions
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ user_id: 'user-123' }]);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await expect(AuthService.verifyEmail('valid-verification-token')).resolves.not.toThrow();
    });

    it('should throw UnauthorizedError for invalid verification token', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await expect(AuthService.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });
  });

  describe('resendVerification', () => {
    it('should resend verification for unverified user', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
      });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ verified: false }]);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await AuthService.resendVerification('john@example.com');

      expect(result).toBeDefined();
      expect(result.length).toBe(64);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.resendVerification('nonexistent@example.com')).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw ConflictError for already verified email', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
      });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ verified: true }]);

      await expect(AuthService.resendVerification('john@example.com')).rejects.toThrow(
        'Email already verified'
      );
    });
  });
});
