/**
 * Offline Queue Unit Tests
 * Tests for IndexedDB-based offline action queue
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define mocks at module scope using vi.hoisted
const { mockPut, mockGet, mockGetAll, mockGetAllFromIndex, mockDelete, mockClear, mockCount, mockDb, mockUUID } = vi.hoisted(() => {
  const mockPut = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn();
  const mockGetAll = vi.fn().mockResolvedValue([]);
  const mockGetAllFromIndex = vi.fn().mockResolvedValue([]);
  const mockDelete = vi.fn().mockResolvedValue(undefined);
  const mockClear = vi.fn().mockResolvedValue(undefined);
  const mockCount = vi.fn().mockResolvedValue(0);
  const mockDb = {
    put: mockPut,
    get: mockGet,
    getAll: mockGetAll,
    getAllFromIndex: mockGetAllFromIndex,
    delete: mockDelete,
    clear: mockClear,
    count: mockCount,
  };
  const mockUUID = 'test-uuid-1234';
  return { mockPut, mockGet, mockGetAll, mockGetAllFromIndex, mockDelete, mockClear, mockCount, mockDb, mockUUID };
});

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue(mockUUID),
});

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDb),
}));

// Import after mocking
import { offlineQueue } from '../../src/lib/offlineQueue';

describe('OfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log for cleaner test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('add', () => {
    it('should add item to queue with correct structure', async () => {
      const userId = 'user-123';
      const operationType = 'qr_scan';
      const payload = { scannedUserId: 'user-456' };

      const beforeTime = Date.now();
      const id = await offlineQueue.add(userId, operationType, payload);

      expect(id).toBe(mockUUID);
      expect(mockPut).toHaveBeenCalledWith('queue', expect.objectContaining({
        id: mockUUID,
        userId,
        operationType,
        payload,
        retryCount: 0,
        status: 'pending',
        createdAt: expect.any(Number),
      }));

      const callArg = mockPut.mock.calls[0][1];
      expect(callArg.createdAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should handle different operation types', async () => {
      await offlineQueue.add('user-1', 'message', { content: 'Hello' });
      await offlineQueue.add('user-1', 'rsvp', { sessionId: 'session-1' });
      await offlineQueue.add('user-1', 'connection_note', { note: 'Met at booth' });

      expect(mockPut).toHaveBeenCalledTimes(3);
      expect(mockPut.mock.calls[0][1].operationType).toBe('message');
      expect(mockPut.mock.calls[1][1].operationType).toBe('rsvp');
      expect(mockPut.mock.calls[2][1].operationType).toBe('connection_note');
    });
  });

  describe('getAll', () => {
    it('should return all queued items', async () => {
      const mockItems = [
        { id: '1', operationType: 'qr_scan', status: 'pending' },
        { id: '2', operationType: 'message', status: 'completed' },
      ];
      mockGetAll.mockResolvedValueOnce(mockItems);

      const result = await offlineQueue.getAll();

      expect(mockGetAll).toHaveBeenCalledWith('queue');
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when queue is empty', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const result = await offlineQueue.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getPending', () => {
    it('should return only pending items', async () => {
      const pendingItems = [
        { id: '1', operationType: 'qr_scan', status: 'pending' },
        { id: '3', operationType: 'rsvp', status: 'pending' },
      ];
      mockGetAllFromIndex.mockResolvedValueOnce(pendingItems);

      const result = await offlineQueue.getPending();

      expect(mockGetAllFromIndex).toHaveBeenCalledWith('queue', 'by-status', 'pending');
      expect(result).toEqual(pendingItems);
    });
  });

  describe('get', () => {
    it('should retrieve specific item by id', async () => {
      const mockItem = { id: 'item-1', operationType: 'qr_scan', status: 'pending' };
      mockGet.mockResolvedValueOnce(mockItem);

      const result = await offlineQueue.get('item-1');

      expect(mockGet).toHaveBeenCalledWith('queue', 'item-1');
      expect(result).toEqual(mockItem);
    });

    it('should return undefined for non-existent item', async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const result = await offlineQueue.get('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should delete item from queue', async () => {
      await offlineQueue.remove('item-1');

      expect(mockDelete).toHaveBeenCalledWith('queue', 'item-1');
    });
  });

  describe('updateStatus', () => {
    it('should update item status', async () => {
      const mockItem = { id: 'item-1', status: 'pending', retryCount: 0 };
      mockGet.mockResolvedValueOnce({ ...mockItem });

      await offlineQueue.updateStatus('item-1', 'completed');

      expect(mockPut).toHaveBeenCalledWith('queue', expect.objectContaining({
        id: 'item-1',
        status: 'completed',
      }));
    });

    it('should increment retry count when status is processing', async () => {
      const mockItem = { id: 'item-1', status: 'pending', retryCount: 1 };
      mockGet.mockResolvedValueOnce({ ...mockItem });

      await offlineQueue.updateStatus('item-1', 'processing');

      expect(mockPut).toHaveBeenCalledWith('queue', expect.objectContaining({
        id: 'item-1',
        status: 'processing',
        retryCount: 2,
      }));
    });

    it('should not update if item does not exist', async () => {
      mockGet.mockResolvedValueOnce(undefined);

      await offlineQueue.updateStatus('non-existent', 'completed');

      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear entire queue', async () => {
      await offlineQueue.clear();

      expect(mockClear).toHaveBeenCalledWith('queue');
    });
  });

  describe('count', () => {
    it('should return total count of items', async () => {
      mockCount.mockResolvedValueOnce(5);

      const result = await offlineQueue.count();

      expect(mockCount).toHaveBeenCalledWith('queue');
      expect(result).toBe(5);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending items', async () => {
      const pendingItems = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'pending' },
      ];
      mockGetAllFromIndex.mockResolvedValueOnce(pendingItems);

      const result = await offlineQueue.getPendingCount();

      expect(result).toBe(3);
    });

    it('should return 0 when no pending items', async () => {
      mockGetAllFromIndex.mockResolvedValueOnce([]);

      const result = await offlineQueue.getPendingCount();

      expect(result).toBe(0);
    });
  });
});
