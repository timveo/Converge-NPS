/**
 * Socket.IO Unit Tests
 * Tests for real-time messaging functionality
 */

import { Server } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { sign } from 'jsonwebtoken';
import prisma from '../../src/config/database';

jest.mock('../../src/services/message.service', () => ({
  getConversationMessages: jest.fn(),
  sendMessage: jest.fn(),
  markConversationAsRead: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import { initializeSocketServer, getActiveUsersCount, isUserOnline, getActiveUserIds } from '../../src/socket';
import * as messageService from '../../src/services/message.service';

describe('Socket.IO Server', () => {
  let httpServer: HTTPServer;
  let io: Server;
  let clientSocket: ClientSocket;
  const JWT_SECRET = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  afterAll(() => {
    // Ensure all timers are cleared to prevent leaks
    jest.useRealTimers();
  });

  beforeEach((done) => {
    // Set up default mock returns for prisma
    (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue([
      { userId: 'user-1', user: { id: 'user-1', fullName: 'User 1' } },
      { userId: 'user-2', user: { id: 'user-2', fullName: 'User 2' } },
    ]);

    httpServer = createServer();
    io = initializeSocketServer(httpServer);
    httpServer.listen(() => {
      done();
    });
  });

  afterEach((done) => {
    jest.clearAllMocks();
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    io.close();
    httpServer.close(() => {
      done();
    });
  });

  const createToken = (userId: string) => {
    return sign({ sub: userId, email: 'test@example.com', roles: ['student'] }, JWT_SECRET, {
      issuer: 'converge-nps.com',
      audience: 'converge-nps-api',
    });
  };

  const connectClient = (userId: string): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const address = httpServer.address();
      const port = typeof address === 'object' ? address?.port : 3000;
      const token = createToken(userId);

      const socket = Client(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket'],
      });

      // Timeout after 5 seconds - clear on success/error to prevent leaks
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(socket);
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  };

  describe('Authentication', () => {
    it('should authenticate socket with valid JWT token', async () => {
      clientSocket = await connectClient('user-1');
      expect(clientSocket.connected).toBe(true);
    });

    it('should reject connection without token', (done) => {
      const address = httpServer.address();
      const port = typeof address === 'object' ? address?.port : 3000;

      const socket = Client(`http://localhost:${port}`, {
        auth: {},
        transports: ['websocket'],
      });

      socket.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication');
        socket.disconnect();
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      const address = httpServer.address();
      const port = typeof address === 'object' ? address?.port : 3000;

      const socket = Client(`http://localhost:${port}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      socket.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication');
        socket.disconnect();
        done();
      });
    });
  });

  describe('Active Users Tracking', () => {
    it('should track user as online when connected', async () => {
      clientSocket = await connectClient('user-1');

      // Wait for connection to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(isUserOnline('user-1')).toBe(true);
      expect(getActiveUsersCount()).toBe(1);
      expect(getActiveUserIds()).toContain('user-1');
    });

    it('should track user as offline when disconnected', async () => {
      clientSocket = await connectClient('user-1');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(isUserOnline('user-1')).toBe(true);

      clientSocket.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(isUserOnline('user-1')).toBe(false);
      expect(getActiveUsersCount()).toBe(0);
    });

    it('should handle multiple sockets from same user', async () => {
      const socket1 = await connectClient('user-1');
      const socket2 = await connectClient('user-1');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(isUserOnline('user-1')).toBe(true);
      expect(getActiveUsersCount()).toBe(1);

      socket1.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // User should still be online with second socket
      expect(isUserOnline('user-1')).toBe(true);

      socket2.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(isUserOnline('user-1')).toBe(false);
    });
  });

  describe('Conversation Events', () => {
    it('should join conversation room', async () => {
      const conversationId = 'conversation-1';
      (messageService.getConversationMessages as jest.Mock).mockResolvedValue({
        messages: [],
        conversation: { id: conversationId },
      });

      clientSocket = await connectClient('user-1');

      const joinedPromise = new Promise<void>((resolve) => {
        clientSocket.on('joined_conversation', (data) => {
          expect(data.conversationId).toBe(conversationId);
          resolve();
        });
      });

      clientSocket.emit('join_conversation', conversationId);

      await joinedPromise;
    });

    it('should leave conversation room', async () => {
      clientSocket = await connectClient('user-1');

      // Just verify emit doesn't throw - leave doesn't have a response event
      clientSocket.emit('leave_conversation', 'conversation-1');
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe('Messaging Events', () => {
    it('should send message via socket', async () => {
      const mockMessage = {
        id: 'message-1',
        conversationId: 'conversation-1',
        content: 'Hello!',
        senderId: 'user-1',
        sentAt: new Date().toISOString(),
      };

      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);

      clientSocket = await connectClient('user-1');

      const sentPromise = new Promise<void>((resolve) => {
        clientSocket.on('message_sent', (data) => {
          expect(data.messageId).toBe('message-1');
          expect(data.conversationId).toBe('conversation-1');
          resolve();
        });
      });

      clientSocket.emit('send_message', {
        conversationId: 'conversation-1',
        content: 'Hello!',
      });

      await sentPromise;
      expect(messageService.sendMessage).toHaveBeenCalledWith('user-1', {
        conversationId: 'conversation-1',
        content: 'Hello!',
      });
    });

    it('should emit error on failed message send', async () => {
      (messageService.sendMessage as jest.Mock).mockRejectedValue(new Error('Send failed'));

      clientSocket = await connectClient('user-1');

      const errorPromise = new Promise<void>((resolve) => {
        clientSocket.on('message_error', (data) => {
          expect(data.error).toBe('Send failed');
          resolve();
        });
      });

      clientSocket.emit('send_message', {
        conversationId: 'conversation-1',
        content: 'Hello!',
      });

      await errorPromise;
    });

    it('should broadcast new message to conversation participants', async () => {
      const mockMessage = {
        id: 'message-1',
        conversationId: 'conversation-1',
        content: 'Hello!',
        senderId: 'user-1',
        sentAt: new Date().toISOString(),
      };

      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (messageService.getConversationMessages as jest.Mock).mockResolvedValue({
        messages: [],
        conversation: { id: 'conversation-1' },
      });

      // Connect two users
      const sender = await connectClient('user-1');
      const receiver = await connectClient('user-2');

      // Both join the conversation
      sender.emit('join_conversation', 'conversation-1');
      receiver.emit('join_conversation', 'conversation-1');
      await new Promise((resolve) => setTimeout(resolve, 200));

      const newMessagePromise = new Promise<void>((resolve) => {
        receiver.on('new_message', (message) => {
          expect(message.id).toBe('message-1');
          expect(message.content).toBe('Hello!');
          resolve();
        });
      });

      sender.emit('send_message', {
        conversationId: 'conversation-1',
        content: 'Hello!',
      });

      await newMessagePromise;

      sender.disconnect();
      receiver.disconnect();
    });
  });

  describe('Typing Indicators', () => {
    it('should broadcast typing start to conversation', async () => {
      (messageService.getConversationMessages as jest.Mock).mockResolvedValue({
        messages: [],
        conversation: { id: 'conversation-1' },
      });

      const user1 = await connectClient('user-1');
      const user2 = await connectClient('user-2');

      // Both join conversation
      user1.emit('join_conversation', 'conversation-1');
      user2.emit('join_conversation', 'conversation-1');
      await new Promise((resolve) => setTimeout(resolve, 200));

      const typingPromise = new Promise<void>((resolve) => {
        user2.on('user_typing', (data) => {
          expect(data.userId).toBe('user-1');
          expect(data.conversationId).toBe('conversation-1');
          resolve();
        });
      });

      user1.emit('typing_start', { conversationId: 'conversation-1' });

      await typingPromise;

      user1.disconnect();
      user2.disconnect();
    });

    it('should broadcast typing stop to conversation', async () => {
      (messageService.getConversationMessages as jest.Mock).mockResolvedValue({
        messages: [],
        conversation: { id: 'conversation-1' },
      });

      const user1 = await connectClient('user-1');
      const user2 = await connectClient('user-2');

      user1.emit('join_conversation', 'conversation-1');
      user2.emit('join_conversation', 'conversation-1');
      await new Promise((resolve) => setTimeout(resolve, 200));

      const stoppedTypingPromise = new Promise<void>((resolve) => {
        user2.on('user_stopped_typing', (data) => {
          expect(data.userId).toBe('user-1');
          expect(data.conversationId).toBe('conversation-1');
          resolve();
        });
      });

      user1.emit('typing_stop', { conversationId: 'conversation-1' });

      await stoppedTypingPromise;

      user1.disconnect();
      user2.disconnect();
    });
  });

  describe('Read Receipts', () => {
    it('should mark messages as read and notify', async () => {
      (messageService.markConversationAsRead as jest.Mock).mockResolvedValue({ success: true });
      (messageService.getConversationMessages as jest.Mock).mockResolvedValue({
        messages: [],
        conversation: { id: 'conversation-1' },
      });

      const user1 = await connectClient('user-1');
      const user2 = await connectClient('user-2');

      user1.emit('join_conversation', 'conversation-1');
      user2.emit('join_conversation', 'conversation-1');
      await new Promise((resolve) => setTimeout(resolve, 200));

      const readPromise = new Promise<void>((resolve) => {
        user1.on('messages_read', (data) => {
          expect(data.conversationId).toBe('conversation-1');
          expect(data.readBy).toBe('user-2');
          resolve();
        });
      });

      user2.emit('mark_as_read', { conversationId: 'conversation-1' });

      await readPromise;
      expect(messageService.markConversationAsRead).toHaveBeenCalledWith('conversation-1', 'user-2');

      user1.disconnect();
      user2.disconnect();
    });
  });

  describe('Online Status', () => {
    it('should return online status for users', async () => {
      const user1 = await connectClient('user-1');
      await connectClient('user-2');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const statusPromise = new Promise<void>((resolve) => {
        user1.on('online_status', (statuses) => {
          expect(statuses).toEqual(
            expect.arrayContaining([
              { userId: 'user-2', online: true },
              { userId: 'user-3', online: false },
            ])
          );
          resolve();
        });
      });

      user1.emit('check_online_status', ['user-2', 'user-3']);

      await statusPromise;
    });

    it('should broadcast user status change on connect', async () => {
      const user1 = await connectClient('user-1');

      const statusPromise = new Promise<void>((resolve) => {
        user1.on('user_status_changed', (data) => {
          if (data.userId === 'user-2' && data.online === true) {
            resolve();
          }
        });
      });

      await connectClient('user-2');

      await statusPromise;
    });
  });
});
