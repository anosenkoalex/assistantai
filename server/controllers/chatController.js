require('dotenv').config();
const { OpenAI } = require('openai');
const db = require('../db/knex');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleChatMessage(req, res) {
  const { messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });
    const reply = completion.choices?.[0]?.message?.content || '';
    const lastUserMessage = messages?.[messages.length - 1]?.content || '';
    await db('messages').insert({ role: 'user', content: lastUserMessage });
    await db('messages').insert({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при обращении к OpenAI' });
  }
}

module.exports = { handleChatMessage };
