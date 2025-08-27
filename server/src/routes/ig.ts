import type { FastifyInstance } from 'fastify';

export async function registerIGRoutes(app: FastifyInstance) {
  // Верификация вебхука от Meta (GET)
  app.get('/api/ig/webhook', async (req, reply) => {
    const q = (req.query ?? {}) as Record<string, any>;
    const mode = q['hub.mode'] || q.hub_mode;
    const token = q['hub.verify_token'] || q.hub_verify_token;
    const challenge = q['hub.challenge'] || q.hub_challenge;

    if (mode === 'subscribe' && token === (process.env.META_VERIFY_TOKEN || '')) {
      return reply.code(200).send(challenge);
    }
    return reply.code(403).send('Forbidden');
  });

  // Заглушка обработчика событий (POST) — реализуем в IG-1.2
  app.post('/api/ig/webhook', async (_req, reply) => {
    return reply.code(200).send('ok');
  });

  // Ручная подписка на вебхук (выполняется один раз при настройке)
  app.post('/api/ig/subscribe', async (_req, reply) => {
    const pageId = process.env.FB_PAGE_ID || '';
    const token = process.env.PAGE_ACCESS_TOKEN || '';

    if (!pageId || !token) {
      return reply.code(400).send({ error: 'Missing FB_PAGE_ID or PAGE_ACCESS_TOKEN' });
    }

    const url = `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { method: 'POST' });
    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return reply.code(500).send({ error: 'subscribe failed', data });
    }
    return { ok: true, data };
  });
}
