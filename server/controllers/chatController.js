require('dotenv').config();
const { OpenAI } = require('openai');
const db = require('../db/knex');
const { readKnowledge } = require('./knowledgeController');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleChatMessage(req, res) {
  const { messages = [] } = req.body;
  try {
    const knowledge = await readKnowledge();
    let systemPrompt = '';
    if (knowledge) {
      const faqText = (knowledge.faq || [])
        .map((f) => `${f.question} - ${f.answer}`)
        .join('\n');
      systemPrompt =
        `Контекст: ${knowledge.businessDescription}\n` +
        `Товары: ${(knowledge.products || []).join(', ')}\n` +
        `FAQ:\n${faqText}`;
    }
    const prepared = [...messages];
    if (systemPrompt) {
      prepared.unshift({ role: 'system', content: systemPrompt });
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: prepared,
    });
    const reply = completion.choices?.[0]?.message?.content?.trim() || '';
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
