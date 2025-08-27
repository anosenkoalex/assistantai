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
}
