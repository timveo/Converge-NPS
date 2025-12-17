import { useState, useEffect, useMemo } from 'react';
import { getDeviceType } from '@/lib/deviceDetection';
import type { DeviceType } from '@/types';

export interface DeviceInfo {
  deviceType: DeviceType;
  isDesktop: boolean;
  isMobile: boolean;
  isTablet: boolean;
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType());

  useEffect(() => {
    function handleResize() {
      setDeviceType(getDeviceType());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
}

export function useDevice(): DeviceInfo {
  const deviceType = useDeviceType();

  return useMemo(() => ({
    deviceType,
    isDesktop: deviceType === 'desktop',
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
  }), [deviceType]);
}
