
const jwt = require('jsonwebtoken');

const JWT_SECRET = "supersecretkey";
const API_URL = "http://localhost:5000/api/leads";

const token = jwt.sign({ id: 1, email: 'ceo@crm.com', role: 'CEO' }, JWT_SECRET, { expiresIn: '1h' });

async function test() {
    try {
        console.log('Testing API with CEO token (using fetch)...');
        const res = await fetch(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Response Status:', res.status);
        const data = await res.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('API Error:', err.message);
    }
}

test();
