import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match, Prediction } from '@/types';
import { Calendar, Save, CheckCircle, Lock } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function PredictionsView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [mRes, pRes] = await Promise.all([api.getMatches(), api.getPredictions()]);
        setMatches(mRes.matches);
        setPredictions(pRes.predictions);

        const initialScores: Record<string, { home: string; away: string }> = {};
        const initialSaved: Record<string, boolean> = {};

        pRes.predictions.forEach((p) => {
          initialScores[p.matchId] = {
            home: p.homeScore.toString(),
            away: p.awayScore.toString(),
          };
          initialSaved[p.matchId] = true;
        });

        setScores(initialScores);
        setSavedStatus(initialSaved);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSave(matchId: string) {
    const matchScore = scores[matchId];
    if (!matchScore || matchScore.home === '' || matchScore.away === '') return;

    setIsSaving(true);
    try {
      await api.savePrediction(
        matchId,
        parseInt(matchScore.home, 10),
        parseInt(matchScore.away, 10)
      );
      // Marcar como guardado
      setSavedStatus((prev) => ({ ...prev, [matchId]: true }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleScoreChange(matchId: string, side: 'home' | 'away', value: string) {
    // 🔒 SI YA ESTÁ GUARDADO, NO PERMITIR CAMBIOS
    if (savedStatus[matchId]) return;

    if (value !== '' && !/^\d+$/.test(value)) return;
    
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: value,
      },
    }));
  }

  if (loading) {
    return <LoadingSoccer message="Cargando partidos de la fecha..." />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left mb-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Mis Predicciones</h2>
        <p className="text-slate-400 text-sm mt-1">Ingresa tus marcadores antes del inicio de cada partido</p>
      </div>

      <div className="grid gap-4 w-full px-1">
        {matches.map((match) => {
          const isSaved = !!savedStatus[match.id];
          const hasScores = scores[match.id]?.home !== '' && scores[match.id]?.away !== '' && scores[match.id]?.home !== undefined;
          
          const hasStarted = new Date(match.kickoff) <= new Date();
          const isFinished = match.status === 'finished';
          
          // 🔒 Regla de Bloqueo Total: Partido finalizado, iniciado O YA GUARDADO por el usuario
          const isLocked = isFinished || hasStarted || isSaved;

          return (
            <div
              key={match.id}
              className={`bg-slate-900/60 backdrop-blur-xl border ${
                isSaved ? 'border-emerald-500/30' : 'border-slate-800/80'
              } rounded-2xl p-4 sm:p-5 shadow-xl transition-all w-full overflow-hidden`}
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-4 border-b border-slate-800/50 pb-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {new Date(match.kickoff).toLocaleString('es-CO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px] ${
                    isFinished
                      ? 'bg-slate-800 text-slate-400 border border-slate-700/40'
                      : hasStarted
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {isFinished ? 'Finalizado' : hasStarted ? 'En Juego' : 'Abierto'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-1 items-center justify-center gap-2 sm:gap-4 w-full overflow-hidden">
                  <div className="flex-1 text-right font-semibold text-sm sm:text-base text-slate-100 truncate">
                    {match.homeTeam}
                  </div>

                  {/* Cajas de Marcadores */}
                  <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={scores[match.id]?.home ?? ''}
                      onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                      disabled={isLocked} // 🔒 SE DESHABILITA SI YA ESTÁ GUARDADO
                      className={`w-10 h-10 text-center border rounded-lg text-lg font-bold focus:outline-none transition ${
                        isLocked
                          ? 'bg-slate-950/90 text-emerald-400 border-slate-800/80 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 text-white border-slate-700/60 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500'
                      }`}
                      placeholder="-"
                    />
                    <span className="text-slate-600 font-bold">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={scores[match.id]?.away ?? ''}
                      onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                      disabled={isLocked} // 🔒 SE DESHABILITA SI YA ESTÁ GUARDADO
                      className={`w-10 h-10 text-center border rounded-lg text-lg font-bold focus:outline-none transition ${
                        isLocked
                          ? 'bg-slate-950/90 text-emerald-400 border-slate-800/80 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 text-white border-slate-700/60 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500'
                      }`}
                      placeholder="-"
                    />
                  </div>

                  <div className="flex-1 text-left font-semibold text-sm sm:text-base text-slate-100 truncate">
                    {match.awayTeam}
                  </div>
                </div>

                {/* Botón de Estado / Acción */}
                {isFinished || hasStarted ? (
                  <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    {isFinished ? (
                      <span>Resultado: <strong className="text-yellow-400">{match.homeScore} - {match.awayScore}</strong></span>
                    ) : (
                      <span>Cerrado por horario</span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleSave(match.id)}
                    disabled={!hasScores || isSaved}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border ${
                      isSaved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-not-allowed opacity-80'
                        : !hasScores
                        ? 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400/20 shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Guardado</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isSaving && <LoadingSoccer message="Guardando tu pronóstico..." />}
    </div>
  );
}
