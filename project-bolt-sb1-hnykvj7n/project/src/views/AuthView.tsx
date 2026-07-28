import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Trophy } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function AuthView() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim() || cleanUsername;

    try {
      if (mode === 'login') {
        await login(cleanUsername, password);
      } else {
        // @ts-ignore
        await register(cleanUsername, password, cleanFullName);
      }
      navigate('/predictions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Encabezado: Logo gigante sin marco */}
        <div className="text-center mb-2 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Logo ScoreMaster" 
            className="w-56 h-56 sm:w-64 sm:h-64 object-contain drop-shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Bandera de Colombia Decorativa */}
        <div className="w-full h-1.5 flex rounded-t-2xl overflow-hidden shadow-lg">
          <div className="bg-yellow-400 h-full w-1/2"></div>
          <div className="bg-blue-600 h-full w-1/4"></div>
          <div className="bg-red-600 h-full w-1/4"></div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-xl rounded-b-2xl border-x border-b border-slate-700/50 p-6 shadow-2xl">
          <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nombre Completo (Para la tabla)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                  placeholder="Ej: Juan Carlos Pérez"
                  required={mode === 'register'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Usuario (Para iniciar sesión)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                placeholder="tu_usuario"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? 'Procesando…'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6 flex items-center justify-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          La quiniela definitiva del fútbol colombiano
        </p>
      </div>

      {busy && (
        <LoadingSoccer 
          message={mode === 'login' ? 'Validando credenciales...' : 'Creando tu cuenta con tu nombre...'} 
        />
      )}
    </div>
  );
}
