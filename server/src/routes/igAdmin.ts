import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';

export async function registerIgAdminRoutes(app: FastifyInstance) {
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
}

