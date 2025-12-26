import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User, LoginCredentials, RegisterData } from '@/types';

interface TwoFactorPendingState {
  userId: string;
  email: string;
}

interface LoginResponse {
  requires2FA?: boolean;
  userId?: string;
  email?: string;
  user?: any;
  accessToken?: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  twoFactorPending: TwoFactorPendingState | null;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  verify2FA: (userId: string, code: string) => Promise<void>;
  resend2FA: (userId: string) => Promise<void>;
  cancelTwoFactor: () => void;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorPending, setTwoFactorPending] = useState<TwoFactorPendingState | null>(null);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (api.isAuthenticated()) {
        try {
          const response = await api.get<{ profile: any }>('/users/me');
          // Map backend user format to frontend User type
          const userData: User = {
            ...response.profile,
            roles: response.profile.userRoles?.map((r: any) => r.role) || [],
            privacy: {
              profileVisibility: response.profile.profileVisibility,
              allowQrScanning: response.profile.allowQrScanning,
              allowMessaging: response.profile.allowMessaging,
              hideContactInfo: response.profile.hideContactInfo,
            },
          };
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
          api.clearAuth();
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>(
      '/auth/login',
      credentials
    );

    // Check if 2FA is required
    if (response.requires2FA && response.userId && response.email) {
      setTwoFactorPending({
        userId: response.userId,
        email: response.email,
      });
      return response;
    }

    // Direct login (2FA is currently disabled)
    if (response.accessToken && response.user) {
      localStorage.setItem('accessToken', response.accessToken);
      if ((response as any).refreshToken) {
        localStorage.setItem('refreshToken', (response as any).refreshToken);
      }
      const expiresIn = (response as any).expiresIn || 8 * 60 * 60; // fallback to 8 hours
      localStorage.setItem('tokenExpiry', String(Date.now() + expiresIn * 1000));

      const user: User = {
        ...response.user,
        roles: response.user.userRoles?.map((r: any) => r.role) || [],
        privacy: {
          profileVisibility: response.user.profileVisibility,
          allowQrScanning: response.user.allowQrScanning,
          allowMessaging: response.user.allowMessaging,
          hideContactInfo: response.user.hideContactInfo,
        },
      };

      setUser(user);
    }

    return response;
  };

  const verify2FA = async (userId: string, code: string) => {
    const response = await api.post<{ user: any; accessToken: string; refreshToken: string; expiresIn: number; message: string }>(
      '/auth/verify-2fa',
      { userId, code }
    );

    // Store access token and refresh token
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('tokenExpiry', String(Date.now() + response.expiresIn * 1000));

    // Map backend user format to frontend User type
    const user: User = {
      ...response.user,
      roles: response.user.userRoles?.map((r: any) => r.role) || [],
      privacy: {
        profileVisibility: response.user.profileVisibility,
        allowQrScanning: response.user.allowQrScanning,
        allowMessaging: response.user.allowMessaging,
        hideContactInfo: response.user.hideContactInfo,
      },
    };

    setUser(user);
    setTwoFactorPending(null);
  };

  const resend2FA = async (userId: string) => {
    await api.post('/auth/resend-2fa', { userId });
  };

  const cancelTwoFactor = () => {
    setTwoFactorPending(null);
  };

  const register = async (data: RegisterData) => {
    // Registration doesn't auto-login, just creates the account
    await api.post<{ message: string; userId: string; verificationToken?: string }>(
      '/auth/register',
      data
    );
    // User needs to login after registration
    // (email verification is optional in development)
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      api.clearAuth();
      setUser(null);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    twoFactorPending,
    login,
    verify2FA,
    resend2FA,
    cancelTwoFactor,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
