import { prisma } from '../prisma.js';

export type RuleResult =
  | { action: 'mute'; reply?: string }
  | { action: 'handoff'; reply?: string }
  | { action: 'night'; reply?: string }
  | { action: 'greet'; reply: string }
  | { action: 'none' };

function isNight(now = new Date()) {
  const hour = now.getHours();
  return hour < 9 || hour >= 21; // 21:00–09:00 — «тихий» период
}

function isStop(text?: string) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return ['stop', 'стоп', 'отписка', 'unsubscribe'].some(x => t.includes(x));
}

function isHandoff(text?: string) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return ['менеджер', 'оператор', 'сотрудник', 'позвать', 'консультант', 'manager', 'agent', 'human'].some(x => t.includes(x));
}

export async function applyRules({
  contactId,
  text,
}: {
  contactId: string;
  text?: string;
}): Promise<RuleResult> {
  const now = new Date();

  // 0) Проверить кулдаун (антиспам) — последнее исходящее событие <30с
  const lastOut = await prisma.igEvent.findFirst({
    where: { thread: { contactId }, direction: 'out' },
    orderBy: { at: 'desc' }
  });
  if (lastOut && now.getTime() - lastOut.at.getTime() < 30_000) {
    return { action: 'none' }; // пропускаем автоответ
  }

  // 1) STOP → mute
  if (isStop(text)) {
    await prisma.igContact.update({
      where: { id: contactId },
      data: { status: 'muted' }
    });
    return { action: 'mute', reply: 'Вы отписались от автоответов. Напишите «Старт», чтобы включить снова.' };
  }

  // 1b) START → вернуться из mute
  if (text && text.trim().toLowerCase().includes('старт')) {
    await prisma.igContact.update({
      where: { id: contactId },
      data: { status: 'bot' }
    });
    return { action: 'greet', reply: 'Автоответы снова активированы ✅' };
  }

  // 2) Хенд-офф менеджеру
  if (isHandoff(text)) {
    await prisma.igContact.update({
      where: { id: contactId },
      data: { status: 'manager' }
    });
    return { action: 'handoff', reply: 'Передал ваш диалог менеджеру. Он скоро ответит.' };
  }

  // 3) Ночной режим
  const contact = await prisma.igContact.findUnique({ where: { id: contactId } });
  if (contact && contact.status === 'bot' && isNight(now)) {
    return { action: 'night', reply: 'Спасибо за сообщение! Сейчас нерабочее время — мы ответим утром.' };
  }

  // 4) Поиск по ключевым словам (IgRule)
  if (text) {
    const rules = await prisma.igRule.findMany({ where: { active: true } });
    const lower = text.toLowerCase();
    for (const rule of rules) {
      if (lower.includes(rule.keyword.toLowerCase())) {
        return { action: 'greet', reply: rule.reply };
      }
    }
  }

  // 5) Базовое приветствие
  return { action: 'greet', reply: 'Привет! Я онлайн-ассистент. Расскажите, что вас интересует 😊' };
}
