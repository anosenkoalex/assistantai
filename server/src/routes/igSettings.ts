import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { requireAdmin } from '../mw/auth.js';

export async function registerIgSettingsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done) => requireAdmin(req, reply, done));
  app.get('/api/ig/settings', async () => {
    const s = await prisma.igSetting.findUnique({ where: { id: 1 } });
    if (!s) {
      // лениво инициализируем
      return prisma.igSetting.create({ data: {} });
    }
    return s;
  });

  app.put('/api/ig/settings', async (req, reply) => {
    const body = (req.body ?? {}) as {
      tz?: string; quietStart?: string; quietEnd?: string; quickReplies?: string[] | null;
    };

    const data: any = {};
    if (typeof body.tz === 'string' && body.tz.length > 0) data.tz = body.tz;
    if (typeof body.quietStart === 'string') data.quietStart = body.quietStart;
    if (typeof body.quietEnd === 'string') data.quietEnd = body.quietEnd;
    if (Array.isArray(body.quickReplies)) data.quickReplies = JSON.stringify(body.quickReplies);
    if (body.quickReplies === null) data.quickReplies = null;

    const updated = await prisma.igSetting.upsert({
      where: { id: 1 },
      update: data,
      create: data
    });
    return updated;
  });
}
