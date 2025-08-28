import { prisma } from '../prisma.js';
import { jstr } from '../utils/json.js';

function redact(s: any) {
  let t = typeof s === 'string' ? s : jstr(s) || '';
  t = t.replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '***@***');
  t = t.replace(/\b\+?\d{9,15}\b/g, '***masked***');
  t = t.replace(/(access_token|authorization|api[-_ ]?key)["']?\s*:\s*["'][^"']+/gi, '$1:"***"');
  return t.slice(0, 10_000); // 10KB cap
}

export async function logIntegrationError(p:{source:string;code?:string;message?:string;meta?:any}) {
  try {
    await prisma.integrationError.create({
      data: { source: p.source, code: p.code || null, message: (p.message ?? '').slice(0,1024), meta: redact(p.meta) }
    });
  } catch(e){ console.error('[ilog-fail]', e); }
}
