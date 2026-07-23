import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export type AuthPayload = {
  id: string;
  username: string;
  isAdmin: boolean;
};

declare module 'fastify' {
  interface FastifyInstance {
    verifyAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: AuthPayload | null;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('verifyAuth', async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      req.user = null;
      return reply.code(401).send({ error: 'No autenticado' });
    }
    try {
      const decoded = decodeToken(token);
      const userRecord = app.store.users.get(decoded.id);
      if (!userRecord) {
        return reply.code(401).send({ error: 'Token inválido' });
      }
      req.user = {
        id: userRecord.id,
        username: userRecord.username,
        isAdmin: userRecord.isAdmin,
      };
    } catch {
      return reply.code(401).send({ error: 'Token inválido' });
    }
  });

  app.decorate('verifyAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    await app.verifyAuth(req, reply);
    if (reply.sent) return;
    if (!req.user?.isAdmin) {
      return reply.code(403).send({ error: 'Acceso denegado' });
    }
  });
});

// Simple base64 token (demo only — not secure).
export function makeToken(payload: AuthPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf-8').toString('base64');
}

export function decodeToken(token: string): AuthPayload {
  const json = Buffer.from(token, 'base64').toString('utf-8');
  return JSON.parse(json) as AuthPayload;
}
