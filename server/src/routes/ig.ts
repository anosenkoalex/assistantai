import type { FastifyInstance } from 'fastify';

type IGMessaging = {
  sender?: { id?: string };      // IG user PSID
  recipient?: { id?: string };   // Page ID
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: any[];
  };
  postback?: { payload?: string; title?: string };
  referral?: any;
};

export async function registerIGRoutes(app: FastifyInstance) {
  // GET: верификация вебхука (оставь как было)
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

  // POST: основной приём событий (Instagram Messaging)
  app.post('/api/ig/webhook', async (req, reply) => {
    const body = req.body as any;

    try {
      // Meta присылает object: 'instagram' (или 'page') с entry[].changes[].value.messages[]
      if (body?.object === 'instagram' || body?.object === 'page') {
        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const value = change.value || {};
            const messages: IGMessaging[] = value.messaging || value.messages || [];

            for (const m of messages) {
              const userId = m.sender?.id;
              const pageId = m.recipient?.id;
              const text = m.message?.text?.trim();

              app.log.info({ userId, pageId, text }, 'IG inbound');

              // Временный «движок»: эхо-ответ для проверки пайплайна
              if (userId && text) {
                await sendIGText(userId, `Получил: "${text}"`);
              }
            }
          }
        }
      }
    } catch (e: any) {
      app.log.error(e, 'IG webhook error');
    }

    // Важно отвечать 200 быстро, иначе Meta ретраит
    return reply.code(200).send('ok');
  });
}

// Отправка текста пользователю через Page Access Token
async function sendIGText(userPSID: string, text: string) {
  const token = process.env.PAGE_ACCESS_TOKEN || '';
  if (!token) throw new Error('PAGE_ACCESS_TOKEN is not set');

  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: userPSID },
      message: { text }
    })
  });

  if (!r.ok) {
    const err = await r.text().catch(() => '');
    throw new Error(`IG send error ${r.status}: ${err}`);
  }
}
