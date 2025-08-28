import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { requireRole } from '../mw/auth.js';
import { startFlow, tickFlow } from '../services/flowEngine.js';

export async function registerFlowBatchRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done)=>requireRole('admin')(req, reply, done));

  let lastRunAt = 0;
  // Запуск flow по сегменту: status? (bot|manager|muted), activeSince? (ISO)
  app.post('/api/flows/:id/run', async (req, reply) => {
    if (Date.now() - lastRunAt < 10_000) return reply.code(429).send({ error:'too_many_requests' });
    lastRunAt = Date.now();
    const { id } = req.params as any;
    const { status, activeSince, limit = 200 } = (req.body ?? {}) as any;
    const cap = Number(process.env.BATCH_HARD_CAP || 500);
    if (Number(limit) > cap) return reply.code(400).send({ error: 'limit too high' });

    const where:any = {};
    if (status) where.status = status;
    // ищем контакты, где последний апдейт позже activeSince
    const since = activeSince ? new Date(activeSince) : null;

    const contacts = await prisma.igContact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: Number(limit)
    });

    let started = 0;
    for (const c of contacts) {
      // найдём/создадим тред
      let thread = await prisma.igThread.findFirst({ where: { contactId: c.id, state: 'active' }, orderBy: { updatedAt: 'desc' } });
      if (!thread) thread = await prisma.igThread.create({ data: { contactId: c.id } });

      if (since) {
        const lastEv = await prisma.igEvent.findFirst({ where: { threadId: thread.id }, orderBy: { at: 'desc' } });
        if (!lastEv || lastEv.at < since) continue;
      }

      const st = await startFlow({ contactId: c.id, threadId: thread.id, flowId: id });
      await tickFlow(st.id);
      started++;
    }

    return { ok: true, started, total: contacts.length };
  });
}
