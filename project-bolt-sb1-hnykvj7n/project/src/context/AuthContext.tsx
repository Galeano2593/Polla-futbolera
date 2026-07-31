import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types';
import { supabase } from '@/lib/supabase'; // Asegúrate de ajustar esta ruta según tu proyecto

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializar estados leyendo de localStorage
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pf_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem('pf_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Sincronización entre pestañas
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
    const cleanInput = usernameInput.trim();

    // 🔒 Acceso maestro forzado para el Administrador
    if (cleanInput === 'admin') {
      if (passwordInput !== 'admin123') {
        throw new Error('Contraseña de administrador incorrecta');
      }

      const adminUser: AuthUser = {
        id: 'admin',
        username: 'admin',
        role: 'admin',
      };

      const mockToken = `mock-token-admin`;
      localStorage.setItem('pf_token', mockToken);
      localStorage.setItem('pf_current_user', JSON.stringify(adminUser));
      setToken(mockToken);
      setUser(adminUser);
      return;
    }

    // 🔍 Buscar en Supabase: coincide por 'username' O por 'full_name'
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.${cleanInput},full_name.ilike.${cleanInput}`)
      .single();

    if (error || !dbUser) {
      throw new Error('Usuario no encontrado');
    }

    // Validación básica de contraseña (si manejas la contraseña en la columna 'password' de Supabase)
    if (dbUser.password && dbUser.password !== passwordInput) {
      throw new Error('Contraseña incorrecta');
    }

    // 🎯 CLAVE DEL CAMBIO: Siempre forzamos dbUser.username como la clave única
    const loggedUser: AuthUser = {
      id: dbUser.username,
      username: dbUser.username, // Ej: 'zephyron'
      role: dbUser.role || 'user',
    };

    const mockToken = `token-${dbUser.username}`;

    localStorage.setItem('pf_token', mockToken);
    localStorage.setItem('pf_current_user', JSON.stringify(loggedUser));

    setToken(mockToken);
    setUser(loggedUser);
  }

  async function register(usernameInput: string, passwordInput: string) {
    const cleanUsername = usernameInput.trim().toLowerCase();

    if (cleanUsername === 'admin') {
      throw new Error('El nombre de usuario reservado no está disponible');
    }

    // Verificamos si ya existe en Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', cleanUsername)
      .single();

    if (existingUser) {
      throw new Error('El usuario ya existe');
    }

    // Insertar el nuevo usuario en Supabase
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          username: cleanUsername,
          full_name: usernameInput.trim(),
          password: passwordInput,
          role: 'user',
        },
      ]);

    if (insertError) {
      throw new Error('Error al registrar el usuario en la base de datos');
    }

    const loggedUser: AuthUser = {
      id: cleanUsername,
      username: cleanUsername,
      role: 'user',
    };

    const mockToken = `token-${cleanUsername}`;

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
