const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const aiRouter = require('./routes/ai');

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/api/ask', aiRouter);

app.get('/api/ping', (req, res) => {
  res.json({ status: 'pong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
