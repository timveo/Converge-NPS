import { featureFlags } from '@/config/features';
import type { DeviceType, FeatureConfig, UserRole } from '@/types';

export function isFeatureAvailable(
  featureName: keyof typeof featureFlags,
  deviceType: DeviceType,
  userRoles: UserRole[] = [],
  hasCamera = false
): boolean {
  const feature = featureFlags[featureName];

  if (!feature || !feature.enabled) {
    return false;
  }

  // Check device compatibility
  if (!feature.devices.includes(deviceType)) {
    return false;
  }

  // Check camera requirement
  if (feature.requiresCamera && !hasCamera) {
    return false;
  }

  // Check role-based access
  if (feature.roles && feature.roles.length > 0) {
    const hasRequiredRole = userRoles.some((role) =>
      feature.roles?.includes(role)
    );
    if (!hasRequiredRole) {
      return false;
    }
  }

  return true;
}

export function getFeatureOptimization(
  featureName: keyof typeof featureFlags
): 'mobile' | 'desktop' | 'both' | undefined {
  const feature = featureFlags[featureName];
  return feature?.optimizedFor;
}

export function getAllEnabledFeatures(
  deviceType: DeviceType,
  userRoles: UserRole[] = [],
  hasCamera = false
): Array<keyof typeof featureFlags> {
  return (Object.keys(featureFlags) as Array<keyof typeof featureFlags>).filter(
    (featureName) =>
      isFeatureAvailable(featureName, deviceType, userRoles, hasCamera)
  );
}
