const axios = require('axios');

const API_URL = 'http://localhost:5000/api/kra-tracker';
const TOKEN = 'YOUR_AUTH_TOKEN'; // This script is for manual run or conceptual verification

async function testKraApi() {
    try {
        const response = await axios.get(API_URL, {
            params: {
                month: '2026-03',
                user_id: 1, // Change to a valid user ID
                type: 'Product',
                product_id: 1 // Change to a valid product ID
            },
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        console.log('API Response Structure:');
        console.log(Object.keys(response.data));
        
        const expectedKeys = [
            'q1LeadsDailyData',
            'q2LeadsDailyData',
            'q3LeadsDailyData',
            'q4LeadsDailyData'
        ];

        expectedKeys.forEach(key => {
            if (response.data[key]) {
                console.log(`${key} found:`, response.data[key]);
            } else {
                console.error(`MISSING KEY: ${key}`);
            }
        });

    } catch (error) {
        console.error('Error fetching KRA data:', error.response?.data || error.message);
    }
}

// testKraApi();
