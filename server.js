// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const API_BASE = process.env.API_BASE || 'https://hackutd2025.eog.systems';
const API_URL = `${API_BASE}/api/Data`;

app.get('/proxy/data', async (req, res) => {
  try {
    const resp = await axios.get(API_URL, { timeout: 10000 });
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: 'Upstream fetch failed' });
  }
});

app.listen(PORT, () => console.log(`Proxy listening at http://localhost:${PORT}`));