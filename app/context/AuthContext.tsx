import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../constants/api';
import { authStorage, UserProfile } from '../utils/authStorage';
import { onUnauthorized } from '../utils/apiClient';

export { UserProfile } from '../utils/authStorage';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, tinyfishApiKey?: string) => Promise<{ success: boolean; error?: string; locked?: boolean }>;
  register: (data: { name: string; email: string; password: string; phone?: string; role?: string; tinyfishApiKey?: string; tinyfishVerified?: boolean }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = useCallback(async () => {
    try {
      const storedToken = await authStorage.getToken();
      const storedUser = await authStorage.getUser();

      if (storedToken) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              setToken(storedToken);
              await authStorage.setUser(data.user);
            } else if (storedUser) {
              setUser(storedUser);
              setToken(storedToken);
            }
          } else if (res.status === 401) {
            await authStorage.clear();
            setToken(null);
            setUser(null);
          } else if (storedUser) {
            // Server error or other status: keep offline session if exists
            setUser(storedUser);
            setToken(storedToken);
          }
        } catch (fetchErr) {
          // Network issue: preserve offline stored user if available
          if (storedUser) {
            setUser(storedUser);
            setToken(storedToken);
          }
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Session init error:', err);
      await authStorage.clear();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Subscribe to 401 unauthenticated events from apiClient
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setToken(null);
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const login = async (identifier: string, password: string, tinyfishApiKey?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password, tinyfishApiKey: tinyfishApiKey?.trim() || undefined })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Invalid credentials',
          locked: data.locked || false
        };
      }

      await authStorage.setToken(data.token);
      await authStorage.setUser(data.user);
      setToken(data.token);
      setUser(data.user);

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server'
      };
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    tinyfishApiKey?: string;
    tinyfishVerified?: boolean;
  }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name.trim(),
          email: userData.email.trim().toLowerCase(),
          password: userData.password,
          phone: userData.phone?.trim() || undefined,
          role: userData.role || 'CITIZEN',
          tinyfishApiKey: userData.tinyfishApiKey?.trim() || undefined,
          tinyfishVerified: userData.tinyfishVerified === true
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Registration failed'
        };
      }

      await authStorage.setToken(data.token);
      await authStorage.setUser(data.user);
      setToken(data.token);
      setUser(data.user);

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server'
      };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        // Clear local credentials even if remote logout fails
      }
    }
    await authStorage.clear();
    setToken(null);
    setUser(null);
  };

  const refreshSession = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
