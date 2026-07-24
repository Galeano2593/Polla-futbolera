import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match } from '@/types';
import { PlusCircle, Calendar, Check, AlertCircle, RefreshCw, Clock, Edit3 } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function AdminView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulario crear partido
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [kickoff, setKickoff] = useState('');

  // Estados de edición dinámica
  const [results, setResults] = useState<Record<string, { home: string; away: string }>>({});
  const [editingKickoff, setEditingKickoff] = useState<Record<string, string>>({});

  async function loadMatches() {
    try {
      const res = await api.getMatches();
      setMatches(res.matches);

      // Pre-cargar valores en inputs
      const initialResults: Record<string, { home: string; away: string }> = {};
      const initialKickoffs: Record<string, string> = {};

      res.matches.forEach((m) => {
        initialResults[m.id] = {
          home: m.homeScore !== undefined ? String(m.homeScore) : '',
          away: m.awayScore !== undefined ? String(m.awayScore) : '',
        };
        // Formatear ISO a YYYY-MM-THH:mm para input datetime-local
        if (m.kickoff) {
          const d = new Date(m.kickoff);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          initialKickoffs[m.id] = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      });

      setResults(initialResults);
      setEditingKickoff(initialKickoffs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  // 1. Crear nuevo partido
  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim() || !kickoff) return;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const localDate = new Date(kickoff);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const hours = String(localDate.getHours()).padStart(2, '0');
      const minutes = String(localDate.getMinutes()).padStart(2, '0');

      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:00-05`;

      await api.adminCreateMatch({
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        kickoff: formattedDate,
      });

      setHomeTeam('');
      setAwayTeam('');
      setKickoff('');
      setSuccess('¡Partido registrado con éxito!');
      await loadMatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el partido');
    } finally {
      setBusy(false);
    }
  }

  // 2. Guardar o corregir marcador
  async function handleSetResult(matchId: string) {
    const res = results[matchId];
    if (!res || res.home === '' || res.away === '') return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.adminSetResult(matchId, parseInt(res.home, 10), parseInt(res.away, 10));
      setSuccess('¡Marcador oficial actualizado correctamente!');
      await loadMatches();
    } catch (err) {
      setError('Error al guardar resultado');
    } finally {
      setBusy(false);
    }
  }

  // 3. Cambiar fecha / hora de un partido (Aplazamiento / Cambio de última hora)
  async function handleUpdateKickoff(matchId: string) {
    const newKickoff = editingKickoff[matchId];
    if (!newKickoff) return;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const localDate = new Date(newKickoff);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const hours = String(localDate.getHours()).padStart(2, '0');
      const minutes = String(localDate.getMinutes()).padStart(2, '0');

      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:00-05`;

      await api.adminUpdateMatchKickoff(matchId, formattedDate);
      setSuccess('¡Horario del partido actualizado!');
      await loadMatches();
    } catch (err) {
      setError('Error al actualizar horario');
    } finally {
      setBusy(false);
    }
  }

  const scheduledMatches = matches.filter((m) => m.status !== 'finished');
  const finishedMatches = matches.filter((m) => m.status === 'finished');

  return (
    <div className="space-y-8 max-w-2xl mx-auto mb-12 text-slate-200">
      <div>
        <h2 className="text-2xl font-bold text-white">Panel de Administrador</h2>
        <p className="text-slate-400 text-sm">Gestiona partidos de la Liga BetPlay</p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4" /> <span>{success}</span>
        </div>
      )}

      {/* CREAR PARTIDO */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> Crear Nuevo Partido
        </h3>
        <form onSubmit={handleCreateMatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-yellow-500"
              placeholder="Equipo Local"
              required
            />
            <input
              type="text"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-yellow-500"
              placeholder="Equipo Visitante"
              required
            />
          </div>
          <input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white scheme-dark text-sm focus:outline-none focus:border-yellow-500"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-sm shadow-lg transition"
          >
            {busy ? 'Guardando...' : 'Registrar Partido'}
          </button>
        </form>
      </div>

      {/* CARGAR RESULTADOS / MODIFICAR HORARIO */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Partidos Programados
          </h3>
          <button
            type="button"
            onClick={loadMatches}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/60 space-y-4">
          {scheduledMatches.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm italic">
              No hay partidos abiertos programados.
            </div>
          ) : (
            scheduledMatches.map((match) => (
              <div key={match.id} className="pt-4 space-y-3">
                {/* Modificar fecha/hora individual */}
                <div className="flex items-center justify-between gap-2 bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400">Horario programado:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={editingKickoff[match.id] || ''}
                      onChange={(e) =>
                        setEditingKickoff({ ...editingKickoff, [match.id]: e.target.value })
                      }
                      className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-200 scheme-dark"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateKickoff(match.id)}
                      disabled={busy}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs rounded-lg border border-slate-700 flex items-center gap-1"
                      title="Actualizar horario del partido"
                    >
                      <Clock className="w-3 h-3" />
                      Hora
                    </button>
                  </div>
                </div>

                {/* Equipos y Marcador */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="flex-1 text-right text-sm font-semibold truncate">
                    {match.homeTeam}
                  </span>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      value={results[match.id]?.home ?? ''}
                      onChange={(e) => {
                        if (e.target.value === '' || /^\d+$/.test(e.target.value))
                          setResults((p) => ({
                            ...p,
                            [match.id]: { ...p[match.id], home: e.target.value },
                          }));
                      }}
                      className="w-9 h-9 text-center bg-white text-black border rounded-lg text-base font-bold"
                      placeholder="0"
                    />
                    <span className="text-slate-600 font-bold">:</span>
                    <input
                      type="text"
                      value={results[match.id]?.away ?? ''}
                      onChange={(e) => {
                        if (e.target.value === '' || /^\d+$/.test(e.target.value))
                          setResults((p) => ({
                            ...p,
                            [match.id]: { ...p[match.id], away: e.target.value },
                          }));
                      }}
                      className="w-9 h-9 text-center bg-white text-black border rounded-lg text-base font-bold"
                      placeholder="0"
                    />
                  </div>
                  <span className="flex-1 text-left text-sm font-semibold truncate">
                    {match.awayTeam}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSetResult(match.id)}
                    disabled={busy}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" /> Cerrar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CORREGIR PARTIDOS FINALIZADOS */}
      {finishedMatches.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <Edit3 className="w-5 h-5" /> Corregir Marcadores Finalizados
          </h3>
          <div className="divide-y divide-slate-800/60 space-y-4">
            {finishedMatches.map((match) => (
              <div key={match.id} className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="flex-1 text-right text-sm font-semibold truncate text-slate-300">
                  {match.homeTeam}
                </span>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    value={results[match.id]?.home ?? ''}
                    onChange={(e) => {
                      if (e.target.value === '' || /^\d+$/.test(e.target.value))
                        setResults((p) => ({
                          ...p,
                          [match.id]: { ...p[match.id], home: e.target.value },
                        }));
                    }}
                    className="w-9 h-9 text-center bg-white text-black border rounded-lg text-base font-bold"
                  />
                  <span className="text-slate-600 font-bold">:</span>
                  <input
                    type="text"
                    value={results[match.id]?.away ?? ''}
                    onChange={(e) => {
                      if (e.target.value === '' || /^\d+$/.test(e.target.value))
                        setResults((p) => ({
                          ...p,
                          [match.id]: { ...p[match.id], away: e.target.value },
                        }));
                    }}
                    className="w-9 h-9 text-center bg-white text-black border rounded-lg text-base font-bold"
                  />
                </div>
                <span className="flex-1 text-left text-sm font-semibold truncate text-slate-300">
                  {match.awayTeam}
                </span>
                <button
                  type="button"
                  onClick={() => handleSetResult(match.id)}
                  disabled={busy}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Corregir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {busy && <LoadingSoccer message="Guardando cambios..." />}
    </div>
  );
}
