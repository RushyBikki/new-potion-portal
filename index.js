// index.js
const axios = require('axios');

const BASE = process.env.API_BASE || 'https://hackutd2025.eog.systems';
const URL = `${BASE}/api/Data`;

async function getData() {
  try {
    const resp = await axios.get(URL, { headers: { Accept: 'application/json' }, timeout: 10000 });
    return resp.data;
  } catch (err) {
    if (err.response) {
      console.error('API error', err.response.status, err.response.statusText);
      console.error(err.response.data);
    } else {
      console.error('Request error:', err.message);
    }
    throw err;
  }
}

if (require.main === module) getData().catch(()=>process.exit(1));
module.exports = { getData };