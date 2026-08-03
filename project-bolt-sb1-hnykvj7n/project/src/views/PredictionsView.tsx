import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match } from '@/types';
import { Calendar, CheckCircle, Lock, Loader2 } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

type SaveState = 'idle' | 'saving' | 'saved';

export default function PredictionsView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const [savingState, setSavingState] = useState<Record<string, SaveState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [mRes, pRes] = await Promise.all([api.getMatches(), api.getPredictions()]);
        setMatches(mRes.matches);

        const initialScores: Record<string, { home: string; away: string }> = {};
        const initialSaveStates: Record<string, SaveState> = {};

        pRes.predictions.forEach((p) => {
          initialScores[p.matchId] = {
            home: p.homeScore !== null && p.homeScore !== undefined ? p.homeScore.toString() : '',
            away: p.awayScore !== null && p.awayScore !== undefined ? p.awayScore.toString() : '',
          };
          initialSaveStates[p.matchId] = 'saved';
        });

        setScores(initialScores);
        setSavingState(initialSaveStates);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function triggerSave(matchId: string, homeVal: string, awayVal: string) {
    if (homeVal === '' || awayVal === '') return;

    setSavingState((prev) => ({ ...prev, [matchId]: 'saving' }));
    try {
      await api.savePrediction(
        matchId,
        parseInt(homeVal, 10),
        parseInt(awayVal, 10)
      );
      setSavingState((prev) => ({ ...prev, [matchId]: 'saved' }));
    } catch (err) {
      console.error("Error al guardar pronóstico:", err);
      setSavingState((prev) => ({ ...prev, [matchId]: 'idle' }));
    }
  }

  function handleScoreChange(matchId: string, side: 'home' | 'away', value: string) {
    if (value !== '' && !/^\d+$/.test(value)) return;

    const currentMatchScores = scores[matchId] || { home: '', away: '' };
    const updatedScores = {
      ...currentMatchScores,
      [side]: value,
    };

    setScores((prev) => ({
      ...prev,
      [matchId]: updatedScores,
    }));

    // Guardado automático inmediato en cuanto ambos campos tienen un valor numérico
    if (updatedScores.home !== '' && updatedScores.away !== '') {
      triggerSave(matchId, updatedScores.home, updatedScores.away);
    } else {
      setSavingState((prev) => ({ ...prev, [matchId]: 'idle' }));
    }
  }

  if (loading) {
    return <LoadingSoccer message="Cargando partidos de la fecha..." />;
  }

  const activeMatches = matches.filter((m) => m.status !== 'finished');

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left mb-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Mis Predicciones</h2>
        <p className="text-slate-400 text-sm mt-1">
          Ingresa o modifica tus marcadores; se actualizarán automáticamente.
        </p>
      </div>

      <div className="grid gap-4 w-full px-1">
        {activeMatches.length === 0 ? (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-xl">
            No hay partidos disponibles para pronosticar en este momento.
          </div>
        ) : (
          activeMatches.map((match) => {
            const currentState = savingState[match.id] || 'idle';
            const hasStarted = new Date(match.kickoff) <= new Date();
            const isFinished = match.status === 'finished';
            const isLocked = isFinished || hasStarted;

            return (
              <div
                key={match.id}
                className={`bg-slate-900/60 backdrop-blur-xl border ${
                  currentState === 'saved' ? 'border-emerald-500/30 shadow-emerald-500/5' : 'border-slate-800/80'
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

                    <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={scores[match.id]?.home ?? ''}
                        onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                        disabled={isLocked}
                        className="w-10 h-10 text-center bg-slate-900 text-white border border-slate-700/60 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="-"
                      />
                      <span className="text-slate-600 font-bold">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={scores[match.id]?.away ?? ''}
                        onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                        disabled={isLocked}
                        className="w-10 h-10 text-center bg-slate-900 text-white border border-slate-700/60 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="-"
                      />
                    </div>

                    <div className="flex-1 text-left font-semibold text-sm sm:text-base text-slate-100 truncate">
                      {match.awayTeam}
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex justify-center items-center min-w-[110px]">
                    {hasStarted || isFinished ? (
                      <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Cerrado</span>
                      </div>
                    ) : currentState === 'saving' ? (
                      <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </div>
                    ) : currentState === 'saved' ? (
                      <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Guardado</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Ingresa ambos marcadores
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
