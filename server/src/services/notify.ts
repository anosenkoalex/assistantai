import { enqueue } from './outbox.js';

export async function notifyManager({ userId, text }: { userId: string; text: string }) {
  const chatId = process.env.TG_MANAGER_CHAT_ID || '';
  const token = process.env.TG_BOT_TOKEN || '';
  if (!chatId || !token) {
    console.log('[MANAGER NOTIFY:FALLBACK]', { userId, text });
    return;
  }
  const msg = `IG: запрос менеджера\n• user: ${userId}\n• text: ${text}`;
  await enqueue('TELEGRAM', { chatId, text: msg });
}
