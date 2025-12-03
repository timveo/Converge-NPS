import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OfflineQueueItem, OperationType, QueueStatus } from '@/types';

interface OfflineQueueDB extends DBSchema {
  queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-status': string };
  };
}

class OfflineQueue {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;
  private readonly DB_NAME = 'converge-nps-offline-queue';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineQueueDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('queue')) {
          const store = db.createObjectStore('queue', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        }
      },
    });
  }

  async add(
    userId: string,
    operationType: OperationType,
    payload: Record<string, unknown>
  ): Promise<string> {
    if (!this.db) await this.init();

    const item: OfflineQueueItem = {
      id: crypto.randomUUID(),
      userId,
      operationType,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await this.db!.put('queue', item);
    console.log(`Added to offline queue: ${operationType}`, item);
    return item.id;
  }

  async getAll(): Promise<OfflineQueueItem[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('queue');
  }

  async getPending(): Promise<OfflineQueueItem[]> {
    if (!this.db) await this.init();
    const all = await this.db!.getAllFromIndex('queue', 'by-status', 'pending');
    return all;
  }

  async get(id: string): Promise<OfflineQueueItem | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('queue', id);
  }

  async remove(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('queue', id);
    console.log(`Removed from offline queue: ${id}`);
  }

  async updateStatus(id: string, status: QueueStatus): Promise<void> {
    if (!this.db) await this.init();

    const item = await this.db!.get('queue', id);
    if (!item) return;

    item.status = status;
    if (status === 'processing') {
      item.retryCount++;
    }

    await this.db!.put('queue', item);
    console.log(`Updated queue item ${id} status to ${status}`);
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('queue');
    console.log('Cleared offline queue');
  }

  async count(): Promise<number> {
    if (!this.db) await this.init();
    return this.db!.count('queue');
  }

  async getPendingCount(): Promise<number> {
    if (!this.db) await this.init();
    const pending = await this.getPending();
    return pending.length;
  }
}

export const offlineQueue = new OfflineQueue();
