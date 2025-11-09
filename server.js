// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const { getData } = require('./index'); // your existing axios fetch module

const app = express();
const PORT = process.env.PORT || 3000;

// Serve front-end static files
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint - front-end calls this to avoid CORS
app.get('/proxy/data', async (req, res) => {
  try {
    const data = await getData(); // uses axios inside index.js
    if (!data) return res.status(502).json({ error: 'No data from upstream' });
    res.json(data);
  } catch (err) {
    console.error('Proxy fetch error:', err?.message ?? err);
    const status = err.response?.status || 502;
    res.status(status).json({ error: 'Upstream fetch failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running http://localhost:${PORT}`);
});