const express = require('express');
const { handleChatMessage, getChatLogs, clearChat } = require('../controllers/chatController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', handleChatMessage);
router.get('/logs', authMiddleware, adminOnly, getChatLogs);
router.delete('/logs', authMiddleware, adminOnly, clearChat);

module.exports = router;
