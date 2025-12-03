# Converge-NPS Frontend

React PWA frontend for the Converge-NPS event networking platform.

## Technology Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Routing:** React Router v6
- **PWA:** Vite PWA Plugin (Workbox)
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Offline Storage:** IndexedDB (idb library)
- **Real-time:** Socket.io Client

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components
│   │   └── features/     # Feature-specific components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities
│   │   ├── api.ts        # API client with auth
│   │   ├── deviceDetection.ts
│   │   ├── featureFlags.ts
│   │   ├── offlineQueue.ts
│   │   └── utils.ts
│   ├── types/            # TypeScript types
│   ├── contexts/         # React contexts
│   ├── config/           # Configuration
│   └── assets/           # Static assets
├── public/
│   ├── icons/            # PWA icons
│   └── manifest.webmanifest
├── tests/                # Unit tests
└── vite.config.ts
```

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/v1
VITE_WS_URL=ws://localhost:3000
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_ENV=development
```

## Key Features

### Device Detection & Feature Flagging

The app adapts to device capabilities:

```typescript
import { useDeviceType } from '@/hooks/useDeviceType';
import { useHasCamera } from '@/hooks/useHasCamera';
import { useFeature } from '@/hooks/useFeature';

function MyComponent() {
  const deviceType = useDeviceType(); // 'mobile' | 'tablet' | 'desktop'
  const hasCamera = useHasCamera(); // boolean
  const canScanQR = useFeature('qrScanner'); // boolean
}
```

### Offline Queue

Critical operations are queued when offline:

```typescript
import { addToOfflineQueue } from '@/lib/queueProcessor';

// Add operation to queue
await addToOfflineQueue(userId, 'qr_scan', {
  scannedCode: 'ABC123',
  scannedAt: new Date().toISOString()
});

// Queue processes automatically when online
```

### API Client

Centralized API client with authentication:

```typescript
import { api } from '@/lib/api';

// Automatically includes auth token
const user = await api.get('/users/me');
const connection = await api.post('/connections', data);
```

### Authentication

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
}
```

## Responsive Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1023px
- **Desktop:** >= 1024px

## Development Status

### Completed (Week 3-4)

- ✅ Project setup with Vite + React + TypeScript
- ✅ Tailwind CSS + shadcn/ui configuration
- ✅ Complete project structure
- ✅ TypeScript types for all entities
- ✅ Device detection service
- ✅ Feature flagging system
- ✅ API client with auth interceptors
- ✅ Offline queue with IndexedDB
- ✅ Auth context and hooks
- ✅ Custom React hooks (useDeviceType, useHasCamera, useFeature, etc.)
- ✅ Basic routing setup
- ✅ Login/Register pages
- ✅ PWA configuration (Vite PWA plugin)

### To Be Implemented (Week 5-6)

- QR Scanner component
- Navigation components (BottomNav, Sidebar)
- Profile management
- Connections list and details
- Schedule views (list + timeline)
- Messaging interface
- Research projects browser
- Industry partners directory
- Admin dashboard
- Staff check-in
- Push notifications
- Unit tests

## Testing

```bash
# Run unit tests
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## PWA Features

- Installable on mobile devices
- Network-first caching strategy
- Offline queue for critical operations
- Service worker with Workbox
- App shortcuts for common actions

## Contributing

1. Follow TypeScript strict mode (no `any` types)
2. Use existing shadcn/ui components
3. Mobile-first responsive design
4. Write unit tests for utilities and hooks
5. Update this README for major changes

## License

Proprietary - Naval Postgraduate School
