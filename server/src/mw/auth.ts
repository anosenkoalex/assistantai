import type { FastifyReply, FastifyRequest } from 'fastify';

export function requireRole(role:'admin'|'operator') {
  return (req: FastifyRequest, reply: FastifyReply, done:(e?:Error)=>void)=>{
    const token = (req.headers['authorization']||'').toString().replace(/^Bearer\s+/i,'').trim();
    const expected = process.env.ADMIN_TOKEN||'';
    if (!expected) return done(); // dev fallback
    if (token !== expected) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    (req as any).user = { role: 'admin' };
    return done();
  };
}

export const requireAdmin = (req: FastifyRequest, reply: FastifyReply, done:(e?:Error)=>void) => requireRole('admin')(req, reply, done);
