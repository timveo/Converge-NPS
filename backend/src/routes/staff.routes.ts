/**
 * Staff Routes
 *
 * All staff-related endpoints (check-in, etc.)
 */

import { Router } from 'express';
import * as staffController from '../controllers/staff.controller';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

// All staff routes require authentication and staff/admin role
router.use(authenticateToken);
router.use(requireStaffOrAdmin);

/**
 * POST /staff/checkin
 * Check in an attendee
 */
router.post('/checkin', staffController.checkInAttendee);

/**
 * GET /staff/checkin/stats
 * Get check-in statistics
 */
router.get('/checkin/stats', staffController.getCheckInStats);

/**
 * GET /staff/search
 * Search for attendees
 */
router.get('/search', staffController.searchAttendees);

export default router;
