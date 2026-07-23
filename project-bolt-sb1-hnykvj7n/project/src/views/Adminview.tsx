import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { Match } from '@/types';
import { PlusCircle, Calendar, Check, AlertCircle, RefreshCw } from 'lucide-react';
import LoadingSoccer from '@/components/LoadingSoccer';

export default function AdminView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [kickoff, setKickoff] = useState('');
  const [results, setResults] = useState<Record<string, { home: string; away: string }>>({});

  async function loadMatches() {
    try {
      const res = await api.getMatches();
      setMatches(res.matches);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => { loadMatches(); }, []);

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim() || !kickoff) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const datePart = kickoff.replace('T', ' ');
      const formattedDate = datePart.length === 16 ? `${datePart}:00-05` : `${datePart}-05`;
      await api.adminCreateMatch({ homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), kickoff: formattedDate });
      setHomeTeam(''); setAwayTeam(''); setKickoff('');
      setSuccess('¡Partido registrado con éxito!');
      await loadMatches();
    } catch (err) { setError('Error al registrar el partido'); } finally { setBusy(false); }
  }

  async function handleSetResult(matchId: string) {
    const res = results[matchId];
    if (!res || res.home === '' || res.away === '') return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.adminSetResult(matchId, parseInt(res.home, 10), parseInt(res.away, 10));
      setSuccess('¡Marcador oficial cargado!');
      await loadMatches();
    } catch (err) { setError('Error al guardar resultado'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto mb-12 text-slate-200">
      <div>
        <h2 className="text-2xl font-bold text-white">Panel de Administrador</h2>
        <p className="text-slate-400 text-sm">Gestiona partidos de la Liga BetPlay</p>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> <span>{error}</span></div>}
      {success && <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2"><Check className="w-4 h-4" /> <span>{success}</span></div>}

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2"><PlusCircle className="w-5 h-5" /> Crear Nuevo Partido</h3>
        <form onSubmit={handleCreateMatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm" placeholder="Equipo Local" required />
            <input type="text" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm" placeholder="Equipo Visitante" required />
          </div>
          <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white scheme-dark text-sm" required />
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-yellow-500 text-slate-950 font-bold text-sm shadow-lg">{busy ? 'Guardando...' : 'Registrar Partido'}</button>
        </form>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2"><Calendar className="w-5 h-5" /> Cargar Resultados</h3>
          <button type="button" onClick={loadMatches} className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <div className="divide-y divide-slate-800/60 space-y-4">
          {matches.filter(m => m.status !== 'finished').length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm italic">No hay partidos abiertos programados.</div>
          ) : (
            matches.filter(m => m.status !== 'finished').map((match) => (
              <div key={match.id} className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="flex-1 text-right text-sm font-semibold truncate">{match.homeTeam}</span>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <input type="text" value={results[match.id]?.home ?? ''} onChange={(e) => { if(e.target.value==='' || /^\d+$/.test(e.target.value)) setResults(p => ({...p, [match.id]: {...p[match.id], home: e.target.value}})) }} className="w-9 h-9 text-center bg-white text-black border rounded-lg text-base font-bold" placeholder="0" />
                  <span className="text-slate-600 font-bold">:</span>
                  <input type="text" value={results[match.id]?.away ?? ''} onChange={(e) => { if(e.target.value==='' || /^\d+$/.test(e.target.value)) setResults(p => ({...p, [match.id]: {...p[match.id], away: e.target.value}})) }} className="w-9 h-9 text-center bg-white text-black border rounded-lg text-base font-bold" placeholder="0" />
                </div>
                <span className="flex-1 text-left text-sm font-semibold truncate">{match.awayTeam}</span>
                <button type="button" onClick={() => handleSetResult(match.id)} disabled={busy} className="px-4 py-2 bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Cerrar</button>
              </div>
            ))
          )}
        </div>
      </div>
      {busy && <LoadingSoccer message="Guardando cambios..." />}
    </div>
  );
}
