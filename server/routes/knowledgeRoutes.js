const express = require('express');
const { getKnowledge, saveKnowledge } = require('../controllers/knowledgeController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, adminOnly, getKnowledge);
router.post('/', authMiddleware, adminOnly, saveKnowledge);

module.exports = router;
