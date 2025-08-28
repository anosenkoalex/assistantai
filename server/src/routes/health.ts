import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/healthz', async (_req, reply) => {
    // DB ping
    let dbOk = true;
    try { await prisma.$queryRaw`SELECT 1`; } catch { dbOk = false; }

    // OpenAI key presence (без сетевых запросов)
    const hasOpenAI = !!(process.env.OPENAI_API_KEY || await maybeGetKey());
    // IG token presence
    const hasIG = !!process.env.PAGE_ACCESS_TOKEN;

    const ok = dbOk && hasOpenAI && hasIG;
    return reply.code(ok ? 200 : 503).send({
      ok, dbOk, hasOpenAI, hasIG,
      time: new Date().toISOString()
    });
  });
}

async function maybeGetKey() {
  try {
    // если у тебя есть функция чтения ключа из БД — используй её
    const { getApiKeyFromDB } = await import('../routes/settings.js');
    return await getApiKeyFromDB();
  } catch { return ''; }
}
