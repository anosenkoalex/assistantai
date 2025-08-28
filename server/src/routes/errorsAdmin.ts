import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { requireRole } from '../mw/auth.js';

export async function registerErrorsAdminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done)=>requireRole('admin')(req, reply, done));

  app.get('/api/admin/errors', async (req) => {
    const { source, take='100', skip='0' } = (req.query || {}) as any;
    const where:any = {};
    if (source) where.source = source;
    const items = await prisma.integrationError.findMany({
      where, orderBy:{ createdAt:'desc' }, take:Number(take), skip:Number(skip)
    });
    const total = await prisma.integrationError.count({ where });
    return { items, total };
  });

  app.delete('/api/admin/errors', async () => {
    await prisma.integrationError.deleteMany({});
    return { ok:true };
  });
}
