/**
 * Profile Service Unit Tests
 * Tests for profile management, privacy, and QR codes
 */

import { ProfileService } from '../../src/services/profile.service';
import prisma from '../../src/config/database';

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const mockProfile = {
      id: 'user-1',
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '555-0123',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      websiteUrl: 'https://johndoe.com',
      profileVisibility: 'public',
      hideContactInfo: false,
      userRoles: [{ role: 'student' }],
    };

    it('should get public profile', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getProfile('user-1', 'user-2');

      expect(result.id).toBe('user-1');
      expect(result.fullName).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('should throw NotFoundError if profile not found', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ProfileService.getProfile('nonexistent', 'user-2')).rejects.toThrow(
        'Profile not found'
      );
    });

    it('should throw ForbiddenError for private profile (non-admin)', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        profileVisibility: 'private',
      });
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ role: 'student' }]);

      await expect(ProfileService.getProfile('user-1', 'user-2')).rejects.toThrow(
        'This profile is private'
      );
    });

    it('should allow admin to view private profile', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        profileVisibility: 'private',
      });
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ role: 'admin' }]);

      const result = await ProfileService.getProfile('user-1', 'admin-user');

      expect(result.id).toBe('user-1');
    });

    it('should allow user to view own private profile', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        profileVisibility: 'private',
      });

      const result = await ProfileService.getProfile('user-1', 'user-1');

      expect(result.id).toBe('user-1');
    });

    it('should hide contact info when hideContactInfo is true', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        hideContactInfo: true,
      });

      const result = await ProfileService.getProfile('user-1', 'user-2');

      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.linkedinUrl).toBeNull();
      expect(result.websiteUrl).toBeNull();
    });

    it('should show contact info to profile owner even when hidden', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        hideContactInfo: true,
      });

      const result = await ProfileService.getProfile('user-1', 'user-1');

      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('555-0123');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      (prisma.profile.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        fullName: 'John Updated',
        bio: 'New bio',
      });

      const result = await ProfileService.updateProfile('user-1', {
        fullName: 'John Updated',
        bio: 'New bio',
      });

      expect(result.fullName).toBe('John Updated');
      expect(result.bio).toBe('New bio');
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fullName: 'John Updated', bio: 'New bio' },
      });
    });

    it('should update acceleration interests', async () => {
      (prisma.profile.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        accelerationInterests: ['AI', 'ML', 'Cybersecurity'],
      });

      const result = await ProfileService.updateProfile('user-1', {
        accelerationInterests: ['AI', 'ML', 'Cybersecurity'],
      });

      expect(result.accelerationInterests).toContain('AI');
    });
  });

  describe('updatePrivacy', () => {
    it('should update privacy settings', async () => {
      (prisma.profile.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        profileVisibility: 'private',
        allowQrScanning: false,
        allowMessaging: false,
        hideContactInfo: true,
      });

      const result = await ProfileService.updatePrivacy('user-1', {
        profileVisibility: 'private',
        allowQrScanning: false,
        allowMessaging: false,
        hideContactInfo: true,
      });

      expect(result.profileVisibility).toBe('private');
      expect(result.allowQrScanning).toBe(false);
    });
  });

  describe('updateOnboarding', () => {
    it('should update onboarding step', async () => {
      (prisma.profile.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        onboardingStep: 3,
        onboardingCompleted: false,
      });

      const result = await ProfileService.updateOnboarding('user-1', 3);

      expect(result.onboardingStep).toBe(3);
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { onboardingStep: 3, onboardingCompleted: undefined },
      });
    });

    it('should mark onboarding as completed', async () => {
      (prisma.profile.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        onboardingStep: 5,
        onboardingCompleted: true,
      });

      const result = await ProfileService.updateOnboarding('user-1', 5, true);

      expect(result.onboardingCompleted).toBe(true);
    });
  });

  describe('getQRCode', () => {
    it('should return existing active QR code', async () => {
      (prisma.qrCode.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        qrCodeData: 'existing-qr-data',
        scanCount: 10,
        isActive: true,
      });

      const result = await ProfileService.getQRCode('user-1');

      expect(result.qrCodeData).toBe('existing-qr-data');
      expect(result.scanCount).toBe(10);
    });

    it('should create new QR code if none exists', async () => {
      (prisma.qrCode.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.qrCode.upsert as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        qrCodeData: 'new-qr-data',
        scanCount: 0,
        isActive: true,
      });

      const result = await ProfileService.getQRCode('user-1');

      expect(result.qrCodeData).toBe('new-qr-data');
      expect(result.scanCount).toBe(0);
      expect(prisma.qrCode.upsert).toHaveBeenCalled();
    });

    it('should regenerate QR code if inactive', async () => {
      (prisma.qrCode.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        qrCodeData: 'old-qr-data',
        scanCount: 5,
        isActive: false,
      });
      (prisma.qrCode.upsert as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        qrCodeData: 'new-qr-data',
        scanCount: 0,
        isActive: true,
      });

      const result = await ProfileService.getQRCode('user-1');

      expect(result.qrCodeData).toBe('new-qr-data');
      expect(prisma.qrCode.upsert).toHaveBeenCalled();
    });
  });

  describe('regenerateQRCode', () => {
    it('should regenerate QR code and reset scan count', async () => {
      (prisma.qrCode.upsert as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        qrCodeData: 'regenerated-qr-data',
        scanCount: 0,
        isActive: true,
      });

      const result = await ProfileService.regenerateQRCode('user-1');

      expect(result.qrCodeData).toBe('regenerated-qr-data');
      expect(prisma.qrCode.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          userId: 'user-1',
          isActive: true,
        }),
        update: expect.objectContaining({
          isActive: true,
          scanCount: 0,
        }),
      });
    });
  });

  describe('uploadAvatar', () => {
    it('should update avatar URL', async () => {
      (prisma.profile.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        avatarUrl: 'https://storage.example.com/avatar.jpg',
      });

      const result = await ProfileService.uploadAvatar(
        'user-1',
        'https://storage.example.com/avatar.jpg'
      );

      expect(result.avatarUrl).toBe('https://storage.example.com/avatar.jpg');
    });
  });

  describe('searchProfiles', () => {
    it('should search profiles with pagination', async () => {
      const mockProfiles = [
        { id: 'user-1', fullName: 'John Doe', userRoles: [] },
        { id: 'user-2', fullName: 'Jane Smith', userRoles: [] },
      ];

      (prisma.profile.findMany as jest.Mock).mockResolvedValue(mockProfiles);
      (prisma.profile.count as jest.Mock).mockResolvedValue(2);

      const result = await ProfileService.searchProfiles({
        page: 1,
        limit: 20,
      });

      expect(result.profiles).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should search by search term', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.profile.count as jest.Mock).mockResolvedValue(0);

      await ProfileService.searchProfiles({ search: 'John' });

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { fullName: { contains: 'John', mode: 'insensitive' } },
              { email: { contains: 'John', mode: 'insensitive' } },
              { organization: { contains: 'John', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should filter by organization', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.profile.count as jest.Mock).mockResolvedValue(0);

      await ProfileService.searchProfiles({ organization: 'NPS' });

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organization: { contains: 'NPS', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should filter by department', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.profile.count as jest.Mock).mockResolvedValue(0);

      await ProfileService.searchProfiles({ department: 'CS' });

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: { contains: 'CS', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should filter by role', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.profile.count as jest.Mock).mockResolvedValue(0);

      await ProfileService.searchProfiles({ role: 'Student' });

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { contains: 'Student', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should calculate total pages correctly', async () => {
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.profile.count as jest.Mock).mockResolvedValue(55);

      const result = await ProfileService.searchProfiles({ page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });
  });
});
