import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import type { LeaderboardRow, Match, Prediction } from '@/types';
import { Trophy, User, Hash, Trash2, ChevronDown, ChevronUp, Eye, Lock, Crown, Flame } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

type ExtendedLeaderboardRow = LeaderboardRow & {
  rawUsername?: string;
  streak?: number;
  accuracy?: number;
  previousRank?: number;
};

export default function LeaderboardView() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<ExtendedLeaderboardRow[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Estado para controlar qué usuario tiene el desplegable de partidos abierto
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Normalizar el id/username del usuario autenticado para comparaciones
  const savedUserRaw = localStorage.getItem('pf_current_user');
  const parsedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;
  const currentUserId = String(parsedUser?.rawUsername || user?.id || user?.username || '').trim().toLowerCase();

  async function loadData() {
    try {
      const [res, mRes, pRes, uRes] = await Promise.all([
        api.getLeaderboard(),
        api.getMatches(),
        fetch('https://trumjgflgcnrfusfxgtn.supabase.co/rest/v1/predictions?select=*', {
          headers: {
            'apikey': 'sb_publishable_oxOkx_GxNVWo4lTsdzKTbg_Ou7uiWDI',
            'Authorization': 'Bearer sb_publishable_oxOkx_GxNVWo4lTsdzKTbg_Ou7uiWDI'
          }
        }).then(r => r.json()).catch(() => []),
        fetch('https://trumjgflgcnrfusfxgtn.supabase.co/rest/v1/users?select=*', {
          headers: {
            'apikey': 'sb_publishable_oxOkx_GxNVWo4lTsdzKTbg_Ou7uiWDI',
            'Authorization': 'Bearer sb_publishable_oxOkx_GxNVWo4lTsdzKTbg_Ou7uiWDI'
          }
        }).then(r => r.json()).catch(() => [])
      ]);

      const rawMatches: Match[] = mRes.matches || [];
      const rawPredictions: Prediction[] = Array.isArray(pRes) ? pRes.map((p: any) => ({
        id: p.id,
        matchId: p.match_id,
        userId: String(p.username).trim().toLowerCase(),
        homeScore: p.home_score,
        awayScore: p.away_score,
        createdAt: p.created_at
      })) : [];

      setMatches(rawMatches);
      setAllPredictions(rawPredictions);

      // Crear mapa de Username Único -> Nombre Real Completo
      const map: Record<string, string> = {};
      if (Array.isArray(uRes)) {
        uRes.forEach((u: any) => {
          const key = String(u.username || '').trim().toLowerCase();
          const displayName = u.full_name && String(u.full_name).trim() !== '' 
            ? u.full_name 
            : u.name && String(u.name).trim() !== '' 
              ? u.name 
              : u.username;
          map[key] = displayName;
        });
        setUsersMap(map);
      }

      // Ordenar partidos finalizados por fecha
      const finishedMatches = rawMatches
        .filter(m => m.status === 'finished' && m.homeScore !== undefined && m.awayScore !== undefined)
        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

      // UNIFICAR USUARIOS: combinamos la API con los usernames que existan en las predicciones
      const apiLeaderboard: LeaderboardRow[] = res.leaderboard || [];
      const predictorUserIds = Array.from(new Set(rawPredictions.map(p => p.userId)));

      const baseList: LeaderboardRow[] = [...apiLeaderboard];
      predictorUserIds.forEach(pUserId => {
        const exists = baseList.some(r => String((r as any).rawUsername || r.userId).trim().toLowerCase() === pUserId);
        if (!exists) {
          baseList.push({
            userId: pUserId,
            username: map[pUserId] || pUserId,
            points: 0,
            played: rawPredictions.filter(p => p.userId === pUserId).length,
            exactHits: 0,
            winnerHits: 0
          });
        }
      });

      // Recalcular puntos con las reglas exactas (+10, +7, +4, +2)
      const enrichedLeaderboard: ExtendedLeaderboardRow[] = baseList.map((row) => {
        const uId = String((row as any).rawUsername || row.userId).trim().toLowerCase();
        const userPreds = rawPredictions.filter(p => p.userId === uId);

        let calculatedPoints = 0;
        let streak = 0;
        let successfulMatches = 0;
        let totalFinishedPlayed = 0;

        finishedMatches.forEach(match => {
          const pred = userPreds.find(p => p.matchId === match.id);
          if (pred && pred.homeScore !== undefined && pred.awayScore !== undefined) {
            totalFinishedPlayed++;
            
            const realHome = match.homeScore ?? 0;
            const realAway = match.awayScore ?? 0;
            const predHome = pred.homeScore;
            const predAway = pred.awayScore;

            // 1. Marcador Exacto (+10 pts)
            const isExact = predHome === realHome && predAway === realAway;

            // 2. Acertar Ganador o Empate (+7 pts)
            const realResult = Math.sign(realHome - realAway);
            const predResult = Math.sign(predHome - predAway);
            const isWinnerOrDraw = realResult === predResult;

            // 3. Goles de un Equipo (+4 pts)
            const isTeamGoalsHit = predHome === realHome || predAway === realAway;

            // 4. Diferencia de Goles (+2 pts)
            const realDiff = Math.abs(realHome - realAway);
            const predDiff = Math.abs(predHome - predAway);
            const isDiffHit = realDiff === predDiff;

            // Evaluar según la jerarquía de reglas
            if (isExact) {
              calculatedPoints += 10;
              successfulMatches++;
              streak++;
            } else if (isWinnerOrDraw) {
              calculatedPoints += 7;
              successfulMatches++;
              streak = 0;
            } else if (isTeamGoalsHit) {
              calculatedPoints += 4;
              successfulMatches++;
              streak = 0;
            } else if (isDiffHit) {
              calculatedPoints += 2;
              successfulMatches++;
              streak = 0;
            } else {
              streak = 0;
            }
          }
        });

        const accuracy = totalFinishedPlayed > 0 
          ? Math.round((successfulMatches / totalFinishedPlayed) * 100) 
          : 0;

        return {
          ...row,
          points: calculatedPoints,
          streak,
          accuracy
        };
      });

      // Ordenar descendentemente por puntos y asignar puesto (rank)
      enrichedLeaderboard.sort((a, b) => b.points - a.points);
      enrichedLeaderboard.forEach((item, index) => {
        item.rank = index + 1;
      });

      setLeaderboard(enrichedLeaderboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDeleteUser(usernameToDelete: string, displayName: string) {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${displayName}" (${usernameToDelete}) y todos sus pronósticos?`);
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

  function toggleExpandUser(userId: string) {
    const cleanId = String(userId).trim().toLowerCase();
    setExpandedUser(expandedUser === cleanId ? null : cleanId);
  }

  if (loading) {
    return <LoadingSoccer message="Actualizando posiciones y rachas de la polla..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto mb-12 text-slate-100">
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
            {leaderboard.map((row, index) => {
              const positionNumber = row.rank || index + 1;
              const rowUserId = String(row.rawUsername || row.userId).trim().toLowerCase();
              const isCurrentUser = currentUserId === rowUserId;
              const isExpanded = expandedUser === rowUserId;
              const isLeader = positionNumber === 1;

              // Nombre Real Registrado
              const displayName = usersMap[rowUserId] || row.username;

              // Filtrar predicciones de ESTE usuario específico
              const userPreds = allPredictions.filter(p => p.userId === rowUserId);

              return (
                <div 
                  key={rowUserId} 
                  className={`flex flex-col transition-all ${
                    isLeader ? 'bg-gradient-to-r from-yellow-500/10 via-slate-900/40 to-yellow-500/5' : ''
                  }`}
                >
                  {/* Fila Principal de Información */}
                  <div
                    className={`flex items-center justify-between p-4 transition-colors cursor-pointer ${
                      isCurrentUser ? 'bg-emerald-500/10' : 'hover:bg-slate-800/30'
                    }`}
                    onClick={() => toggleExpandUser(rowUserId)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Recuadro de Posición */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0 shadow-md ${
                        isLeader
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 ring-2 ring-yellow-400/60 shadow-yellow-500/20' 
                          : positionNumber === 2 
                            ? 'bg-slate-300 text-slate-950 border border-slate-200'
                            : positionNumber === 3
                              ? 'bg-amber-600 text-white border border-amber-500'
                              : 'bg-slate-800/90 text-slate-200 border border-slate-700/80'
                      }`}>
                        {isLeader ? (
                          <Trophy className="w-5 h-5 text-slate-950 fill-slate-950" />
                        ) : (
                          positionNumber
                        )}
                      </div>

                      {/* Icono del Jugador / Avatar */}
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                        <User className={`w-4.5 h-4.5 ${isCurrentUser ? 'text-emerald-400' : 'text-slate-400'}`} />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-semibold ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {displayName} {isCurrentUser && <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded-md font-normal ml-0.5">Tú</span>}
                          </span>

                          {/* INSIGNIA: LÍDER */}
                          {isLeader && (
                            <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                              <Crown className="w-2.5 h-2.5 text-yellow-400" /> Líder
                            </span>
                          )}

                          {/* INSIGNIA: RACHA */}
                          {(row.streak ?? 0) >= 2 && (
                            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-sm">
                              <Flame className="w-2.5 h-2.5 text-orange-400 fill-orange-400" /> {row.streak} en racha
                            </span>
                          )}

                          {/* INSIGNIA: EFECTIVIDAD */}
                          {row.played >= 2 && (row.accuracy ?? 0) > 0 && (
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                              <span className="text-[11px] leading-none">🎯</span> {row.accuracy}% efectividad
                            </span>
                          )}

                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right">
                        <div className="text-base font-bold text-white flex items-center gap-1.5 justify-end">
                          <Trophy className={`w-4 h-4 ${isLeader ? 'text-yellow-400 animate-bounce' : 'text-amber-500/80'}`} />
                          {row.points} <span className="text-xs font-normal text-slate-400">pts</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-0.5 justify-end mt-0.5">
                          <Hash className="w-2.5 h-2.5" />
                          {userPreds.length} jugados
                        </div>
                      </div>

                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(rowUserId, displayName)}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                          title={`Eliminar a ${displayName}`}
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
                        const isMatchClosed = new Date(match.kickoff) <= new Date() || match.status === 'finished';
                        const canSeePrediction = isMatchClosed || isCurrentUser;

                        const pred = userPreds.find(p => p.matchId === match.id);

                        if (!canSeePrediction) {
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
