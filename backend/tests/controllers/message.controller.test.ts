/**
 * Message Controller Unit Tests
 */

// Mock the database before importing anything else
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    message: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    conversationParticipant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    connection: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $on: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock the messageService
jest.mock('../../src/services/message.service');

import { Request, Response } from 'express';
import * as messageController from '../../src/controllers/message.controller';
import * as messageService from '../../src/services/message.service';
import prisma from '../../src/config/database';

// Cast prisma to any for mock methods
const prismaMock = prisma as any;

describe('Message Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock schema parsers
    (messageService.sendMessageSchema as any) = {
      parse: jest.fn((data) => data),
    };
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = {
        conversationId: 'conv-1',
        content: 'Hello!',
      };

      const mockMessage = {
        id: 'msg-1',
        content: 'Hello!',
        senderId: 'user-123',
      };
      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);

      await messageController.sendMessage(mockReq as Request, mockRes as Response);

      expect(messageService.sendMessage).toHaveBeenCalledWith('user-123', mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Message sent successfully',
      });
    });

    it('should return 400 for invalid message data', async () => {
      mockReq.user = { id: 'user-123' } as any;

      (messageService.sendMessageSchema.parse as jest.Mock).mockImplementation(() => {
        const error: any = new Error('Validation error');
        error.name = 'ZodError';
        error.errors = [{ message: 'Invalid content' }];
        throw error;
      });

      await messageController.sendMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid message data',
        })
      );
    });

    it('should return 400 if recipient not found', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { conversationId: 'conv-1', content: 'Hello!' };

      (messageService.sendMessage as jest.Mock).mockRejectedValue(
        new Error('Recipient not found')
      );

      await messageController.sendMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if messaging not allowed', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { conversationId: 'conv-1', content: 'Hello!' };

      (messageService.sendMessage as jest.Mock).mockRejectedValue(
        new Error('User does not allow messaging')
      );

      await messageController.sendMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if unauthorized', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { conversationId: 'conv-1', content: 'Hello!' };

      (messageService.sendMessage as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to send message')
      );

      await messageController.sendMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 429 for rate limit error', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { conversationId: 'conv-1', content: 'Hello!' };

      (messageService.sendMessage as jest.Mock).mockRejectedValue(
        new Error('Message rate limit exceeded')
      );

      await messageController.sendMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { conversationId: 'conv-1', content: 'Hello!' };

      (messageService.sendMessage as jest.Mock).mockRejectedValue(new Error('Database error'));

      await messageController.sendMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getOrCreateConversation', () => {
    it('should create conversation with recipientId', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { recipientId: 'user-456' };

      const mockConversation = { id: 'conv-1' };
      (messageService.getOrCreateConversation as jest.Mock).mockResolvedValue(mockConversation);

      await messageController.getOrCreateConversation(mockReq as Request, mockRes as Response);

      expect(messageService.getOrCreateConversation).toHaveBeenCalledWith('user-123', 'user-456');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockConversation,
      });
    });

    it('should create conversation with participantId', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { participantId: 'user-789' };

      const mockConversation = { id: 'conv-2' };
      (messageService.getOrCreateConversation as jest.Mock).mockResolvedValue(mockConversation);

      await messageController.getOrCreateConversation(mockReq as Request, mockRes as Response);

      expect(messageService.getOrCreateConversation).toHaveBeenCalledWith('user-123', 'user-789');
    });

    it('should return 400 if no recipient specified', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = {};

      await messageController.getOrCreateConversation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'recipientId or participantId is required',
      });
    });

    it('should return 400 if messaging not allowed', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { recipientId: 'user-456' };

      (messageService.getOrCreateConversation as jest.Mock).mockRejectedValue(
        new Error('User does not allow messaging')
      );

      await messageController.getOrCreateConversation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.body = { recipientId: 'user-456' };

      (messageService.getOrCreateConversation as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await messageController.getOrCreateConversation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getConversations', () => {
    it('should get user conversations', async () => {
      mockReq.user = { id: 'user-123' } as any;

      const mockConversations = [
        { id: 'conv-1' },
        { id: 'conv-2' },
      ];
      (messageService.getUserConversations as jest.Mock).mockResolvedValue(mockConversations);

      await messageController.getConversations(mockReq as Request, mockRes as Response);

      expect(messageService.getUserConversations).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockConversations,
        count: 2,
      });
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;

      (messageService.getUserConversations as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await messageController.getConversations(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMessages', () => {
    it('should get conversation messages', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };
      mockReq.query = { limit: '20', before: 'msg-5' };

      const mockResult = {
        messages: [{ id: 'msg-1' }],
        conversation: { id: 'conv-1' },
      };
      (messageService.getConversationMessages as jest.Mock).mockResolvedValue(mockResult);

      await messageController.getMessages(mockReq as Request, mockRes as Response);

      expect(messageService.getConversationMessages).toHaveBeenCalledWith(
        'user-123',
        'conv-1',
        { limit: 20, before: 'msg-5' }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.messages,
        conversation: mockResult.conversation,
        count: 1,
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'nonexistent' };
      mockReq.query = {};

      (messageService.getConversationMessages as jest.Mock).mockRejectedValue(
        new Error('Conversation not found')
      );

      await messageController.getMessages(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };
      mockReq.query = {};

      (messageService.getConversationMessages as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to view messages')
      );

      await messageController.getMessages(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };
      mockReq.query = {};

      (messageService.getConversationMessages as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await messageController.getMessages(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };

      (messageService.markConversationAsRead as jest.Mock).mockResolvedValue(undefined);

      await messageController.markAsRead(mockReq as Request, mockRes as Response);

      expect(messageService.markConversationAsRead).toHaveBeenCalledWith('conv-1', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Messages marked as read',
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'nonexistent' };

      (messageService.markConversationAsRead as jest.Mock).mockRejectedValue(
        new Error('Conversation not found')
      );

      await messageController.markAsRead(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };

      (messageService.markConversationAsRead as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to mark as read')
      );

      await messageController.markAsRead(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };

      (messageService.deleteConversation as jest.Mock).mockResolvedValue(undefined);

      await messageController.deleteConversation(mockReq as Request, mockRes as Response);

      expect(messageService.deleteConversation).toHaveBeenCalledWith('user-123', 'conv-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Conversation deleted successfully',
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'nonexistent' };

      (messageService.deleteConversation as jest.Mock).mockRejectedValue(
        new Error('Conversation not found')
      );

      await messageController.deleteConversation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };

      (messageService.deleteConversation as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to delete conversation')
      );

      await messageController.deleteConversation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { id: 'conv-1' };

      (messageService.deleteConversation as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await messageController.deleteConversation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count', async () => {
      mockReq.user = { id: 'user-123' } as any;

      (messageService.getUnreadCount as jest.Mock).mockResolvedValue(5);

      await messageController.getUnreadCount(mockReq as Request, mockRes as Response);

      expect(messageService.getUnreadCount).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { count: 5 },
      });
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 'user-123' } as any;

      (messageService.getUnreadCount as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await messageController.getUnreadCount(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchUsersForMessaging', () => {
    beforeEach(() => {
      mockReq.user = { id: 'current-user' } as any;
      mockReq.query = {};
      (prismaMock.profile.findMany as jest.Mock).mockReset();
    });

    it('should return empty array when query shorter than 2 chars', async () => {
      mockReq.query = { q: 'a' };

      await messageController.searchUsersForMessaging(mockReq as Request, mockRes as Response);

      expect(prismaMock.profile.findMany).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should search users with sanitized query and limit', async () => {
      mockReq.query = { q: '  Jane  ', limit: '10' };
      const mockUsers = [{ id: 'user-1', fullName: 'Jane Doe' }];
      // Mock connection lookup first (returns user's connections)
      (prismaMock.connection.findMany as jest.Mock).mockResolvedValue([{ connectedUserId: 'connected-user-1' }]);
      (prismaMock.profile.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await messageController.searchUsersForMessaging(mockReq as Request, mockRes as Response);

      // First call should be to get connections
      expect(prismaMock.connection.findMany).toHaveBeenCalledWith({
        where: { userId: 'current-user' },
        select: { connectedUserId: true },
      });

      // Second call should be profile search with privacy filtering
      expect(prismaMock.profile.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { id: { not: 'current-user' } },
            {
              OR: [
                { fullName: { contains: 'Jane', mode: 'insensitive' } },
                { email: { contains: 'Jane', mode: 'insensitive' } },
                { organization: { contains: 'Jane', mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { id: { in: ['connected-user-1'] } },
                { showProfileAllowConnections: true },
              ],
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          avatarUrl: true,
        },
        take: 10,
        orderBy: { fullName: 'asc' },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
      });
    });

    it('should cap limit at 50', async () => {
      mockReq.query = { q: 'Jane', limit: '500' };
      // Mock connection lookup first
      (prismaMock.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.profile.findMany as jest.Mock).mockResolvedValue([]);

      await messageController.searchUsersForMessaging(mockReq as Request, mockRes as Response);

      expect(prismaMock.profile.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { id: { not: 'current-user' } },
            {
              OR: [
                { fullName: { contains: 'Jane', mode: 'insensitive' } },
                { email: { contains: 'Jane', mode: 'insensitive' } },
                { organization: { contains: 'Jane', mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { id: { in: [] } },
                { showProfileAllowConnections: true },
              ],
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true,
          avatarUrl: true,
        },
        take: 50,
        orderBy: { fullName: 'asc' },
      });
    });

    it('should handle errors gracefully', async () => {
      mockReq.query = { q: 'Jane' };
      
      // Mock console.error to prevent it from appearing in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      (prismaMock.profile.findMany as jest.Mock).mockRejectedValue(new Error('DB failure'));

      await messageController.searchUsersForMessaging(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to search users',
      });
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});
