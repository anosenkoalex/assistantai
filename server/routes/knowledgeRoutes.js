const express = require('express');
const { getKnowledge, saveKnowledge } = require('../controllers/knowledgeController');

const router = express.Router();

router.get('/', getKnowledge);
router.post('/', saveKnowledge);

module.exports = router;
