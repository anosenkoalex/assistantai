import { createHmac } from 'crypto';
import { logIntegrationError } from './ilog.js';

export async function postHook(url: string | undefined | null, payload: any) {
  if (!url) return;
  const body = JSON.stringify(payload);
  const secret = process.env.HOOK_SECRET || '';
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  if (secret) {
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    headers['X-Signature'] = `sha256=${sig}`;
  }
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(()=>ctrl.abort(), 5000);
      const r = await fetch(url, { method:'POST', headers, body, signal: ctrl.signal });
      clearTimeout(timer);
      if (r.ok) return;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (attempt === 2) {
        await logIntegrationError({ source:'HOOK', message:'post fail', meta:{ url, payload, err:String(e) } });
      }
    }
  }
}
