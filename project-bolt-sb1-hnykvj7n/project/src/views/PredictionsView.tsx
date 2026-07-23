import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match, Prediction } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Lock, CheckCircle2, Clock, Save, Goal } from 'lucide-react';

type PredictionMap = Record<string, Prediction>;

export default function PredictionsView() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [preds, setPreds] = useState<PredictionMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [{ matches }, { predictions }] = await Promise.all([
        api.getMatches(),
        api.getPredictions(),
      ]);
      setMatches(matches);
      const map: PredictionMap = {};
      for (const p of predictions) map[p.matchId] = p;
      setPreds(map);
      const d: Record<string, { home: string; away: string }> = {};
      for (const m of matches) {
        const existing = map[m.id];
        d[m.id] = {
          home: existing ? String(existing.homeScore) : '',
          away: existing ? String(existing.awayScore) : '',
        };
      }
      setDrafts(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(matchId: string) {
    const draft = drafts[matchId];
    if (!draft || draft.home === '' || draft.away === '') return;
    setSaving(matchId);
    setError('');
    setSavedMsg(null);
    try {
      const { prediction } = await api.savePrediction(
        matchId,
        Number(draft.home),
        Number(draft.away),
      );
      setPreds((prev) => ({ ...prev, [matchId]: prediction }));
      setSavedMsg(matchId);
      setTimeout(() => setSavedMsg((cur) => (cur === matchId ? null : cur)), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mis Predicciones</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ingresa tus marcadores antes del inicio de cada partido
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {matches.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Goal className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No hay partidos cargados todavía.
        </div>
      )}

      <div className="space-y-4">
        {matches.map((m) => {
          const started = new Date(m.kickoff).getTime() <= Date.now();
          const finished = m.status === 'finished';
          const pred = preds[m.id];
          const draft = drafts[m.id] ?? { home: '', away: '' };
          const canSave =
            !started &&
            draft.home !== '' &&
            draft.away !== '' &&
            !saving &&
            (!pred ||
              Number(draft.home) !== pred.homeScore ||
              Number(draft.away) !== pred.awayScore);

          return (
            <div
              key={m.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                started ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  {formatKickoff(m.kickoff)}
                </div>
                {finished ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Finalizado
                  </span>
                ) : started ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    En juego
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    Abierto
                  </span>
                )}
              </div>

              <div className="px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-slate-900">{m.homeTeam}</p>
                    <p className="text-xs text-slate-400">Local</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <ScoreInput
                      value={draft.home}
                      disabled={started}
                      onChange={(v) =>
                        setDrafts((d) => ({ ...d, [m.id]: { ...d[m.id], home: v } }))
                      }
                    />
                    <span className="text-slate-300 font-bold">:</span>
                    <ScoreInput
                      value={draft.away}
                      disabled={started}
                      onChange={(v) =>
                        setDrafts((d) => ({ ...d, [m.id]: { ...d[m.id], away: v } }))
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{m.awayTeam}</p>
                    <p className="text-xs text-slate-400">Visitante</p>
                  </div>
                </div>

                {finished && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Resultado final:{' '}
                      <span className="font-bold text-slate-900">
                        {m.homeScore} - {m.awayScore}
                      </span>
                    </span>
                    {pred?.scored && (
                      <span
                        className={`flex items-center gap-1.5 font-semibold ${
                          pred.points === 3
                            ? 'text-emerald-600'
                            : pred.points === 1
                              ? 'text-amber-600'
                              : 'text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {pred.points} pts
                      </span>
                    )}
                  </div>
                )}

                {!finished && !started && (
                  <div className="mt-4 flex items-center justify-between">
                    {pred && !savedMsg ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Guardado: {pred.homeScore} - {pred.awayScore}
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      {savedMsg === m.id && (
                        <span className="text-xs text-emerald-600 font-medium animate-pulse">
                          ¡Guardado!
                        </span>
                      )}
                      <button
                        onClick={() => handleSave(m.id)}
                        disabled={!canSave}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        {saving === m.id ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )}

                {started && !finished && pred && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Tu pronóstico: {pred.homeScore} - {pred.awayScore}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      disabled={disabled}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || (/^\d{1,2}$/.test(v) && Number(v) <= 99)) onChange(v);
      }}
      className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition ${
        disabled
          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
          : 'bg-white border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
      }`}
    />
  );
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
