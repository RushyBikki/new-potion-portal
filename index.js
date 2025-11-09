// index.js
const axios = require('axios');

const NEXT_PUBLIC_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://hackutd2025.eog.systems';
const NEXT_PUBLIC_URL = `${NEXT_PUBLIC_BASE}/api/Data`;

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