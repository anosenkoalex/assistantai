import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { requireRole } from '../mw/auth.js';
import { canSend, markSent } from '../services/limits.js';
import { igOutMessages, igErrors } from '../metrics.js';

export async function registerIgAdminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done) => requireRole('operator')(req, reply, done));
  // Список контактов (с последним событием)
  app.get('/api/ig/contacts', async (req) => {
    const { q, status, take = '30', skip = '0' } = (req.query ?? {}) as any;
    const where:any = {};
    if (status) where.status = status;            // bot | manager | muted
    if (q) where.igUserId = { contains: q };      // примитивный поиск

    const [items, total] = await Promise.all([
      prisma.igContact.findMany({
        where, orderBy: { updatedAt: 'desc' },
        include: {
          tags: true,
          threads: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            include: {
              events: { orderBy: { at: 'desc' }, take: 1 }
            }
          }
        },
        take: Number(take), skip: Number(skip)
      }),
      prisma.igContact.count({ where })
    ]);

    return { items, total };
  });

  // Треды контакта
  app.get('/api/ig/threads', async (req, reply) => {
    const { contactId } = (req.query ?? {}) as any;
    if (!contactId) return reply.code(400).send({ error: 'contactId required' });
    const threads = await prisma.igThread.findMany({
      where: { contactId }, orderBy: { updatedAt: 'desc' }
    });
    return { items: threads };
  });

  // События треда (журнал)
  app.get('/api/ig/events', async (req, reply) => {
    const { threadId, take = '100', skip = '0' } = (req.query ?? {}) as any;
    if (!threadId) return reply.code(400).send({ error: 'threadId required' });
    const events = await prisma.igEvent.findMany({
      where: { threadId }, orderBy: { at: 'asc' },
      take: Number(take), skip: Number(skip)
    });
    return { items: events };
  });

  // Смена статуса контакта (bot | manager | muted)
  app.put('/api/ig/contacts/:id/status', async (req, reply) => {
    const { id } = req.params as any;
    const { status } = req.body as any;
    if (!['bot','manager','muted'].includes(status)) {
      return reply.code(400).send({ error: 'invalid status' });
    }
    const updated = await prisma.igContact.update({
      where: { id }, data: { status }
    });
    return updated;
  });

  app.post('/api/ig/contacts/:id/tags', async (req, reply) => {
    const { id } = req.params as any;
    const { tag } = req.body as any;
    if (!tag) return reply.code(400).send({ error: 'tag required' });
    await prisma.igContactTag.create({ data:{ contactId: id, tag } });
    return { ok: true };
  });

  app.delete('/api/ig/contacts/:id/tags', async (req, reply) => {
    const { id } = req.params as any;
    const { tag } = req.body as any;
    if (!tag) return reply.code(400).send({ error: 'tag required' });
    await prisma.igContactTag.deleteMany({ where:{ contactId: id, tag } });
    return { ok: true };
  });

  // Статистика нажатий Quick Replies (по text)
  app.get('/api/ig/stats/quick', async (req) => {
    const { from, to } = (req.query ?? {}) as any;
    const where: any = { type: 'quick' };
    if (from || to) where.at = {};
    if (from) where.at.gte = new Date(from);
    if (to) where.at.lte = new Date(to);

    // Берём все quick-события и агрегируем в памяти
    const events = await prisma.igEvent.findMany({ where, select: { text: true } });
    const map = new Map<string, number>();
    for (const e of events) {
      const k = (e.text || '').trim() || '(empty)';
      map.set(k, (map.get(k) || 0) + 1);
    }
    const items = Array.from(map.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a,b) => b.count - a.count);

    return { items, total: events.length };
  });

  // Ручная отправка сообщения контакту (от имени страницы)
  app.post('/api/ig/send', async (req, reply) => {
    const { contactId, text, quick } = (req.body ?? {}) as {
      contactId?: string;
      text?: string;
      quick?: string[];
    };
    if (!contactId || !text) return reply.code(400).send({ error: 'contactId and text required' });

    const contact = await prisma.igContact.findUnique({ where: { id: contactId } });
    if (!contact) return reply.code(404).send({ error: 'contact not found' });

    // найти/создать активный тред
    let thread = await prisma.igThread.findFirst({
      where: { contactId, state: 'active' },
      orderBy: { updatedAt: 'desc' },
    });
    if (!thread) thread = await prisma.igThread.create({ data: { contactId } });

    // отправить
    if (!(await canSend(contact.id))) return reply.code(429).send({ error: 'rate_limited' });
    try {
      await sendIGText(contact.igUserId, text, Array.isArray(quick) ? quick : undefined);
      igOutMessages.inc();
    } catch {
      igErrors.inc();
      throw;
    }
    await markSent(contact.id);

    // залогировать
    await prisma.igEvent.create({
      data: { threadId: thread.id, direction: 'out', type: 'text', text },
    });

    // при ручном ответе логично перевести контакт в режим manager (бот молчит)
    await prisma.igContact.update({
      where: { id: contactId },
      data: { status: 'manager' },
    });

    return { ok: true };
  });

  // Статистика по срабатываниям правил (по IgEvent.type='rule')
  app.get('/api/ig/stats/rules', async (req) => {
    const { from, to } = (req.query ?? {}) as any;
    const where: any = { type: 'rule' };
    if (from || to) where.at = {};
    if (from) where.at.gte = new Date(from);
    if (to) where.at.lte = new Date(to);

    const events = await prisma.igEvent.findMany({ where, select: { payload: true } });
    const map = new Map<string, number>();
    for (const e of events) {
      const id = (e.payload as any)?.ruleId || '(unknown)';
      map.set(id, (map.get(id) || 0) + 1);
    }

    // подтянем названия/keywords
    const ids = Array.from(map.keys()).filter(x => x !== '(unknown)');
    const rules = await prisma.igRule.findMany({ where: { id: { in: ids } } });
    const info = new Map(rules.map(r => [r.id, { keyword: r.keyword }]));

    const items = Array.from(map.entries())
      .map(([ruleId, count]) => ({ ruleId, count, keyword: info.get(ruleId)?.keyword || '' }))
      .sort((a,b) => b.count - a.count);

    return { items, total: events.length };
  });
}

// локальная утилита (скопируй реализацию, как в routes/ig.ts)
async function sendIGText(userPSID: string, text: string, quickReplies?: string[]) {
  const token = process.env.PAGE_ACCESS_TOKEN || '';
  if (!token) throw new Error('PAGE_ACCESS_TOKEN is not set');

  const payload: any = { recipient: { id: userPSID }, message: { text } };
  if (Array.isArray(quickReplies) && quickReplies.length) {
    payload.message.quick_replies = quickReplies.slice(0, 11).map((title) => ({
      content_type: 'text',
      title: String(title).slice(0, 20),
      payload: `QR:${title}`,
    }));
  }

  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => '');
    throw new Error(`IG send error ${r.status}: ${err}`);
  }
}

