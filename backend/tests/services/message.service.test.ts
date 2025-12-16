/**
 * Message Service Unit Tests
 * Tests for messaging, conversations, and read receipts
 */

import {
  getOrCreateConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markConversationAsRead,
  updateMessageReadStatus,
  deleteConversation,
  getUnreadCount,
} from '../../src/services/message.service';
import prisma from '../../src/config/database';

describe('Message Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation', async () => {
      const mockConversation = {
        id: 'conversation-1',
        isGroup: false,
        participants: [
          { userId: 'user-1', user: { id: 'user-1', fullName: 'John' } },
          { userId: 'user-2', user: { id: 'user-2', fullName: 'Jane' } },
        ],
      };

      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);

      const result = await getOrCreateConversation('user-1', 'user-2');

      expect(result.id).toBe('conversation-1');
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation if none exists', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ allowMessaging: true });
      (prisma.conversation.create as jest.Mock).mockResolvedValue({
        id: 'new-conversation',
        isGroup: false,
        participants: [],
      });
      (prisma.conversationParticipant.createMany as jest.Mock).mockResolvedValue({});
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
        id: 'new-conversation',
        isGroup: false,
        participants: [
          { userId: 'user-1', user: { id: 'user-1', fullName: 'John' } },
          { userId: 'user-2', user: { id: 'user-2', fullName: 'Jane' } },
        ],
      });

      const result = await getOrCreateConversation('user-1', 'user-2');

      expect(result.id).toBe('new-conversation');
      expect(prisma.conversation.create).toHaveBeenCalled();
      expect(prisma.conversationParticipant.createMany).toHaveBeenCalled();
    });

    it('should throw error if recipient does not allow messaging', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ allowMessaging: false });

      await expect(getOrCreateConversation('user-1', 'user-2')).rejects.toThrow(
        'Recipient does not allow messaging'
      );
    });

    it('should throw error if recipient not found', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getOrCreateConversation('user-1', 'user-2')).rejects.toThrow(
        'Recipient does not allow messaging'
      );
    });
  });

  describe('sendMessage', () => {
    it('should send message with existing conversationId', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        conversationId: 'conversation-1',
        userId: 'user-1',
      });
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'message-1',
        content: 'Hello!',
        senderId: 'user-1',
        sender: { id: 'user-1', fullName: 'John' },
        conversation: { participants: [] },
      });
      (prisma.conversation.update as jest.Mock).mockResolvedValue({});

      const result = await sendMessage('user-1', {
        conversationId: 'conversation-1',
        content: 'Hello!',
      });

      expect(result.id).toBe('message-1');
      expect(result.content).toBe('Hello!');
    });

    it('should send message with recipientId and create conversation', async () => {
      // Mock getOrCreateConversation
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({
        id: 'conversation-1',
        participants: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      });
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        conversationId: 'conversation-1',
        userId: 'user-1',
      });
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'message-1',
        content: 'Hello!',
        senderId: 'user-1',
        sender: { id: 'user-1', fullName: 'John' },
        conversation: { participants: [] },
      });
      (prisma.conversation.update as jest.Mock).mockResolvedValue({});

      const result = await sendMessage('user-1', {
        recipientId: 'user-2',
        content: 'Hello!',
      });

      expect(result.id).toBe('message-1');
    });

    it('should throw error if sender is not participant', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        sendMessage('user-1', { conversationId: 'conversation-1', content: 'Hello!' })
      ).rejects.toThrow('Unauthorized to send message in this conversation');
    });

    it('should throw error if no conversation ID provided', async () => {
      await expect(sendMessage('user-1', { content: 'Hello!' })).rejects.toThrow(
        'Conversation ID is required'
      );
    });

    it('should update conversation lastMessageAt', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        conversationId: 'conversation-1',
        userId: 'user-1',
      });
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'message-1',
        content: 'Hello!',
        senderId: 'user-1',
        sender: { id: 'user-1', fullName: 'John' },
        conversation: { participants: [] },
      });
      (prisma.conversation.update as jest.Mock).mockResolvedValue({});

      await sendMessage('user-1', {
        conversationId: 'conversation-1',
        content: 'Hello!',
      });

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-1' },
        data: { lastMessageAt: expect.any(Date) },
      });
    });
  });

  describe('getConversationMessages', () => {
    const mockConversation = {
      id: 'conversation-1',
      participants: [
        { userId: 'user-1', user: { id: 'user-1', fullName: 'John' } },
        { userId: 'user-2', user: { id: 'user-2', fullName: 'Jane' } },
      ],
    };

    it('should get conversation messages', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        { id: 'message-1', content: 'Hello', sender: { fullName: 'John' } },
        { id: 'message-2', content: 'Hi!', sender: { fullName: 'Jane' } },
      ]);

      const result = await getConversationMessages('user-1', 'conversation-1');

      expect(result.messages).toHaveLength(2);
      expect(result.conversation.id).toBe('conversation-1');
    });

    it('should throw error if conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getConversationMessages('user-1', 'nonexistent')).rejects.toThrow(
        'Conversation not found'
      );
    });

    it('should throw error if user is not participant', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConversation,
        participants: [
          { userId: 'user-2', user: { id: 'user-2', fullName: 'Jane' } },
          { userId: 'user-3', user: { id: 'user-3', fullName: 'Bob' } },
        ],
      });

      await expect(getConversationMessages('user-1', 'conversation-1')).rejects.toThrow(
        'Unauthorized to view this conversation'
      );
    });

    it('should support cursor-based pagination', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        id: 'message-5',
        sentAt: new Date('2024-03-15T10:00:00'),
      });
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);

      await getConversationMessages('user-1', 'conversation-1', {
        before: 'message-5',
        limit: 20,
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: expect.any(Date) },
          }),
        })
      );
    });
  });

  describe('getUserConversations', () => {
    it('should get user conversations', async () => {
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue([
        {
          conversation: {
            id: 'conversation-1',
            participants: [
              { userId: 'user-1', user: { fullName: 'John' } },
              { userId: 'user-2', user: { fullName: 'Jane' } },
            ],
            messages: [{ id: 'message-1', content: 'Hello', sentAt: new Date() }],
            _count: { messages: 2 },
            updatedAt: new Date(),
          },
        },
      ]);

      const result = await getUserConversations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conversation-1');
      expect(result[0].otherUser?.fullName).toBe('Jane');
    });

    it('should return empty array if no conversations', async () => {
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUserConversations('user-1');

      expect(result).toEqual([]);
    });

    it('should sort conversations by last message time', async () => {
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue([
        {
          conversation: {
            id: 'conversation-1',
            participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
            messages: [{ sentAt: new Date('2024-03-15T10:00:00') }],
            _count: { messages: 0 },
            updatedAt: new Date('2024-03-15T10:00:00'),
          },
        },
        {
          conversation: {
            id: 'conversation-2',
            participants: [{ userId: 'user-1' }, { userId: 'user-3' }],
            messages: [{ sentAt: new Date('2024-03-15T11:00:00') }],
            _count: { messages: 0 },
            updatedAt: new Date('2024-03-15T11:00:00'),
          },
        },
      ]);

      const result = await getUserConversations('user-1');

      // More recent conversation should be first
      expect(result[0].id).toBe('conversation-2');
    });
  });

  describe('markConversationAsRead', () => {
    it('should mark messages as read', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        conversationId: 'conversation-1',
        userId: 'user-1',
      });
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await markConversationAsRead('conversation-1', 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conversation-1',
          senderId: { not: 'user-1' },
          isRead: false,
        },
        data: { isRead: true },
      });
    });

    it('should throw error if not participant', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(markConversationAsRead('conversation-1', 'user-1')).rejects.toThrow(
        'Not a participant in this conversation'
      );
    });
  });

  describe('updateMessageReadStatus', () => {
    it('should update message read status', async () => {
      (prisma.message.update as jest.Mock).mockResolvedValue({
        id: 'message-1',
        isRead: true,
      });

      const result = await updateMessageReadStatus('message-1', true);

      expect(result.isRead).toBe(true);
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        data: { isRead: true },
      });
    });
  });

  describe('deleteConversation', () => {
    it('should remove user from conversation', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        conversationId: 'conversation-1',
        userId: 'user-1',
      });
      (prisma.conversationParticipant.delete as jest.Mock).mockResolvedValue({});
      (prisma.conversationParticipant.count as jest.Mock).mockResolvedValue(1);

      const result = await deleteConversation('user-1', 'conversation-1');

      expect(result.success).toBe(true);
      expect(prisma.conversationParticipant.delete).toHaveBeenCalled();
    });

    it('should delete conversation if no participants remain', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        conversationId: 'conversation-1',
        userId: 'user-1',
      });
      (prisma.conversationParticipant.delete as jest.Mock).mockResolvedValue({});
      (prisma.conversationParticipant.count as jest.Mock).mockResolvedValue(0);
      (prisma.conversation.delete as jest.Mock).mockResolvedValue({});

      await deleteConversation('user-1', 'conversation-1');

      expect(prisma.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conversation-1' },
      });
    });

    it('should throw error if not participant', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteConversation('user-1', 'conversation-1')).rejects.toThrow(
        'Not a participant in this conversation'
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread message count', async () => {
      (prisma.message.count as jest.Mock).mockResolvedValue(5);

      const result = await getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversation: {
            participants: {
              some: { userId: 'user-1' },
            },
          },
          senderId: { not: 'user-1' },
          isRead: false,
        },
      });
    });

    it('should return 0 if no unread messages', async () => {
      (prisma.message.count as jest.Mock).mockResolvedValue(0);

      const result = await getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });
});
