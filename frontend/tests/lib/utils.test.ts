/**
 * Frontend Utils Unit Tests
 * Tests for utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  truncate,
  getInitials,
  debounce,
  throttle,
  generateId,
  sleep,
} from '../../src/lib/utils';

describe('Utils', () => {
  describe('cn (classnames)', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const condition = false;
      const result = cn('foo', condition && 'bar', 'baz');
      expect(result).toBe('foo baz');
    });

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle arrays', () => {
      const result = cn(['foo', 'bar']);
      expect(result).toBe('foo bar');
    });

    it('should handle objects', () => {
      const result = cn({ foo: true, bar: false, baz: true });
      expect(result).toBe('foo baz');
    });
  });

  describe('formatDate', () => {
    it('should format date string', () => {
      const result = formatDate('2024-03-15T10:00:00Z');
      expect(result).toMatch(/Mar\s+15,\s+2024/);
    });

    it('should format Date object', () => {
      const date = new Date('2024-03-15T10:00:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/Mar\s+15,\s+2024/);
    });
  });

  describe('formatTime', () => {
    it('should format time from date string', () => {
      const result = formatTime('2024-03-15T14:30:00Z');
      // Result depends on timezone, just check format
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it('should format time from Date object', () => {
      const date = new Date('2024-03-15T14:30:00Z');
      const result = formatTime(date);
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
  });

  describe('formatDateTime', () => {
    it('should format both date and time', () => {
      const result = formatDateTime('2024-03-15T14:30:00Z');
      expect(result).toContain('at');
      expect(result).toMatch(/Mar/);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for recent times', () => {
      const result = formatRelativeTime('2024-03-15T11:59:30Z');
      expect(result).toBe('just now');
    });

    it('should return minutes ago', () => {
      const result = formatRelativeTime('2024-03-15T11:55:00Z');
      expect(result).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const result = formatRelativeTime('2024-03-15T09:00:00Z');
      expect(result).toBe('3h ago');
    });

    it('should return days ago', () => {
      const result = formatRelativeTime('2024-03-13T12:00:00Z');
      expect(result).toBe('2d ago');
    });

    it('should return formatted date for older times', () => {
      const result = formatRelativeTime('2024-03-01T12:00:00Z');
      expect(result).toMatch(/Mar/);
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const result = truncate('This is a long string that needs truncation', 20);
      expect(result).toBe('This is a long strin...');
    });

    it('should not truncate short strings', () => {
      const result = truncate('Short', 20);
      expect(result).toBe('Short');
    });

    it('should handle exact length', () => {
      const result = truncate('Exact', 5);
      expect(result).toBe('Exact');
    });

    it('should handle empty string', () => {
      const result = truncate('', 10);
      expect(result).toBe('');
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      const result = getInitials('John Doe');
      expect(result).toBe('JD');
    });

    it('should handle single name', () => {
      const result = getInitials('John');
      expect(result).toBe('J');
    });

    it('should handle multiple names', () => {
      const result = getInitials('John William Doe');
      expect(result).toBe('JW');
    });

    it('should convert to uppercase', () => {
      const result = getInitials('john doe');
      expect(result).toBe('JD');
    });

    it('should limit to 2 characters', () => {
      const result = getInitials('John William Doe Smith');
      expect(result.length).toBe(2);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reset timer on each call', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow calls after throttle period', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to throttled function', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn('arg1', 'arg2');

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
    });

    it('should generate valid UUID format', () => {
      const id = generateId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(id).toMatch(uuidRegex);
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve after specified time', async () => {
      const callback = vi.fn();

      sleep(100).then(callback);

      expect(callback).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);

      expect(callback).toHaveBeenCalled();
    });

    it('should return a promise', () => {
      const result = sleep(100);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
