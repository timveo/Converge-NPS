/**
 * Connection Controller
 *
 * Handles connection endpoints (QR scan, manual entry, management)
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ConnectionService } from '../services/connection.service';
import {
  CreateConnectionSchema,
  UpdateConnectionSchema,
  QRScanSchema,
  ConnectionsQuerySchema,
} from '../types/schemas';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class ConnectionController {
  /**
   * POST /connections/qr-scan
   * Create connection via QR code scan
   */
  static async qrScan(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { qrCodeData, collaborativeIntents, notes } = QRScanSchema.parse(req.body) as any;

      // Look up user by QR code
      const qrResult = await ConnectionService.getConnectionByQRCode(qrCodeData);

      if (!qrResult) {
        return res.status(404).json({
          error: { code: 'INVALID_QR_CODE', message: 'QR code not found or inactive' },
        });
      }

      const userId = req.user.id;
      const connectedUserId = qrResult.userId;
      const connectionMethod = 'qr_scan';

      // Create bidirectional connections
      const [connection] = await Promise.all([
        // Connection from user to connected user
        prisma.connection.create({
          data: {
            userId,
            connectedUserId,
            collaborativeIntents,
            notes,
            connectionMethod,
          },
          include: {
            connectedUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                organization: true,
                department: true,
                role: true,
                bio: true,
                avatarUrl: true,
                linkedinUrl: true,
                websiteUrl: true,
                hideContactInfo: true,
              },
            },
          },
        }),
        // Reciprocal connection from connected user to user
        prisma.connection.create({
          data: {
            userId: connectedUserId,
            connectedUserId: userId,
            collaborativeIntents: [], // Empty for reciprocal connections
            notes: null,
            connectionMethod,
          },
        }),
      ]);

      // Increment QR code scan count
      await prisma.qrCode.update({
        where: { userId: connectedUserId },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      });

      logger.info('Connection created successfully', {
        action: 'Add Connection',
        method: 'qr_code',
        connectionId: connection.id,
        userId,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      res.status(201).json({
        message: 'Connection created successfully',
        connection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /connections/manual
   * Create connection via manual entry
   */
  static async manualEntry(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const data = CreateConnectionSchema.parse(req.body) as any;

      // Create bidirectional connections
      const [connection] = await Promise.all([
        // Connection from user to connected user
        prisma.connection.create({
          data: {
            userId: req.user.id,
            connectedUserId: data.connectedUserId,
            collaborativeIntents: data.collaborativeIntents,
            notes: data.notes || null,
            connectionMethod: 'manual_entry',
          },
          include: {
            connectedUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                organization: true,
                department: true,
                role: true,
                bio: true,
                avatarUrl: true,
                linkedinUrl: true,
                websiteUrl: true,
                hideContactInfo: true,
              },
            },
          },
        }),
        // Reciprocal connection from connected user to user
        prisma.connection.create({
          data: {
            userId: data.connectedUserId,
            connectedUserId: req.user.id,
            collaborativeIntents: [], // Empty for reciprocal connections
            notes: null,
            connectionMethod: 'manual_entry',
          },
        }),
      ]);

      logger.info('Connection created successfully', {
        action: 'Add Connection',
        method: 'Code_Add',
        connectionId: connection.id,
        userId: req.user.id,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      res.status(201).json({
        message: 'Connection created successfully',
        connection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /connections
   * Create connection by user ID (for recommendations)
   */
  static async createByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { connectedUserId } = req.body;

      if (!connectedUserId) {
        return res.status(400).json({
          error: { code: 'INVALID_REQUEST', message: 'connectedUserId is required' },
        });
      }

      // Create bidirectional connections
      const [connection] = await Promise.all([
        // Connection from user to connected user
        prisma.connection.create({
          data: {
            userId: req.user.id,
            connectedUserId,
            collaborativeIntents: [],
            connectionMethod: 'manual_entry',
          },
          include: {
            connectedUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                organization: true,
                department: true,
                role: true,
                bio: true,
                avatarUrl: true,
                linkedinUrl: true,
                websiteUrl: true,
                hideContactInfo: true,
              },
            },
          },
        }),
        // Reciprocal connection from connected user to user
        prisma.connection.create({
          data: {
            userId: connectedUserId,
            connectedUserId: req.user.id,
            collaborativeIntents: [], // Empty for reciprocal connections
            notes: null,
            connectionMethod: 'manual_entry',
          },
        }),
      ]);

      logger.info('Connection created successfully', {
        action: 'Add Connection',
        method: 'UI_Add',
        connectionId: connection.id,
        userId: req.user.id,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      res.status(201).json({
        message: 'Connection created successfully',
        connection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /connections
   * Get all connections for current user
   */
  static async getConnections(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const query = ConnectionsQuerySchema.parse(req.query);

      const result = await ConnectionService.getConnections({
        userId: req.user.id,
        ...query,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /connections/:id
   * Get connection by ID
   */
  static async getConnection(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { id } = req.params;

      const connection = await ConnectionService.getConnection(id, req.user.id);

      res.status(200).json({ connection });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /connections/:id
   * Update connection
   */
  static async updateConnection(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { id } = req.params;
      const data = UpdateConnectionSchema.parse(req.body) as any;

      const connection = await ConnectionService.updateConnection(id, req.user.id, data);

      logger.info('Connection updated', { connectionId: id, userId: req.user.id });

      res.status(200).json({
        message: 'Connection updated successfully',
        connection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /connections/:id
   * Delete connection (bidirectional)
   */
  static async deleteConnection(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { id } = req.params;

      // Verify ownership and get connection details
      const connection = await prisma.connection.findUnique({
        where: { id },
      });

      if (!connection) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Connection not found' },
        });
      }

      if (connection.userId !== req.user.id) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Not authorized to delete this connection' },
        });
      }

      // Delete both directions of the connection
      await Promise.all([
        // Delete the user's connection record
        prisma.connection.delete({
          where: { id },
        }),
        // Delete the reciprocal connection record
        prisma.connection.deleteMany({
          where: {
            userId: connection.connectedUserId,
            connectedUserId: connection.userId,
          },
        }),
      ]);

      logger.info('Connection deleted successfully', {
        action: 'Remove Connection',
        connectionId: id,
        userId: req.user.id,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      res.status(200).json({
        message: 'Connection deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /connections/export
   * Export connections as CSV
   */
  static async exportConnections(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const csv = await ConnectionService.exportConnections(req.user.id);

      logger.info('Connections exported', { userId: req.user.id });

      res.status(200)
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="connections-${Date.now()}.csv"`)
        .send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /connections/recommendations
   * Get connection recommendations
   */
  static async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const recommendations = await ConnectionService.getRecommendations(req.user.id, limit);

      res.status(200).json({
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }
}
