import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types';
import { api } from '@/api'; // Importamos el servicio de la API de Supabase

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializar estados directamente leyendo de localStorage
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pf_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem('pf_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Mantener sincronizados los estados globales ante cambios en otras pestañas
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('pf_token'));
      const savedUser = localStorage.getItem('pf_current_user');
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  async function login(usernameInput: string, passwordInput: string) {
    const response = await api.login(usernameInput, passwordInput);

    // ✅ Normalizamos el objeto de usuario antes de guardar
    const userData = {
      ...response.user,
      role: response.user.role || (response.user.username?.toLowerCase() === 'admin' ? 'admin' : 'user'),
      isAdmin: response.user.role === 'admin' || response.user.username?.toLowerCase() === 'admin'
    };

    // ✅ Guardamos en localStorage para que persista al recargar
    localStorage.setItem('pf_token', response.token);
    localStorage.setItem('pf_current_user', JSON.stringify(userData));

    setToken(response.token);
    setUser(userData);
  }

  async function register(usernameInput: string, passwordInput: string, fullNameInput?: string) {
    const response = await api.register(usernameInput, passwordInput, fullNameInput || usernameInput);

    const userData = {
      ...response.user,
      role: response.user.role || 'user',
      isAdmin: response.user.role === 'admin'
    };

    // ✅ Guardamos en localStorage para que persista al recargar
    localStorage.setItem('pf_token', response.token);
    localStorage.setItem('pf_current_user', JSON.stringify(userData));

    setToken(response.token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_current_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
