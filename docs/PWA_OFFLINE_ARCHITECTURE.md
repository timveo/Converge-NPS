# PWA & Offline Architecture

**Document Version:** 1.0
**Date:** 2025-12-02
**Status:** Architecture Design
**Owner:** Architect Agent

---

## Table of Contents

1. [Overview](#overview)
2. [PWA Strategy](#pwa-strategy)
3. [Service Worker Design](#service-worker-design)
4. [Offline Queue Implementation](#offline-queue-implementation)
5. [Network Detection](#network-detection)
6. [PWA Manifest](#pwa-manifest)
7. [Installation Strategy](#installation-strategy)
8. [Push Notifications](#push-notifications)
9. [Offline UI/UX](#offline-uiux)
10. [Performance Optimizations](#performance-optimizations)
11. [Testing Strategy](#testing-strategy)
12. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Simplified Approach for MVP

**From PRD:**
> "Simplified to network-first with basic caching (NOT full offline-first like reference implementation). This reduces frontend complexity by ~40% while maintaining core offline capabilities for critical features."

### Key Simplifications

| Feature | Reference Implementation | Converge-NPS MVP |
|---------|-------------------------|------------------|
| **Caching Strategy** | Full offline-first with IndexedDB | Network-first with Cache API |
| **Offline Queue** | Complex with exponential backoff | Simple retry on reconnection |
| **Conflict Resolution** | Manual UI for conflicts | Last-write-wins (simple) |
| **Stale Data Detection** | >24 hour banner | Not implemented |
| **Sync Architecture** | Bidirectional with visibility detection | Basic unidirectional queue |

### Success Criteria

✅ PWA installable on mobile devices
✅ Network-first caching for all resources
✅ Offline queue for QR scans, messages, RSVPs
✅ Service worker handles update notifications
✅ Works offline for cached data viewing
✅ Reconnection triggers queue processing
✅ Push notifications (if PWA installed)
✅ 40% less complexity than reference implementation

---

## PWA Strategy

### Core Approach

**Network-First Caching**
- Try network first for all requests
- Fall back to cache if network fails
- Update cache with successful network responses
- 24-hour TTL for API responses

**Critical Features Offline**
- View cached connections
- View cached schedule
- Queue QR scans for later
- Queue messages for later
- Queue RSVPs for later

**Non-Critical Features Online-Only**
- Admin dashboard
- Smartsheet sync
- CSV exports
- Real-time messaging (viewing works offline, sending queued)

### Technology Stack

- **Service Worker**: Workbox (Google's PWA library)
- **Cache Storage**: Browser Cache API
- **Offline Queue**: Database `offline_queue` table + IndexedDB for client
- **Push Notifications**: Web Push API + Firebase Cloud Messaging (FCM)
- **Installation**: `beforeinstallprompt` event

---

## Service Worker Design

### Registration

```typescript
// src/serviceWorkerRegistration.ts
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    });
  }
}
```

### Service Worker Lifecycle

```typescript
// public/sw.js (built with Workbox)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache app shell (built assets)
precacheAndRoute(self.__WB_MANIFEST);

// Network-first for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Cache-first for static assets
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Stale-while-revalidate for fonts/CSS
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);
```

### Caching Strategies by Resource

| Resource Type | Strategy | Cache Name | TTL | Max Entries |
|---------------|----------|------------|-----|-------------|
| **App Shell (HTML/JS/CSS)** | Precache | workbox-precache | Forever (versioned) | N/A |
| **API Responses** | Network-first | api-cache | 24 hours | 50 |
| **Images (avatars, logos)** | Cache-first | images-cache | 7 days | 100 |
| **Fonts** | Stale-while-revalidate | static-resources | Forever | 20 |
| **CSS** | Stale-while-revalidate | static-resources | Forever | 10 |

### Update Detection

```typescript
// Service worker update notification
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// In app code
navigator.serviceWorker.addEventListener('controllerchange', () => {
  // Show toast: "New version available. Reload to update."
  showUpdateNotification();
});

function showUpdateNotification() {
  // UI component with "Reload" button
  toast({
    title: 'Update Available',
    description: 'A new version is ready. Click to reload.',
    action: <Button onClick={() => window.location.reload()}>Reload</Button>,
  });
}
```

---

## Offline Queue Implementation

### Database Table (from DATABASE_SCHEMA.md)

```sql
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('qr_scan', 'message', 'rsvp', 'connection_note')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);
```

### Client-Side Queue (IndexedDB)

```typescript
// src/lib/offlineQueue.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineQueueDB extends DBSchema {
  queue: {
    key: string;
    value: {
      id: string;
      userId: string;
      operationType: 'qr_scan' | 'message' | 'rsvp' | 'connection_note';
      payload: any;
      createdAt: number;
      retryCount: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
  };
}

class OfflineQueue {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;

  async init() {
    this.db = await openDB<OfflineQueueDB>('offline-queue', 1, {
      upgrade(db) {
        db.createObjectStore('queue', { keyPath: 'id' });
      },
    });
  }

  async add(operation: Omit<OfflineQueueDB['queue']['value'], 'id' | 'createdAt' | 'retryCount' | 'status'>) {
    if (!this.db) await this.init();

    const item = {
      ...operation,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending' as const,
    };

    await this.db!.put('queue', item);
    return item.id;
  }

  async getAll() {
    if (!this.db) await this.init();
    return this.db!.getAll('queue');
  }

  async getPending() {
    const all = await this.getAll();
    return all.filter(item => item.status === 'pending');
  }

  async remove(id: string) {
    if (!this.db) await this.init();
    await this.db!.delete('queue', id);
  }

  async updateStatus(id: string, status: 'processing' | 'completed' | 'failed') {
    if (!this.db) await this.init();
    const item = await this.db!.get('queue', id);
    if (item) {
      item.status = status;
      if (status === 'processing') {
        item.retryCount++;
      }
      await this.db!.put('queue', item);
    }
  }
}

export const offlineQueue = new OfflineQueue();
```

### Queue Processing

```typescript
// src/lib/queueProcessor.ts
import { offlineQueue } from './offlineQueue';
import { api } from './api';

export async function processOfflineQueue() {
  const pending = await offlineQueue.getPending();

  for (const item of pending) {
    try {
      await offlineQueue.updateStatus(item.id, 'processing');

      switch (item.operationType) {
        case 'qr_scan':
          await api.post('/v1/connections/qr-scan', item.payload);
          break;
        case 'message':
          await api.post('/v1/messages', item.payload);
          break;
        case 'rsvp':
          await api.post('/v1/rsvps', item.payload);
          break;
        case 'connection_note':
          await api.patch(`/v1/connections/${item.payload.connectionId}`, {
            notes: item.payload.notes,
          });
          break;
      }

      await offlineQueue.updateStatus(item.id, 'completed');
      await offlineQueue.remove(item.id);

      console.log(`Processed offline operation: ${item.operationType}`);
    } catch (error) {
      console.error(`Failed to process offline operation: ${item.operationType}`, error);

      // Simple retry: mark as failed after 3 attempts
      if (item.retryCount >= 3) {
        await offlineQueue.updateStatus(item.id, 'failed');
      } else {
        await offlineQueue.updateStatus(item.id, 'pending');
      }
    }
  }
}
```

### Queued Operations

#### 1. QR Code Scan

```typescript
async function handleQRScan(scannedCode: string) {
  const payload = {
    scannedCode,
    scannedAt: new Date().toISOString(),
    method: 'qr_scan',
  };

  if (navigator.onLine) {
    try {
      await api.post('/v1/connections/qr-scan', payload);
    } catch (error) {
      await offlineQueue.add({
        userId: currentUser.id,
        operationType: 'qr_scan',
        payload,
      });
      toast({ title: 'Queued for later', description: 'Will sync when online' });
    }
  } else {
    await offlineQueue.add({
      userId: currentUser.id,
      operationType: 'qr_scan',
      payload,
    });
    toast({ title: 'Saved offline', description: 'Will sync when online' });
  }
}
```

#### 2. Send Message

```typescript
async function sendMessage(conversationId: string, content: string) {
  const payload = {
    conversationId,
    content,
    sentAt: new Date().toISOString(),
  };

  if (navigator.onLine) {
    try {
      await api.post('/v1/messages', payload);
    } catch (error) {
      await offlineQueue.add({
        userId: currentUser.id,
        operationType: 'message',
        payload,
      });
    }
  } else {
    await offlineQueue.add({
      userId: currentUser.id,
      operationType: 'message',
      payload,
    });
  }
}
```

#### 3. RSVP to Session

```typescript
async function rsvpToSession(sessionId: string, status: 'attending' | 'interested') {
  const payload = {
    sessionId,
    status,
    rsvpAt: new Date().toISOString(),
  };

  if (navigator.onLine) {
    try {
      await api.post('/v1/rsvps', payload);
    } catch (error) {
      await offlineQueue.add({
        userId: currentUser.id,
        operationType: 'rsvp',
        payload,
      });
    }
  } else {
    await offlineQueue.add({
      userId: currentUser.id,
      operationType: 'rsvp',
      payload,
    });
  }
}
```

---

## Network Detection

### Online/Offline Events

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { processOfflineQueue } from '@/lib/queueProcessor';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      console.log('Network connection restored');

      // Process offline queue
      processOfflineQueue().catch(console.error);
    }

    function handleOffline() {
      setIsOnline(false);
      console.log('Network connection lost');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Background Sync API (Progressive Enhancement)

```typescript
// Service worker with Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // Fetch pending operations from server
  const response = await fetch('/v1/offline-queue');
  const operations = await response.json();

  // Process each operation
  for (const op of operations) {
    // Send to appropriate endpoint
  }
}

// Register background sync
if ('sync' in navigator.serviceWorker.registration) {
  navigator.serviceWorker.registration.sync.register('sync-offline-queue');
}
```

---

## PWA Manifest

### manifest.json

```json
{
  "name": "Converge-NPS",
  "short_name": "Converge",
  "description": "NPS Tech Accelerator 2026 Networking Platform",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#0F172A",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "750x1334",
      "type": "image/png",
      "platform": "narrow",
      "label": "QR Code Scanner"
    },
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "platform": "wide",
      "label": "Dashboard"
    }
  ],
  "categories": ["networking", "events", "education"],
  "shortcuts": [
    {
      "name": "Scan QR Code",
      "short_name": "Scan",
      "description": "Scan attendee QR code",
      "url": "/scan",
      "icons": [{ "src": "/icons/scan-shortcut.png", "sizes": "96x96" }]
    },
    {
      "name": "My Schedule",
      "short_name": "Schedule",
      "description": "View event schedule",
      "url": "/schedule",
      "icons": [{ "src": "/icons/schedule-shortcut.png", "sizes": "96x96" }]
    },
    {
      "name": "Messages",
      "short_name": "Messages",
      "description": "View messages",
      "url": "/messages",
      "icons": [{ "src": "/icons/messages-shortcut.png", "sizes": "96x96" }]
    }
  ]
}
```

---

## Installation Strategy

### Device-Specific Prompts

```typescript
// src/components/PWAInstallPrompt.tsx
import { useState, useEffect } from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const deviceType = useDeviceType();

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt based on device type
      if (deviceType === 'mobile' || deviceType === 'tablet') {
        // Show after profile completion (tracked in localStorage)
        const profileCompleted = localStorage.getItem('profile_completed');
        if (profileCompleted) {
          setShowPrompt(true);
        }
      }
      // Desktop: don't show prompt (browser use is OK)
    });
  }, [deviceType]);

  async function handleInstall() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User ${outcome} the install prompt`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  }

  function handleDismiss() {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('install_prompt_dismissed', Date.now().toString());
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-primary text-white p-4 rounded-lg shadow-lg">
      <h3 className="font-semibold">Install Converge-NPS</h3>
      <p className="text-sm mt-1">
        Install for offline access and faster loading.
      </p>
      <div className="flex gap-2 mt-3">
        <button onClick={handleInstall} className="btn-primary">
          Install
        </button>
        <button onClick={handleDismiss} className="btn-secondary">
          Not Now
        </button>
      </div>
    </div>
  );
}
```

### Installation Timing

| Device | Timing | Rationale |
|--------|--------|-----------|
| **Mobile** | After profile completion | User has invested time, more likely to install |
| **Tablet** | After profile completion | Same as mobile |
| **Desktop** | Never | Browser use is acceptable for desktop |

---

## Push Notifications

### Setup (if PWA installed)

```typescript
// src/lib/pushNotifications.ts
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function subscribeToPushNotifications() {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY!),
  });

  // Send subscription to server
  await fetch('/v1/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}
```

### Notification Types

| Type | Trigger | Example |
|------|---------|---------|
| **New Message** | Real-time when message received | "John Smith sent you a message" |
| **Session Reminder** | 15 minutes before session | "Your session 'AI in Defense' starts in 15 min" |
| **Connection Request** | When someone scans your QR | "Sarah Lee connected with you" |

### Service Worker Push Handler

```typescript
// Service worker
self.addEventListener('push', (event) => {
  const data = event.data?.json();

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    clients.openWindow(event.notification.data.url);
  }
});
```

---

## Offline UI/UX

### Offline Indicator

```typescript
// src/components/OfflineIndicator.tsx
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black px-4 py-2 text-center text-sm z-50">
      <span className="font-medium">You're offline.</span> Changes will sync when reconnected.
    </div>
  );
}
```

### Pending Operations Badge

```typescript
// src/components/PendingOperationsBadge.tsx
import { useState, useEffect } from 'react';
import { offlineQueue } from '@/lib/offlineQueue';

export function PendingOperationsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function updateCount() {
      const pending = await offlineQueue.getPending();
      setCount(pending.length);
    }

    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg">
      <span className="text-sm font-medium">
        {count} pending {count === 1 ? 'action' : 'actions'}
      </span>
    </div>
  );
}
```

### Manual Retry UI

```typescript
// src/components/OfflineQueueView.tsx
import { offlineQueue } from '@/lib/offlineQueue';
import { processOfflineQueue } from '@/lib/queueProcessor';

export function OfflineQueueView() {
  const [items, setItems] = useState([]);

  async function loadItems() {
    const all = await offlineQueue.getAll();
    setItems(all);
  }

  async function retryAll() {
    await processOfflineQueue();
    await loadItems();
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">Pending Actions</h2>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="border p-3 rounded">
            <div className="flex justify-between items-center">
              <span>{item.operationType}</span>
              <span className="text-sm text-gray-500">
                {item.status} (retry: {item.retryCount})
              </span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={retryAll} className="btn-primary mt-4">
        Retry All
      </button>
    </div>
  );
}
```

---

## Performance Optimizations

### Code Splitting

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Messages = lazy(() => import('./pages/Messages'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Suspense>
  );
}
```

### Image Optimization

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import imagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9] },
      svgo: {
        plugins: [{ name: 'removeViewBox', active: false }],
      },
    }),
  ],
});
```

### Service Worker Precaching

```typescript
// Only precache critical assets
precacheAndRoute([
  { url: '/', revision: '1' },
  { url: '/assets/main.js', revision: '1' },
  { url: '/assets/main.css', revision: '1' },
  { url: '/icons/icon-192x192.png', revision: '1' },
]);
```

### Performance Targets

| Metric | Target (p95) | Measurement |
|--------|--------------|-------------|
| **First Contentful Paint (FCP)** | <1.5s | Lighthouse |
| **Largest Contentful Paint (LCP)** | <2.5s | Lighthouse |
| **Time to Interactive (TTI)** | <3.5s | Lighthouse |
| **Cumulative Layout Shift (CLS)** | <0.1 | Lighthouse |
| **First Input Delay (FID)** | <100ms | Real User Monitoring |
| **App Shell Load (Cached)** | <1s | Custom metric |

---

## Testing Strategy

### Offline Mode Testing

```typescript
// tests/offline.test.ts
import { test, expect } from '@playwright/test';

