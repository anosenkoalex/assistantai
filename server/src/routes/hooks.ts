import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../mw/auth.js';

export async function registerHooksRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done)=>requireAdmin(req, reply, done));

  app.post('/hooks/test', async (req) => {
    app.log.info(req.body, 'hook.test');
    return { ok: true };
  });
}
