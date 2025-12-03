import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin/staff role
router.use(authenticate);
router.use(adminController.requireAdmin);

/**
 * Session Management
 */

// POST /v1/admin/sessions - Create session
router.post('/sessions', adminController.createSession);

// PATCH /v1/admin/sessions/:id - Update session
router.patch('/sessions/:id', adminController.updateSession);

// DELETE /v1/admin/sessions/:id - Delete/cancel session
router.delete('/sessions/:id', adminController.deleteSession);

/**
 * User Management
 */

// GET /v1/admin/users - List users
router.get('/users', adminController.listUsers);

// GET /v1/admin/users/:id - Get user details
router.get('/users/:id', adminController.getUserDetails);

// PATCH /v1/admin/users/:id/role - Update user role
router.patch('/users/:id/role', adminController.updateUserRole);

// POST /v1/admin/users/:id/suspend - Suspend user
router.post('/users/:id/suspend', adminController.suspendUser);

/**
 * Analytics & Statistics
 */

// GET /v1/admin/stats - Dashboard statistics
router.get('/stats', adminController.getDashboardStats);

// GET /v1/admin/stats/rsvps - RSVP statistics
router.get('/stats/rsvps', adminController.getRsvpStats);

// GET /v1/admin/stats/activity - Activity report
router.get('/stats/activity', adminController.getActivityReport);

/**
 * Audit Logs
 */

// GET /v1/admin/audit-logs - Get audit logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
