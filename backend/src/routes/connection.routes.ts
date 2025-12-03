/**
 * Connection Routes
 *
 * All connection-related endpoints (QR scan, manual entry, management)
 */

import { Router } from 'express';
import { ConnectionController } from '../controllers/connection.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All connection routes require authentication
router.use(authenticateToken);

/**
 * POST /connections/qr-scan
 * Create connection via QR code scan
 */
router.post('/qr-scan', ConnectionController.qrScan);

/**
 * POST /connections/manual
 * Create connection via manual entry
 */
router.post('/manual', ConnectionController.manualEntry);

/**
 * GET /connections/export
 * Export connections as CSV (must come before /:id route)
 */
router.get('/export', ConnectionController.exportConnections);

/**
 * GET /connections
 * Get all connections for current user
 */
router.get('/', ConnectionController.getConnections);

/**
 * GET /connections/:id
 * Get connection by ID
 */
router.get('/:id', ConnectionController.getConnection);

/**
 * PATCH /connections/:id
 * Update connection
 */
router.patch('/:id', ConnectionController.updateConnection);

/**
 * DELETE /connections/:id
 * Delete connection
 */
router.delete('/:id', ConnectionController.deleteConnection);

export default router;
