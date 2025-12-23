// Authentication Middleware
// Based on SECURITY_ARCHITECTURE.md and API_ARCHITECTURE.md

import { Request, Response, NextFunction } from 'express';
import { AppRole } from '@prisma/client';
import { extractBearerToken, verifyAccessToken } from '../utils/auth';
import prisma from '../config/database';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: AppRole[];
      };
    }
  }
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization token',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Verify JWT token
    const decoded = verifyAccessToken(token);

    // Fetch user roles from database (for fresh role data)
    let roles: AppRole[] = [];
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: decoded.sub },
        select: { role: true },
      });
      roles = userRoles.map((ur) => ur.role);
    } catch (dbError) {
      // Database error shouldn't invalidate a valid token
      // Fall back to roles from JWT payload if available
      logger.warn('Failed to fetch user roles from database, using JWT roles', { userId: decoded.sub, error: dbError });
      // Cast string roles from JWT to AppRole enum (they should match)
      roles = (decoded.roles || []).filter((r): r is AppRole =>
        Object.values(AppRole).includes(r as AppRole)
      );
    }

    // Attach user to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roles,
    };

    // Set current user ID for RLS policies
    // TODO: Fix RLS policy setting - currently causes SQL syntax error
    // await prisma.$executeRaw`SET LOCAL app.current_user_id = ${decoded.sub}`;

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// =============================================================================
// AUTHORIZATION MIDDLEWARE (ROLE-BASED)
// =============================================================================

export function requireRole(...allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const hasPermission = allowedRoles.some((role) => req.user!.roles.includes(role));

    if (!hasPermission) {
      logger.warn(`Insufficient permissions: User ${req.user.id} tried to access resource requiring roles: ${allowedRoles.join(', ')}`);
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          requiredRoles: allowedRoles,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

// =============================================================================
// OPTIONAL AUTHENTICATION (for public endpoints with optional auth)
// =============================================================================

export async function optionalAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);

      const userRoles = await prisma.userRole.findMany({
        where: { userId: decoded.sub },
        select: { role: true },
      });

      const roles = userRoles.map((ur) => ur.role);

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        roles,
      };

      // Set current user ID for RLS policies
      // TODO: Fix RLS policy setting - currently causes SQL syntax error
      // await prisma.$executeRaw`SET LOCAL app.current_user_id = ${decoded.sub}`;
    }

    next();
  } catch (error) {
    // Silently fail for optional authentication
    next();
  }
}

// =============================================================================
// ADMIN-ONLY MIDDLEWARE
// =============================================================================

export const requireAdmin = requireRole(AppRole.admin);

// =============================================================================
// STAFF OR ADMIN MIDDLEWARE
// =============================================================================

export const requireStaffOrAdmin = requireRole(AppRole.staff, AppRole.admin);

// =============================================================================
// PARTICIPANT OR ADMIN MIDDLEWARE
// =============================================================================

export const requireParticipantOrAdmin = requireRole(AppRole.participant, AppRole.admin);

// =============================================================================
// ALIAS FOR BACKWARD COMPATIBILITY
// =============================================================================

export const authenticate = authenticateToken;
