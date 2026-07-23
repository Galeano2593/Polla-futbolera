import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createStore, seedStore, hashPassword, genId } from './store.js';
import { scorePrediction } from './scoring.js';
import authPlugin, { makeToken } from './auth.js';
import type { Match, Prediction } from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

const PORT = 4000;

const app = Fastify({
  logger: { level: 'info' },
});

await app.register(cors, { origin: true, credentials: true });
await app.register(authPlugin);

app.decorate('store', createStore());
seedStore(app);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

app.post('/api/auth/register', {
  schema: {
    body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 20 },
        password: { type: 'string', minLength: 6, maxLength: 100 },
      },
    },
  },
}, async (req, reply) => {
  const { username, password } = req.body as { username: string; password: string };
  const cleanUsername = username.trim();
  if (app.store.usersByUsername.has(cleanUsername)) {
    return reply.code(409).send({ error: 'El nombre de usuario ya existe' });
  }
  const id = genId('user');
  const user = {
    id,
    username: cleanUsername,
    passwordHash: hashPassword(password),
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  app.store.users.set(id, user);
  app.store.usersByUsername.set(cleanUsername, id);
  return reply.send({
    token: makeToken({ id, username: cleanUsername, isAdmin: false }),
    user: { id, username: cleanUsername, isAdmin: false },
  });
});

app.post('/api/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
    },
  },
}, async (req, reply) => {
  const { username, password } = req.body as { username: string; password: string };
  const id = app.store.usersByUsername.get(username.trim());
  if (!id) return reply.code(401).send({ error: 'Credenciales inválidas' });
  const user = app.store.users.get(id)!;
  if (user.passwordHash !== hashPassword(password)) {
    return reply.code(401).send({ error: 'Credenciales inválidas' });
  }
  return reply.send({
    token: makeToken({ id: user.id, username: user.username, isAdmin: user.isAdmin }),
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
  });
});

// ---------------------------------------------------------------------------
// Matches (public read)
// ---------------------------------------------------------------------------

app.get('/api/matches', async () => {
  const matches = Array.from(app.store.matches.values()).sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );
  return { matches };
});

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------

app.get('/api/predictions', {
  preHandler: app.verifyAuth,
}, async (req) => {
  const userId = req.user!.id;
  const preds = Array.from(app.store.predictions.values()).filter(
    (p) => p.userId === userId,
  );
  return { predictions: preds };
});

app.post('/api/predictions', {
  preHandler: app.verifyAuth,
  schema: {
    body: {
      type: 'object',
      required: ['matchId', 'homeScore', 'awayScore'],
      properties: {
        matchId: { type: 'string' },
        homeScore: { type: 'integer', minimum: 0, maximum: 30 },
        awayScore: { type: 'integer', minimum: 0, maximum: 30 },
      },
    },
  },
}, async (req, reply) => {
  const userId = req.user!.id;
  const { matchId, homeScore, awayScore } = req.body as {
    matchId: string;
    homeScore: number;
    awayScore: number;
  };

  const match = app.store.matches.get(matchId);
  if (!match) return reply.code(404).send({ error: 'Partido no encontrado' });

  if (new Date(match.kickoff).getTime() <= Date.now()) {
    return reply.code(403).send({ error: 'El partido ya comenzó' });
  }

  const key = `${userId}:${matchId}`;
  const now = new Date().toISOString();
  const existingId = app.store.predictionsByUserMatch.get(key);
  if (existingId) {
    const existing = app.store.predictions.get(existingId)!;
    existing.homeScore = homeScore;
    existing.awayScore = awayScore;
    existing.updatedAt = now;
    return reply.send({ prediction: existing });
  }

  const pred: Prediction = {
    id: genId('pred'),
    userId,
    matchId,
    homeScore,
    awayScore,
    points: null,
    scored: false,
    createdAt: now,
    updatedAt: now,
  };
  app.store.predictions.set(pred.id, pred);
  app.store.predictionsByUserMatch.set(key, pred.id);
  return reply.code(201).send({ prediction: pred });
});

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

