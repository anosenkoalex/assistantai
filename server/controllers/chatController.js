require('dotenv').config();
const { OpenAI } = require('openai');
const db = require('../db/knex');
const { readKnowledge } = require('./knowledgeController');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleChatMessage(req, res) {
  const { messages } = req.body;
  try {
    const knowledge = await readKnowledge();
    let systemPrompt = '';
    if (knowledge) {
      const faqText = (knowledge.faq || [])
        .map((f) => `${f.question} - ${f.answer}`)
        .join('\n');
      systemPrompt =
        `\u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442: ${knowledge.businessDescription}\n` +
        `\u0422\u043e\u0432\u0430\u0440\u044b: ${(knowledge.products || []).join(', ')}\n` +
        `FAQ:\n${faqText}`;
    }
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: message });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
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
