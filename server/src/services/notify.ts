export async function notifyManager({ userId, text }: { userId: string; text: string }) {
  // Здесь можно интегрировать Telegram-бота / email / Slack
  // Пока просто логируем (чтобы не блокировать поток)
  console.log('[MANAGER NOTIFY]', { userId, text });
}
