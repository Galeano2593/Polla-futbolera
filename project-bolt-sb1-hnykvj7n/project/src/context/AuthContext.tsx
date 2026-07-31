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
    // Llamar al endpoint real en api.ts que maneja Supabase y la lógica admin
    const response = await api.login(usernameInput, passwordInput);

    setToken(response.token);
    setUser(response.user);
  }

  async function register(usernameInput: string, passwordInput: string, fullNameInput?: string) {
    // Llamar al registro real de Supabase
    const response = await api.register(usernameInput, passwordInput, fullNameInput || usernameInput);

    setToken(response.token);
    setUser(response.user);
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
