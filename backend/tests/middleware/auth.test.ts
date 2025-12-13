/**
 * Auth Middleware Unit Tests
 * Tests for authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppRole } from '@prisma/client';
import {
  authenticateToken,
  requireRole,
  optionalAuthentication,
  requireAdmin,
  requireStaffOrAdmin,
} from '../../src/middleware/auth';
import * as authUtils from '../../src/utils/auth';

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    userRole: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import prisma from '../../src/config/database';

// Helper to create mock request/response objects
const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  ...overrides,
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should return 401 if no authorization header', async () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Missing authorization token',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', async () => {
      const req = createMockReq({
        headers: { authorization: 'Basic token123' },
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Missing authorization token',
        }),
      });
    });

    it('should authenticate valid token and attach user to request', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const email = 'test@example.com';
      const roles: AppRole[] = ['student' as AppRole];

      const token = authUtils.generateAccessToken(userId, email, roles);

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ role: 'student' }]);

      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(userId);
      expect(req.user?.email).toBe(email);
      expect(req.user?.roles).toContain('student');
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer expired.token.here' },
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
        }),
      });
    });

    it('should fetch fresh roles from database', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const email = 'test@example.com';
      const roles: AppRole[] = ['student' as AppRole];

      const token = authUtils.generateAccessToken(userId, email, roles);

      // Database has admin role (different from token)
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
        { role: 'student' },
        { role: 'admin' },
      ]);

      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(req.user?.roles).toContain('admin');
      expect(prisma.userRole.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { role: true },
      });
    });
  });

  describe('requireRole', () => {
    it('should return 401 if user not authenticated', () => {
      const middleware = requireRole('admin' as AppRole);
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        }),
      });
    });

    it('should return 403 if user lacks required role', () => {
      const middleware = requireRole('admin' as AppRole);
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['student' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          requiredRoles: ['admin'],
        }),
      });
    });

    it('should call next() if user has required role', () => {
      const middleware = requireRole('admin' as AppRole);
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['admin' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept any of multiple allowed roles', () => {
      const middleware = requireRole('admin' as AppRole, 'staff' as AppRole);
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['staff' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuthentication', () => {
    it('should call next() without user if no token provided', async () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await optionalAuthentication(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should attach user if valid token provided', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const email = 'test@example.com';
      const roles: AppRole[] = ['student' as AppRole];

      const token = authUtils.generateAccessToken(userId, email, roles);

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ role: 'student' }]);

      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await optionalAuthentication(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(userId);
      expect(next).toHaveBeenCalled();
    });

    it('should silently fail and call next() for invalid token', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid.token.here' },
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      await optionalAuthentication(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'admin@example.com',
        roles: ['admin' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        roles: ['student' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireStaffOrAdmin', () => {
    it('should allow staff users', () => {
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'staff@example.com',
        roles: ['staff' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireStaffOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin users', () => {
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'admin@example.com',
        roles: ['admin' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireStaffOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject regular users', () => {
      const req = createMockReq() as Request;
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        roles: ['student' as AppRole],
      };
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireStaffOrAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
