/**
 * ProfileEditPage Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileEditPage from '../../src/pages/ProfileEditPage';

const mockNavigate = vi.fn();
const mockUpdateUser = vi.fn();
const mockApiPatch = vi.fn();

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
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      organization: 'Test Org',
      department: 'Engineering',
      role: 'Developer',
      bio: 'Test bio',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      websiteUrl: 'https://johndoe.com',
    },
    updateUser: mockUpdateUser,
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    patch: (...args: any[]) => mockApiPatch(...args),
  },
}));

describe('ProfileEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the edit profile form', () => {
    render(<ProfileEditPage />);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('should populate form with user data', () => {
    render(<ProfileEditPage />);

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Org')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Engineering')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Developer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
  });

  it('should update form values on input change', () => {
    render(<ProfileEditPage />);

    const fullNameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(fullNameInput, { target: { value: 'Jane Doe', name: 'fullName' } });

    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
  });

  it('should call API and navigate on successful save', async () => {
    const { toast } = await import('sonner');

    mockApiPatch.mockResolvedValue({
      message: 'Profile updated',
      profile: {
        fullName: 'John Doe',
        phone: '555-1234',
        organization: 'Test Org',
        department: 'Engineering',
        role: 'Developer',
        bio: 'Test bio',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        websiteUrl: 'https://johndoe.com',
      },
    });

    render(<ProfileEditPage />);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith(
        '/users/me',
        expect.objectContaining({
          fullName: 'John Doe',
          organization: 'Test Org',
        })
      );
    });

    await waitFor(() => {
      expect((toast as any).success).toHaveBeenCalledWith('Profile updated successfully!');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });
  });

  it('should update local user state after successful save', async () => {
    mockApiPatch.mockResolvedValue({
      message: 'Profile updated',
      profile: {
        fullName: 'John Doe',
      },
    });

    render(<ProfileEditPage />);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'John Doe',
        })
      );
    });
  });

  it('should show error toast on API failure', async () => {
    const { toast } = await import('sonner');

    mockApiPatch.mockRejectedValue(new Error('Network error'));

    render(<ProfileEditPage />);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect((toast as any).error).toHaveBeenCalledWith('Failed to update profile. Please try again.');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should disable buttons while saving', async () => {
    mockApiPatch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ProfileEditPage />);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
    });

    expect(cancelButton).toBeDisabled();
  });

  it('should navigate to profile on cancel', () => {
    render(<ProfileEditPage />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('should include URLs in API payload', async () => {
    mockApiPatch.mockResolvedValue({
      message: 'Profile updated',
      profile: {},
    });

    render(<ProfileEditPage />);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith(
        '/users/me',
        expect.objectContaining({
          linkedinUrl: expect.any(String),
          websiteUrl: expect.any(String),
        })
      );
    });
  });

  it('should include all profile fields in API payload', async () => {
    mockApiPatch.mockResolvedValue({
      message: 'Profile updated',
      profile: {},
    });

    render(<ProfileEditPage />);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith(
        '/users/me',
        expect.objectContaining({
          fullName: 'John Doe',
          phone: '555-1234',
          organization: 'Test Org',
          department: 'Engineering',
          role: 'Developer',
          bio: 'Test bio',
        })
      );
    });
  });

  it('should display bio character count', () => {
    render(<ProfileEditPage />);

    expect(screen.getByText(/\/500 characters/i)).toBeInTheDocument();
  });

  it('should have back link to profile page', () => {
    render(<ProfileEditPage />);

    const backLink = screen.getByRole('link');
    expect(backLink).toHaveAttribute('href', '/profile');
  });
});
