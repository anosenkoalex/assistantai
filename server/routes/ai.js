const express = require('express');
const { chatCompletion } = require('../services/openaiService');

const router = express.Router();

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const reply = await chatCompletion([{ role: 'user', content: message }]);
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

module.exports = router;
