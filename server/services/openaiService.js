// server/services/openaiService.js
// -------------------------------
require('dotenv').config();
const { OpenAI } = require('openai');
const fs          = require('fs').promises;
const path        = require('path');

const businessFile = path.join(__dirname, '..', 'business_data.json');

// -------- База знаний бизнеса ---------------------------------
let businessData = { description: '', faq: '', tone: '' };

async function loadBusinessData() {
  try {
    const data = await fs.readFile(businessFile, 'utf-8');
    businessData = JSON.parse(data);
  } catch (_) {
    // файла пока нет – используем пустые значения
    businessData = { description: '', faq: '', tone: '' };
  }
}

async function saveBusinessData(data) {
  businessData = {
    description: data.description || '',
    faq:         data.faq         || '',
    tone:        data.tone        || '',
  };
  await fs.writeFile(businessFile, JSON.stringify(businessData, null, 2));
}

function getBusinessData() {
  return businessData;
}

// -------- OpenAI ----------------------------------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Функция-обёртка: отдаёт ответ ChatGPT с учётом базы знаний бизнеса.
 * @param {Array<{role:"user"|"assistant"|"system", content:string}>} messages
 * @returns {Promise<string>} ответ ассистента
 */
async function chatCompletion(messages = []) {
  // Контекст, который будем передавать первым сообщением system
  const ctx =
    `Описание бизнеса:\n${businessData.description}\n\n` +
    `FAQ:\n${businessData.faq}\n\n` +
    `Тон общения: ${businessData.tone}`;

  const completion = await openai.chat.completions.create({
    model:   process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages: [{ role: 'system', content: ctx }, ...messages],
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

// -------- Экспорт ---------------------------------------------
module.exports = {
  loadBusinessData,
  saveBusinessData,
  getBusinessData,
  chatCompletion,
};
