import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import type { LeaderboardRow } from '@/types';
import { Trophy, User, Hash, Star, Trash2 } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function LeaderboardView() {
  const { user } = useAuth(); // Identificar si el usuario actual es admin
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLeaderboard() {
    try {
      const res = await api.getLeaderboard();
      setLeaderboard(res.leaderboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function handleDeleteUser(usernameToDelete: string) {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${usernameToDelete}" y todos sus pronósticos?`);
    if (!confirmar) return;

    setLoading(true);
    try {
      // @ts-ignore
      await api.adminDeleteUser(usernameToDelete);
      await loadLeaderboard(); // Recargar la tabla actualizada
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSoccer message="Actualizando posiciones de la polla..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center sm:text-left mb-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Tabla de Posiciones</h2>
        <p className="text-slate-400 text-sm mt-1">Ranking global de competidores de la Liga BetPlay</p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Aún no hay jugadores registrados en la polla.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {leaderboard.map((row) => {
              const isCurrentUser = user?.username === row.username;
              
              return (
                <div
                  key={row.userId}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    isCurrentUser ? 'bg-emerald-500/10' : 'hover:bg-slate-800/30'
                  }`}
                >
                  {/* Puesto y Nombre */}
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      row.rank === 1 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                        : row.rank === 2 
                          ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                          : row.rank === 3
                            ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}>
                      {row.rank === 1 ? <Star className="w-4 h-4 fill-yellow-400/20" /> : row.rank}
                    </div>

                    <div className="flex items-center gap-2">
                      <User className={`w-4 h-4 ${isCurrentUser ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className={`text-sm font-semibold ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {row.username} {isCurrentUser && <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded-md font-normal ml-1">Tú</span>}
                      </span>
                    </div>
                  </div>

                  {/* Puntaje y Botón Eliminar */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-bold text-white flex items-center gap-1 justify-end">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        {row.points} <span className="text-xs font-normal text-slate-400">pts</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-0.5 justify-end mt-0.5">
                        <Hash className="w-2.5 h-2.5" />
                        {row.played} jugados
                      </div>
                    </div>

                    {/* Botón de eliminación visible SOLO para el admin */}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(row.username)}
                        className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                        title={`Eliminar a ${row.username}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

