import type { AuthUser, Match, Prediction, LeaderboardRow } from '@/types';

// Claves para LocalStorage
const KEYS = {
  USERS: 'pf_users',
  CURRENT_USER: 'pf_current_user',
  TOKEN: 'pf_token',
  MATCHES: 'pf_matches',
  PREDICTIONS: 'pf_predictions',
};

// --- AYUDANTES DE PERSISTENCIA ---
function getStorage<T>(key: string, fallback: T): T {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function setStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// --- DATOS SEMILLA (FECHA 1 LIGA BETPLAY 2026-II) ---
const INITIAL_MATCHES: Match[] = [
  { id: 'm1', homeTeam: 'Llaneros', awayTeam: 'Deportivo Pereira', kickoff: '2026-07-24T16:00:00Z', status: 'scheduled' },
  { id: 'm2', homeTeam: 'Deportivo Cali', awayTeam: 'Jaguares FC', kickoff: '2026-07-24T18:15:00Z', status: 'scheduled' },
  { id: 'm3', homeTeam: 'Millonarios FC', awayTeam: 'Atlético Bucaramanga', kickoff: '2026-07-25T14:00:00Z', status: 'scheduled' },
  { id: 'm4', homeTeam: 'Independiente Medellín', awayTeam: 'Deportivo Pasto', kickoff: '2026-07-25T16:15:00Z', status: 'scheduled' }
];

// Inicializar partidos si no existen
if (!localStorage.getItem(KEYS.MATCHES)) {
  setStorage(KEYS.MATCHES, INITIAL_MATCHES);
}

export const api = {
  register: async (username: string, password: string) => {
    const users = getStorage<Record<string, string>>(KEYS.USERS, {});
    if (users[username]) throw new Error('El usuario ya existe');
    
    users[username] = password;
    setStorage(KEYS.USERS, users);

    const user: AuthUser = { id: username, username, role: username === 'admin' ? 'admin' : 'user' };
    setStorage(KEYS.CURRENT_USER, user);
    localStorage.setItem(KEYS.TOKEN, `mock-token-${username}`);

    return { token: `mock-token-${username}`, user };
  },

  login: async (username: string, password: string) => {
    const users = getStorage<Record<string, string>>(KEYS.USERS, { admin: 'admin123' });
    if (!users[username] || users[username] !== password) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const user: AuthUser = { id: username, username, role: username === 'admin' ? 'admin' : 'user' };
    setStorage(KEYS.CURRENT_USER, user);
    localStorage.setItem(KEYS.TOKEN, `mock-token-${username}`);

    return { token: `mock-token-${username}`, user };
  },

  getMatches: async () => {
    const matches = getStorage<Match[]>(KEYS.MATCHES, []);
    return { matches };
  },

  getPredictions: async () => {
    const currentUser = getStorage<AuthUser | null>(KEYS.CURRENT_USER, null);
    if (!currentUser) throw new Error('No autenticado');

    const allPredictions = getStorage<Prediction[]>(KEYS.PREDICTIONS, []);
    const predictions = allPredictions.filter(p => p.userId === currentUser.id);
    return { predictions };
  },

  savePrediction: async (matchId: string, homeScore: number, awayScore: number) => {
    const currentUser = getStorage<AuthUser | null>(KEYS.CURRENT_USER, null);
    if (!currentUser) throw new Error('No autenticado');

    const predictions = getStorage<Prediction[]>(KEYS.PREDICTIONS, []);
    const existingIndex = predictions.findIndex(p => p.matchId === matchId && p.userId === currentUser.id);

    const newPrediction: Prediction = {
      id: `${currentUser.id}-${matchId}`,
      matchId,
      userId: currentUser.id,
      homeScore,
      awayScore,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) predictions[existingIndex] = newPrediction;
    else predictions.push(newPrediction);

    setStorage(KEYS.PREDICTIONS, predictions);
    return { prediction: newPrediction };
  },

  getLeaderboard: async () => {
    const users = getStorage<Record<string, string>>(KEYS.USERS, {});
    const matches = getStorage<Match[]>(KEYS.MATCHES, []);
    const predictions = getStorage<Prediction[]>(KEYS.PREDICTIONS, []);

    const leaderboard: LeaderboardRow[] = Object.keys(users)
      .filter(username => username !== 'admin')
      .map((username, index) => {
        let points = 0;
        const userPredictions = predictions.filter(p => p.userId === username);

        userPredictions.forEach(p => {
          const match = matches.find(m => m.id === p.matchId);
          if (match && match.status === 'finished' && match.homeScore !== undefined && match.awayScore !== undefined) {
            const actualHome = match.homeScore;
            const actualAway = match.awayScore;

            // 3 Puntos: Marcador Exacto
            if (p.homeScore === actualHome && p.awayScore === actualAway) {
              points += 3;
            } 
            // 1 Punto: Ganador o Empate
            else if (
              (p.homeScore > p.awayScore && actualHome > actualAway) ||
              (p.homeScore < p.awayScore && actualHome < actualAway) ||
              (p.homeScore === p.awayScore && actualHome === actualAway)
            ) {
              points += 1;
            }
          }
        });

        return {
          rank: 0,
          userId: username,
          username,
          points,
          played: userPredictions.length,
        };
      });

    // Ordenar de mayor a menor puntaje
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((row, i) => row.rank = i + 1);

    return { leaderboard };
  },

  adminCreateMatch: async (data: { homeTeam: string; awayTeam: string; kickoff: string }) => {
    const matches = getStorage<Match[]>(KEYS.MATCHES, []);
    const newMatch: Match = {
      id: `m-${Date.now()}`,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      kickoff: data.kickoff,
      status: 'scheduled',
    };
    matches.push(newMatch);
    setStorage(KEYS.MATCHES, matches);
    return { match: newMatch };
  },

  adminSetResult: async (matchId: string, homeScore: number, awayScore: number) => {
    const matches = getStorage<Match[]>(KEYS.MATCHES, []);
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error('Partido no encontrado');

    matches[matchIndex].status = 'finished';
    matches[matchIndex].homeScore = homeScore;
    matches[matchIndex].awayScore = awayScore;
    setStorage(KEYS.MATCHES, matches);

    const predictions = getStorage<Prediction[]>(KEYS.PREDICTIONS, []);
    const updatedCount = predictions.filter(p => p.matchId === matchId).length;

    return { match: matches[matchIndex], predictionsUpdated: updatedCount };
  },
    adminDeleteUser: async (usernameToDelete: string) => {
    // 1. Cargar la lista completa de usuarios
    const users = getStorage<Record<string, string>>(KEYS.USERS, {});
    
    // 2. Si existe el usuario, eliminarlo del objeto
    if (users[usernameToDelete]) {
      delete users[usernameToDelete];
      setStorage(KEYS.USERS, users);
    }

    // 3. Limpiar las predicciones de ese usuario para liberar espacio
    const allPredictions = getStorage<Prediction[]>(KEYS.PREDICTIONS, []);
    const filteredPredictions = allPredictions.filter(p => p.userId !== usernameToDelete);
    setStorage(KEYS.PREDICTIONS, filteredPredictions);

    return { success: true };
  }

};
