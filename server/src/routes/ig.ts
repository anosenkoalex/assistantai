import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { applyRules } from '../services/igRules.js';
import { notifyManager } from '../services/notify.js';
import { requireAdmin } from '../mw/auth.js';
import { buildThreadMessages, askOpenAI } from '../services/ai.js';
import { estimateCostUsd } from '../services/cost.js';
import { startFlow, tickFlow } from '../services/flowEngine.js';

type IGMessaging = {
  sender?: { id?: string };      // IG user PSID
  recipient?: { id?: string };   // Page ID
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: any[];
  };
  postback?: { payload?: string; title?: string };
  referral?: any;
};

export async function registerIGRoutes(app: FastifyInstance) {
  // GET: верификация вебхука
  app.get('/api/ig/webhook', async (req, reply) => {
    const q = (req.query ?? {}) as Record<string, any>;
    const mode = q['hub.mode'] || q.hub_mode;
    const token = q['hub.verify_token'] || q.hub_verify_token;
    const challenge = q['hub.challenge'] || q.hub_challenge;

    if (mode === 'subscribe' && token === (process.env.META_VERIFY_TOKEN || '')) {
      return reply.code(200).send(challenge);
    }
    return reply.code(403).send('Forbidden');
  });

  // POST: основной приём событий (Instagram Messaging)
  app.post('/api/ig/webhook', async (req, reply) => {
    const body = req.body as any;

    try {
      if (body?.object === 'instagram' || body?.object === 'page') {
        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const value = change.value || {};
            const messages: IGMessaging[] = value.messaging || value.messages || [];

            for (const m of messages) {
              const userId = m.sender?.id;
              const pageId = m.recipient?.id;

              // Текст юзера
              const text = m.message?.text?.trim();
              // ВАЖНО: Quick Reply payload приходит в message.quick_reply.payload
              const qrPayload = (m as any)?.message?.quick_reply?.payload || m.postback?.payload; // на всякий случай

              if (!userId) continue;

              // 1) Контакт
              const contact = await prisma.igContact.upsert({
                where: { igUserId: String(userId) },
                create: { igUserId: String(userId), status: 'bot' },
                update: { updatedAt: new Date() }
              });

              // 2) Активный тред
              let thread = await prisma.igThread.findFirst({
                where: { contactId: contact.id, state: 'active' },
                orderBy: { updatedAt: 'desc' }
              });
              if (!thread) {
                thread = await prisma.igThread.create({
                  data: { contactId: contact.id, pageId: pageId ?? undefined }
                });
              }

              // === ВЕТКА QUICK REPLY ===
              if (qrPayload && String(qrPayload).startsWith('QR:')) {
                const title = String(qrPayload).slice(3); // что было на кнопке

                // 2.а) запись входящего quick-события
                await prisma.igEvent.create({
                  data: {
                    threadId: thread.id,
                    direction: 'in',
                    type: 'quick',
                    text: title,
                    payload: m as any
                  }
                });

                // 2.б) антиспам: если >5 quick за 60 сек — игнорим
                const since = new Date(Date.now() - 60_000);
                const spamCount = await prisma.igEvent.count({
                  where: { threadId: thread.id, direction: 'in', type: 'quick', at: { gte: since } }
                });
                if (spamCount > 5) {
                  app.log.warn({ userId, title }, 'QuickReply spam ignored');
                  return; // не отвечаем
                }

                // 2.в) ответ по правилам (ищем rule по keyword == title, без учёта регистра)
                const rule = await prisma.igRule.findFirst({
                  where: { active: true, keyword: { equals: title, mode: 'insensitive' } }
                });

                const replyText = rule?.reply ?? `Вы выбрали: “${title}”`;
                const settings = await prisma.igSetting.findUnique({ where: { id: 1 } });
                const quick = settings?.quickReplies ? JSON.parse(settings.quickReplies) as string[] : undefined;

                await sendIGText(userId, replyText, quick);
                await prisma.igEvent.create({
                  data: { threadId: thread.id, direction: 'out', type: 'text', text: replyText }
                });
                continue;
              }

              // === Обычная ветка === (как было раньше)

              // 3) Записать входящее событие
              await prisma.igEvent.create({
                data: {
                  threadId: thread.id,
                  direction: 'in',
                  type: m.message?.text ? 'text' : m.postback ? 'postback' : 'system',
                  text: text ?? undefined,
                  payload: m as any
                }
              });

              app.log.info({ userId, pageId, text }, 'IG inbound');

              // попытка найти активный триггер
              if (text) {
                const trgs = await prisma.flowTrigger.findMany({
                  where: { active: true, kind: 'keyword' }
                });
                const lower = text.toLowerCase();
                const match = trgs.find(t => lower.includes(t.value.toLowerCase()));
                if (match) {
                  // стартуем flow
                  const st = await startFlow({ contactId: contact.id, threadId: thread.id, flowId: match.flowId });
                  await tickFlow(st.id);
                  // не продолжаем обычную логику — flow взял управление
                  continue;
                }
              }

              // 4) Применить правила
              const res = await applyRules({ contactId: contact.id, text });

              // 5) Ветвление по действию
              if (res.action === 'mute') {
                // Ничего не отправляем пользователю? Можно подтвердить отписку
                if (res.reply) {
                  await sendIGText(userId, res.reply);
                  await prisma.igEvent.create({
                    data: { threadId: thread.id, direction: 'out', type: 'text', text: res.reply }
                  });
                }
                continue;
              }

              if (res.action === 'handoff') {
                // Уведомить менеджера и подтвердить пользователю
                await notifyManager({ userId: String(userId), text: text || '' });
                if (res.reply) {
                  await sendIGText(userId, res.reply);
                  await prisma.igEvent.create({
                    data: { threadId: thread.id, direction: 'out', type: 'text', text: res.reply }
                  });
                }
                continue;
              }

              if (res.action === 'night') {
                // Вежливо сообщить про нерабочее время
                if (res.reply) {
                  const settings = await prisma.igSetting.findUnique({ where: { id: 1 } });
                  const quick = settings?.quickReplies ? JSON.parse(settings.quickReplies) as string[] : undefined;
                  await sendIGText(userId, res.reply, quick);
                  await prisma.igEvent.create({
                    data: { threadId: thread.id, direction: 'out', type: 'text', text: res.reply }
                  });
                }
                continue;
              }

              if (res.action === 'greet') {
                const settings = await prisma.igSetting.findUnique({ where: { id: 1 } });
                const quick = settings?.quickReplies ? JSON.parse(settings.quickReplies) as string[] : undefined;

                let reply = res.reply; // дефолтный ответ правил

                // Попробуем ИИ, если включен и есть входящий текст
                if (contact.status === 'bot' && settings?.aiEnabled && text) {
                  const model = settings.aiModel || process.env.DEFAULT_MODEL || 'gpt-4o-mini';
                  const temperature = typeof settings.aiTemperature === 'number' ? settings.aiTemperature : 0.7;
                  const msgs = await buildThreadMessages(thread.id, text, settings.systemPrompt ?? undefined, 12);
                  try {
                    const ai = await askOpenAI(msgs, model, temperature);
                    if (ai.text) reply = ai.text;

                    // Запишем usage при наличии
                    if (ai.usage) {
                      const cost = estimateCostUsd(model, ai.usage.prompt_tokens, ai.usage.completion_tokens);
                      await prisma.usage.create({
                        data: {
                          userId: contact.id,
                          model,
                          promptTokens: ai.usage.prompt_tokens || 0,
                          completionTokens: ai.usage.completion_tokens || 0,
                          costUsd: cost
                        }
                      });
                    }
                  } catch (e) {
                    app.log.error(e, 'AI reply failed; fallback to rule reply');
                  }
                }

                await sendIGText(userId, reply, quick);

                await prisma.igEvent.create({
                  data: { threadId: thread.id, direction: 'out', type: 'text', text: reply }
                });

                if (res.meta?.ruleId) {
                  await prisma.igEvent.create({
                    data: {
                      threadId: thread.id,
                      direction: 'out',
                      type: 'rule',
                      text: `hit:${res.meta.keyword || ''}`,
                      payload: { ruleId: res.meta.ruleId, keyword: res.meta.keyword }
                    }
                  });
                }
                continue;
              }

              // res.action === 'none' → ничего не делаем
            }
          }
        }
      }
    } catch (e: any) {
      app.log.error(e, 'IG webhook error');
    }

    return reply.code(200).send('ok');
  });

  // Подписка страницы на сообщения
  app.post('/api/ig/subscribe', { preHandler: requireAdmin }, async (_req, reply) => {
    const pageId = process.env.FB_PAGE_ID || '';
    const token = process.env.PAGE_ACCESS_TOKEN || '';
    if (!pageId || !token) {
      return reply.code(400).send({ error: 'Missing FB_PAGE_ID or PAGE_ACCESS_TOKEN' });
    }
    const url = `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { method: 'POST' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return reply.code(500).send({ error: 'subscribe failed', data });
    return { ok: true, data };
  });
}

// Отправка текста пользователю через Page Access Token
async function sendIGText(userPSID: string, text: string, quickReplies?: string[]) {
  const token = process.env.PAGE_ACCESS_TOKEN || '';
  if (!token) throw new Error('PAGE_ACCESS_TOKEN is not set');

  const payload: any = {
    recipient: { id: userPSID },
    message: { text }
  };

  if (Array.isArray(quickReplies) && quickReplies.length) {
    payload.message.quick_replies = quickReplies.slice(0, 11).map((title) => ({
      content_type: 'text',
      title: String(title).slice(0, 20),
      payload: `QR:${title}`
    }));
  }

  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const err = await r.text().catch(() => '');
    throw new Error(`IG send error ${r.status}: ${err}`);
  }
}
