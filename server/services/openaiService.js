const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getOpenAIResponse(prompt) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices?.[0]?.message?.content?.trim() || '';
}

module.exports = { getOpenAIResponse };
