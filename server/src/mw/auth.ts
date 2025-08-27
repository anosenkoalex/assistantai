import type { FastifyReply, FastifyRequest } from 'fastify';

export function requireAdmin(req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  const token = (req.headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.ADMIN_TOKEN || '';
  if (!expected || token === expected) return done();
  reply.code(401).send({ error: 'unauthorized' });
}
