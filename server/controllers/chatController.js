require('dotenv').config();
const db = require('../db/knex');
const { chatCompletion } = require('../services/openaiService');

async function handleChatMessage(req, res) {
  const { messages = [] } = req.body;
  try {
    const reply = await chatCompletion(messages);
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    if (lastUserMessage) {
      await db('messages').insert({ role: 'user', content: lastUserMessage });
      await db('messages').insert({ role: 'assistant', content: reply });
    }
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при обращении к OpenAI' });
  }
}

async function getChatLogs(req, res) {
  try {
    const logs = await db('messages').select('id', 'role', 'content', 'timestamp').orderBy('id');
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}

async function clearChat(req, res) {
  try {
    await db('messages').del();
    res.json({ status: 'cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
}

module.exports = { handleChatMessage, getChatLogs, clearChat };
