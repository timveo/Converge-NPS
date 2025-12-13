/**
 * Feature Flags Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isFeatureAvailable,
  getFeatureOptimization,
  getAllEnabledFeatures,
} from '../../src/lib/featureFlags';

describe('Feature Flags', () => {
  describe('isFeatureAvailable', () => {
    it('should return true for enabled feature on supported device', () => {
      const result = isFeatureAvailable('messaging', 'desktop', []);
      expect(result).toBe(true);
    });

    it('should return false for disabled device type', () => {
      // qrScanner is not enabled for desktop
      const result = isFeatureAvailable('qrScanner', 'desktop', []);
      expect(result).toBe(false);
    });

    it('should return true for mobile device with qrScanner', () => {
      const result = isFeatureAvailable('qrScanner', 'mobile', [], true);
      expect(result).toBe(true);
    });

    it('should return false when camera is required but not available', () => {
      const result = isFeatureAvailable('qrScanner', 'mobile', [], false);
      expect(result).toBe(false);
    });

    it('should check role-based access for admin features', () => {
      // Admin without admin role
      const resultWithoutRole = isFeatureAvailable('adminDashboard', 'desktop', ['student']);
      expect(resultWithoutRole).toBe(false);

      // Admin with admin role
      const resultWithRole = isFeatureAvailable('adminDashboard', 'desktop', ['admin']);
      expect(resultWithRole).toBe(true);
    });

    it('should allow staff to access admin dashboard', () => {
      const result = isFeatureAvailable('adminDashboard', 'desktop', ['staff']);
      expect(result).toBe(true);
    });

    it('should return true for features without role restrictions', () => {
      const result = isFeatureAvailable('messaging', 'mobile', []);
      expect(result).toBe(true);
    });

    it('should support tablet device', () => {
      const result = isFeatureAvailable('manualCodeEntry', 'tablet', []);
      expect(result).toBe(true);
    });
  });

  describe('getFeatureOptimization', () => {
    it('should return desktop for adminDashboard', () => {
      const result = getFeatureOptimization('adminDashboard');
      expect(result).toBe('desktop');
    });

    it('should return mobile for staffCheckin', () => {
      const result = getFeatureOptimization('staffCheckin');
      expect(result).toBe('mobile');
    });

    it('should return both for messaging', () => {
      const result = getFeatureOptimization('messaging');
      expect(result).toBe('both');
    });

    it('should return undefined for features without optimization', () => {
      const result = getFeatureOptimization('qrScanner');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllEnabledFeatures', () => {
    it('should return features available for desktop', () => {
      const result = getAllEnabledFeatures('desktop', ['admin']);

      expect(result).toContain('manualCodeEntry');
      expect(result).toContain('messaging');
      expect(result).toContain('adminDashboard');
      expect(result).not.toContain('qrScanner'); // Not available on desktop
    });

    it('should return features available for mobile', () => {
      const result = getAllEnabledFeatures('mobile', [], true);

      expect(result).toContain('qrScanner');
      expect(result).toContain('manualCodeEntry');
      expect(result).toContain('messaging');
    });

    it('should filter by role', () => {
      const resultWithRole = getAllEnabledFeatures('desktop', ['admin']);
      const resultWithoutRole = getAllEnabledFeatures('desktop', ['student']);

      expect(resultWithRole).toContain('adminDashboard');
      expect(resultWithoutRole).not.toContain('adminDashboard');
    });

    it('should filter by camera availability', () => {
      const resultWithCamera = getAllEnabledFeatures('mobile', [], true);
      const resultWithoutCamera = getAllEnabledFeatures('mobile', [], false);

      expect(resultWithCamera).toContain('qrScanner');
      expect(resultWithoutCamera).not.toContain('qrScanner');
    });
  });
});
