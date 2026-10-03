
const jwt = require('jsonwebtoken');
const JWT_SECRET = "supersecretkey";
const API_URL = "http://localhost:5000/api/leads";

const token = jwt.sign({ id: 2, email: 'manager1@crm.com', role: 'SalesManager', sbu_id: 1 }, JWT_SECRET, { expiresIn: '1h' });

async function test() {
    try {
        console.log('Testing API with SalesManager (manager1) token...');
        const res = await fetch(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Response Status:', res.status);
        const data = await res.json();
        console.log('Total leads found:', data.total);
        console.log('Lead IDs:', data.data.map(l => l.id));
        console.log('Farming status:', data.data.map(l => l.is_farming));
    } catch (err) {
        console.error('API Error:', err.message);
    }
}
test();
