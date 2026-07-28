export type AuthUser = {
  id: string;
  username: string;
  isAdmin: boolean;
};

// Ampliamos los estados posibles para el partido
export type MatchStatus = 'scheduled' | 'finished' | 'suspended' | 'cancelled';

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  isDeskWin?: boolean; // Opcional: marca si se resolvió por escritorio / W.O.
  createdAt: string;
};

export type Prediction = {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  scored: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LeaderboardRow = {
  userId: string;
  username: string;
  points: number;
};