test('QR scan works offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

  // Go offline
  await context.setOffline(true);

  // Scan QR code
  await page.click('[data-testid="qr-scanner"]');
  await page.fill('[data-testid="qr-input"]', 'TEST123');
  await page.click('[data-testid="submit"]');

  // Verify queued
  await expect(page.locator('[data-testid="pending-badge"]')).toHaveText('1 pending action');

  // Go online
  await context.setOffline(false);

  // Wait for sync
  await page.waitForTimeout(2000);

  // Verify synced
  await expect(page.locator('[data-testid="pending-badge"]')).not.toBeVisible();
});
```

### Service Worker Testing

```typescript
// tests/serviceWorker.test.ts
test('Service worker caches API responses', async ({ page }) => {
  await page.goto('/');

  // First request (network)
  const response1 = await page.request.get('/v1/connections');
  expect(response1.headers()['x-cache']).toBe('MISS');

  // Second request (cache)
  const response2 = await page.request.get('/v1/connections');
  expect(response2.headers()['x-cache']).toBe('HIT');
});
```

### Cross-Browser Testing

| Browser | Version | Test Coverage |
|---------|---------|---------------|
| **Chrome** | Latest | Full |
| **Safari (iOS)** | Latest | Full |
| **Safari (macOS)** | Latest | Full |
| **Firefox** | Latest | Full |
| **Edge** | Latest | Smoke tests |
| **Samsung Internet** | Latest | Smoke tests |

### PWA Audit

```bash
# Lighthouse PWA audit
lighthouse https://converge-nps.com --preset=pwa --output=html

