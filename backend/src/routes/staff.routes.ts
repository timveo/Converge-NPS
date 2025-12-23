/**
 * Staff Routes
 *
 * All staff-related endpoints (walk-in registration, etc.)
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
 * Get registration statistics
 */
router.get('/checkin/stats', staffController.getCheckInStats);

/**
 * GET /staff/checkin/recent
 * Get recent check-ins
 */
router.get('/checkin/recent', staffController.getRecentCheckIns);

/**
 * GET /staff/search
 * Search for attendees
 */
router.get('/search', staffController.searchAttendees);

/**
 * POST /staff/walkin
 * Register and check in a walk-in attendee
 */
router.post('/walkin', staffController.registerWalkIn);

export default router;
