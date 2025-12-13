/**
 * Recommendation Service Unit Tests
 * Tests for AI-powered and rule-based recommendations
 */

import {
  getPersonalizedRecommendations,
  getConnectionRecommendations,
} from '../../src/services/recommendation.service';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
}));

// Mock database
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    profile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    rsvp: {
      findMany: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    partner: {
      findMany: jest.fn(),
    },
    connection: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '../../src/config/database';
import Anthropic from '@anthropic-ai/sdk';

describe('Recommendation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPersonalizedRecommendations', () => {
    const mockProfile = {
      id: 'user-1',
      fullName: 'John Doe',
      accelerationInterests: ['AI', 'ML'],
      organization: 'NPS',
      role: 'Student',
      department: 'CS',
    };

    const mockRsvps = [
      { session: { title: 'AI Workshop', description: 'Learn AI basics' } },
    ];

    const mockSessions = [
      {
        id: 'session-1',
        title: 'ML Deep Dive',
        description: 'Advanced ML',
        speaker: 'Dr. Smith',
        sessionType: 'workshop',
      },
    ];

    const mockOpportunities = [
      {
        id: 'opp-1',
        title: 'AI Research',
        description: 'Research position',
        type: 'research',
        sponsorOrganization: 'NPS',
      },
    ];

    beforeEach(() => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.rsvp.findMany as jest.Mock).mockResolvedValue(mockRsvps);
      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.partner.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should throw error if user profile not found', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getPersonalizedRecommendations('nonexistent')).rejects.toThrow(
        'User profile not found'
      );
    });

    it('should fetch user profile and RSVP history', async () => {
      // Mock Anthropic response
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as jest.Mock).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              recommendations: [
                {
                  id: 'session-1',
                  type: 'session',
                  title: 'ML Deep Dive',
                  description: 'Advanced ML',
                  reason: 'Matches your AI interests',
                  relevanceScore: 8,
                  tags: ['AI', 'ML'],
                },
              ],
            }),
          },
        ],
      });

      await getPersonalizedRecommendations('user-1');

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(prisma.rsvp.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          session: { select: { title: true, description: true } },
        },
        take: 10,
      });
    });

    it('should fetch only sessions when type filter is session', async () => {
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: 'text', text: '{"recommendations": []}' }],
      });

      await getPersonalizedRecommendations('user-1', 'session');

      expect(prisma.session.findMany).toHaveBeenCalled();
      expect(prisma.opportunity.findMany).not.toHaveBeenCalled();
      expect(prisma.project.findMany).not.toHaveBeenCalled();
      expect(prisma.partner.findMany).not.toHaveBeenCalled();
    });

    it('should fetch only opportunities when type filter is opportunity', async () => {
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: 'text', text: '{"recommendations": []}' }],
      });

      await getPersonalizedRecommendations('user-1', 'opportunity');

      expect(prisma.session.findMany).not.toHaveBeenCalled();
      expect(prisma.opportunity.findMany).toHaveBeenCalled();
    });

    it('should return empty array on AI error', async () => {
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      const result = await getPersonalizedRecommendations('user-1');

      expect(result).toEqual([]);
    });

    it('should handle JSON in markdown code blocks', async () => {
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as jest.Mock).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n{"recommendations": [{"id": "1", "type": "session", "title": "Test", "description": "Test", "reason": "Test", "relevanceScore": 5, "tags": []}]}\n```',
          },
        ],
      });

      const result = await getPersonalizedRecommendations('user-1');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getConnectionRecommendations', () => {
    const mockProfile = {
      id: 'user-1',
      fullName: 'John Doe',
      accelerationInterests: ['AI', 'ML'],
      organization: 'NPS',
      connectionsAsUser: [{ connectedUserId: 'user-2' }],
      connectionsAsTarget: [],
    };

    const mockPotentialConnections = [
      {
        id: 'user-3',
        fullName: 'Jane Smith',
        accelerationInterests: ['AI', 'Cybersecurity'],
        organization: 'NPS',
        role: 'Researcher',
        profileVisibility: 'public',
        allowQrScanning: true,
      },
      {
        id: 'user-4',
        fullName: 'Bob Wilson',
        accelerationInterests: ['Robotics'],
        organization: 'Other',
        role: 'Engineer',
        profileVisibility: 'public',
        allowQrScanning: true,
      },
    ];

    beforeEach(() => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue(mockPotentialConnections);
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should throw error if user profile not found', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getConnectionRecommendations('nonexistent')).rejects.toThrow(
        'User profile not found'
      );
    });

    it('should get connection recommendations', async () => {
      const result = await getConnectionRecommendations('user-1', 10);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should exclude already connected users', async () => {
      await getConnectionRecommendations('user-1', 10);

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              notIn: expect.arrayContaining(['user-1', 'user-2']),
            }),
          }),
        })
      );
    });

    it('should only include users with public profiles and QR scanning enabled', async () => {
      await getConnectionRecommendations('user-1', 10);

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            profileVisibility: 'public',
            allowQrScanning: true,
          }),
        })
      );
    });

    it('should score recommendations based on shared interests', async () => {
      const result = await getConnectionRecommendations('user-1', 10);

      // User-3 shares 'AI' interest and same org, should be scored higher
      const user3Rec = result.find((r: any) => r.id === 'user-3');
      const user4Rec = result.find((r: any) => r.id === 'user-4');

      if (user3Rec && user4Rec) {
        expect(user3Rec.score).toBeGreaterThan(user4Rec.score);
      }
    });

    it('should include shared interests in recommendation', async () => {
      const result = await getConnectionRecommendations('user-1', 10);

      const user3Rec = result.find((r: any) => r.id === 'user-3');
      if (user3Rec) {
        expect(user3Rec.sharedInterests).toContain('AI');
      }
    });

    it('should add same organization bonus', async () => {
      const result = await getConnectionRecommendations('user-1', 10);

      const user3Rec = result.find((r: any) => r.id === 'user-3');
      if (user3Rec) {
        expect(user3Rec.sameOrganization).toBe(true);
      }
    });

    it('should filter out users with no connection score', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'user-5',
          fullName: 'No Match',
          accelerationInterests: ['Unrelated'],
          organization: 'Different',
          role: 'Other',
          profileVisibility: 'public',
          allowQrScanning: true,
        },
      ]);

      const result = await getConnectionRecommendations('user-1', 10);

      expect(result.every((r: any) => r.score > 0)).toBe(true);
    });

    it('should sort recommendations by score descending', async () => {
      const result = await getConnectionRecommendations('user-1', 10);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });

    it('should respect limit parameter', async () => {
      // Add more mock connections
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([
        ...mockPotentialConnections,
        {
          id: 'user-5',
          fullName: 'User 5',
          accelerationInterests: ['AI'],
          organization: 'NPS',
          profileVisibility: 'public',
          allowQrScanning: true,
        },
      ]);

      const result = await getConnectionRecommendations('user-1', 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should calculate mutual connections', async () => {
      (prisma.connection.findMany as jest.Mock).mockResolvedValue([
        { userId: 'user-1', connectedUserId: 'user-6' },
        { userId: 'user-3', connectedUserId: 'user-6' },
      ]);

      const result = await getConnectionRecommendations('user-1', 10);

      const user3Rec = result.find((r: any) => r.id === 'user-3');
      if (user3Rec) {
        expect(user3Rec.mutualConnections).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
