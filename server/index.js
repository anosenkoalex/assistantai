const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const aiRouter = require('./routes/ai');
const chatRoutes = require('./routes/chatRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { loadBusinessData } = require('./services/openaiService');
const initDb = require('./db/init');

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

initDb();
loadBusinessData();

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/ask', aiRouter);
app.use('/api/admin', adminRoutes);

app.get('/api/ping', (req, res) => {
  res.json({ status: 'pong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
