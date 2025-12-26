import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from '../../src/pages/AuthPage';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children }: any) => children,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: vi.fn(),
    verify2FA: vi.fn(),
    resend2FA: vi.fn(),
    twoFactorPending: null,
    cancelTwoFactor: vi.fn(),
  }),
}));

describe('AuthPage - login toasts', () => {
  // NOTE: 2FA is currently disabled. These tests reflect the direct login flow.
  // To test 2FA flow, re-enable 2FA in the backend and update these tests.

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a success toast and navigates on successful login (2FA disabled)', async () => {
    const { toast } = await import('sonner');

    // With 2FA disabled, login returns tokens directly
    mockLogin.mockResolvedValue({
      message: 'Login successful',
      user: { id: 'user-1', email: 'alice@nps.edu' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@nps.edu' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correctpass' },
    });

    // Button is now "Login" instead of "Continue"
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'alice@nps.edu',
        password: 'correctpass',
      });
    });

    await waitFor(() => {
      expect((toast as any).success).toHaveBeenCalledWith(
        'Welcome back!',
        expect.objectContaining({
          description: expect.stringContaining('logged in'),
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows a red error toast when credentials are invalid', async () => {
    const { toast } = await import('sonner');

    mockLogin.mockRejectedValue({
      response: {
        status: 401,
        data: { error: { message: 'We have no user with those credentials.' } },
      },
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'nobody@nps.edu' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'badpass' },
    });

    // Button is now "Login" instead of "Continue"
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect((toast as any).error).toHaveBeenCalledWith(
        'Login failed',
        expect.objectContaining({
          description: 'We have no user with those credentials.',
        })
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
