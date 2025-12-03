import type { DeviceType } from '@/types';

export function getDeviceType(): DeviceType {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export async function hasCamera(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error checking camera availability:', error);
    return false;
  }
}

export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is not in TypeScript
    navigator.msMaxTouchPoints > 0
  );
}

export function isStandalone(): boolean {
  // Check if running as installed PWA
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error - standalone is iOS specific
    window.navigator.standalone === true
  );
}

export function getOS(): 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown' {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  if (/win/.test(userAgent)) return 'windows';
  if (/mac/.test(userAgent)) return 'macos';
  if (/linux/.test(userAgent)) return 'linux';

  return 'unknown';
}

export function getBrowser(): 'chrome' | 'safari' | 'firefox' | 'edge' | 'unknown' {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/edg/.test(userAgent)) return 'edge';
  if (/chrome/.test(userAgent)) return 'chrome';
  if (/safari/.test(userAgent)) return 'safari';
  if (/firefox/.test(userAgent)) return 'firefox';

  return 'unknown';
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export function getDeviceInfo() {
  return {
    deviceType: getDeviceType(),
    isTouchDevice: isTouchDevice(),
    isStandalone: isStandalone(),
    os: getOS(),
    browser: getBrowser(),
    supportsWebGL: supportsWebGL(),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
  };
}
