/**
 * Two-Factor Authentication Service
 *
 * Handles 2FA code generation, storage, and verification
 */

import prisma from '../config/database';
import crypto from 'crypto';
import { EmailService } from './email.service';

// Configuration
const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

export interface SendCodeResult {
  success: boolean;
  message: string;
  cooldownRemaining?: number;
}

export interface VerifyCodeResult {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
}

export class TwoFactorService {
  /**
   * Generate a random 6-digit code
   */
  private static generateCode(): string {
    // Generate cryptographically secure random number
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    // Ensure it's 6 digits by taking modulo and padding
    const code = (randomNumber % 1000000).toString().padStart(CODE_LENGTH, '0');
    return code;
  }

  /**
   * Hash a code for secure storage
   */
  private static hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Send a 2FA code to the user's email
   */
  static async sendCode(userId: string, email: string, userName?: string): Promise<SendCodeResult> {
    // Check for existing recent code (prevent spam)
    const recentCode = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentCode) {
      const cooldownRemaining = Math.ceil(
        (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recentCode.createdAt.getTime())) / 1000
      );
      return {
        success: false,
        message: `Please wait ${cooldownRemaining} seconds before requesting a new code`,
        cooldownRemaining,
      };
    }

    // Invalidate any existing codes for this user
    await prisma.twoFactorCode.deleteMany({
      where: { userId },
    });

    // Generate new code
    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Log code in development for testing (NEVER do this in production!)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n========================================`);
      console.log(`2FA CODE FOR ${email}: ${code}`);
      console.log(`========================================\n`);
    }

    // Store hashed code
    await prisma.twoFactorCode.create({
      data: {
        userId,
        codeHash,
        expiresAt,
      },
    });

    // Send email
    const emailSent = await EmailService.sendTwoFactorCode(email, code, userName);

    if (!emailSent) {
      // In development, still allow login even if email fails (code is logged)
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Email sending failed, but code is logged above for development testing');
        return {
          success: true,
          message: 'Verification code sent (check server logs in development)',
        };
      }

      // Clean up the code if email failed in production
      await prisma.twoFactorCode.deleteMany({
        where: { userId },
      });
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.',
      };
    }

    return {
      success: true,
      message: 'Verification code sent to your email',
    };
  }

  /**
   * Verify a 2FA code
   */
  static async verifyCode(userId: string, code: string): Promise<VerifyCodeResult> {
    // Find the most recent code for this user
    const storedCode = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!storedCode) {
      return {
        success: false,
        message: 'No verification code found. Please request a new one.',
      };
    }

    // Check if code is expired
    if (storedCode.expiresAt < new Date()) {
      await prisma.twoFactorCode.delete({
        where: { id: storedCode.id },
      });
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.',
      };
    }

    // Check max attempts
    if (storedCode.attempts >= MAX_ATTEMPTS) {
      await prisma.twoFactorCode.delete({
        where: { id: storedCode.id },
      });
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      };
    }

    // Verify the code
    const codeHash = this.hashCode(code);

    if (codeHash !== storedCode.codeHash) {
      // Increment attempts
      const updatedCode = await prisma.twoFactorCode.update({
        where: { id: storedCode.id },
        data: { attempts: { increment: 1 } },
      });

      const attemptsRemaining = MAX_ATTEMPTS - updatedCode.attempts;
      return {
        success: false,
        message: `Invalid code. ${attemptsRemaining} attempts remaining.`,
        attemptsRemaining,
      };
    }

    // Mark as verified and delete
    await prisma.twoFactorCode.delete({
      where: { id: storedCode.id },
    });

    return {
      success: true,
      message: 'Code verified successfully',
    };
  }

  /**
   * Check if a user has a pending 2FA verification
   */
  static async hasPendingCode(userId: string): Promise<boolean> {
    const pendingCode = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });
    return !!pendingCode;
  }

  /**
   * Clean up expired codes (can be called periodically)
   */
  static async cleanupExpiredCodes(): Promise<number> {
    const result = await prisma.twoFactorCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}
