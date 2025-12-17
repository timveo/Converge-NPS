/**
 * Offline Data Cache Unit Tests
 * Tests for IndexedDB-based offline data caching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define mocks at module scope using vi.hoisted
const { mockPut, mockGet, mockDelete, mockClear, mockDb } = vi.hoisted(() => {
  const mockPut = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn();
  const mockDelete = vi.fn().mockResolvedValue(undefined);
  const mockClear = vi.fn().mockResolvedValue(undefined);
  const mockDb = {
    put: mockPut,
    get: mockGet,
    delete: mockDelete,
    clear: mockClear,
  };
  return { mockPut, mockGet, mockDelete, mockClear, mockDb };
});

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDb),
}));

// Import after mocking
import { offlineDataCache } from '../../src/lib/offlineDataCache';

describe('OfflineDataCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('set', () => {
    it('should store data with timestamp', async () => {
      const testData = [{ id: '1', name: 'Test Session' }];
      const beforeTime = Date.now();

      await offlineDataCache.set('schedule:sessions', testData);

      expect(mockPut).toHaveBeenCalledWith('datasets', expect.objectContaining({
        key: 'schedule:sessions',
        data: testData,
        updatedAt: expect.any(Number),
      }));

      const callArg = mockPut.mock.calls[0][1];
      expect(callArg.updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(callArg.updatedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should handle different dataset keys', async () => {
      const projectsData = [{ id: 'p1', title: 'Project 1' }];
      const opportunitiesData = [{ id: 'o1', title: 'Opportunity 1' }];

      await offlineDataCache.set('projects', projectsData);
      await offlineDataCache.set('opportunities', opportunitiesData);

      expect(mockPut).toHaveBeenCalledTimes(2);
      expect(mockPut).toHaveBeenCalledWith('datasets', expect.objectContaining({
        key: 'projects',
        data: projectsData,
      }));
      expect(mockPut).toHaveBeenCalledWith('datasets', expect.objectContaining({
        key: 'opportunities',
        data: opportunitiesData,
      }));
    });
  });

  describe('get', () => {
    it('should retrieve cached data with timestamp', async () => {
      const cachedRecord = {
        key: 'schedule:sessions',
        data: [{ id: '1', name: 'Test Session' }],
        updatedAt: 1702000000000,
      };
      mockGet.mockResolvedValueOnce(cachedRecord);

      const result = await offlineDataCache.get('schedule:sessions');

      expect(mockGet).toHaveBeenCalledWith('datasets', 'schedule:sessions');
      expect(result).toEqual({
        data: cachedRecord.data,
        updatedAt: cachedRecord.updatedAt,
      });
    });

    it('should return null for non-existent keys', async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const result = await offlineDataCache.get('schedule:sessions');

      expect(result).toBeNull();
    });

    it('should preserve data types', async () => {
      const complexData = {
        sessions: [{ id: '1', attendees: 50, isActive: true }],
        metadata: { total: 1, page: 1 },
      };
      mockGet.mockResolvedValueOnce({
        key: 'schedule:sessions',
        data: complexData,
        updatedAt: Date.now(),
      });

      const result = await offlineDataCache.get<typeof complexData>('schedule:sessions');

      expect(result?.data).toEqual(complexData);
    });
  });

  describe('clear', () => {
    it('should clear specific key when provided', async () => {
      await offlineDataCache.clear('schedule:sessions');

      expect(mockDelete).toHaveBeenCalledWith('datasets', 'schedule:sessions');
      expect(mockClear).not.toHaveBeenCalled();
    });

    it('should clear all datasets when no key provided', async () => {
      await offlineDataCache.clear();

      expect(mockClear).toHaveBeenCalledWith('datasets');
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('setThread', () => {
    it('should store message thread with conversation ID', async () => {
      const threadData = {
        messages: [{ id: 'm1', content: 'Hello' }],
        participants: ['user1', 'user2'],
      };

      await offlineDataCache.setThread('conv-123', threadData);

      expect(mockPut).toHaveBeenCalledWith('messageThreads', expect.objectContaining({
        conversationId: 'conv-123',
        data: threadData,
        updatedAt: expect.any(Number),
      }));
    });
  });

  describe('getThread', () => {
    it('should retrieve cached thread data', async () => {
      const cachedThread = {
        conversationId: 'conv-123',
        data: { messages: [{ id: 'm1', content: 'Hello' }] },
        updatedAt: 1702000000000,
      };
      mockGet.mockResolvedValueOnce(cachedThread);

      const result = await offlineDataCache.getThread('conv-123');

      expect(mockGet).toHaveBeenCalledWith('messageThreads', 'conv-123');
      expect(result).toEqual({
        data: cachedThread.data,
        updatedAt: cachedThread.updatedAt,
      });
    });

    it('should return null for non-existent thread', async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const result = await offlineDataCache.getThread('non-existent');

      expect(result).toBeNull();
    });
  });
});
