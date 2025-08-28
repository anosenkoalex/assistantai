import TelegramBot from 'node-telegram-bot-api';
import { logIntegrationError } from './ilog.js';

let tg: TelegramBot | null = null;
function getTg() {
  const token = process.env.TG_BOT_TOKEN || '';
  if (!token) return null;
  if (tg) return tg;
  tg = new TelegramBot(token, { polling: false });
  return tg;
}

export async function notifyManager({ userId, text }: { userId: string; text: string }) {
  const chatId = process.env.TG_MANAGER_CHAT_ID || '';
  const bot = getTg();
  if (!bot || !chatId) {
    console.log('[MANAGER NOTIFY:FALLBACK]', { userId, text });
    return;
  }
  const msg = `IG: запрос менеджера\n• user: ${userId}\n• text: ${text}`;
  try {
    await bot.sendMessage(chatId, msg, { disable_web_page_preview: true });
  } catch (e: any) {
    await logIntegrationError({ source: 'TELEGRAM', message: e?.message, meta: { userId, text } });
  }
}
