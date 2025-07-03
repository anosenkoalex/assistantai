const fs = require('fs').promises;
const path = require('path');

const knowledgeFile = path.join(__dirname, '..', 'knowledge.json');

async function readKnowledge() {
  try {
    const data = await fs.readFile(knowledgeFile, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { businessDescription: '', products: [], faq: [] };
  }
}

async function writeKnowledge(data) {
  await fs.writeFile(knowledgeFile, JSON.stringify(data, null, 2));
}

async function getKnowledge(req, res) {
  const data = await readKnowledge();
  res.json(data);
}

async function saveKnowledge(req, res) {
  const { businessDescription = '', products = [], faq = [] } = req.body || {};
  const data = {
    businessDescription,
    products: Array.isArray(products) ? products : [],
    faq: Array.isArray(faq) ? faq : [],
  };
  await writeKnowledge(data);
  res.json({ status: 'ok' });
}

module.exports = { getKnowledge, saveKnowledge, readKnowledge };
