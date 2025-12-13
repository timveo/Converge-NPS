/**
 * useDeviceType Hook Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeviceType } from '../../src/hooks/useDeviceType';

// Mock deviceDetection
vi.mock('@/lib/deviceDetection', () => ({
  getDeviceType: vi.fn().mockReturnValue('desktop'),
}));

describe('useDeviceType', () => {
  let resizeHandler: () => void;

  beforeEach(() => {
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'resize') resizeHandler = handler as () => void;
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial device type', async () => {
    const { getDeviceType } = await import('@/lib/deviceDetection');
    (getDeviceType as any).mockReturnValue('desktop');

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('desktop');
  });

  it('should return mobile device type', async () => {
    const { getDeviceType } = await import('@/lib/deviceDetection');
    (getDeviceType as any).mockReturnValue('mobile');

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('mobile');
  });

  it('should return tablet device type', async () => {
    const { getDeviceType } = await import('@/lib/deviceDetection');
    (getDeviceType as any).mockReturnValue('tablet');

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('tablet');
  });

  it('should add resize event listener on mount', () => {
    renderHook(() => useDeviceType());

    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should remove resize event listener on unmount', () => {
    const { unmount } = renderHook(() => useDeviceType());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should update device type on resize', async () => {
    const { getDeviceType } = await import('@/lib/deviceDetection');
    (getDeviceType as any).mockReturnValue('desktop');

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('desktop');

    // Simulate resize to mobile
    (getDeviceType as any).mockReturnValue('mobile');

    act(() => {
      resizeHandler();
    });

    expect(result.current).toBe('mobile');
  });
});
