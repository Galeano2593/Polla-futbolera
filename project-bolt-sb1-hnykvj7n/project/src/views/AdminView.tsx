import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match } from '@/types';
import { ShieldCheck, Plus, Trophy, Clock } from 'lucide-react';

type Tab = 'matches' | 'results';

export default function AdminView() {
  const [tab, setTab] = useState<Tab>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function loadMatches() {
    setLoading(true);
    try {
      const { matches } = await api.getMatches();
      setMatches(matches);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMatches();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administrador</h1>
          <p className="text-slate-500 text-sm">Gestiona partidos y resultados</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
        <button
          onClick={() => setTab('matches')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'matches' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Crear Partido
        </button>
        <button
          onClick={() => setTab('results')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'results' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Cargar Resultados
        </button>
      </div>

      {msg && (
        <div
          className={`mb-4 text-sm rounded-xl px-4 py-3 ${
            msg.type === 'ok'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-red-700 bg-red-50 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {tab === 'matches' ? (
        <CreateMatchForm
          onCreated={() => {
            setMsg({ type: 'ok', text: 'Partido creado correctamente' });
            void loadMatches();
          }}
          onError={(t) => setMsg({ type: 'err', text: t })}
        />
      ) : (
        <ResultsForm
          matches={matches}
          loading={loading}
          onDone={() => {
            setMsg({ type: 'ok', text: 'Resultado cargado y puntos calculados' });
            void loadMatches();
          }}
          onError={(t) => setMsg({ type: 'err', text: t })}
        />
      )}

      {/* Match list */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Partidos ({matches.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {m.homeTeam} vs {m.awayTeam}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(m.kickoff).toLocaleString('es', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'finished' ? (
                    <span className="text-sm font-bold text-slate-900">
                      {m.homeScore} - {m.awayScore}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Sin resultado</span>
                  )}
                  {m.status === 'finished' && (
                    <Trophy className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateMatchForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (text: string) => void;
}) {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [kickoff, setKickoff] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const iso = new Date(kickoff).toISOString();
      await api.adminCreateMatch({ homeTeam, awayTeam, kickoff: iso });
      setHomeTeam('');
      setAwayTeam('');
      setKickoff('');
      onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-slate-700 font-medium">
        <Plus className="w-4 h-4" />
        Nuevo partido
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Equipo Local
          </label>
          <input
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Equipo Visitante
          </label>
          <input
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Fecha y hora
        </label>
        <input
          type="datetime-local"
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition disabled:opacity-50"
      >
        {busy ? 'Creando…' : 'Crear partido'}
      </button>
    </form>
  );
}

function ResultsForm({
  matches,
  loading,
  onDone,
  onError,
}: {
  matches: Match[];
  loading: boolean;
  onDone: () => void;
  onError: (text: string) => void;
}) {
  const [matchId, setMatchId] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!matchId || home === '' || away === '') return;
    setBusy(true);
    try {
      await api.adminSetResult(matchId, Number(home), Number(away));
      setMatchId('');
      setHome('');
      setAway('');
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-slate-700 font-medium">
        <Trophy className="w-4 h-4" />
        Cargar resultado final
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Partido
        </label>
        <select
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        >
          <option value="">Selecciona un partido…</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.homeTeam} vs {m.awayTeam} —{' '}
              {new Date(m.kickoff).toLocaleDateString('es')}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Goles Local
          </label>
          <input
            type="number"
            min={0}
            max={99}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Goles Visitante
          </label>
          <input
            type="number"
            min={0}
            max={99}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Cargar resultado y calcular puntos'}
      </button>
    </form>
  );
}
