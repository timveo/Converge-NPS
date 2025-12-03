import { Router } from 'express';
import * as sessionController from '../controllers/session.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Session routes
 */

// GET /v1/sessions - List sessions with filters
router.get('/', authenticate, sessionController.listSessions);

// GET /v1/sessions/:id - Get session details
router.get('/:id', authenticate, sessionController.getSession);

// POST /v1/sessions/:id/rsvp - Create RSVP
router.post('/:id/rsvp', authenticate, sessionController.createRsvp);

// GET /v1/sessions/:id/attendees - Get attendees (admin/staff only)
router.get('/:id/attendees', authenticate, sessionController.getAttendees);

// GET /v1/sessions/:id/conflicts - Check conflicts
router.get('/:id/conflicts', authenticate, sessionController.checkConflicts);

/**
 * RSVP routes
 */

// GET /v1/rsvps/me - Get my RSVPs
router.get('/rsvps/me', authenticate, sessionController.getMyRsvps);

// PATCH /v1/rsvps/:id - Update RSVP
router.patch('/rsvps/:id', authenticate, sessionController.updateRsvp);

// DELETE /v1/rsvps/:id - Delete RSVP
router.delete('/rsvps/:id', authenticate, sessionController.deleteRsvp);

export default router;
