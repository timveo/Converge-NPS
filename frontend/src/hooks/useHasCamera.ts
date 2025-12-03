import { useState, useEffect } from 'react';
import { hasCamera } from '@/lib/deviceDetection';

export function useHasCamera(): boolean {
  const [cameraAvailable, setCameraAvailable] = useState(false);

  useEffect(() => {
    hasCamera().then(setCameraAvailable);
  }, []);

  return cameraAvailable;
}
