/**
 * Auth Utilities Unit Tests
 * Tests for password hashing, JWT tokens, and token utilities
 */

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
  hashRandomToken,
  extractBearerToken,
  getTokenExpirationTime,
} from '../../src/utils/auth';
import { AppRole } from '@prisma/client';

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash format
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Password Validation', () => {
    it('should accept valid password', () => {
      const result = validatePasswordStrength('ValidPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('PasswordOnly');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('JWT Access Token', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const email = 'test@example.com';
    const roles: AppRole[] = ['student' as AppRole];

    it('should generate access token', () => {
      const token = generateAccessToken(userId, email, roles);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should verify valid access token', () => {
      const token = generateAccessToken(userId, email, roles);
      const decoded = verifyAccessToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.roles).toContain('student');
    });

    it('should throw error for invalid access token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow('Invalid or expired access token');
    });

    it('should throw error for tampered token', () => {
      const token = generateAccessToken(userId, email, roles);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyAccessToken(tamperedToken)).toThrow('Invalid or expired access token');
    });
  });

  describe('JWT Refresh Token', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should generate refresh token', () => {
      const token = generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(userId);
      const decoded = verifyRefreshToken(token);

      expect(decoded.sub).toBe(userId);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid.token.here')).toThrow('Invalid or expired refresh token');
    });

    it('should reject access token used as refresh token', () => {
      const accessToken = generateAccessToken(userId, 'test@example.com', ['student' as AppRole]);

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('Token Hashing', () => {
    it('should hash token to hex string', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 hex length
    });

    it('should produce consistent hashes', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Random Token Generation', () => {
    it('should generate random token', () => {
      const token = generateRandomToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes as hex
    });

    it('should generate unique tokens', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();

      expect(token1).not.toBe(token2);
    });

    it('should hash random token', () => {
      const token = generateRandomToken();
      const hash = hashRandomToken(token);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('Bearer Token Extraction', () => {
    it('should extract valid bearer token', () => {
      const token = extractBearerToken('Bearer abc123');
      expect(token).toBe('abc123');
    });

    it('should return null for missing header', () => {
      const token = extractBearerToken(undefined);
      expect(token).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(extractBearerToken('Basic abc123')).toBeNull();
      expect(extractBearerToken('abc123')).toBeNull();
      expect(extractBearerToken('Bearer')).toBeNull();
      expect(extractBearerToken('Bearer abc 123')).toBeNull();
    });
  });

  describe('Token Expiration Time', () => {
    it('should parse seconds', () => {
      expect(getTokenExpirationTime('30s')).toBe(30);
    });

    it('should parse minutes', () => {
      expect(getTokenExpirationTime('5m')).toBe(300);
    });

    it('should parse hours', () => {
      expect(getTokenExpirationTime('1h')).toBe(3600);
    });

    it('should parse days', () => {
      expect(getTokenExpirationTime('30d')).toBe(2592000);
    });

    it('should default to hours for unknown unit', () => {
      expect(getTokenExpirationTime('5x')).toBe(5 * 3600);
    });
  });
});
