// Mobile utility functions for haptic feedback and camera selection

/**
 * Trigger haptic feedback on supported devices
 */
export function triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
  // Use Vibration API if available
  if (navigator.vibrate) {
    switch (intensity) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(50);
        break;
      case 'heavy':
        navigator.vibrate([100, 50, 100]);
        break;
    }
  }
}

/**
 * Get the preferred camera device (back camera on mobile)
 */
export function getPreferredCamera(devices: MediaDeviceInfo[]): string | undefined {
  // Prefer back-facing camera on mobile devices
  const backCamera = devices.find(
    (device) =>
      device.kind === 'videoinput' &&
      (device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment'))
  );

  if (backCamera) {
    return backCamera.deviceId;
  }

  // Fall back to first available camera
  const firstCamera = devices.find((device) => device.kind === 'videoinput');
  return firstCamera?.deviceId;
}

/**
 * Check if device supports haptic feedback
 */
export function supportsHaptics(): boolean {
  return 'vibrate' in navigator;
}
