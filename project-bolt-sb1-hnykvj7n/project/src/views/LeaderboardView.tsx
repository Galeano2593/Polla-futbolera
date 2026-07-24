import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import type { LeaderboardRow, Match, Prediction } from '@/types';
import { Trophy, User, Hash, Star, Trash2, ChevronDown, ChevronUp, Eye, Lock } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function LeaderboardView() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar qué usuario tiene el desplegable de partidos abierto
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Normalizar el nombre de usuario autenticado para comparaciones
  const currentUsername = String(user?.username || '').trim().toLowerCase();

  async function loadData() {
    try {
      const [res, mRes, pRes] = await Promise.all([
        api.getLeaderboard(),
        api.getMatches(),
        // Consultar directamente a Supabase todas las predicciones para tener datos en tiempo real
        fetch('https://trumjgflgcnrfusfxgtn.supabase.co/rest/v1/predictions?select=*', {
          headers: {
            'apikey': 'sb_publishable_oxOkx_GxNVWo4lTsdzKTbg_Ou7uiWDI',
            'Authorization': 'Bearer sb_publishable_oxOkx_GxNVWo4lTsdzKTbg_Ou7uiWDI'
          }
        }).then(r => r.json())
      ]);

      setLeaderboard(res.leaderboard);
      setMatches(mRes.matches);

      if (Array.isArray(pRes)) {
        const mappedPreds: Prediction[] = pRes.map((p: any) => ({
          id: p.id,
          matchId: p.match_id,
          userId: String(p.username).trim().toLowerCase(),
          homeScore: p.home_score,
          awayScore: p.away_score,
          createdAt: p.created_at
        }));
        setAllPredictions(mappedPreds);
      }
    } catch (err) {
      console.error(err);
    } fontally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDeleteUser(usernameToDelete: string) {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${usernameToDelete}" y todos sus pronósticos?`);
    if (!confirmar) return;

    setLoading(true);
    try {
      // @ts-ignore
      await api.adminDeleteUser(usernameToDelete);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpandUser(username: string) {
    const cleanUser = String(username).trim().toLowerCase();
    setExpandedUser(expandedUser === cleanUser ? null : cleanUser);
  }

  if (loading) {
    return <LoadingSoccer message="Actualizando posiciones de la polla..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto mb-12">
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
              const rowUsername = String(row.username).trim().toLowerCase();
              const isCurrentUser = currentUsername === rowUsername || String(row.userId).trim().toLowerCase() === currentUsername;
              const isExpanded = expandedUser === rowUsername;

              // Filtrar predicciones de ESTE usuario específico (ignorando diferencias de mayúsculas/minúsculas)
              const userPreds = allPredictions.filter(
                p => p.userId === rowUsername || p.userId === String(row.userId).trim().toLowerCase()
              );

              return (
                <div key={row.userId} className="flex flex-col">
                  {/* Fila Principal de Información */}
                  <div
                    className={`flex items-center justify-between p-4 transition-colors cursor-pointer ${
                      isCurrentUser ? 'bg-emerald-500/10' : 'hover:bg-slate-800/30'
                    }`}
                    onClick={() => toggleExpandUser(row.username)}
                  >
                    <div className="flex items-center gap-3">
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
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white flex items-center gap-1 justify-end">
                          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                          {row.points} <span className="text-xs font-normal text-slate-400">pts</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-0.5 justify-end mt-0.5">
                          <Hash className="w-2.5 h-2.5" />
                          {userPreds.length} jugados
                        </div>
                      </div>

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

                  {/* Panel Desplegable: Pronósticos del Usuario */}
                  {isExpanded && (
                    <div className="bg-slate-950/50 px-4 pb-4 pt-1 border-t border-slate-900 flex flex-col gap-2 animate-fadeIn">
                      <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1 mb-1">
                        <Eye className="w-3 h-3 text-emerald-400" /> Pronósticos visibles
                      </div>
                      
                      {matches.map(match => {
                        // REGLA DE TIEMPO Y PROPIEDAD:
                        // El partido ya cerró/empezó O es el usuario autenticado (Tú)
                        const isMatchClosed = new Date(match.kickoff) <= new Date() || match.status === 'finished';
                        const canSeePrediction = isMatchClosed || isCurrentUser;

                        // Buscar el marcador que registró este usuario para este partido
                        const pred = userPreds.find(p => p.matchId === match.id);

                        if (!canSeePrediction) {
                          // Si el partido sigue abierto Y NO soy yo mismo, ocultar marcador
                          return (
                            <div key={match.id} className="flex justify-between items-center text-xs bg-slate-900/20 p-2 rounded-xl border border-slate-800/40 text-slate-600 italic">
                              <span>{match.homeTeam} vs {match.awayTeam}</span>
                              <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-500 font-normal flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-amber-500" /> Oculto hasta el silbatazo
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={match.id} className="flex justify-between items-center text-xs bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="font-medium text-slate-300 w-1/3 truncate text-left">{match.homeTeam}</span>
                            
                            <div className="flex items-center gap-2 justify-center w-1/3">
                              <span className="bg-slate-950 text-emerald-400 font-bold px-2 py-0.5 rounded border border-slate-800 text-sm">
                                {pred ? `${pred.homeScore} - ${pred.awayScore}` : 'N/A'}
                              </span>
                            </div>

                            <span className="font-medium text-slate-300 w-1/3 truncate text-right">{match.awayTeam}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
