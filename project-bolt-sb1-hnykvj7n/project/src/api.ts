import type { AuthUser, Match, Prediction, LeaderboardRow } from '@/types';

// ==========================================
// 🛠️ CREDENCIALES DE CONEXIÓN A SUPABASE
// ==========================================
const SUPABASE_URL = 'https://trumjgflgcnrfusfxgtn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oxOkx_GxNVWo4lTsdzKTbg_Ou7uiWDI';

async function sbRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Error en la base de datos');
  }
  
  if (res.status === 204) {
    return {} as T;
  }
  
  return await res.json() as T;
}

export const api = {
  register: async (username: string, password: string, fullName: string) => {
    const cleanUsername = username.trim().toLowerCase();
    
    await sbRequest(`users`, {
      method: 'POST',
      body: JSON.stringify({
        username: cleanUsername,
        password: password,
        full_name: fullName.trim(),
        role: cleanUsername === 'admin' ? 'admin' : 'user'
      }),
      headers: { 
        'Prefer': 'resolution=merge-duplicates,return=representation' 
      }
    });

    const user: AuthUser = { id: cleanUsername, username: fullName.trim(), role: cleanUsername === 'admin' ? 'admin' : 'user' };
    localStorage.setItem('pf_token', `sb-token-${cleanUsername}`);
    localStorage.setItem('pf_current_user', JSON.stringify(user));
    return { token: `sb-token-${cleanUsername}`, user };
  },

  login: async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();
    
    if (cleanUsername === 'admin' && password === 'admin123') {
      const adminUser: AuthUser = { id: 'admin', username: 'Administrador', role: 'admin' };
      localStorage.setItem('pf_token', 'sb-token-admin');
      localStorage.setItem('pf_current_user', JSON.stringify(adminUser));
      return { token: 'sb-token-admin', user: adminUser };
    }

    // 🔒 CONSULTA DE SEGURIDAD CORREGIDA: Extrae el usuario de forma exacta del arreglo de la nube
    const res = await sbRequest<any[]>(`users?username=eq.${cleanUsername}&select=*`);
    
    if (!res || res.length === 0) {
      throw new Error('Usuario o contraseña incorrectos');
    }
    
    const dbUser = res[0]; // <--- Extracción correcta del primer elemento del arreglo

    if (dbUser.password !== password) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const user: AuthUser = { id: dbUser.username, username: dbUser.full_name, role: dbUser.role };
    localStorage.setItem('pf_token', `sb-token-${dbUser.username}`);
    localStorage.setItem('pf_current_user', JSON.stringify(user));
    return { token: `sb-token-${dbUser.username}`, user };
  },

  getMatches: async () => {
    const matches = await sbRequest<any[]>(`matches?select=*&order=kickoff.asc`);
    const mapped: Match[] = matches.map((m: any) => ({
      id: m.id,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      kickoff: m.kickoff,
      status: m.status,
      homeScore: m.home_score !== null ? m.home_score : undefined,
      awayScore: m.away_score !== null ? m.away_score : undefined
    }));
    return { matches: mapped };
  },

  getPredictions: async () => {
    const savedUser = localStorage.getItem('pf_current_user');
    if (!savedUser) return { predictions: [] };
    const currentUser = JSON.parse(savedUser);

    const predictions = await sbRequest<any[]>(`predictions?username=eq.${currentUser.id}&select=*`);
    const mapped = predictions.map(p => ({
      id: p.id,
      matchId: p.match_id,
      userId: p.username,
      homeScore: p.home_score,
      awayScore: p.away_score,
      createdAt: p.created_at
    }));
    return { predictions: mapped };
  },

  savePrediction: async (matchId: string, homeScore: number, awayScore: number) => {
    const savedUser = localStorage.getItem('pf_current_user');
    if (!savedUser) throw new Error('No autenticado');
    const currentUser = JSON.parse(savedUser);

    const predId = `${currentUser.id}-${matchId}`;
    await sbRequest(`predictions`, {
      method: 'POST',
      body: JSON.stringify({
        id: predId,
        username: currentUser.id,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore
      }),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    });

    return { 
      prediction: { id: predId, matchId, userId: currentUser.id, homeScore, awayScore, createdAt: new Date().toISOString() } 
    };
  },

  getLeaderboard: async () => {
    // Filtrar al administrador directo desde la API para evitar conflictos lógicos
    const [users, matches, allPredictions] = await Promise.all([
      sbRequest<any[]>(`users?role=neq.admin&select=*`),
      sbRequest<any[]>(`matches?select=*`),
      sbRequest<any[]>(`predictions?select=*`)
    ]);

    const leaderboard: LeaderboardRow[] = users.map((u) => {
      let points = 0;
      const userPredictions = allPredictions.filter(p => p.username === u.username);

      userPredictions.forEach(p => {
        const match = matches.find(m => m.id === p.match_id);
        if (match && match.status === 'finished' && match.home_score !== null && match.away_score !== null) {
          const actualHome = match.home_score;
          const actualAway = match.away_score;
          const predHome = p.home_score;
          const predAway = p.away_score;

          let matchPoints = 0;
          if (predHome === actualHome && predAway === actualAway) {
            matchPoints = 10;
          } else {
            const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
            const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
            if (actualWinner === predWinner) matchPoints = 7;
            if (predHome === actualHome || predAway === actualAway) {
              if (matchPoints < 4) matchPoints = 4;
            }
            const actualDiff = Math.abs(actualHome - actualAway);
            const predDiff = Math.abs(predHome - predAway);
            if (actualDiff === predDiff) {
              if (matchPoints < 2) matchPoints = 2;
            }
          }
          points += matchPoints;
        }
      });

      return {
        rank: 0,
        userId: u.username,
        username: u.full_name,
        points,
        played: userPredictions.length,
      };
    });

    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((row, i) => row.rank = i + 1);
    return { leaderboard };
  },

  adminCreateMatch: async (data: { homeTeam: string; awayTeam: string; kickoff: string }) => {
    const matchId = `m${Math.floor(Math.random() * 100000)}`;

    await sbRequest('matches', {
      method: 'POST',
      body: JSON.stringify({ 
        id: matchId, 
        home_team: data.homeTeam.trim(), 
        away_team: data.awayTeam.trim(), 
        kickoff: data.kickoff, 
        status: 'scheduled' 
      }),
      headers: { 'Prefer': 'return=representation' }
    });
    
    return { match: { id: matchId, homeTeam: data.homeTeam, awayTeam: data.awayTeam, kickoff: data.kickoff, status: 'scheduled' } };
  },

  adminSetResult: async (matchId: string, homeScore: number, awayScore: number) => {
    await sbRequest(`matches?id=eq.${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'finished',
        home_score: homeScore,
        away_score: awayScore
      }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return { match: {} as any, predictionsUpdated: 1 };
  },

  adminDeleteUser: async (usernameToDelete: string) => {
    await sbRequest(`users?username=eq.${usernameToDelete}`, {
      method: 'DELETE'
    });
    return { success: true };
  }
};
