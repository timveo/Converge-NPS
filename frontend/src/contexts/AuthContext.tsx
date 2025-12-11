import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User, LoginCredentials, RegisterData } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
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

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post<{ user: any; accessToken: string; message: string }>(
      '/auth/login',
      credentials
    );

    // Store access token in localStorage
    localStorage.setItem('accessToken', response.accessToken);
    // Set token expiry (1 hour from now, matching backend JWT expiration)
    localStorage.setItem('tokenExpiry', String(Date.now() + 3600 * 1000));
    // Refresh token is stored in httpOnly cookie by backend

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
    login,
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
