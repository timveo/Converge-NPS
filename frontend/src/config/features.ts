import type { FeatureFlags } from '@/types';

export const featureFlags: FeatureFlags = {
  qrScanner: {
    enabled: true,
    requiresCamera: true,
    devices: ['mobile', 'tablet'],
  },
  manualCodeEntry: {
    enabled: true,
    requiresCamera: false,
    devices: ['mobile', 'tablet', 'desktop'],
  },
  adminDashboard: {
    enabled: true,
    devices: ['mobile', 'tablet', 'desktop'],
    roles: ['admin', 'staff'],
    optimizedFor: 'desktop',
  },
  staffCheckin: {
    enabled: true,
    devices: ['mobile', 'tablet', 'desktop'],
    roles: ['staff', 'admin'],
    optimizedFor: 'mobile',
  },
  messaging: {
    enabled: true,
    devices: ['mobile', 'tablet', 'desktop'],
    optimizedFor: 'both',
  },
  timelineView: {
    enabled: true,
    devices: ['mobile', 'tablet', 'desktop'],
    optimizedFor: 'desktop',
  },
  connectionsList: {
    enabled: true,
    devices: ['mobile', 'tablet', 'desktop'],
    optimizedFor: 'both',
  },
};
