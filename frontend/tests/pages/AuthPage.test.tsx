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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a success toast when login requires 2FA (code sent)', async () => {
    const { toast } = await import('sonner');

    mockLogin.mockResolvedValue({
      requires2FA: true,
      userId: 'user-1',
      email: 'alice@nps.edu',
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@nps.edu' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'alice@nps.edu',
        password: 'wrongpass',
      });
    });

    await waitFor(() => {
      expect((toast as any).success).toHaveBeenCalledWith(
        'Verification code sent!',
        expect.objectContaining({
          description: expect.stringContaining('6-digit code'),
        })
      );
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

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

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
