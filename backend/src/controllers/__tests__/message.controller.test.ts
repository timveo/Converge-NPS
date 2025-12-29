import { Request, Response } from 'express';
import * as messageController from '../message.controller';
import * as messageService from '../../services/message.service';
import prisma from '../../config/database';
import { getSocketIO } from '../../socket';

// Mock dependencies
jest.mock('../../services/message.service');
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    conversationParticipant: {
      findMany: jest.fn(),
    },
  },
}));
jest.mock('../../socket');

describe('Message Controller - Socket.IO Integration', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSocketIO: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request mock
    mockRequest = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['USER' as any],
      },
      body: {
        conversationId: 'conv-123',
        content: 'Test message',
      },
    };

    // Setup response mock
    const jsonMock = jest.fn();
    const statusMock = jest.fn(() => ({ json: jsonMock }));
    mockResponse = {
      status: statusMock as any,
      json: jsonMock,
    };

    // Setup Socket.IO mock
    mockSocketIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    (getSocketIO as jest.Mock).mockReturnValue(mockSocketIO);
  });

  describe('sendMessage', () => {
    it('should emit Socket.IO events when message is sent', async () => {
      // Mock message service
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        content: 'Test message',
        senderId: 'user-123',
        sentAt: new Date(),
      };
      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (messageService.sendMessageSchema.parse as jest.Mock) = jest.fn((data) => data);

      // Mock conversation participants
      const mockParticipants = [
        { userId: 'user-123', user: { fullName: 'User 1' } },
        { userId: 'user-456', user: { fullName: 'User 2' } },
      ];
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);

      // Call controller
      await messageController.sendMessage(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify Socket.IO events were emitted
      expect(mockSocketIO.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(mockSocketIO.emit).toHaveBeenCalledWith('new_message', mockMessage);

      expect(mockSocketIO.to).toHaveBeenCalledWith('user:user-456');
      expect(mockSocketIO.emit).toHaveBeenCalledWith('message_notification', {
        conversationId: 'conv-123',
        message: mockMessage,
      });
    });

    it('should identify recipient correctly', async () => {
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        content: 'Test message',
        senderId: 'user-123',
        sentAt: new Date(),
      };
      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (messageService.sendMessageSchema.parse as jest.Mock) = jest.fn((data) => data);

      const mockParticipants = [
        { userId: 'user-123', user: { fullName: 'Sender' } },
        { userId: 'recipient-789', user: { fullName: 'Recipient' } },
      ];
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);

      await messageController.sendMessage(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should emit to recipient (not sender)
      expect(mockSocketIO.to).toHaveBeenCalledWith('user:recipient-789');
      expect(mockSocketIO.to).not.toHaveBeenCalledWith('user:user-123');
    });

    it('should not emit to recipient if no recipient found', async () => {
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        content: 'Test message',
        senderId: 'user-123',
        sentAt: new Date(),
      };
      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (messageService.sendMessageSchema.parse as jest.Mock) = jest.fn((data) => data);

      // Only sender in participants (edge case)
      const mockParticipants = [
        { userId: 'user-123', user: { fullName: 'Sender' } },
      ];
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);

      await messageController.sendMessage(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should still emit to conversation
      expect(mockSocketIO.to).toHaveBeenCalledWith('conversation:conv-123');

      // Count how many times emit was called
      const emitCalls = mockSocketIO.emit.mock.calls;
      // Should only emit new_message, not message_notification
      expect(emitCalls.length).toBe(1);
      expect(emitCalls[0][0]).toBe('new_message');
    });

    it('should handle missing Socket.IO instance gracefully', async () => {
      (getSocketIO as jest.Mock).mockReturnValue(null);

      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        content: 'Test message',
        senderId: 'user-123',
        sentAt: new Date(),
      };
      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (messageService.sendMessageSchema.parse as jest.Mock) = jest.fn((data) => data);

      await messageController.sendMessage(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should still respond successfully even without Socket.IO
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Message sent successfully',
      });
    });

    it('should return success response after emitting events', async () => {
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        content: 'Test message',
        senderId: 'user-123',
        sentAt: new Date(),
      };
      (messageService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (messageService.sendMessageSchema.parse as jest.Mock) = jest.fn((data) => data);

      const mockParticipants = [
        { userId: 'user-123', user: { fullName: 'User 1' } },
        { userId: 'user-456', user: { fullName: 'User 2' } },
      ];
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);

      await messageController.sendMessage(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Message sent successfully',
      });
    });
  });
});
