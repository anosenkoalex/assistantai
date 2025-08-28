import type { FastifyInstance } from 'fastify';
import { requireRole } from '../mw/auth.js';

export async function registerAdminTestRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done)=>requireRole('admin')(req, reply, done));

  app.post('/api/admin/test/ig-send', async (req, reply) => {
    const { userId, text } = req.body as any;
    if (!userId || !text) return reply.code(400).send({ error: 'userId and text required' });
    await sendIGText(String(userId), String(text));
    return { ok: true };
  });
}

async function sendIGText(userPSID: string, text: string) {
  const token = process.env.PAGE_ACCESS_TOKEN || '';
  if (!token) throw new Error('PAGE_ACCESS_TOKEN is not set');
  const payload: any = { recipient: { id: userPSID }, message: { text } };
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
