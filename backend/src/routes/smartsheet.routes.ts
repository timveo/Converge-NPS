import { Router } from 'express';
import * as smartsheetController from '../controllers/smartsheet.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../controllers/admin.controller';

const router = Router();

// All smartsheet routes require authentication and admin/staff role
router.use(authenticate);
router.use(requireAdmin);

// =============================================================================
// EXPORT (Outbound: App → Smartsheet)
// =============================================================================

// Sync status and management
router.get('/status', smartsheetController.getSyncStatus);
router.get('/failed', smartsheetController.getFailedSyncs);
router.post('/sync/:type', smartsheetController.triggerSync);
router.post('/retry/:id', smartsheetController.retrySync);
router.delete('/clear-failed', smartsheetController.clearFailedSyncs);

// =============================================================================
// IMPORT (Inbound: Smartsheet → App)
// =============================================================================

// Import individual data types
router.post('/import/sessions', smartsheetController.importSessions);
router.post('/import/projects', smartsheetController.importProjects);
router.post('/import/opportunities', smartsheetController.importOpportunities);
router.post('/import/partners', smartsheetController.importPartners);
router.post('/import/attendees', smartsheetController.importAttendees);

// Import all data at once
router.post('/import/all', smartsheetController.importAll);

export default router;
