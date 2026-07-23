import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match } from '@/types';
import { PlusCircle, Calendar, Check, AlertCircle } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function AdminView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Estados del Formulario de Creación (Forzados con texto legible)
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [kickoff, setKickoff] = useState('');

  // Estados para cargar resultados reales
  const [results, setResults] = useState<Record<string, { home: string; away: string }>>({});

  async function loadMatches() {
    try {
      const res = await api.getMatches();
      setMatches(res.matches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam || !awayTeam || !kickoff) return;

    setBusy(true);
    setError('');
    try {
      await api.adminCreateMatch({
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        kickoff: new Date(kickoff).toISOString(),
      });
      setHomeTeam('');
      setAwayTeam('');
      setKickoff('');
      await loadMatches();
    } catch (err) {
      setError('Error al crear el partido');
    } finally {
      setBusy(false);
    }
  }

  async function handleSetResult(matchId: string) {
    const res = results[matchId];
    if (!res || res.home === '' || res.away === '') return;

    setBusy(true);
    try {
      await api.adminSetResult(matchId, parseInt(res.home, 10), parseInt(res.away, 10));
      await loadMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function handleResultChange(matchId: string, side: 'home' | 'away', value: string) {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: value,
      },
    }));
  }

  if (loading) {
    return <LoadingSoccer message="Cargando panel de control Dimayor..." />;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto mb-12 text-slate-200">
      <div className="text-center sm:text-left mb-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Panel de Administrador</h2>
        <p className="text-slate-400 text-sm mt-1">Gestiona los partidos y carga los resultados oficiales de la Liga BetPlay</p>
      </div>

      {/* SECCIÓN 1: FORMULARIO DE CREAR PARTIDO */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> Crear Nuevo Partido
        </h3>

        <form onSubmit={handleCreateMatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Equipo Local
              </label>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition font-medium"
                placeholder="Ej: Atlético Nacional"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Equipo Visitante
              </label>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition font-medium"
                placeholder="Ej: Millonarios FC"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Fecha y Hora del Partido (Kickoff)
            </label>
            <input
              type="datetime-local"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition font-medium scheme-dark"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>Registrar Partido en la Nube</span>
          </button>
        </form>
      </div>

      {/* SECCIÓN 2: CARGAR RESULTADOS REALES */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Cargar Resultados Oficiales
        </h3>

        <div className="divide-y divide-slate-800/60 space-y-4">
          {matches.filter(m => m.status !== 'finished').length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-sm">
              No hay partidos abiertos pendientes por marcador.
            </div>
          ) : (
            matches
              .filter((m) => m.status !== 'finished')
              .map((match) => {
                const hasInputResult = results[match.id]?.home !== '' && results[match.id]?.away !== '';
                
                return (
                  <div key={match.id} className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-1 items-center justify-center gap-3 w-full">
                      <span className="flex-1 text-right text-sm font-semibold text-slate-200 truncate">{match.homeTeam}</span>
                      
                      {/* Inputs de marcador Real Forzados con Letra Negra */}
                      <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={results[match.id]?.home ?? ''}
                          onChange={(e) => handleResultChange(match.id, 'home', e.target.value)}
                          className="w-9 h-9 text-center bg-white text-black border border-slate-300 rounded-md text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                        />
                        <span className="text-slate-600 font-bold">:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={results[match.id]?.away ?? ''}
                          onChange={(e) => handleResultChange(match.id, 'away', e.target.value)}
                          className="w-9 h-9 text-center bg-white text-black border border-slate-300 rounded-md text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </div>

                      <span className="flex-1 text-left text-sm font-semibold text-slate-200 truncate">{match.awayTeam}</span>
                    </div>

                    <button
                      onClick={() => handleSetResult(match.id)}
                      disabled={!hasInputResult || busy}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Cerrar y Calcular Puntos
                    </button>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {busy && <LoadingSoccer message="Guardando cambios en la base de datos..." />}
    </div>
  );
}
