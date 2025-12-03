import { Request, Response } from 'express';
import * as messageService from '../services/message.service';

/**
 * POST /v1/messages
 * Send a message
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const data = messageService.sendMessageSchema.parse(req.body) as any;

    const message = await messageService.sendMessage(userId, data);

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid message data',
        details: error.errors,
      });
    }

    if (error.message.includes('not found') || error.message.includes('does not allow')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    // Rate limit error from DB trigger
    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Message rate limit exceeded. Please try again later.',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
}

/**
 * GET /v1/conversations
 * Get user's conversations
 */
export async function getConversations(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const conversations = await messageService.getUserConversations(userId);

    res.json({
      success: true,
      data: conversations,
      count: conversations.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
    });
  }
}

/**
 * GET /v1/conversations/:id/messages
 * Get conversation messages
 */
export async function getMessages(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;
    const { limit, before } = req.query;

    const messages = await messageService.getConversationMessages(
      userId,
      conversationId,
      {
        limit: limit ? parseInt(limit as string) : undefined,
        before: before as string,
      }
    );

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error: any) {
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
}

/**
 * POST /v1/conversations/:id/read
 * Mark messages as read
 */
export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;

    await messageService.markMessagesAsRead(userId, conversationId);

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read',
    });
  }
}

/**
 * DELETE /v1/conversations/:id
 * Delete conversation
 */
export async function deleteConversation(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;

    await messageService.deleteConversation(userId, conversationId);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
    });
  }
}

/**
 * GET /v1/messages/unread-count
 * Get unread message count
 */
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const count = await messageService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count',
    });
  }
}
