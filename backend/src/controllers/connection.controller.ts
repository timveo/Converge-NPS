/**
 * Connection Controller
 *
 * Handles connection endpoints (QR scan, manual entry, management)
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionService } from '../services/connection.service';
import {
  CreateConnectionSchema,
  UpdateConnectionSchema,
  QRScanSchema,
  ConnectionsQuerySchema,
} from '../types/schemas';
import logger from '../utils/logger';

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

      // Create connection
      const connection = await ConnectionService.createConnection({
        userId: req.user.id,
        connectedUserId: qrResult.userId,
        collaborativeIntents,
        notes: notes || null,
        connectionMethod: 'qr_scan',
      });

      logger.info('Connection created via QR scan', {
        userId: req.user.id,
        connectedUserId: qrResult.userId,
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

      const connection = await ConnectionService.createConnection({
        userId: req.user.id,
        ...data,
      });

      logger.info('Connection created via manual entry', {
        userId: req.user.id,
        connectedUserId: data.connectedUserId,
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

      const connection = await ConnectionService.createConnection({
        userId: req.user.id,
        connectedUserId,
        collaborativeIntents: [],
        connectionMethod: 'manual_entry',
      });

      logger.info('Connection created via recommendation', {
        userId: req.user.id,
        connectedUserId,
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
   * Delete connection
   */
  static async deleteConnection(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { id } = req.params;

      await ConnectionService.deleteConnection(id, req.user.id);

      logger.info('Connection deleted', { connectionId: id, userId: req.user.id });

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
