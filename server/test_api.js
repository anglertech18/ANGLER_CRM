
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "supersecretkey";
const API_URL = "http://localhost:5000/api/leads";

const token = jwt.sign({ id: 1, email: 'ceo@crm.com', role: 'CEO' }, JWT_SECRET, { expiresIn: '1h' });

async function test() {
    try {
        console.log('Testing API with CEO token...');
        const res = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Response Status:', res.status);
        console.log('Response Data:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('API Error:', err.response ? err.response.data : err.message);
    }
}

test();
