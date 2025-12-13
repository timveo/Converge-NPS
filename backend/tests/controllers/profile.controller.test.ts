/**
 * Profile Controller Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import { ProfileController } from '../../src/controllers/profile.controller';
import { ProfileService } from '../../src/services/profile.service';

// Mock the ProfileService
jest.mock('../../src/services/profile.service');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ProfileController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

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

    mockNext = jest.fn();
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;

      const mockProfile = {
        id: 'user-123',
        email: 'test@nps.edu',
        fullName: 'Test User',
      };

      (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

      await ProfileController.getMyProfile(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.getProfile).toHaveBeenCalledWith('user-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ profile: mockProfile });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.getMyProfile(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        })
      );
    });

    it('should pass errors to next', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;

      const error = new Error('Database error');
      (ProfileService.getProfile as jest.Mock).mockRejectedValue(error);

      await ProfileController.getMyProfile(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateMyProfile', () => {
    it('should update profile successfully', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;
      mockReq.body = { fullName: 'Updated Name' };

      const updatedProfile = {
        id: 'user-123',
        fullName: 'Updated Name',
      };

      (ProfileService.updateProfile as jest.Mock).mockResolvedValue(updatedProfile);

      await ProfileController.updateMyProfile(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.updateProfile).toHaveBeenCalledWith('user-123', { fullName: 'Updated Name' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        profile: updatedProfile,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.updateMyProfile(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('updatePrivacy', () => {
    it('should update privacy settings', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;
      mockReq.body = { allowQrScanning: false };

      const updatedProfile = {
        id: 'user-123',
        allowQrScanning: false,
      };

      (ProfileService.updatePrivacy as jest.Mock).mockResolvedValue(updatedProfile);

      await ProfileController.updatePrivacy(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.updatePrivacy).toHaveBeenCalledWith('user-123', { allowQrScanning: false });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Privacy settings updated successfully',
        profile: updatedProfile,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.updatePrivacy(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('updateOnboarding', () => {
    it('should update onboarding status', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;
      mockReq.body = { onboardingStep: 3, onboardingCompleted: false };

      const updatedProfile = {
        id: 'user-123',
        onboardingStep: 3,
        onboardingCompleted: false,
      };

      (ProfileService.updateOnboarding as jest.Mock).mockResolvedValue(updatedProfile);

      await ProfileController.updateOnboarding(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.updateOnboarding).toHaveBeenCalledWith('user-123', 3, false);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Onboarding status updated',
        profile: updatedProfile,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.updateOnboarding(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getProfile', () => {
    it('should return another user profile', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;
      mockReq.params = { userId: 'user-456' };

      const mockProfile = {
        id: 'user-456',
        fullName: 'Other User',
      };

      (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

      await ProfileController.getProfile(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.getProfile).toHaveBeenCalledWith('user-456', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ profile: mockProfile });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { userId: 'user-456' };

      await ProfileController.getProfile(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getQRCode', () => {
    it('should return QR code', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;

      const mockQRCode = {
        code: 'QR123ABC',
        userId: 'user-123',
      };

      (ProfileService.getQRCode as jest.Mock).mockResolvedValue(mockQRCode);

      await ProfileController.getQRCode(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.getQRCode).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ qrCode: mockQRCode });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.getQRCode(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('regenerateQRCode', () => {
    it('should regenerate QR code', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;

      const newQRCode = {
        code: 'NEWQR456',
        userId: 'user-123',
      };

      (ProfileService.regenerateQRCode as jest.Mock).mockResolvedValue(newQRCode);

      await ProfileController.regenerateQRCode(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.regenerateQRCode).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'QR code regenerated successfully',
        qrCode: newQRCode,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.regenerateQRCode(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;
      mockReq.body = { avatarUrl: 'https://example.com/avatar.jpg' };

      const updatedProfile = {
        id: 'user-123',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      (ProfileService.uploadAvatar as jest.Mock).mockResolvedValue(updatedProfile);

      await ProfileController.uploadAvatar(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.uploadAvatar).toHaveBeenCalledWith('user-123', 'https://example.com/avatar.jpg');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Avatar uploaded successfully',
        profile: updatedProfile,
      });
    });

    it('should return 400 if avatar URL is invalid', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;
      mockReq.body = { avatarUrl: '' };

      await ProfileController.uploadAvatar(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_AVATAR_URL' }),
        })
      );
    });

    it('should return 400 if avatar URL is not a string', async () => {
      mockReq.user = { id: 'user-123', roles: ['student'] } as any;
      mockReq.body = { avatarUrl: 123 };

      await ProfileController.uploadAvatar(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.uploadAvatar(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('searchProfiles', () => {
    it('should search profiles with all filters', async () => {
      mockReq.user = { id: 'user-123', roles: ['admin'] } as any;
      mockReq.query = {
        search: 'test',
        organization: 'NPS',
        department: 'CS',
        role: 'student',
        page: '1',
        limit: '10',
      };

      const searchResult = {
        profiles: [{ id: 'user-456', fullName: 'Test User' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      (ProfileService.searchProfiles as jest.Mock).mockResolvedValue(searchResult);

      await ProfileController.searchProfiles(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.searchProfiles).toHaveBeenCalledWith({
        search: 'test',
        organization: 'NPS',
        department: 'CS',
        role: 'student',
        page: 1,
        limit: 10,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(searchResult);
    });

    it('should search profiles without filters', async () => {
      mockReq.user = { id: 'user-123', roles: ['admin'] } as any;
      mockReq.query = {};

      const searchResult = {
        profiles: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      (ProfileService.searchProfiles as jest.Mock).mockResolvedValue(searchResult);

      await ProfileController.searchProfiles(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(ProfileService.searchProfiles).toHaveBeenCalledWith({
        search: undefined,
        organization: undefined,
        department: undefined,
        role: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await ProfileController.searchProfiles(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should pass errors to next', async () => {
      mockReq.user = { id: 'user-123', roles: ['admin'] } as any;
      mockReq.query = {};

      const error = new Error('Search error');
      (ProfileService.searchProfiles as jest.Mock).mockRejectedValue(error);

      await ProfileController.searchProfiles(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
