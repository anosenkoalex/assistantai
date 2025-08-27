import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';

export async function registerIgRulesRoutes(app: FastifyInstance) {
  // список правил
  app.get('/api/ig/rules', async () => {
    return prisma.igRule.findMany({ orderBy: { createdAt: 'desc' } });
  });

  // создать правило
  app.post('/api/ig/rules', async (req, reply) => {
    const { keyword, reply: answer } = req.body as any;
    if (!keyword || !answer) return reply.code(400).send({ error: 'keyword and reply required' });
    const rule = await prisma.igRule.create({ data: { keyword, reply: answer } });
    return rule;
  });

  // выключить правило
  app.put('/api/ig/rules/:id/toggle', async (req, reply) => {
    const { id } = req.params as any;
    const rule = await prisma.igRule.update({
      where: { id },
      data: { active: { set: false } }
    });
    return rule;
  });
}
