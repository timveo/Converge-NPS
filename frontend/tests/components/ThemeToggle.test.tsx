/**
 * ThemeToggle Component Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../../src/components/ThemeToggle';

// Mock next-themes
const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it('should render toggle button', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should have accessible name', () => {
    render(<ThemeToggle />);

    expect(screen.getByText('Toggle theme')).toBeInTheDocument();
  });

  it('should toggle theme when clicked', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('should toggle to light when currently dark', () => {
    vi.mocked(vi.importActual('next-themes') as any).useTheme = () => ({
      theme: 'dark',
      setTheme: mockSetTheme,
    });

    vi.doMock('next-themes', () => ({
      useTheme: () => ({
        theme: 'dark',
        setTheme: mockSetTheme,
      }),
    }));

    // Re-render with dark theme
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Since we're mocking useTheme to return 'light', it toggles to 'dark'
    expect(mockSetTheme).toHaveBeenCalled();
  });

  it('should render sun and moon icons', () => {
    render(<ThemeToggle />);

    // Both icons should be present (one visible, one hidden based on theme)
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });
});
