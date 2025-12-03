import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../../src/components/ProtectedRoute';

// Mock useAuth hook
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../src/hooks/useAuth';

describe('ProtectedRoute', () => {
  const TestComponent = () => <div>Protected Content</div>;

  it('should show loading spinner while checking auth', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    // Should show loading spinner
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1', role: 'student' },
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login if not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    // Should not render protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children for admin when requireAdmin is true', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'admin-1', role: 'admin' },
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute requireAdmin>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should show access denied for non-admin when requireAdmin is true', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1', role: 'student' },
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute requireAdmin>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should allow staff role for admin routes', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'staff-1', role: 'staff' },
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute requireAdmin>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