app.get('/api/leaderboard', async () => {
  const byUser = new Map<string, number>();
  for (const p of app.store.predictions.values()) {
    if (p.scored && p.points !== null) {
      byUser.set(p.userId, (byUser.get(p.userId) ?? 0) + p.points);
    }
  }
  const rows = Array.from(byUser.entries()).map(([userId, points]) => {
    const u = app.store.users.get(userId);
    return {
      userId,
      username: u?.username ?? 'Desconocido',
      points,
    };
  });
  rows.sort((a, b) => b.points - a.points);
  return { leaderboard: rows };
});

// ---------------------------------------------------------------------------
// Admin: matches
// ---------------------------------------------------------------------------

app.post('/api/admin/matches', {
  preHandler: app.verifyAdmin,
  schema: {
    body: {
      type: 'object',
      required: ['homeTeam', 'awayTeam', 'kickoff'],
      properties: {
        id: { type: 'string' },
        homeTeam: { type: 'string', minLength: 1, maxLength: 50 },
        awayTeam: { type: 'string', minLength: 1, maxLength: 50 },
        kickoff: { type: 'string', format: 'date-time' },
      },
    },
  },
}, async (req, reply) => {
  const { id, homeTeam, awayTeam, kickoff } = req.body as {
    id?: string;
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
  };

  if (id) {
    const existing = app.store.matches.get(id);
    if (!existing) return reply.code(404).send({ error: 'Partido no encontrado' });
    existing.homeTeam = homeTeam;
    existing.awayTeam = awayTeam;
    existing.kickoff = kickoff;
    return reply.send({ match: existing });
  }

  const match: Match = {
    id: genId('match'),
    homeTeam,
    awayTeam,
    kickoff,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };
  app.store.matches.set(match.id, match);
  return reply.code(201).send({ match });
});

// ---------------------------------------------------------------------------
// Admin: results -> triggers scoring
// ---------------------------------------------------------------------------

app.post('/api/admin/results', {
  preHandler: app.verifyAdmin,
  schema: {
    body: {
      type: 'object',
      required: ['matchId', 'homeScore', 'awayScore'],
      properties: {
        matchId: { type: 'string' },
        homeScore: { type: 'integer', minimum: 0, maximum: 99 },
        awayScore: { type: 'integer', minimum: 0, maximum: 99 },
      },
    },
  },
}, async (req, reply) => {
  const { matchId, homeScore, awayScore } = req.body as {
    matchId: string;
    homeScore: number;
    awayScore: number;
  };
  const match = app.store.matches.get(matchId);
  if (!match) return reply.code(404).send({ error: 'Partido no encontrado' });

  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.status = 'finished';

  let updated = 0;
  for (const pred of app.store.predictions.values()) {
    if (pred.matchId !== matchId) continue;
    pred.points = scorePrediction(
      { home: pred.homeScore, away: pred.awayScore },
      { home: homeScore, away: awayScore },
    );
    pred.scored = true;
    pred.updatedAt = new Date().toISOString();
    updated++;
  }

  return reply.send({ match, predictionsUpdated: updated });
});

// ---------------------------------------------------------------------------
// Static file serving (serve built React frontend at root)
// ---------------------------------------------------------------------------

if (existsSync(distDir)) {
  await app.register(fastifyStatic, {
    root: distDir,
    prefix: '/assets/',
    decorateReply: false,
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api')) {
      return reply.code(404).send({ error: 'Ruta no encontrada' });
    }
    return reply.type('text/html').send(readFileSync(join(distDir, 'index.html'), 'utf-8'));
  });

  app.get('/', async (_req, reply) => {
    return reply.type('text/html').send(readFileSync(join(distDir, 'index.html'), 'utf-8'));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`Fastify server running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
