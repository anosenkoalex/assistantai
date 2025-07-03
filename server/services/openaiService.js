const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');

const businessFile = path.join(__dirname, '..', 'business_data.json');
let businessData = { description: '', faq: '', tone: '' };

async function loadBusinessData() {
  try {
    const data = await fs.readFile(businessFile, 'utf-8');
    businessData = JSON.parse(data);
  } catch (err) {
    businessData = { description: '', faq: '', tone: '' };
  }
}

async function saveBusinessData(data) {
  businessData = {
    description: data.description || '',
    faq: data.faq || '',
    tone: data.tone || '',
  };
  await fs.writeFile(businessFile, JSON.stringify(businessData, null, 2));
}

function getBusinessData() {
  return businessData;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function chatCompletion(messages = []) {
  const ctx = `\nОписание бизнеса:\n${businessData.description}\n\nЧасто задаваемые вопросы:\n${businessData.faq}\n\nТон общения: ${businessData.tone}`;
  const finalMessages = [{ role: 'system', content: ctx }, ...messages];
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages: finalMessages,
  });
  return completion.choices?.[0]?.message?.content?.trim() || '';
}

module.exports = {
  loadBusinessData,
  saveBusinessData,
  getBusinessData,
  chatCompletion,
};
