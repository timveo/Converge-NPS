import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verify } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import * as messageService from '../services/message.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Active users map (userId -> socketId[])
const activeUsers = new Map<string, string[]>();

/**
 * Initialize Socket.IO server
 */
export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.userId = decoded.userId;

      logger.info('Socket authenticated', { userId: decoded.userId, socketId: socket.id });
      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    logger.info('User connected', { userId, socketId: socket.id });

    // Add to active users
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, []);
    }
    activeUsers.get(userId)!.push(socket.id);

    // Emit online status to relevant users
    emitUserOnlineStatus(io, userId, true);

    // Join user's personal room
    socket.join(`user:${userId}`);

    /**
     * Join conversation room
     */
    socket.on('join_conversation', async (conversationId: string) => {
      try {
        // Verify user is part of conversation
        const messages = await messageService.getConversationMessages(userId, conversationId, { limit: 1 });

        socket.join(`conversation:${conversationId}`);
        logger.info('User joined conversation', { userId, conversationId });

        socket.emit('joined_conversation', { conversationId });
      } catch (error: any) {
        logger.error('Failed to join conversation', { error, userId, conversationId });
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Leave conversation room
     */
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info('User left conversation', { userId, conversationId });
    });

    /**
     * Send message
     */
    socket.on('send_message', async (data: {
      conversationId?: string;
      recipientId?: string;
      content: string;
    }) => {
      try {
        const message = await messageService.sendMessage(userId, data);

        // Emit to conversation room
        io.to(`conversation:${message.conversationId}`).emit('new_message', message);

        // Emit to recipient's personal room (for notification)
        // Get conversation participants to find recipient
        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId: message.conversationId },
          include: { user: true }
        });
        
        const recipientId = participants.find(p => p.userId !== userId)?.userId;

        io.to(`user:${recipientId}`).emit('message_notification', {
          conversationId: message.conversationId,
          message,
        });

        logger.info('Message sent', {
          messageId: message.id,
          senderId: userId,
          conversationId: message.conversationId
        });

        // Send delivery confirmation to sender
        socket.emit('message_sent', {
          messageId: message.id,
          conversationId: message.conversationId,
          sentAt: message.sentAt,
        });
      } catch (error: any) {
        logger.error('Failed to send message', { error, userId, data });
        socket.emit('message_error', {
          error: error.message,
          tempId: (data as any).tempId, // Client can send temp ID for matching
        });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing_start', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId: data.conversationId,
      });
    });

    /**
     * Mark messages as read
     */
    socket.on('mark_as_read', async (data: { conversationId: string }) => {
      try {
        await messageService.markConversationAsRead(userId, data.conversationId);

        // Notify other user
        socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
          conversationId: data.conversationId,
          readBy: userId,
        });

        logger.info('Messages marked as read', { userId, conversationId: data.conversationId });
      } catch (error: any) {
        logger.error('Failed to mark messages as read', { error, userId, conversationId: data.conversationId });
      }
    });

    /**
     * Request online status for users
     */
    socket.on('check_online_status', (userIds: string[]) => {
      const onlineStatus = userIds.map(id => ({
        userId: id,
        online: activeUsers.has(id),
      }));

      socket.emit('online_status', onlineStatus);
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      logger.info('User disconnected', { userId, socketId: socket.id });

      // Remove from active users
      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        const index = userSockets.indexOf(socket.id);
        if (index > -1) {
          userSockets.splice(index, 1);
        }

        // If no more sockets for this user, remove from map
        if (userSockets.length === 0) {
          activeUsers.delete(userId);
          emitUserOnlineStatus(io, userId, false);
        }
      }
    });

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      logger.error('Socket error', { error, userId, socketId: socket.id });
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

/**
 * Emit online/offline status to relevant users
 */
function emitUserOnlineStatus(io: Server, userId: string, online: boolean) {
  // Notify all users who have conversations with this user
  // For simplicity, we broadcast to all connected clients
  // In production, you'd want to optimize this
  io.emit('user_status_changed', {
    userId,
    online,
    timestamp: new Date(),
  });
}

/**
 * Get active users count
 */
export function getActiveUsersCount(): number {
  return activeUsers.size;
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return activeUsers.has(userId);
}

/**
 * Get all active user IDs
 */
export function getActiveUserIds(): string[] {
  return Array.from(activeUsers.keys());
}
