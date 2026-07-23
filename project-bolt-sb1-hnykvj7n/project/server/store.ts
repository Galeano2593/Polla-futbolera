import type { FastifyInstance } from 'fastify';

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string;
};

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // ISO timestamp
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

type Store = {
  users: Map<string, User>;
  usersByUsername: Map<string, string>;
  matches: Map<string, Match>;
  predictions: Map<string, Prediction>;
  predictionsByUserMatch: Map<string, string>;
};

declare module 'fastify' {
  interface FastifyInstance {
    store: Store;
  }
}

export function createStore(): Store {
  return {
    users: new Map(),
    usersByUsername: new Map(),
    matches: new Map(),
    predictions: new Map(),
    predictionsByUserMatch: new Map(),
  };
}

export function seedStore(app: FastifyInstance) {
  const store = app.store;

  const adminId = 'admin-0001';
  store.users.set(adminId, {
    id: adminId,
    username: 'admin',
    passwordHash: hashPassword('admin123'),
    isAdmin: true,
    createdAt: new Date().toISOString(),
  });
  store.usersByUsername.set('admin', adminId);

  const demoId = 'user-0001';
  store.users.set(demoId, {
    id: demoId,
    username: 'demo',
    passwordHash: hashPassword('demo123'),
    isAdmin: false,
    createdAt: new Date().toISOString(),
  });
  store.usersByUsername.set('demo', demoId);

  const matches: Match[] = [
    {
      id: 'match-0001',
      homeTeam: 'Llaneros',
      awayTeam: 'Deportivo Pereira',
      kickoff: '2026-07-24T23:10:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0002',
      homeTeam: 'Deportivo Cali',
      awayTeam: 'Jaguares',
      kickoff: '2026-07-25T01:15:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0003',
      homeTeam: 'Boyacá Chicó',
      awayTeam: 'Atlético Nacional',
      kickoff: '2026-07-25T19:00:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0004',
      homeTeam: 'Independiente Medellín',
      awayTeam: 'Deportivo Pasto',
      kickoff: '2026-07-25T21:05:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0005',
      homeTeam: 'Millonarios',
      awayTeam: 'Atlético Bucaramanga',
      kickoff: '2026-07-25T23:10:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0006',
      homeTeam: 'Deportes Tolima',
      awayTeam: 'Junior',
      kickoff: '2026-07-26T01:15:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0007',
      homeTeam: 'Internacional de Bogotá',
      awayTeam: 'América de Cali',
      kickoff: '2026-07-26T19:00:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0008',
      homeTeam: 'Águilas Doradas',
      awayTeam: 'Independiente Santa Fe',
      kickoff: '2026-07-26T21:05:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0009',
      homeTeam: 'Alianza',
      awayTeam: 'Fortaleza',
      kickoff: '2026-07-26T23:10:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'match-0010',
      homeTeam: 'Once Caldas',
      awayTeam: 'Cúcuta Deportivo',
      kickoff: '2026-07-27T01:15:00.000Z',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const m of matches) store.matches.set(m.id, m);

  const demoPreds: Prediction[] = [
    {
      id: 'pred-0001',
      userId: demoId,
      matchId: 'match-0005',
      homeScore: 2,
      awayScore: 1,
      points: null,
      scored: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  for (const p of demoPreds) {
    store.predictions.set(p.id, p);
    store.predictionsByUserMatch.set(`${p.userId}:${p.matchId}`, p.id);
  }
}

// Simple deterministic hash (NOT cryptographically secure — demo only).
export function hashPassword(pw: string): string {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) + h) ^ pw.charCodeAt(i);
  }
  return `h${(h >>> 0).toString(16)}`;
}

export function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
