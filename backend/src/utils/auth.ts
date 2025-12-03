// Authentication Utilities
// Based on SECURITY_ARCHITECTURE.md

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppRole } from '@prisma/client';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// =============================================================================
// PASSWORD HASHING (bcrypt with cost factor 12)
// =============================================================================

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// JWT TOKEN GENERATION
// =============================================================================

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export function generateAccessToken(userId: string, email: string, roles: AppRole[]): string {
  const payload: JWTPayload = {
    sub: userId,
    email,
    roles: roles.map((r) => r.toString()),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'converge-nps.com',
    audience: 'converge-nps-api',
  } as jwt.SignOptions);
}

export function generateRefreshToken(userId: string): string {
  const payload = {
    sub: userId,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'converge-nps.com',
    audience: 'converge-nps-api',
  } as jwt.SignOptions);
}

// =============================================================================
// JWT TOKEN VERIFICATION
// =============================================================================

export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'converge-nps.com',
      audience: 'converge-nps-api',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'converge-nps.com',
      audience: 'converge-nps-api',
    }) as { sub: string; type: string };

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    return { sub: decoded.sub };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

// =============================================================================
// TOKEN HASHING (for storing refresh tokens securely)
// =============================================================================

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// =============================================================================
// RANDOM TOKEN GENERATION (for email verification, password reset)
// =============================================================================

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashRandomToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// =============================================================================
// TOKEN EXTRACTION
// =============================================================================

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

// =============================================================================
// EXPIRATION TIME CALCULATION
// =============================================================================

export function getTokenExpirationTime(expiresIn: string): number {
  // Convert expiresIn (e.g., "1h", "30d") to seconds
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  const unitSeconds: { [key: string]: number } = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * (unitSeconds[unit] || 3600);
}

export function getAccessTokenExpiry(): number {
  return getTokenExpirationTime(JWT_EXPIRES_IN);
}

export function getRefreshTokenExpiry(): number {
  return getTokenExpirationTime(JWT_REFRESH_EXPIRES_IN);
}
