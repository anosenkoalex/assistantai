import { prisma } from '../prisma.js';
import { logIntegrationError } from '../services/ilog.js';
import { askOpenAI, buildThreadMessages } from '../services/ai.js';
import { estimateCostUsd } from '../services/cost.js';
import { enqueue } from '../services/outbox.js';

export async function runOutboxWorker() {
  const items = await prisma.outbox.findMany({ where: { status: 'pending' }, take: 20, orderBy: { createdAt: 'asc' } });
  for (const it of items) {
    try {
      if (it.type === 'IG') {
        const p = it.payload as any;
        const token = process.env.PAGE_ACCESS_TOKEN || '';
        const payload: any = { recipient: { id: p.userPSID }, message: { text: p.text } };
        if (Array.isArray(p.quickReplies) && p.quickReplies.length) {
          payload.message.quick_replies = p.quickReplies.slice(0, 11).map((t: string) => ({
            content_type: 'text',
            title: String(t).slice(0, 20),
            payload: `QR:${t}`
          }));
        }
        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!r.ok) {
          const errText = await r.text().catch(() => '');
          throw new Error(`IG send error ${r.status}: ${errText}`);
        }
        const data = await r.json().catch(() => ({}));
        if (p.threadId) {
          await prisma.igEvent.create({ data: { threadId: p.threadId, direction: 'out', type: 'text', text: p.text, extId: data?.message_id } });
        }
      }
      if (it.type === 'OPENAI') {
        const p = it.payload as any;
        const msgs = await buildThreadMessages(p.threadId, p.text, p.systemPrompt, 12);
        const ai = await askOpenAI(msgs, p.model, p.temperature);
        await enqueue('IG', { userPSID: p.userPSID, text: ai.text, quickReplies: p.quickReplies, threadId: p.threadId });
        if (ai.usage) {
          const cost = estimateCostUsd(p.model, ai.usage.prompt_tokens, ai.usage.completion_tokens);
          await prisma.usage.create({
            data: {
              userId: p.contactId,
              model: p.model,
              promptTokens: ai.usage.prompt_tokens || 0,
              completionTokens: ai.usage.completion_tokens || 0,
              costUsd: cost
            }
          });
        }
      }
      if (it.type === 'TELEGRAM') {
        const p = it.payload as any;
        const token = process.env.TG_BOT_TOKEN || '';
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: p.chatId, text: p.text, disable_web_page_preview: true })
        });
        if (!r.ok) {
          const errText = await r.text().catch(() => '');
          throw new Error(`TG send error ${r.status}: ${errText}`);
        }
      }
      await prisma.outbox.update({ where: { id: it.id }, data: { status: 'sent', attempts: { increment: 1 } } });
    } catch (e: any) {
      const upd = await prisma.outbox.update({ where: { id: it.id }, data: { status: 'error', attempts: { increment: 1 }, lastError: String(e) } });
      await logIntegrationError({ source: it.type, message: 'outbox fail', meta: { payload: it.payload, err: String(e) } });
      if (upd.attempts < 3) {
        await prisma.outbox.update({ where: { id: it.id }, data: { status: 'pending' } });
      }
    }
  }
}
