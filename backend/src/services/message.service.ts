import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
}).refine(
  (data) => data.conversationId || data.recipientId,
  { message: 'Either conversationId or recipientId must be provided' }
);

export const updateMessageStatusSchema = z.object({
  status: z.enum(['sent', 'delivered', 'read']),
});

// Message service functions

/**
 * Get or create conversation between two users
 */
export async function getOrCreateConversation(userId1: string, userId2: string) {
  // Check if conversation already exists (in either direction)
  let conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { AND: [{ user1Id: userId1 }, { user2Id: userId2 }] },
        { AND: [{ user1Id: userId2 }, { user2Id: userId1 }] },
      ],
    },
    include: {
      user1: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          organization: true,
        },
      },
      user2: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          organization: true,
        },
      },
    },
  });

  if (conversation) {
    return conversation;
  }

  // Check if recipient allows messaging
  const recipient = await prisma.profile.findUnique({
    where: { id: userId2 },
    select: { allowMessaging: true },
  });

  if (!recipient || !recipient.allowMessaging) {
    throw new Error('Recipient does not allow messaging');
  }

  // Create new conversation
  conversation = await prisma.conversation.create({
    data: {
      user1Id: userId1,
      user2Id: userId2,
    },
    include: {
      user1: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          organization: true,
        },
      },
      user2: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          organization: true,
        },
      },
    },
  });

  return conversation;
}

/**
 * Send a message
 */
export async function sendMessage(senderId: string, data: {
  conversationId?: string;
  recipientId?: string;
  content: string;
}) {
  let conversationId = data.conversationId;

  // If recipientId provided, get or create conversation
  if (data.recipientId) {
    const conversation = await getOrCreateConversation(senderId, data.recipientId);
    conversationId = conversation.id;
  }

  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  // Verify sender is part of the conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
    throw new Error('Unauthorized to send message in this conversation');
  }

  // Create message (rate limit enforced by DB trigger)
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: data.content,
      status: 'sent',
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      conversation: {
        include: {
          user1: {
            select: { id: true, fullName: true },
          },
          user2: {
            select: { id: true, fullName: true },
          },
        },
      },
    },
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return message;
}

/**
 * Get conversation messages with pagination
 */
export async function getConversationMessages(
  userId: string,
  conversationId: string,
  options: {
    limit?: number;
    before?: string; // message ID for cursor-based pagination
  } = {}
) {
  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new Error('Unauthorized to view this conversation');
  }

  const where: any = { conversationId };

  // Cursor-based pagination
  if (options.before) {
    const beforeMessage = await prisma.message.findUnique({
      where: { id: options.before },
    });

    if (beforeMessage) {
      where.createdAt = { lt: beforeMessage.createdAt };
    }
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit || 50,
  });

  return messages.reverse(); // Return in chronological order
}

/**
 * Get user's conversations
 */
export async function getUserConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          organization: true,
        },
      },
      user2: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          organization: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
          status: true,
        },
      },
      _count: {
        select: {
          messages: {
            where: {
              senderId: { not: userId },
              status: { not: 'read' },
            },
          },
        },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  // Transform to include other participant and unread count
  return conversations.map(conv => {
    const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
    return {
      id: conv.id,
      otherUser,
      lastMessage: conv.messages[0] || null,
      unreadCount: conv._count.messages,
      lastMessageAt: conv.lastMessageAt,
    };
  });
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(userId: string, conversationId: string) {
  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new Error('Unauthorized');
  }

  // Mark all messages from other user as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      status: { not: 'read' },
    },
    data: {
      status: 'read',
    },
  });

  return { success: true };
}

/**
 * Update message status (for delivery/read receipts)
 */
export async function updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read') {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: { status },
  });

  return message;
}

/**
 * Delete conversation (soft delete - archives for user)
 */
export async function deleteConversation(userId: string, conversationId: string) {
  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new Error('Unauthorized to delete this conversation');
  }

  // In a production app, you'd implement a soft delete mechanism
  // For MVP, we'll just delete the conversation
  // Note: This will cascade delete all messages due to Prisma schema
  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  return { success: true };
}

/**
 * Get unread message count
 */
export async function getUnreadCount(userId: string) {
  const count = await prisma.message.count({
    where: {
      conversation: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      senderId: { not: userId },
      status: { not: 'read' },
    },
  });

  return count;
}
