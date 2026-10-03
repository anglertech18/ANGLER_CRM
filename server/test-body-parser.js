// Quick test to verify API endpoint is receiving body data
const axios = require('axios');

async function testBodyParser() {
    try {
        // First, login to get a token
        console.log('1. Testing login...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@example.com',  // Update with valid credentials
            password: 'admin123'
        });

        const token = loginResponse.data.token;
        console.log('✓ Login successful, got token');

        // Test the /test route (no auth needed)
        console.log('\n2. Testing /leads/test route (no auth)...');
        const testResponse = await axios.post('http://localhost:5000/api/leads/test', {
            test: 'data',
            foo: 'bar'
        });
        console.log('Response:', testResponse.data);

        // Test creating a minimal lead
        console.log('\n3. Testing lead creation with minimal data...');
        const leadResponse = await axios.post('http://localhost:5000/api/leads', {
            first_name: 'Test',
            last_name: 'Lead',
            sales_sbu_id: 1,  // Update with valid SBU ID
            telecalling_qualified: false
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✓ Lead created successfully!');
        console.log('Lead ID:', leadResponse.data.id);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testBodyParser();
