import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
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

  // Mantener sincronizados los estados globales ante cambios externos
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
    const cleanUsername = usernameInput.trim().toLowerCase();
    const usersData = localStorage.getItem('pf_users');
    const users = usersData ? JSON.parse(usersData) : {};

    // 🔒 ACCESO MAESTRO FORZADO: Administrador
    if (cleanUsername === 'admin') {
      if (passwordInput !== 'admin123') {
        throw new Error('Contraseña de administrador incorrecta');
      }
      users['admin'] = passwordInput;
      localStorage.setItem('pf_users', JSON.stringify(users));
    } else {
      // Validación normal de usuarios
      if (!users[cleanUsername] || users[cleanUsername] !== passwordInput) {
        throw new Error('Usuario o contraseña incorrectos');
      }
    }

    const mockToken = `mock-token-${cleanUsername}`;
    const loggedUser: AuthUser = {
      id: cleanUsername,
      username: cleanUsername,
      role: cleanUsername === 'admin' ? 'admin' : 'user',
    };

    localStorage.setItem('pf_token', mockToken);
    localStorage.setItem('pf_current_user', JSON.stringify(loggedUser));

    setToken(mockToken);
    setUser(loggedUser);
  }

  async function register(usernameInput: string, passwordInput: string) {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const usersData = localStorage.getItem('pf_users');
    const users = usersData ? JSON.parse(usersData) : {};

    if (users[cleanUsername] || cleanUsername === 'admin') {
      throw new Error('El usuario ya existe');
    }

    users[cleanUsername] = passwordInput;
    const mockToken = `mock-token-${cleanUsername}`;
    const loggedUser: AuthUser = {
      id: cleanUsername,
      username: cleanUsername,
      role: cleanUsername === 'admin' ? 'admin' : 'user',
    };

    localStorage.setItem('pf_users', JSON.stringify(users));
    localStorage.setItem('pf_token', mockToken);
    localStorage.setItem('pf_current_user', JSON.stringify(loggedUser));

    setToken(mockToken);
    setUser(loggedUser);
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
