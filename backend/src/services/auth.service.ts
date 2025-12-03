/**
 * Authentication Service
 *
 * Database operations for authentication flow
 */

import { PrismaClient, Profile } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/auth';
import { UnauthorizedError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  organization?: string;
  department?: string;
  role?: string;
}

export interface LoginResponse {
  user: Partial<Profile>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<{ userId: string; verificationToken: string }> {
    // Check if user already exists
    const existing = await prisma.profile.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user profile (use raw SQL or create via Supabase Auth)
    // For MVP, we'll create directly in profiles table
    // In production, this would integrate with Supabase Auth

    const userId = crypto.randomUUID();

    await prisma.profile.create({
      data: {
        id: userId,
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        organization: data.organization,
        department: data.department,
        role: data.role,
        profileVisibility: 'public',
        allowQrScanning: true,
        allowMessaging: true,
        hideContactInfo: false,
        onboardingCompleted: false,
        onboardingStep: 0,
      },
    });

    // Store password hash in separate auth table (not in profile)
    // For MVP, we'll use a passwords table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_passwords (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await prisma.$executeRaw`
      INSERT INTO user_passwords (user_id, password_hash)
      VALUES (${userId}::uuid, ${passwordHash})
      ON CONFLICT (user_id) DO UPDATE SET password_hash = ${passwordHash}, updated_at = NOW();
    `;

    // Store verification token
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS email_verifications (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await prisma.$executeRaw`
      INSERT INTO email_verifications (user_id, token_hash, expires_at)
      VALUES (${userId}::uuid, ${verificationTokenHash}, ${verificationTokenExpiry})
      ON CONFLICT (user_id) DO UPDATE
      SET token_hash = ${verificationTokenHash}, expires_at = ${verificationTokenExpiry};
    `;

    // Assign default role (student)
    await prisma.userRole.create({
      data: {
        userId,
        role: 'student',
      },
    });

    return { userId, verificationToken };
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    // Find user
    const user = await prisma.profile.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userRoles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Get password hash
    const passwordRecord: any = await prisma.$queryRaw`
      SELECT password_hash FROM user_passwords WHERE user_id = ${user.id}::uuid;
    `;

    if (!passwordRecord || passwordRecord.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = await verifyPassword(password, passwordRecord[0].password_hash);

    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check email verification
    const verification: any = await prisma.$queryRaw`
      SELECT verified FROM email_verifications WHERE user_id = ${user.id}::uuid;
    `;

    if (!verification || verification.length === 0 || !verification[0].verified) {
      throw new UnauthorizedError('Email not verified. Please check your email.');
    }

    // Generate tokens
    const roles = user.userRoles.map(r => r.role);
    const accessToken = generateAccessToken(user.id, user.email, roles);
    const refreshToken = await generateRefreshToken(user.id);

    // Store refresh token hash
    const refreshTokenHash = hashToken(refreshToken);
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        refresh_token_hash TEXT NOT NULL,
        device_info TEXT,
        ip_address INET,
        last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.$executeRaw`
      INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
      VALUES (${user.id}::uuid, ${refreshTokenHash}, ${expiresAt});
    `;

    // Return user data (without sensitive fields)
    const { ...safeUser } = user;

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload || typeof payload === 'string' || !payload.sub) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const userId = payload.sub;

    // Check if refresh token exists in database
    const refreshTokenHash = hashToken(refreshToken);
    const session: any = await prisma.$queryRaw`
      SELECT * FROM user_sessions
      WHERE user_id = ${userId}::uuid AND refresh_token_hash = ${refreshTokenHash}
      AND expires_at > NOW();
    `;

    if (!session || session.length === 0) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user with roles
    const user = await prisma.profile.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate new tokens (single-use rotation)
    const roles = user.userRoles.map(r => r.role);
    const newAccessToken = generateAccessToken(user.id, user.email, roles);
    const newRefreshToken = await generateRefreshToken(user.id);

    // Invalidate old refresh token and store new one
    await prisma.$executeRaw`
      DELETE FROM user_sessions WHERE refresh_token_hash = ${refreshTokenHash};
    `;

    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.$executeRaw`
      INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
      VALUES (${userId}::uuid, ${newRefreshTokenHash}, ${expiresAt});
    `;

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user
   */
  static async logout(refreshToken: string): Promise<void> {
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.$executeRaw`
      DELETE FROM user_sessions WHERE refresh_token_hash = ${refreshTokenHash};
    `;
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<string> {
    // Find user (silently fail to prevent email enumeration)
    const user = await prisma.profile.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return success even if user doesn't exist (prevent email enumeration)
      return '';
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS password_resets (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await prisma.$executeRaw`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES (${user.id}::uuid, ${resetTokenHash}, ${expiresAt})
      ON CONFLICT (user_id) DO UPDATE
      SET token_hash = ${resetTokenHash}, expires_at = ${expiresAt}, used = false;
    `;

    return resetToken;
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find reset token
    const reset: any = await prisma.$queryRaw`
      SELECT user_id FROM password_resets
      WHERE token_hash = ${tokenHash} AND expires_at > NOW() AND used = false;
    `;

    if (!reset || reset.length === 0) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const userId = reset[0].user_id;

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.$executeRaw`
      UPDATE user_passwords SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE user_id = ${userId}::uuid;
    `;

    // Mark token as used
    await prisma.$executeRaw`
      UPDATE password_resets SET used = true WHERE token_hash = ${tokenHash};
    `;

    // Invalidate all sessions (force re-login)
    await prisma.$executeRaw`
      DELETE FROM user_sessions WHERE user_id = ${userId}::uuid;
    `;
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find verification token
    const verification: any = await prisma.$queryRaw`
      SELECT user_id FROM email_verifications
      WHERE token_hash = ${tokenHash} AND expires_at > NOW() AND verified = false;
    `;

    if (!verification || verification.length === 0) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }

    const userId = verification[0].user_id;

    // Mark as verified
    await prisma.$executeRaw`
      UPDATE email_verifications SET verified = true WHERE user_id = ${userId}::uuid;
    `;
  }

  /**
   * Resend verification email
   */
  static async resendVerification(email: string): Promise<string> {
    const user = await prisma.profile.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if already verified
    const verification: any = await prisma.$queryRaw`
      SELECT verified FROM email_verifications WHERE user_id = ${user.id}::uuid;
    `;

    if (verification && verification.length > 0 && verification[0].verified) {
      throw new ConflictError('Email already verified');
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update token
    await prisma.$executeRaw`
      UPDATE email_verifications
      SET token_hash = ${verificationTokenHash}, expires_at = ${expiresAt}
      WHERE user_id = ${user.id}::uuid;
    `;

    return verificationToken;
  }
}
