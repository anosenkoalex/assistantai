const { getBusinessData, saveBusinessData } = require('../services/openaiService');

async function getBusinessDataHandler(req, res) {
  try {
    const data = getBusinessData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load data' });
  }
}

async function saveBusinessDataHandler(req, res) {
  const { description = '', faq = '', tone = '' } = req.body || {};
  try {
    await saveBusinessData({ description, faq, tone });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data' });
  }
}

module.exports = { getBusinessData: getBusinessDataHandler, saveBusinessData: saveBusinessDataHandler };
