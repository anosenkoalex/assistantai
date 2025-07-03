const { OpenAI } = require('openai');
const db = require('../db/knex');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleChatMessage(req, res) {
  const { message } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
    });
    const reply = completion.choices?.[0]?.message?.content || '';
    await db('messages').insert({ role: 'user', content: message });
    await db('messages').insert({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при обращении к OpenAI' });
  }
}

module.exports = { handleChatMessage };
