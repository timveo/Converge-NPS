import prisma from '../config/database';
import { z } from 'zod';

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
  // Check if conversation already exists between these two users
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: {
        every: {
          userId: {
            in: [userId1, userId2]
          }
        }
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              organization: true,
            },
          },
        },
      },
    },
  });

  // Filter for conversations with exactly these two participants
  const conversation = existingConversation?.participants.length === 2 
    ? existingConversation 
    : null;

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
  const newConversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      subject: '',
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              organization: true,
            },
          },
        },
      },
    },
  });

  // Add participants to the conversation
  await prisma.conversationParticipant.createMany({
    data: [
      {
        conversationId: newConversation.id,
        userId: userId1,
      },
      {
        conversationId: newConversation.id,
        userId: userId2,
      },
    ],
  });

  // Refetch conversation with participants
  const updatedConversation = await prisma.conversation.findUnique({
    where: { id: newConversation.id },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              organization: true,
            },
          },
        },
      },
    },
  });

  return updatedConversation;
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
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: senderId,
      },
    },
  });

  if (!participant) {
    throw new Error('Unauthorized to send message in this conversation');
  }

  // Create message (rate limit enforced by DB trigger)
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: data.content,
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
          participants: {
            include: {
              user: {
                select: { id: true, fullName: true },
              },
            },
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
  // Verify user is part of conversation and get conversation info
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              organization: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const isParticipant = conversation.participants.some(p => p.userId === userId);
  if (!isParticipant) {
    throw new Error('Unauthorized to view this conversation');
  }

  const where: any = { conversationId };

  // Cursor-based pagination
  if (options.before) {
    const beforeMessage = await prisma.message.findUnique({
      where: { id: options.before },
    });

    if (beforeMessage) {
      where.createdAt = { lt: beforeMessage.sentAt };
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
    orderBy: { sentAt: 'desc' },
    take: options.limit || 50,
  });

  // Find the other user in the conversation
  const otherParticipant = conversation.participants.find(p => p.userId !== userId);
  const otherUser = otherParticipant?.user;

  return {
    messages: messages.reverse(), // Return in chronological order
    conversation: {
      id: conversation.id,
      otherUser,
    },
  };
}
 /**
 * Get user's conversations
 */
export async function getUserConversations(userId: string) {
  // Get conversation participants for this user
  const userParticipants = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  organization: true,
                },
              },
            },
          },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              sentAt: true,
              senderId: true,
              isRead: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderId: { not: userId }, // Only count unread messages from others
                },
              },
            },
          },
        },
      },
    },
  });

  // Transform the data to match expected format
  const conversations = userParticipants.map(p => {
    const conversation = p.conversation;
    const otherParticipant = conversation.participants.find(
      participant => participant.userId !== userId
    );
    const otherUser = otherParticipant?.user;
    const lastMessage = conversation.messages[0];

    return {
      id: conversation.id,
      otherUser,
      lastMessage,
      unreadCount: conversation._count.messages,
      lastMessageAt: conversation.updatedAt,
    };
  });

  // Sort by last message time or conversation update time for conversations with no messages
  return conversations.sort((a, b) => {
    const aTime = a.lastMessage?.sentAt
      ? new Date(a.lastMessage.sentAt).getTime()
      : new Date(a.lastMessageAt).getTime();
    const bTime = b.lastMessage?.sentAt
      ? new Date(b.lastMessage.sentAt).getTime()
      : new Date(b.lastMessageAt).getTime();
    return bTime - aTime;
  });
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId: string, userId: string) {
  // Check if user is participant in conversation
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new Error('Not a participant in this conversation');
  }

  // Mark all messages from other user as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return { success: true };
}

/**
 * Update message read status
 */
export async function updateMessageReadStatus(messageId: string, isRead: boolean) {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: { isRead },
  });

  return message;
}

/**
 * Delete conversation (soft delete - archives for user)
 */
export async function deleteConversation(userId: string, conversationId: string) {
  // Verify user is part of conversation
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new Error('Not a participant in this conversation');
  }

  // Remove user from conversation (delete participant record)
  await prisma.conversationParticipant.delete({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  // If no more participants, delete the conversation and messages
  const remainingParticipants = await prisma.conversationParticipant.count({
    where: { conversationId },
  });

  if (remainingParticipants === 0) {
    await prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  return { success: true };
}

/**
 * Get unread message count
 */
export async function getUnreadCount(userId: string) {
  const count = await prisma.message.count({
    where: {
      conversation: {
        participants: {
          some: {
            userId,
          },
        },
      },
      senderId: { not: userId },
      isRead: false,
    },
  });

  return count;
}
