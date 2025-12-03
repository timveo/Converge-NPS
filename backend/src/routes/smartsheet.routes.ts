import { Router } from 'express';
import * as smartsheetController from '../controllers/smartsheet.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../controllers/admin.controller';

const router = Router();

// All smartsheet routes require authentication and admin/staff role
router.use(authenticate);
router.use(requireAdmin);

// Sync status and management
router.get('/status', smartsheetController.getSyncStatus);
router.get('/failed', smartsheetController.getFailedSyncs);
router.post('/sync/:type', smartsheetController.triggerSync);
router.post('/retry/:id', smartsheetController.retrySync);
router.delete('/clear-failed', smartsheetController.clearFailedSyncs);

export default router;
