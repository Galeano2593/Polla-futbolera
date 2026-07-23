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

  async function login(username: string, password: string) {
    const usersData = localStorage.getItem('pf_users');
    const users = usersData ? JSON.parse(usersData) : {};

    // 🔒 ACCESO MAESTRO FORZADO: Siempre garantizará el ingreso del administrador
    if (username === 'admin') {
      if (password !== 'admin123') { // <-- Aquí puedes cambiar 'admin123' por tu contraseña secreta
        throw new Error('Contraseña de administrador incorrecta');
      }
      users['admin'] = password;
      localStorage.setItem('pf_users', JSON.stringify(users));
    } else {
      // Validación normal para usuarios registrados normales
      if (!users[username] || users[username] !== password) {
        throw new Error('Usuario o contraseña incorrectos');
      }
    }

    const mockToken = `mock-token-${username}`;
    const loggedUser: AuthUser = {
      id: username,
      username,
      role: username === 'admin' ? 'admin' : 'user',
    };

    // Actualizar localStorage e inmediatamente los estados de React
    localStorage.setItem('pf_token', mockToken);
    localStorage.setItem('pf_current_user', JSON.stringify(loggedUser));
    
    setToken(mockToken);
    setUser(loggedUser);
  }

  async function register(username: string, password: string) {
    const usersData = localStorage.getItem('pf_users');
    const users = usersData ? JSON.parse(usersData) : {};

    if (users[username] || username === 'admin') {
      throw new Error('El usuario ya existe');
    }

    users[username] = password;
    const mockToken = `mock-token-${username}`;
    const loggedUser: AuthUser = {
      id: username,
      username,
      role: username === 'admin' ? 'admin' : 'user',
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

