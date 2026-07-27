import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import AuthView from '@/views/AuthView';
import PredictionsView from '@/views/PredictionsView';
import LeaderboardView from '@/views/LeaderboardView';
import AdminView from '@/views/Adminview';
import RulesView from '@/views/RulesView';
import HistoryView from '@/views/HistoryView'; // 👈 1. Importación de la vista de historial
import { useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';

// Protector de Rutas para Usuarios Autenticados
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Protector de Rutas exclusivo para el Administrador
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (user?.role !== 'admin') return <Navigate to="/predictions" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta Pública: Ingreso / Registro */}
          <Route path="/" element={<AuthView />} />

          {/* Rutas Privadas Protegidas por el Layout Común */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="predictions" element={<PredictionsView />} />
            <Route path="history" element={<HistoryView />} /> {/* 👈 2. Nueva ruta declarada */}
            <Route path="leaderboard" element={<LeaderboardView />} />
            <Route path="rules" element={<RulesView />} />
            
            {/* Ruta exclusiva del Administrador */}
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminView />
                </AdminRoute>
              }
            />
          </Route>

          {/* Redirección por defecto si la ruta no existe */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
