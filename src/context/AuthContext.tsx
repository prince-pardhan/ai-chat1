import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/chat';
import { safeParseJson } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  hasGeminiKey: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (name?: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: { name?: string; profileImage?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aichatpro_token'));
  const [loading, setLoading] = useState(true);
  const [hasGeminiKey, setHasGeminiKey] = useState(true);

  const getHeaders = (customToken?: string | null) => {
    const activeToken = customToken !== undefined ? customToken : token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getHeaders(),
      });
      const parsed = await safeParseJson<{ user: User | null; hasGeminiKey?: boolean }>(res);
      if (parsed.ok && parsed.data) {
        setUser(parsed.data.user);
        setHasGeminiKey(Boolean(parsed.data.hasGeminiKey));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to check user session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const parsed = await safeParseJson<{ user: User; token: string }>(res);
      if (!parsed.ok || !parsed.data) {
        return { success: false, error: parsed.error || 'Failed to sign in' };
      }
      setUser(parsed.data.user);
      setToken(parsed.data.token);
      localStorage.setItem('aichatpro_token', parsed.data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const parsed = await safeParseJson<{ user: User; token: string }>(res);
      if (!parsed.ok || !parsed.data) {
        return { success: false, error: parsed.error || 'Failed to create account' };
      }
      setUser(parsed.data.user);
      setToken(parsed.data.token);
      localStorage.setItem('aichatpro_token', parsed.data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const loginWithGoogle = async (name?: string, email?: string) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const parsed = await safeParseJson<{ user: User; token: string }>(res);
      if (!parsed.ok || !parsed.data) {
        return { success: false, error: parsed.error || 'Failed to sign in with Google' };
      }
      setUser(parsed.data.user);
      setToken(parsed.data.token);
      localStorage.setItem('aichatpro_token', parsed.data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const loginAsGuest = async () => {
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const parsed = await safeParseJson<{ user: User; token: string }>(res);
      if (!parsed.ok || !parsed.data) {
        return { success: false, error: parsed.error || 'Failed to create guest session' };
      }
      setUser(parsed.data.user);
      setToken(parsed.data.token);
      localStorage.setItem('aichatpro_token', parsed.data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('aichatpro_token');
    }
  };

  const updateProfile = async (updates: { name?: string; profileImage?: string }) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      const parsed = await safeParseJson<{ user: User }>(res);
      if (!parsed.ok || !parsed.data) {
        return { success: false, error: parsed.error || 'Failed to update profile' };
      }
      setUser(parsed.data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const parsed = await safeParseJson<{ success: boolean }>(res);
      if (!parsed.ok) {
        return { success: false, error: parsed.error || 'Failed to delete account' };
      }
      setUser(null);
      setToken(null);
      localStorage.removeItem('aichatpro_token');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        hasGeminiKey,
        login,
        register,
        loginWithGoogle,
        loginAsGuest,
        logout,
        updateProfile,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
