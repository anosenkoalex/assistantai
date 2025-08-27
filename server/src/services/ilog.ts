import { prisma } from '../prisma.js';

export async function logIntegrationError(params: {
  source: string; code?: string; message?: string; meta?: any;
}) {
  try {
    await prisma.integrationError.create({
      data: {
        source: params.source,
        code: params.code || null,
        message: params.message?.slice(0, 1024) || null,
        meta: params.meta || undefined
      }
    });
  } catch (e) {
    // не роняем поток
    console.error('[ilog-fail]', e);
  }
}
