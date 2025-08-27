import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { requireAdmin } from '../mw/auth.js';

export async function registerFlowRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done) => requireAdmin(req, reply, done));

  app.get('/api/flows', async () => prisma.flow.findMany({ orderBy: { updatedAt: 'desc' } }));
  app.post('/api/flows', async (req, reply) => {
    const { name, entry, nodes } = req.body as any;
    if (!name || !entry || !nodes) return reply.code(400).send({ error: 'name, entry, nodes required' });
    return prisma.flow.create({ data: { name, entry, nodes } });
  });
  app.put('/api/flows/:id', async (req, reply) => {
    const { id } = req.params as any;
    const { name, entry, nodes, active } = req.body as any;
    return prisma.flow.update({ where: { id }, data: { name, entry, nodes, active } });
  });
  app.delete('/api/flows/:id', async (req, reply) => {
    const { id } = req.params as any;
    await prisma.flow.delete({ where: { id } });
    return { ok: true };
  });

  app.get('/api/flows/:id/triggers', async (req, reply) => {
    const { id } = req.params as any;
    return prisma.flowTrigger.findMany({ where: { flowId: id }, orderBy: { createdAt: 'desc' } });
  });
  app.post('/api/flows/:id/triggers', async (req, reply) => {
    const { id } = req.params as any;
    const { kind, value } = req.body as any;
    if (!kind || !value) return reply.code(400).send({ error: 'kind and value required' });
    return prisma.flowTrigger.create({ data: { flowId: id, kind, value } });
  });
  app.put('/api/flow-triggers/:tid/toggle', async (req, reply) => {
    const { tid } = req.params as any;
    const trg = await prisma.flowTrigger.findUnique({ where: { id: tid } });
    if (!trg) return reply.code(404).send({ error: 'not found' });
    return prisma.flowTrigger.update({ where: { id: tid }, data: { active: !trg.active } });
  });
}
