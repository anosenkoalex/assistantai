require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { getOpenAIResponse } = require('./openaiService');

const LOG_PATH = path.join(__dirname, '..', 'logs', 'telegram_logs.json');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

function logInteraction(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    const logs = fs.existsSync(LOG_PATH)
      ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'))
      : [];
    logs.push(entry);
    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  const allowed = process.env.TELEGRAM_ALLOWED_IDS
    ? process.env.TELEGRAM_ALLOWED_IDS.split(',').map((id) => id.trim())
    : null;
  if (allowed && !allowed.includes(String(chatId))) {
    return;
  }

  try {
    const reply = await getOpenAIResponse(text);
    await bot.sendMessage(chatId, reply);
    logInteraction({
      user_id: chatId,
      username: msg.from.username || '',
      prompt: text,
      response: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Telegram bot error:', err);
  }
});

module.exports = bot;
