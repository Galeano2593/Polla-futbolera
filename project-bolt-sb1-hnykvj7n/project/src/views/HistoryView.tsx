import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match, Prediction } from '@/types';
import { Calendar, Award } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function HistoryView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistoryData() {
      try {
        const [mRes, pRes] = await Promise.all([api.getMatches(), api.getPredictions()]);
        
        // Filtrar solo los partidos que YA han finalizado
        const finishedMatches = mRes.matches.filter((m: Match) => m.status === 'finished');
        
        setMatches(finishedMatches);
        setPredictions(pRes.predictions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistoryData();
  }, []);

  // Función para calcular los puntos exactos ganados en un partido
  function calculatePoints(predHome?: number, predAway?: number, realHome?: number, realAway?: number) {
    if (predHome === undefined || predAway === undefined || realHome === undefined || realAway === undefined) {
      return { pts: 0, type: 'none', label: 'Sin pronóstico' };
    }

    // 🎯 Marcador Exacto (10 puntos)
    if (predHome === realHome && predAway === realAway) {
      return { pts: 10, type: 'exact', label: '+10 Puntos (Exacto)' };
    }

    // ⚽ Ganador o Empate correcto (3 puntos)
    const realResult = Math.sign(realHome - realAway);
    const predResult = Math.sign(predHome - predAway);

    if (realResult === predResult) {
      return { pts: 3, type: 'winner', label: '+3 Puntos (Acierto)' };
    }

    // ❌ No acertó (0 puntos)
    return { pts: 0, type: 'miss', label: '0 Puntos' };
  }

  if (loading) {
    return <LoadingSoccer message="Cargando tu historial de resultados..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto mb-12">
      <div className="text-center sm:text-left mb-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Historial de Partidos</h2>
        <p className="text-slate-400 text-sm mt-1">Revisa tus pronósticos anteriores y los puntos acumulados</p>
      </div>

      {matches.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-xl">
          Aún no hay partidos finalizados en el torneo.
        </div>
      ) : (
        <div className="grid gap-4 w-full px-1">
          {matches.map((match) => {
            const pred = predictions.find((p) => p.matchId === match.id);
            const result = calculatePoints(
              pred?.homeScore,
              pred?.awayScore,
              match.homeScore,
              match.awayScore
            );

            return (
              <div
                key={match.id}
                className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl transition-all"
              >
                {/* Header de la tarjeta */}
                <div className="flex justify-between items-center text-xs text-slate-400 mb-3 border-b border-slate-800/50 pb-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {new Date(match.kickoff).toLocaleString('es-CO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>

                  {/* Badge de Puntos Obtenidos */}
                  <div
                    className={`px-2.5 py-1 rounded-full font-bold text-[11px] flex items-center gap-1 border ${
                      result.type === 'exact'
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                        : result.type === 'winner'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700/50'
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    <span>{result.label}</span>
                  </div>
                </div>

                {/* Comparativa: Pronóstico vs Resultado Real */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  
                  {/* Tu Pronóstico */}
                  <div className="flex flex-col items-center justify-center p-2 bg-slate-900/50 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                      Tu Pronóstico
                    </span>
                    {pred ? (
                      <div className="text-sm font-bold text-slate-200">
                        {match.homeTeam} <span className="text-emerald-400 px-1">{pred.homeScore} - {pred.awayScore}</span> {match.awayTeam}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">No pronosticaste</span>
                    )}
                  </div>

                  {/* Resultado Real */}
                  <div className="flex flex-col items-center justify-center p-2 bg-slate-900/50 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-1">
                      Resultado Final
                    </span>
                    <div className="text-sm font-bold text-white">
                      {match.homeTeam} <span className="text-yellow-400 px-1">{match.homeScore ?? 0} - {match.awayScore ?? 0}</span> {match.awayTeam}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
