import type { Match, Prediction, LeaderboardRow } from '@/types';

const SUPABASE_URL = 'https://trumjgtfgcnrfushtgtn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ox0kx_GxNVWo4lTsdzKTbg_Ou7uiWDI';


async function sbRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error de base de datos');
  }
  if (res.status === 204) return {} as T;
  return await res.json() as T;
}

export const api = {
  register: async (username: string, password: string, fullName: string) => {
    const u = username.trim().toLowerCase();
    await sbRequest('users', {
      method: 'POST',
      body: JSON.stringify({ username: u, password, full_name: fullName.trim(), role: u === 'admin' ? 'admin' : 'user' }),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    });
    const logged = { id: u, username: fullName.trim(), role: u === 'admin' ? 'admin' : 'user' };
    localStorage.setItem('pf_token', `sb-${u}`);
    localStorage.setItem('pf_current_user', JSON.stringify(logged));
    return { token: `sb-${u}`, user: logged };
  },

  login: async (username: string, password: string) => {
    const u = username.trim().toLowerCase();
    if (u === 'admin' && password === 'admin123') {
      const adm = { id: 'admin', username: 'Administrador', role: 'admin' };
      localStorage.setItem('pf_token', 'sb-admin');
      localStorage.setItem('pf_current_user', JSON.stringify(adm));
      return { token: 'sb-admin', user: adm };
    }
    const res = await sbRequest<any[]>(`users?username=eq.${u}`);
    if (!res || res.length === 0 || res[0].password !== password) throw new Error('Usuario o contraseña incorrectos');
    const logged = { id: res[0].username, username: res[0].full_name, role: res[0].role };
    localStorage.setItem('pf_token', `sb-${res[0].username}`);
    localStorage.setItem('pf_current_user', JSON.stringify(logged));
    return { token: `sb-${res[0].username}`, user: logged };
  },

  getMatches: async () => {
    const res = await sbRequest<any[]>('matches?select=*&order=kickoff.asc');
    const matches: Match[] = res.map(m => ({
      id: m.id, homeTeam: m.home_team, awayTeam: m.away_team, kickoff: m.kickoff, status: m.status,
      homeScore: m.home_score !== null ? m.home_score : undefined, awayScore: m.away_score !== null ? m.away_score : undefined
    }));
    return { matches };
  },

  getPredictions: async () => {
    const saved = localStorage.getItem('pf_current_user');
    if (!saved) return { predictions: [] };
    const u = JSON.parse(saved).id;
    const res = await sbRequest<any[]>(`predictions?username=eq.${u}`);
    const predictions: Prediction[] = res.map(p => ({
      id: p.id, matchId: p.match_id, userId: p.username, homeScore: p.home_score, awayScore: p.away_score, createdAt: p.created_at
    }));
    return { predictions };
  },

  savePrediction: async (matchId: string, homeScore: number, awayScore: number) => {
    const saved = localStorage.getItem('pf_current_user');
    if (!saved) throw new Error('No autenticado');
    const u = JSON.parse(saved).id;
    const predId = `${u}-${matchId}`;
    await sbRequest('predictions', {
      method: 'POST',
      body: JSON.stringify({ id: predId, username: u, match_id: matchId, home_score: homeScore, away_score: awayScore }),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    });
    return { prediction: { id: predId, matchId, userId: u, homeScore, awayScore, createdAt: new Date().toISOString() } };
  },

  getLeaderboard: async () => {
    const [users, matches, preds] = await Promise.all([
      sbRequest<any[]>('users?select=*'), sbRequest<any[]>('matches?select=*'), sbRequest<any[]>('predictions?select=*')
    ]);
    const leaderboard: LeaderboardRow[] = users.filter(u => u.username !== 'admin').map((u) => {
      let points = 0;
      const userPreds = preds.filter(p => p.username === u.username);
      userPreds.forEach(p => {
        const m = matches.find(m => m.id === p.match_id);
        if (m && m.status === 'finished' && m.home_score !== null && m.away_score !== null) {
          if (p.home_score === m.home_score && p.away_score === m.away_score) points += 10;
          else {
            const mW = m.home_score > m.away_score ? 'h' : m.home_score < m.away_score ? 'a' : 'd';
            const pW = p.home_score > p.away_score ? 'h' : p.home_score < p.away_score ? 'a' : 'd';
            if (mW === pW) points += 7;
            if (p.home_score === m.home_score || p.away_score === m.away_score) { if (points < 7) points += 4; }
            if (Math.abs(m.home_score - m.away_score) === Math.abs(p.home_score - p.away_score)) { if (points < 4) points += 2; }
          }
        }
      });
      return { rank: 0, userId: u.username, username: u.full_name, points, played: userPreds.length };
    });
    leaderboard.sort((a, b) => b.points - a.points).forEach((row, i) => row.rank = i + 1);
    return { leaderboard };
  },

    adminCreateMatch: async (data: { homeTeam: string; awayTeam: string; kickoff: string }) => {
    // 🛠️ ID numérico corto aleatorio para alinearse de forma exacta al formato de tu base de datos
    const matchId = `m${Math.floor(Math.random() * 100000)}`;
    
    // 🇨🇴 Estructurar la fecha limpiando la 'T' nativa de HTML y añadiendo la zona horaria fija de Colombia (-05)
    const formattedKickoff = data.kickoff.replace('T', ' ') + ':00-05';

    await sbRequest('matches', {
      method: 'POST',
      body: JSON.stringify({ 
        id: matchId, 
        home_team: data.homeTeam.trim(), 
        away_team: data.awayTeam.trim(), 
        kickoff: formattedKickoff, 
        status: 'scheduled' 
      }),
      headers: { 'Prefer': 'return=representation' }
    });
    
    return { match: { id: matchId, homeTeam: data.homeTeam, awayTeam: data.awayTeam, kickoff: data.kickoff, status: 'scheduled' } };
  },


  adminSetResult: async (matchId: string, homeScore: number, awayScore: number) => {
    await sbRequest(`matches?id=eq.${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'finished', home_score: homeScore, away_score: awayScore }),
      headers: { 'Prefer': 'return=representation' }
    });
    return { match: {} as any, predictionsUpdated: 1 };
  },

  adminDeleteUser: async (u: string) => {
    await sbRequest(`users?username=eq.${u}`, { method: 'DELETE' });
    return { success: true };
  }
};

