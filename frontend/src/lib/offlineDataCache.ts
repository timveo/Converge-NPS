import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

type DatasetKey =
  | 'schedule:sessions'
  | 'schedule:rsvps:me'
  | 'projects'
  | 'opportunities'
  | 'industry:partners'
  | 'connections:list'
  | 'messages:conversations';

interface CachedDataset {
  key: DatasetKey;
  data: unknown;
  updatedAt: number;
}

interface CachedThread {
  conversationId: string;
  data: unknown;
  updatedAt: number;
}

interface OfflineDataCacheDB extends DBSchema {
  datasets: {
    key: DatasetKey;
    value: CachedDataset;
  };
  messageThreads: {
    key: string;
    value: CachedThread;
  };
}

class OfflineDataCache {
  private db: IDBPDatabase<OfflineDataCacheDB> | null = null;
  private readonly DB_NAME = 'converge-nps-offline-data';
  private readonly DB_VERSION = 2;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineDataCacheDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('messageThreads')) {
          db.createObjectStore('messageThreads', { keyPath: 'conversationId' });
        }
      },
    });
  }

  async set<T>(key: DatasetKey, data: T): Promise<void> {
    if (!this.db) await this.init();

    const record: CachedDataset = {
      key,
      data,
      updatedAt: Date.now(),
    };

    await this.db!.put('datasets', record);
  }

  async get<T>(key: DatasetKey): Promise<{ data: T; updatedAt: number } | null> {
    if (!this.db) await this.init();

    const record = await this.db!.get('datasets', key);
    if (!record) return null;

    return {
      data: record.data as T,
      updatedAt: record.updatedAt,
    };
  }

  async clear(key?: DatasetKey): Promise<void> {
    if (!this.db) await this.init();

    if (key) {
      await this.db!.delete('datasets', key);
      return;
    }

    await this.db!.clear('datasets');
  }

  async setThread<T>(conversationId: string, data: T): Promise<void> {
    if (!this.db) await this.init();

    const record: CachedThread = {
      conversationId,
      data,
      updatedAt: Date.now(),
    };

    await this.db!.put('messageThreads', record);
  }

  async getThread<T>(conversationId: string): Promise<{ data: T; updatedAt: number } | null> {
    if (!this.db) await this.init();

    const record = await this.db!.get('messageThreads', conversationId);
    if (!record) return null;

    return {
      data: record.data as T,
      updatedAt: record.updatedAt,
    };
  }
}

export const offlineDataCache = new OfflineDataCache();
export type { DatasetKey };
