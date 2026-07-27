import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Calendar, LogOut, ShieldAlert, BookOpen, History } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Encabezado Principal */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-md shadow-emerald-500/5">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Polla FPC</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700/50">
              ⚽ {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1 text-sm font-medium"
              title="Salir de la polla"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Bandera de Colombia Decorativa Estilizada */}
        <div className="w-full h-1 flex shadow-inner">
          <div className="bg-yellow-400 h-full w-1/2"></div>
          <div className="bg-blue-600 h-full w-1/4"></div>
          <div className="bg-red-600 h-full w-1/4"></div>
        </div>
      </header>

      {/* Contenido de la Aplicación */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 mb-20">
        <Outlet />
      </main>

      {/* Menú de Navegación Inferior Móvil / Escritorio */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 z-40 shadow-2xl">
        <div className="max-w-md mx-auto px-4 h-16 flex justify-around items-center">
          <Link
            to="/predictions"
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-all ${
              location.pathname === '/predictions'
                ? 'text-emerald-400 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Predicciones</span>
          </Link>

          <Link
            to="/history"
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-all ${
              location.pathname === '/history'
                ? 'text-emerald-400 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            <span>Historial</span>
          </Link>

          <Link
            to="/leaderboard"
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-all ${
              location.pathname === '/leaderboard'
                ? 'text-emerald-400 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Tabla</span>
          </Link>

          <Link
            to="/rules"
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-all ${
              location.pathname === '/rules'
                ? 'text-emerald-400 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Reglas</span>
          </Link>

          {/* Acceso rápido para el Administrador de la Liga BetPlay */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-all ${
                location.pathname === '/admin'
                  ? 'text-yellow-400 scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
