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
      isAdmin: role === 'admin'
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
          full_name: 'admin',
          role: 'admin'
        }),
        headers: { 'Prefer': 'resolution=merge-duplicates' }
      }).catch(() => {});

      const adminUser: AuthUser = { id: 'admin', username: 'admin', isAdmin: true };
      localStorage.setItem('pf_token', 'sb-token-admin');
      localStorage.setItem('pf_current_user', JSON.stringify({ ...adminUser, rawUsername: 'admin' }));
      return { token: 'sb-token-admin', user: adminUser };
    }

    // Búsqueda flexible e insensible a mayúsculas
    const res = await sbRequest<any[]>(`users?username=ilike.${encodeURIComponent(cleanUsername)}&select=*`);

    if (!res || res.length === 0) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const dbUser = res[0];

    if (String(dbUser.password).trim() !== String(password).trim()) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const displayName = dbUser.full_name && dbUser.full_name.trim() !== '' ? dbUser.full_name : dbUser.username;
    const isAdmin = dbUser.role === 'admin' || dbUser.username.toLowerCase() === 'admin';
    const user: AuthUser = { id: dbUser.username, username: displayName, isAdmin };

    localStorage.setItem('pf_token', `sb-token-${dbUser.username}`);
    localStorage.setItem('pf_current_user', JSON.stringify({ ...user, rawUsername: dbUser.username }));
    return { token: `sb-token-${dbUser.username}`, user };
  },

  getMatches: async () => {
    const matches = await sbRequest<any[]>(`matches?select=*&order=kickoff.asc`);
    const mapped: Match[] = (matches || []).map((m: any) => ({
      id: String(m.id),
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      kickoff: m.kickoff,
      status: m.status,
      isDeskWin: m.is_desk_win || false,
      createdAt: m.created_at || new Date().toISOString(),
      homeScore: (m.home_score !== null && m.home_score !== undefined) ? Number(m.home_score) : undefined,
      awayScore: (m.away_score !== null && m.away_score !== undefined) ? Number(m.away_score) : undefined
    }));
    return { matches: mapped };
  },

  getPredictions: async () => {
    const savedUser = localStorage.getItem('pf_current_user');
    if (!savedUser) return { predictions: [] };
    const currentUser = JSON.parse(savedUser);

    const targetUsername = String(currentUser.rawUsername || currentUser.id).trim().toLowerCase();

    // Trae las predicciones coincidiendo por el usuario actual
    const predictions = await sbRequest<any[]>(`predictions?select=*`);
    const userPreds = (predictions || []).filter(p => {
      if (!p || !p.username) return false;
      const u = String(p.username).trim().toLowerCase();
      return u === targetUsername || u === String(currentUser.username).trim().toLowerCase();
    });

    const mapped: Prediction[] = userPreds.map(p => ({
      id: p.id,
      matchId: String(p.match_id),
      userId: p.username,
      homeScore: Number(p.home_score),
      awayScore: Number(p.away_score),
      points: p.points ?? null,
      scored: p.scored ?? false,
      createdAt: p.created_at,
      updatedAt: p.updated_at || p.created_at
    }));
    return { predictions: mapped };
  },

  savePrediction: async (matchId: string, homeScore: number, awayScore: number) => {
    const savedUser = localStorage.getItem('pf_current_user');
    if (!savedUser) throw new Error('No autenticado');
    const currentUser = JSON.parse(savedUser);

    const targetUsername = String(currentUser.rawUsername || currentUser.id).trim().toLowerCase();

    const predId = `${targetUsername}-${matchId}`;
    await sbRequest(`predictions`, {
      method: 'POST',
      body: JSON.stringify({
        id: predId,
        username: targetUsername,
        match_id: matchId,
        home_score: Number(homeScore),
        away_score: Number(awayScore)
      }),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    });

    return { 
      prediction: { 
        id: predId, 
        matchId, 
        userId: targetUsername, 
        homeScore, 
        awayScore, 
        points: null,
        scored: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } 
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

    const leaderboard: (LeaderboardRow & { rawUsername?: string; played?: number })[] = safeUsers
      .filter(u => u && u.username && String(u.username).toLowerCase() !== 'admin' && u.role !== 'admin')
      .map((u) => {
        let points = 0;
        const normalizedUsername = String(u.username).trim().toLowerCase();
        const normalizedFullName = u.full_name ? String(u.full_name).trim().toLowerCase() : '';

        // Búsqueda cruzada por username O full_name para evitar descalces de ID
        const userPredictions = safePredictions.filter(p => {
          if (!p || !p.username) return false;
          const predUser = String(p.username).trim().toLowerCase();
          return predUser === normalizedUsername || (normalizedFullName !== '' && predUser === normalizedFullName);
        });

        userPredictions.forEach(p => {
          const match = safeMatches.find(m => String(m.id) === String(p.match_id));

          if (!match || match.status === 'cancelled' || match.status === 'suspended') {
            return;
          }

          if (match.status === 'finished' && match.home_score !== null && match.away_score !== null) {
            const actualHome = Number(match.home_score);
            const actualAway = Number(match.away_score);
            const predHome = Number(p.home_score);
            const predAway = Number(p.away_score);

            // 1. Marcador Exacto (+10 Pts)
            if (predHome === actualHome && predAway === actualAway) {
              points += 10;
            } else {
              let matchPoints = 0;

              // 2. Acertar Ganador o Empate (+7 Pts)
              const actualWinner = Math.sign(actualHome - actualAway);
              const predWinner = Math.sign(predHome - predAway);
              if (actualWinner === predWinner) {
                matchPoints += 7;
              }

              // 3. Goles de un Equipo (+4 Pts)
              if (predHome === actualHome || predAway === actualAway) {
                matchPoints += 4;
              }

              // 4. Diferencia de Goles (+2 Pts)
              const actualDiff = Math.abs(actualHome - actualAway);
              const predDiff = Math.abs(predHome - predAway);
              if (actualDiff === predDiff) {
                matchPoints += 2;
              }

              points += matchPoints;
            }
          }
        });

        const displayName = u.full_name && u.full_name.trim() !== '' ? u.full_name : u.username;

        return {
          userId: normalizedUsername,
          username: displayName,
          rawUsername: normalizedUsername,
          points,
          played: userPredictions.length,
        };
      });

    leaderboard.sort((a, b) => b.points - a.points);
    return { leaderboard };
  },

  // ==========================================
  // ⚙️ FUNCIONES DE ADMINISTRACIÓN CORREGIDAS
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

    return { 
      match: { 
        id: matchId, 
        homeTeam: data.homeTeam, 
        awayTeam: data.awayTeam, 
        kickoff: data.kickoff, 
        status: 'scheduled',
        createdAt: new Date().toISOString()
      } 
    };
  },

  adminSetResult: async (matchId: string, homeScore: number, awayScore: number) => {
    await sbRequest(`matches?id=eq.${encodeURIComponent(matchId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'finished',
        home_score: Number(homeScore),
        away_score: Number(awayScore),
        is_desk_win: false
      }),
      headers: { 'Prefer': 'return=representation' }
    });
    return { success: true };
  },

  adminSetDeskWinResult: async (matchId: string, homeScore: number, awayScore: number) => {
    await sbRequest(`matches?id=eq.${encodeURIComponent(matchId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'finished',
        home_score: Number(homeScore),
        away_score: Number(awayScore),
        is_desk_win: true
      }),
      headers: { 'Prefer': 'return=representation' }
    });
    return { success: true };
  },

  adminSuspendMatch: async (matchId: string) => {
    await sbRequest(`matches?id=eq.${encodeURIComponent(matchId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'suspended'
      }),
      headers: { 'Prefer': 'return=representation' }
    });
    return { success: true };
  },

  adminCancelMatch: async (matchId: string) => {
    await sbRequest(`matches?id=eq.${encodeURIComponent(matchId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'cancelled',
        home_score: null,
        away_score: null
      }),
      headers: { 'Prefer': 'return=representation' }
    });
    return { success: true };
  },

  adminUpdateMatchKickoff: async (matchId: string, newKickoff: string) => {
    await sbRequest(`matches?id=eq.${encodeURIComponent(matchId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        kickoff: newKickoff
      }),
      headers: { 'Prefer': 'return=representation' }
    });
    return { success: true };
  },

  adminDeleteUser: async (usernameToDelete: string) => {
    const cleanUser = usernameToDelete.trim().toLowerCase();
    await sbRequest(`users?username=eq.${encodeURIComponent(cleanUser)}`, {
      method: 'DELETE'
    });
    return { success: true };
  }
};
