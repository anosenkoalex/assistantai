import type { FastifyInstance } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '../prisma.js';
import { applyRules } from '../services/igRules.js';
import { notifyManager } from '../services/notify.js';
import { requireAdmin } from '../mw/auth.js';
import { enqueue } from '../services/outbox.js';
import { startFlow, tickFlow } from '../services/flowEngine.js';

function isTriggerActive(trg: any, now = new Date()) {
  if (trg.startAt && now < new Date(trg.startAt)) return false;
  if (trg.endAt && now > new Date(trg.endAt)) return false;
  if (typeof trg.daysMask === 'number') {
    // 1=Mon..7=Sun → IG/JS getDay(): 0=Sun..6=Sat
    const jsDay = now.getDay(); // 0..6
    const bit = jsDay === 0 ? 64 : 1 << (jsDay - 1);
    return (trg.daysMask & bit) !== 0;
  }
  return true;
}

type IGMessaging = {
  sender?: { id?: string };      // IG user PSID
  recipient?: { id?: string };   // Page ID
  timestamp?: number;
  message?: {
    mid?: string;
    id?: string;
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
  app.post('/api/ig/webhook', { config: { rawBody: true } }, async (req, reply) => {
    const sig = (req.headers['x-hub-signature-256'] as string) || '';
    const secret = process.env.FB_APP_SECRET || '';
    const raw = (req as any).rawBody as Buffer | undefined;
    if (!sig || !secret || !raw) {
      return reply.code(401).send('invalid signature');
    }
    const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
    const valid = sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!valid) {
      return reply.code(401).send('invalid signature');
    }

    const body = req.body as any;

    try {
      if (body?.object === 'instagram' || body?.object === 'page') {
        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const value = change.value || {};
            const messages: IGMessaging[] = value.messaging || value.messages || [];
            if (value.story) {
              messages.push({ message: {}, story: value.story } as any);
            }

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

              // === Обычная ветка === (как было раньше)

              // 3) Записать входящее событие (идемпотентно по mid/id)
              const extId = (m.message?.mid || (m as any).mid || (m as any).id || m.message?.id) ? String(m.message?.mid || (m as any).mid || (m as any).id || m.message?.id) : undefined;
              if (extId) {
                const exists = await prisma.igEvent.findUnique({ where: { extId } });
                if (exists) continue; // уже обработано
                await prisma.igEvent.upsert({
                  where: { extId },
                  create: {
                    threadId: thread.id,
                    direction: 'in',
                    type: m.message?.text ? 'text' : m.postback ? 'postback' : 'system',
                    text: text ?? undefined,
                    payload: m as any,
                    extId
                  },
                  update: {}
                });
              } else {
                await prisma.igEvent.create({
                  data: {
                    threadId: thread.id,
                    direction: 'in',
                    type: m.message?.text ? 'text' : m.postback ? 'postback' : 'system',
                    text: text ?? undefined,
                    payload: m as any
                  }
                });
              }

              app.log.info({ userId, pageId, text }, 'IG inbound');

              const now = new Date();
              const trgs = await prisma.flowTrigger.findMany({ where: { active: true } });

              let matched: any = null;

              // 1) по quick reply (если есть payload QR:Title)
              if (qrPayload && String(qrPayload).startsWith('QR:')) {
                const title = String(qrPayload).slice(3);
                matched = trgs.find(t =>
                  t.kind === 'quick' &&
                  isTriggerActive(t, now) &&
                  title.toLowerCase().includes((t.value || '').toLowerCase())
                );
              }

              // 2) по keyword (если есть текст)
              if (!matched && text) {
                matched = trgs.find(t =>
                  t.kind === 'keyword' &&
                  isTriggerActive(t, now) &&
                  text.toLowerCase().includes((t.value || '').toLowerCase())
                );
              }

              // 3) по referral (если есть postback/referral payload)
              const storyReferral = (m as any)?.message?.referral;
              const isStoryMention = storyReferral?.source === 'STORY_MENTION' || !!(value?.story);
              const refPayload = storyReferral?.ref || storyReferral?.ad_id || (m as any)?.postback?.payload;
              if (!matched && refPayload) {
                matched = trgs.find(t =>
                  t.kind === 'referral' &&
                  isTriggerActive(t, now) &&
                  String(refPayload).toLowerCase().includes((t.value || '').toLowerCase())
                );
              }

              // 4) story mention (Meta может прислать как отдельный тип change/value)
              if (!matched && isStoryMention) {
                matched = trgs.find(t => t.kind === 'story_mention' && isTriggerActive(t, now));
              }

              // 5) any (любой вход)
              if (!matched) {
                matched = trgs.find(t => t.kind === 'any' && isTriggerActive(t, now));
              }

              if (matched) {
                const st = await startFlow({ contactId: contact.id, threadId: thread.id, flowId: matched.flowId });
                await tickFlow(st.id);
                continue; // управление взял flow
              }

              // 4) Применить правила
              const res = await applyRules({ contactId: contact.id, text });

              // 5) Ветвление по действию
              if (res.action === 'mute') {
                if (res.reply) {
                  await sendIGText(userId, res.reply, undefined, thread.id);
                }
                continue;
              }

              if (res.action === 'handoff') {
                await notifyManager({ userId: String(userId), text: text || '' });
                if (res.reply) {
                  await sendIGText(userId, res.reply, undefined, thread.id);
                }
                continue;
              }

              if (res.action === 'night') {
                if (res.reply) {
                  const settings = await prisma.igSetting.findUnique({ where: { id: 1 } });
                  const quick = settings?.quickReplies ? JSON.parse(settings.quickReplies) as string[] : undefined;
                  await sendIGText(userId, res.reply, quick, thread.id);
                }
                continue;
              }

              if (res.action === 'greet') {
                const settings = await prisma.igSetting.findUnique({ where: { id: 1 } });
                const quick = settings?.quickReplies ? JSON.parse(settings.quickReplies) as string[] : undefined;

                if (contact.status === 'bot' && settings?.aiEnabled && text) {
                  const model = settings.aiModel || process.env.DEFAULT_MODEL || 'gpt-4o-mini';
                  const temperature = typeof settings.aiTemperature === 'number' ? settings.aiTemperature : 0.7;
                  await enqueue('OPENAI', {
                    threadId: thread.id,
                    userPSID: userId,
                    contactId: contact.id,
                    text,
                    model,
                    temperature,
                    systemPrompt: settings.systemPrompt ?? undefined,
                    quickReplies: quick
                  });
                } else if (res.reply) {
                  await sendIGText(userId, res.reply, quick, thread.id);
                }

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

// Отправка текста пользователю через очередь Outbox
async function sendIGText(userPSID: string, text: string, quickReplies?: string[], threadId?: string) {
  await enqueue('IG', { userPSID, text, quickReplies, threadId });
}
