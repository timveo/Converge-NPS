import { useMemo } from 'react';
import { useDeviceType } from './useDeviceType';
import { useHasCamera } from './useHasCamera';
import { useAuth } from './useAuth';
import { isFeatureAvailable } from '@/lib/featureFlags';
import { featureFlags } from '@/config/features';

export function useFeature(featureName: keyof typeof featureFlags): boolean {
  const deviceType = useDeviceType();
  const hasCamera = useHasCamera();
  const { user } = useAuth();

  return useMemo(() => {
    return isFeatureAvailable(
      featureName,
      deviceType,
      user?.roles || [],
      hasCamera
    );
  }, [featureName, deviceType, user?.roles, hasCamera]);
}
