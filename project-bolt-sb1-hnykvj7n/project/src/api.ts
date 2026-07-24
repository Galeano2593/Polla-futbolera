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
    const errText = await res.text().catch(() => '');
    let errData: any = {};
    try { errData = JSON.parse(errText); } catch { errData = {}; }
    throw new Error(errData.message || errData.hint || `Error ${res.status} en la base de datos`);
  }
  
  if (res.status === 204) {
    return {} as T;
  }
  
  const text = await res.text();
  if (!text || text.trim() === '') {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  register: async (username: string, password: string, fullName: string) => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim() || cleanUsername;
    const role = cleanUsername === 'admin' ? 'admin' : 'user';
    
    await sbRequest(`users`, {
      method: 'POST',
      body: JSON.stringify({
        username: cleanUsername,
        password: password,
        full_name: cleanFullName,
        role: role
      }),
      headers: { 
        'Prefer': 'resolution=merge-duplicates,return=representation' 
      }
    });

    const user: AuthUser = { 
      id: cleanUsername, 
      username: cleanFullName, 
      role: role 
    };

    localStorage.setItem('pf_token', `sb-token-${cleanUsername}`);
    localStorage.setItem('pf_current_user', JSON.stringify({ ...user, rawUsername: cleanUsername }));
    return { token: `sb-token-${cleanUsername}`, user };
  },

  login: async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();
    
    if (cleanUsername === 'admin' && password === 'admin123') {
      await sbRequest(`users`, {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123',
          full_name: 'Administrador',
          role: 'admin'
        }),
        headers: { 'Prefer': 'resolution=merge-duplicates' }
      }).catch(() => {});

      const adminUser: AuthUser = { id: 'admin', username: 'Administrador', role: 'admin' };
      localStorage.setItem('pf_token', 'sb-token-admin');
      localStorage.setItem('pf_current_user', JSON.stringify({ ...adminUser, rawUsername: 'admin' }));
      return { token: 'sb-token-admin', user: adminUser };
    }

    const res = await sbRequest<any[]>(`users?username=eq.${cleanUsername}&select=*`);
    
    if (!res || res.length === 0) {
      throw new Error('Usuario o contraseña incorrectos');
    }
    
    const dbUser = res[0];

    if (dbUser.password !== password) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const user: AuthUser = { id: dbUser.username, username: dbUser.full_name, role: dbUser.role };
    localStorage.setItem('pf_token', `sb-token-${dbUser.username}`);
    localStorage.setItem('pf_current_user', JSON.stringify({ ...user, rawUsername: dbUser.username }));
    return { token: `sb-token-${dbUser.username}`, user };
  },

  getMatches: async () => {
    const matches = await sbRequest<any[]>(`matches?select=*&order=kickoff.asc`);
    const mapped: Match[] = (matches || []).map((m: any) => ({
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
    
    // Normalizar usuario a minúsculas
    const targetUsername = String(currentUser.rawUsername || currentUser.id).trim().toLowerCase();

    const predictions = await sbRequest<any[]>(`predictions?username=eq.${encodeURIComponent(targetUsername)}&select=*`);
    const mapped: Prediction[] = (predictions || []).map(p => ({
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
    
    // Normalizar usuario a minúsculas
    const targetUsername = String(currentUser.rawUsername || currentUser.id).trim().toLowerCase();
    const displayName = currentUser.username || targetUsername;

    // 1. Asegurar registro del usuario en 'users'
    await sbRequest(`users`, {
      method: 'POST',
      body: JSON.stringify({
        username: targetUsername,
        password: 'autoRegisteredPassword',
        full_name: displayName,
        role: currentUser.role || 'user'
      }),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    }).catch(() => {});

    // 2. Guardar predicción
    const predId = `${targetUsername}-${matchId}`;
    await sbRequest(`predictions`, {
      method: 'POST',
      body: JSON.stringify({
        id: predId,
        username: targetUsername,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore
      }),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    });

    return { 
      prediction: { id: predId, matchId, userId: targetUsername, homeScore, awayScore, createdAt: new Date().toISOString() } 
    };
  },

  getLeaderboard: async () => {
    const [users, matches, allPredictions] = await Promise.all([
      sbRequest<any[]>(`users?select=*`).catch(() => []),
      sbRequest<any[]>(`matches?select=*`).catch(() => []),
      sbRequest<any[]>(`predictions?select=*`).catch(() => [])
    ]);

    const safeUsers = Array.isArray(users) ? users : [];
    const safeMatches = Array.isArray(matches) ? matches : [];
    const safePredictions = Array.isArray(allPredictions) ? allPredictions : [];

    const leaderboard: LeaderboardRow[] = safeUsers
      .filter(u => u && u.username && u.username.toLowerCase() !== 'admin' && u.role !== 'admin')
      .map((u) => {
        let points = 0;
        const normalizedUsername = String(u.username).trim().toLowerCase();
        
        const userPredictions = safePredictions.filter(
          p => p && p.username && String(p.username).trim().toLowerCase() === normalizedUsername
        );

        userPredictions.forEach(p => {
          const match = safeMatches.find(m => m.id === p.match_id);
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
          userId: normalizedUsername,
          username: u.full_name || u.username,
          points,
          played: userPredictions.length,
        };
      });

    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((row, i) => row.rank = i + 1);
    return { leaderboard };
  },

  // ==========================================
  // ⚙️ FUNCIONES DE ADMINISTRACIÓN
  // ==========================================

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

  adminUpdateMatchKickoff: async (matchId: string, newKickoff: string) => {
    await sbRequest(`matches?id=eq.${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        kickoff: newKickoff
      }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return { success: true };
  },

  adminDeleteUser: async (usernameToDelete: string) => {
    const cleanUser = usernameToDelete.trim().toLowerCase();
    await sbRequest(`users?username=eq.${cleanUser}`, {
      method: 'DELETE'
    });
    return { success: true };
  }
};
