import { prisma } from '../prisma.js';

export async function canSend(contactId: string, perMin = 3, perDay = 50) {
  const c = await prisma.igContact.findUnique({ where: { id: contactId } });
  const now = new Date();
  const reset = c?.dailyResetAt && new Date(c.dailyResetAt) > now ? c.dailyResetAt : null;
  const needsReset = !reset || new Date(reset) < now;
  if (needsReset) {
    await prisma.igContact.update({ where:{ id: contactId }, data: { dailySent: 0, dailyResetAt: new Date(now.getTime()+24*3600e3) } });
  }
  // грубая проверка в минуту — см. события за 60с
  const since = new Date(Date.now()-60_000);
  const minuteCount = await prisma.igEvent.count({ where:{ direction:'out', at:{ gte: since }, thread: { contactId } } });
  const dayCount = (needsReset ? 0 : (c?.dailySent||0));
  return minuteCount < perMin && dayCount < perDay;
}

export async function markSent(contactId: string, inc = 1) {
  await prisma.igContact.update({ where:{ id: contactId }, data:{ dailySent: { increment: inc }, lastSentAt: new Date() }});
}
