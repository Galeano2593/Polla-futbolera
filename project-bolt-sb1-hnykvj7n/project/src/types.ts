export type AuthUser = {
  id: string;
  username: string;
  isAdmin: boolean;
};

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'finished';
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
