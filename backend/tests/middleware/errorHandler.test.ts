/**
 * Error Handler Middleware Unit Tests
 * Tests for error handling and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../../src/middleware/errorHandler';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// Helper functions
const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  path: '/test',
  ...overrides,
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create UnauthorizedError with correct properties', () => {
      const error = new UnauthorizedError('Access denied');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Access denied');
    });

    it('should create UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
    });

    it('should create ForbiddenError with correct properties', () => {
      const error = new ForbiddenError('Not allowed');

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Not allowed');
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
    });

    it('should create ConflictError with correct properties', () => {
      const error = new ConflictError('Email already exists', { email: 'test@example.com' });

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.details).toEqual({ email: 'test@example.com' });
    });

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError instances correctly', () => {
      const error = new ValidationError('Invalid data', { field: 'name' });
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid data',
          details: { field: 'name' },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        }),
      });
    });

    it('should handle Prisma P2002 unique constraint violation', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', meta: { target: ['email'] }, clientVersion: '4.0.0' }
      );
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: 'A record with this value already exists',
          details: { field: 'email' },
        }),
      });
    });

    it('should handle Prisma P2003 foreign key constraint violation', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', meta: { field_name: 'userId' }, clientVersion: '4.0.0' }
      );
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced record does not exist',
        }),
      });
    });

    it('should handle Prisma P2025 record not found', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '4.0.0' }
      );
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Record not found',
        }),
      });
    });

    it('should handle Prisma P2014 invalid ID', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Invalid ID',
        { code: 'P2014', clientVersion: '4.0.0' }
      );
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INVALID_ID',
        }),
      });
    });

    it('should handle Prisma validation errors', () => {
      const error = new Prisma.PrismaClientValidationError(
        'Invalid data provided',
        { clientVersion: '4.0.0' }
      );
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
        }),
      });
    });

    it('should handle rate limit errors from database triggers', () => {
      const error = new Error('Rate limit exceeded for action X');
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      });
    });

    it('should handle privacy violation errors (QR scanning disabled)', () => {
      const error = new Error('User has disabled QR code scanning');
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'PRIVACY_VIOLATION',
        }),
      });
    });

    it('should handle privacy violation errors (messaging disabled)', () => {
      const error = new Error('User has disabled messaging');
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'PRIVACY_VIOLATION',
        }),
      });
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
        }),
      });
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection failed');
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
        }),
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with route information', () => {
      const req = createMockReq({
        method: 'GET',
        path: '/api/unknown',
      }) as Request;
      const res = createMockRes() as Response;

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Route GET /api/unknown not found',
          timestamp: expect.any(String),
        }),
      });
    });

    it('should include method in error message', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/users',
      }) as Request;
      const res = createMockRes() as Response;

      notFoundHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Route POST /api/users not found',
        }),
      });
    });
  });

  describe('asyncHandler', () => {
    it('should call the wrapped function', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ data: 'test' });
      const wrapped = asyncHandler(mockHandler);

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      wrapped(req, res, next);

      // Allow promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(mockHandler).toHaveBeenCalledWith(req, res, next);
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Async error');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(mockHandler);

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      wrapped(req, res, next);

      // Allow promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors in async context', async () => {
      const error = new Error('Sync error');
      const mockHandler = jest.fn().mockImplementation(async () => {
        throw error;
      });
      const wrapped = asyncHandler(mockHandler);

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      wrapped(req, res, next);

      // Allow promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
