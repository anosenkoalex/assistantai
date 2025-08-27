import { prisma } from '../prisma.js';
import { inQuietHours } from './time.js';

export type RuleResult =
  | { action: 'mute'; reply?: string }
  | { action: 'handoff'; reply?: string }
  | { action: 'night'; reply?: string }
  | { action: 'greet'; reply: string }
  | { action: 'none' };

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

  // 3) Ночной режим из настроек
  const contact = await prisma.igContact.findUnique({ where: { id: contactId } });
  const settings = await prisma.igSetting.findUnique({ where: { id: 1 } });
  const tz = settings?.tz || 'Asia/Bishkek';
  const qStart = settings?.quietStart || '21:00';
  const qEnd = settings?.quietEnd || '09:00';
  if (contact && contact.status === 'bot' && inQuietHours(now, tz, qStart, qEnd)) {
    return { action: 'night', reply: 'Спасибо за сообщение! Мы ответим в рабочее время.' };
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
