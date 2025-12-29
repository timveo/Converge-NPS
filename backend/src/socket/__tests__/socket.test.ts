import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { sign } from 'jsonwebtoken';
import { initializeSocketServer, getSocketIO } from '../index';

describe('Socket.IO Server', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let clientSocket: ClientSocket;
  const TEST_PORT = 3001;
  const TEST_USER_ID = 'test-user-123';
  const JWT_SECRET = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach((done) => {
    // Create HTTP server
    httpServer = new HTTPServer();
    httpServer.listen(TEST_PORT, () => {
      // Initialize Socket.IO server
      ioServer = initializeSocketServer(httpServer);
      done();
    });
  });

  afterEach((done) => {
    // Cleanup
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      httpServer.close(() => done());
    } else {
      done();
    }
  });

  describe('Server Initialization', () => {
    it('should initialize Socket.IO server successfully', () => {
      expect(ioServer).toBeDefined();
      expect(getSocketIO()).toBe(ioServer);
    });

    it('should export Socket.IO instance via getSocketIO', () => {
      const io = getSocketIO();
      expect(io).toBe(ioServer);
    });
  });

  describe('Authentication', () => {
    it('should accept connection with valid JWT token', (done) => {
      const token = sign({ sub: TEST_USER_ID }, JWT_SECRET, {
        issuer: 'converge-nps.com',
        audience: 'converge-nps-api',
      });

      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject connection without token', (done) => {
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`);

      clientSocket.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'invalid-token' },
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });
    });
  });

  describe('User Rooms', () => {
    it('should join user to their personal room on connection', (done) => {
      const token = sign({ sub: TEST_USER_ID }, JWT_SECRET, {
        issuer: 'converge-nps.com',
        audience: 'converge-nps-api',
      });

      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        // Emit test event to user room
        ioServer.to(`user:${TEST_USER_ID}`).emit('test_event', { data: 'test' });

        clientSocket.on('test_event', (data) => {
          expect(data.data).toBe('test');
          done();
        });
      });
    });
  });

  describe('Message Notification Events', () => {
    it('should emit message_notification to recipient user room', (done) => {
      const recipientId = 'recipient-123';
      const token = sign({ sub: recipientId }, JWT_SECRET, {
        issuer: 'converge-nps.com',
        audience: 'converge-nps-api',
      });

      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        const mockMessage = {
          id: 'msg-123',
          conversationId: 'conv-123',
          content: 'Test message',
        };

        // Listen for message_notification event
        clientSocket.on('message_notification', (data) => {
          expect(data.conversationId).toBe('conv-123');
          expect(data.message).toEqual(mockMessage);
          done();
        });

        // Emit notification from server
        ioServer.to(`user:${recipientId}`).emit('message_notification', {
          conversationId: 'conv-123',
          message: mockMessage,
        });
      });
    });

    it('should emit new_message to conversation room', (done) => {
      const conversationId = 'conv-456';
      const token = sign({ sub: TEST_USER_ID }, JWT_SECRET, {
        issuer: 'converge-nps.com',
        audience: 'converge-nps-api',
      });

      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        // Join conversation room
        const serverSocket = Array.from(ioServer.sockets.sockets.values())[0];
        serverSocket.join(`conversation:${conversationId}`);

        const mockMessage = {
          id: 'msg-456',
          conversationId,
          content: 'Test conversation message',
        };

        // Listen for new_message event
        clientSocket.on('new_message', (data) => {
          expect(data).toEqual(mockMessage);
          done();
        });

        // Emit message to conversation room
        ioServer.to(`conversation:${conversationId}`).emit('new_message', mockMessage);
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle disconnect properly', (done) => {
      const token = sign({ sub: TEST_USER_ID }, JWT_SECRET, {
        issuer: 'converge-nps.com',
        audience: 'converge-nps-api',
      });

      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
    });

    it('should support reconnection', (done) => {
      const token = sign({ sub: TEST_USER_ID }, JWT_SECRET, {
        issuer: 'converge-nps.com',
        audience: 'converge-nps-api',
      });

      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 100,
      });

      let connectCount = 0;

      clientSocket.on('connect', () => {
        connectCount++;
        if (connectCount === 1) {
          // Disconnect after first connection
          clientSocket.disconnect();
          // Reconnect
          setTimeout(() => clientSocket.connect(), 200);
        } else if (connectCount === 2) {
          // Successfully reconnected
          expect(clientSocket.connected).toBe(true);
          done();
        }
      });
    });
  });
});
