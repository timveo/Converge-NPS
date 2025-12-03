// Error Handling Middleware
// Based on API_ARCHITECTURE.md Section 6

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error classes for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, 'CONFLICT', message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfter?: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, { retryAfter });
  }
}

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = randomUUID();

  // Log error
  logger.error({
    requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  // Handle known AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    res.status(prismaError.statusCode).json({
      error: {
        code: prismaError.code,
        message: prismaError.message,
        details: prismaError.details,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.message,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Handle database rate limit errors (from triggers)
  if (err.message && err.message.includes('Rate limit exceeded')) {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Handle privacy violation errors (from triggers)
  if (err.message && (err.message.includes('disabled QR code scanning') || err.message.includes('disabled messaging'))) {
    res.status(403).json({
      error: {
        code: 'PRIVACY_VIOLATION',
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Default to 500 Internal Server Error
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

// =============================================================================
// PRISMA ERROR HANDLER
// =============================================================================

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
} {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      return {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'A record with this value already exists',
        details: {
          field: (err.meta?.target as string[])?.join(', '),
        },
      };

    case 'P2003':
      // Foreign key constraint violation
      return {
        statusCode: 400,
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Referenced record does not exist',
        details: {
          field: err.meta?.field_name,
        },
      };

    case 'P2025':
      // Record not found
      return {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Record not found',
      };

    case 'P2014':
      // Invalid ID
      return {
        statusCode: 400,
        code: 'INVALID_ID',
        message: 'Invalid ID provided',
      };

    default:
      return {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
        details: process.env.NODE_ENV === 'production' ? undefined : err.message,
      };
  }
}

// =============================================================================
// ASYNC HANDLER (to wrap async route handlers)
// =============================================================================

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// 404 NOT FOUND HANDLER
// =============================================================================

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
}
