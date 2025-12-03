import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Message routes
 */

// POST /v1/messages - Send message
router.post('/', authenticate, messageController.sendMessage);

// GET /v1/messages/unread-count - Get unread count
router.get('/unread-count', authenticate, messageController.getUnreadCount);

/**
 * Conversation routes
 */

// GET /v1/conversations - Get user's conversations
router.get('/conversations', authenticate, messageController.getConversations);

// GET /v1/conversations/:id/messages - Get conversation messages
router.get('/conversations/:id/messages', authenticate, messageController.getMessages);

// POST /v1/conversations/:id/read - Mark messages as read
router.post('/conversations/:id/read', authenticate, messageController.markAsRead);

// DELETE /v1/conversations/:id - Delete conversation
router.delete('/conversations/:id', authenticate, messageController.deleteConversation);

export default router;
