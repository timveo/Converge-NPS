/**
 * Vitest Test Setup
 * Runs before all tests
 */

import { afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

// Mock IndexedDB for offline cache/queue tests
// The idb library checks for IDBRequest class, so we need to define it
class MockIDBRequest {
  result: unknown = null;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: Event) => void) | null = null;
  readyState: string = 'pending';
  source: unknown = null;
  transaction: unknown = null;
}

// Define IDBRequest globally for idb library checks
Object.defineProperty(global, 'IDBRequest', {
  value: MockIDBRequest,
  writable: true,
});

// Mock the idb module directly to avoid IndexedDB complexity in tests
vi.mock('idb', () => {
  const mockDb = {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    objectStoreNames: { contains: () => true },
    createObjectStore: vi.fn(),
    close: vi.fn(),
  };
  
  return {
    openDB: vi.fn().mockResolvedValue(mockDb),
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.randomUUID
if (!crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
  });
}

// Mock environment variables
vi.mock('process', () => ({
  env: {
    VITE_API_BASE_URL: 'http://localhost:3000/api/v1',
    VITE_WS_URL: 'http://localhost:3000',
  },
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Suppress console errors during tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: An update to') ||
     args[0].includes('act(...)'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