# Expected scores:
# - PWA: 100
# - Performance: 90+
# - Accessibility: 95+
# - Best Practices: 95+
# - SEO: 90+
```

---

## Implementation Checklist

### Week 3-4: Service Worker Setup

- [ ] Install Workbox
- [ ] Configure service worker with Workbox
- [ ] Implement network-first caching for API
- [ ] Implement cache-first for images
- [ ] Implement precaching for app shell
- [ ] Add service worker update notification
- [ ] Test service worker lifecycle

### Week 5: Offline Queue

- [ ] Create IndexedDB schema for offline queue
- [ ] Implement queue add/get/remove operations
- [ ] Implement queue processor with simple retry
- [ ] Add offline queue for QR scans
- [ ] Add offline queue for messages
- [ ] Add offline queue for RSVPs
- [ ] Test queue processing on reconnection

### Week 6: PWA Manifest & Installation

- [ ] Create manifest.json with all required fields
- [ ] Generate PWA icons (72px to 512px)
- [ ] Create screenshots for app stores
- [ ] Implement install prompt component
- [ ] Add device-specific install timing
- [ ] Test installation on iOS and Android
- [ ] Test app shortcuts

### Week 7: Push Notifications

- [ ] Set up Firebase Cloud Messaging (FCM)
- [ ] Implement push subscription
- [ ] Add notification permission request
- [ ] Implement service worker push handler
- [ ] Add notification click handler
- [ ] Test notifications on mobile devices
- [ ] Verify notification delivery during event

### Week 8: Offline UI/UX

- [ ] Add offline indicator banner
- [ ] Add pending operations badge
- [ ] Create offline queue view page
- [ ] Add manual retry functionality
- [ ] Add network status hook
- [ ] Test all offline UI components

### Week 9: Performance Optimization

- [ ] Implement code splitting for routes
- [ ] Add lazy loading for components
- [ ] Optimize images with imagemin
- [ ] Configure service worker precaching
- [ ] Add performance monitoring (Lighthouse CI)
- [ ] Achieve performance targets (LCP <2.5s, etc.)

### Week 10: Testing & QA

- [ ] Write Playwright tests for offline scenarios
- [ ] Test service worker caching strategies
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] PWA audit with Lighthouse
- [ ] Test on real devices (iOS, Android)
- [ ] Load testing with 500+ concurrent users

---

## Summary

### Key Simplifications from Reference Implementation

✅ **Network-first caching** (not full offline-first with IndexedDB)
✅ **Simple retry** on reconnection (not exponential backoff)
✅ **Last-write-wins** conflict resolution (not manual UI)
✅ **No stale data detection** (not >24 hour banner)
✅ **Basic unidirectional queue** (not complex bidirectional sync)

### Offline Queue Operations

✅ QR code scans
✅ Messages
✅ RSVPs
✅ Connection notes

### PWA Installation Strategy

✅ Mobile: Prompt after profile completion
✅ Tablet: Prompt after profile completion
✅ Desktop: No prompt (browser use OK)

### Push Notification Types

✅ New messages
✅ Session reminders
✅ Connection requests

### Complexity Reduction

**Reference Implementation:** ~100% complexity (full offline-first)
**Converge-NPS MVP:** ~60% complexity (network-first with basic queue)
**Reduction:** ~40% less complexity while maintaining core offline capabilities

---

**Last Updated:** 2025-12-02
**Next Review:** Week 3 (Development phase)
