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

  // 1) STOP → mute
  if (isStop(text)) {
    await prisma.igContact.update({
      where: { id: contactId },
      data: { status: 'muted' }
    });
    return { action: 'mute', reply: 'Вы отписались от автоответов. Если захотите продолжить — напишите «Старт».' };
  }

  // 2) Хенд-офф менеджеру
  if (isHandoff(text)) {
    await prisma.igContact.update({
      where: { id: contactId },
      data: { status: 'manager' }
    });
    return { action: 'handoff', reply: 'Передал ваш диалог менеджеру. Он скоро ответит.' };
  }

  // 3) Ночной режим (если контакт не в режиме manager/muted)
  const contact = await prisma.igContact.findUnique({ where: { id: contactId } });
  if (contact && contact.status === 'bot' && isNight()) {
    return { action: 'night', reply: 'Спасибо за сообщение! Сейчас нерабочее время — мы ответим утром.' };
  }

  // 4) Базовое приветствие/разогрев (первая реплика без истории или по умолчанию)
  return { action: 'greet', reply: 'Привет! Я онлайн-ассистент. Расскажите, что вас интересует, и я помогу 😊' };
}
