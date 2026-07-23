import type { AuthUser, Match, Prediction, LeaderboardRow } from '@/types';

// ==========================================
// 🛠️ CREDENCIALES DE CONEXIÓN A SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ox0kx_GxNVWo4lTsdzKTbg_Ou7uiWDI.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ox0kx_GxNVWo4lTsdzKTbg_Ou7uiWDI';

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
  
  if (options.method === 'POST' || options.method === 'PATCH' || options.method === 'DELETE') {
    return {} as T; 
  }
  
  return await res.json() as T;
}

export const api = {
  register: async (username: string, password: string, fullName: string) => {
    const cleanUsername = username.trim().toLowerCase();
    
    // Crear usuario en la nube de Supabase
    await sbRequest(`users`, {
      method: 'POST',
      body: JSON.stringify({
        username: cleanUsername,
        password: password,
        full_name: fullName.trim(),
        role: cleanUsername === 'admin' ? 'admin' : 'user'
      }),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    });

    const user: AuthUser = { id: cleanUsername, username: fullName.trim(), role: cleanUsername === 'admin' ? 'admin' : 'user' };
    localStorage.setItem('pf_token', `sb-token-${cleanUsername}`);
    localStorage.setItem('pf_current_user', JSON.stringify(user));
    return { token: `sb-token-${cleanUsername}`, user };
  },

  login: async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();
    
    // Acceso forzado de contingencia para la cuenta maestra de administración
    if (cleanUsername === 'admin' && password === 'admin123') {
      const adminUser: AuthUser = { id: 'admin', username: 'Administrador', role: 'admin' };
      localStorage.setItem('pf_token', 'sb-token-admin');
      localStorage.setItem('pf_current_user', JSON.stringify(adminUser));
      return { token: 'sb-token-admin', user: adminUser };
    }

    const res = await sbRequest<any[]>(`users?username=eq.${cleanUsername}&select=*`);
    const dbUser = res[0]; // Captura el primer elemento coincidente de la consulta

    if (!dbUser || dbUser.password !== password) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const user: AuthUser = { id: dbUser.username, username: dbUser.full_name, role: dbUser.role };
    localStorage.setItem('pf_token', `sb-token-${dbUser.username}`);
    localStorage.setItem('pf_current_user', JSON.stringify(user));
    return { token: `sb-token-${dbUser.username}`, user };
  },

  getMatches: async () => {
    const matches = await sbRequest<Match[]>(`matches?select=*&order=kickoff.asc`);
    return { matches };
  },

  getPredictions: async () => {
    const savedUser = localStorage.getItem('pf_current_user');
    if (!savedUser) throw new Error('No autenticado');
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
    const [users, matches, allPredictions] = await Promise.all([
      sbRequest<any[]>(`users?select=*`),
      sbRequest<Match[]>(`matches?select=*`),
      sbRequest<any[]>(`predictions?select=*`)
    ]);

    const leaderboard: LeaderboardRow[] = users
      .filter(u => u.username !== 'admin')
      .map((u) => {
        let points = 0;
        const userPredictions = allPredictions.filter(p => p.username === u.username);

        userPredictions.forEach(p => {
          const match = matches.find(m => m.id === p.match_id);
          if (match && match.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
            const actualHome = match.homeScore;
            const actualAway = match.awayScore;
            const predHome = p.home_score;
            const predAway = p.away_score;

            let matchPoints = 0;
            
            // Evalúa el sistema de puntos: 10, 7, 4 y 2 puntos respectivamente
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
    const matchId = `m-${Date.now()}`;
    
    // Convertir la fecha del formulario al formato exacto que exige Supabase (YYYY-MM-DD HH:MM:SS)
    const formattedKickoff = data.kickoff.replace('T', ' ') + ':00';

    await sbRequest(`matches`, {
      method: 'POST',
      body: JSON.stringify({
        id: matchId,
        home_team: data.homeTeam.trim(),
        away_team: data.awayTeam.trim(),
        kickoff: formattedKickoff,
        status: 'scheduled'
      })
    });
    
    return { 
      match: { 
        id: matchId, 
        homeTeam: data.homeTeam, 
        awayTeam: data.awayTeam, 
        kickoff: data.kickoff, 
        status: 'scheduled' 
      } 
    };
  },


  adminSetResult: async (matchId: string, homeScore: number, awayScore: number) => {
    await sbRequest(`matches?id=eq.${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'finished',
        home_score: homeScore,
        away_score: awayScore
      })
    });
    return { match: { id: matchId, homeTeam: '', awayTeam: '', kickoff: '', status: 'finished', homeScore, awayScore }, predictionsUpdated: 1 };
  },


  adminDeleteUser: async (usernameToDelete: string) => {
    await sbRequest(`users?username=eq.${usernameToDelete}`, {
      method: 'DELETE'
    });
    return { success: true };
  }
};
