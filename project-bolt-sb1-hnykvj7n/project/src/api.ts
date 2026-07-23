import type { AuthUser, Match, Prediction, LeaderboardRow } from '@/types';

const BASE = '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('pf_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Error de red');
  }
  return data as T;
}

export const api = {
  register: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMatches: () => request<{ matches: Match[] }>('/matches'),

  getPredictions: () => request<{ predictions: Prediction[] }>('/predictions'),

  savePrediction: (matchId: string, homeScore: number, awayScore: number) =>
    request<{ prediction: Prediction }>('/predictions', {
      method: 'POST',
      body: JSON.stringify({ matchId, homeScore, awayScore }),
    }),

  getLeaderboard: () => request<{ leaderboard: LeaderboardRow[] }>('/leaderboard'),

  adminCreateMatch: (data: {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
  }) =>
    request<{ match: Match }>('/admin/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminSetResult: (matchId: string, homeScore: number, awayScore: number) =>
    request<{ match: Match; predictionsUpdated: number }>('/admin/results', {
      method: 'POST',
      body: JSON.stringify({ matchId, homeScore, awayScore }),
    }),
};
