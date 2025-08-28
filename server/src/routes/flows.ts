import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { requireRole } from '../mw/auth.js';
import { jstr, jparse } from '../utils/json.js';

export async function registerFlowRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (req, reply, done) => requireRole('admin')(req, reply, done));

  app.get('/api/flows', async () => prisma.flow.findMany({ orderBy: { updatedAt: 'desc' } }));
  app.post('/api/flows', async (req, reply) => {
    const { name, entry, nodes } = req.body as any;
    if (!name || !entry || !nodes) return reply.code(400).send({ error: 'name, entry, nodes required' });
    const nodesStr = typeof nodes === 'string' ? nodes : JSON.stringify(nodes);
    return prisma.flow.create({ data: { name, entry, nodes: nodesStr, active: true } });
  });
  app.put('/api/flows/:id', async (req, reply) => {
    const { id } = req.params as any;
    const { name, entry, nodes, active } = req.body as any;
    const nodesStr = typeof nodes === 'string' ? nodes : JSON.stringify(nodes);
    return prisma.flow.update({ where: { id }, data: { name, entry, nodes: nodesStr, active } });
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
    const { kind, value, startAt, endAt, daysMask, meta } = req.body as any;
    if (!kind) return reply.code(400).send({ error: 'kind required' });
    return prisma.flowTrigger.create({
      data: {
        flowId: id,
        kind,
        value: value ?? '',
        startAt: startAt ? new Date(startAt) : undefined,
        endAt: endAt ? new Date(endAt) : undefined,
        daysMask: typeof daysMask === 'number' ? daysMask : undefined,
        meta: jstr(meta)
      }
    });
  });
  app.put('/api/flow-triggers/:tid', async (req, reply) => {
    const { tid } = req.params as any;
    const body = req.body as any;
    const data: any = {};
    for (const k of ['kind','value','startAt','endAt','daysMask','active','meta']) {
      if (k in body) data[k] = k === 'meta' ? jstr(body[k]) : body[k];
    }
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);
    return prisma.flowTrigger.update({ where: { id: tid }, data });
  });
  app.put('/api/flow-triggers/:tid/toggle', async (req, reply) => {
    const { tid } = req.params as any;
    const trg = await prisma.flowTrigger.findUnique({ where: { id: tid } });
    if (!trg) return reply.code(404).send({ error: 'not found' });
    return prisma.flowTrigger.update({ where: { id: tid }, data: { active: !trg.active } });
  });

  app.get('/api/flows/:id/export', async (req, reply) => {
    const { id } = req.params as any;
    const flow = await prisma.flow.findUnique({ where: { id } });
    if (!flow) return reply.code(404).send({ error: 'not found' });
    const triggers = await prisma.flowTrigger.findMany({ where: { flowId: id } });
    return { flow: { ...flow, nodes: jparse(flow?.nodes, {}) }, triggers: triggers.map(t => ({ ...t, meta: jparse(t.meta) })) };
  });

  app.get('/api/flows/:id/analytics', async (req) => {
    const { id } = req.params as any;
    const states = await prisma.flowState.findMany({ where:{ flowId: id }, select:{ threadId:true } });
    const threadIds = states.map(s=>s.threadId);
    if (!threadIds.length) return { items: [], total: 0 };
    const events = await prisma.igEvent.findMany({ where:{ threadId:{ in: threadIds }, type:'flow_node' } });
    const map = new Map<string, number>();
    for (const e of events) {
      const nodeId = (e.text||'').replace(/^node:/,'');
      map.set(nodeId, (map.get(nodeId)||0)+1);
    }
    const items = Array.from(map.entries()).map(([nodeId,count])=>({ nodeId, count })).sort((a,b)=>b.count-a.count);
    return { items, total: events.length };
  });

  app.post('/api/flows/import', async (req, reply) => {
    const { flow, triggers } = req.body as any;
    if (!flow || !flow.name || !flow.entry || !flow.nodes) {
      return reply.code(400).send({ error: 'invalid flow payload' });
    }
    const created = await prisma.flow.create({
      data: { name: flow.name, entry: flow.entry, nodes: JSON.stringify(flow.nodes), active: !!flow.active }
    });
    if (Array.isArray(triggers)) {
      for (const t of triggers) {
        await prisma.flowTrigger.create({
          data: {
            flowId: created.id,
            kind: t.kind, value: t.value ?? '',
            active: t.active ?? true,
            startAt: t.startAt ? new Date(t.startAt) : undefined,
            endAt: t.endAt ? new Date(t.endAt) : undefined,
            daysMask: typeof t.daysMask === 'number' ? t.daysMask : undefined,
            meta: jstr(t.meta)
          }
        });
      }
    }
    return { ok: true, id: created.id };
  });
}
