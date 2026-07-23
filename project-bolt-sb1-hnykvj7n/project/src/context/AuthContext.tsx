import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/types';
import { api } from '@/api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pf_token');
    const stored = localStorage.getItem('pf_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored) as AuthUser);
      } catch {
        localStorage.removeItem('pf_token');
        localStorage.removeItem('pf_user');
      }
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const { token, user } = await api.login(username, password);
    localStorage.setItem('pf_token', token);
    localStorage.setItem('pf_user', JSON.stringify(user));
    setUser(user);
  }

  async function register(username: string, password: string) {
    const { token, user } = await api.register(username, password);
    localStorage.setItem('pf_token', token);
    localStorage.setItem('pf_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
