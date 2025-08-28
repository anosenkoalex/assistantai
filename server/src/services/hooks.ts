import crypto from 'crypto';

export async function postHook(url: string | undefined, payload: any) {
  if (!url) return;
  const secret = process.env.HOOK_SECRET || '';
  const body = JSON.stringify(payload);
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig }, body });
  if (!r.ok) throw new Error(`hook ${url} ${r.status}`);
}
