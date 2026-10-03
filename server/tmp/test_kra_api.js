const axios = require('axios');

async function testApi() {
    try {
        const response = await axios.get('http://localhost:5000/api/kra-tracker', {
            params: {
                month: '2026-03',
                user_id: 5,
                type: 'Product',
                product_id: 1
            }
        });

        console.log('API Response for 2026-03 (User 5, Product 1):');
        console.log('Q1 Leads Daily Data:', response.data.q1LeadsDailyData);
        console.log('Q2 Leads Daily Data:', response.data.q2LeadsDailyData);
        console.log('Q3 Leads Daily Data:', response.data.q3LeadsDailyData);
        console.log('Q4 Leads Daily Data:', response.data.q4LeadsDailyData);
        console.log('Leads Created Daily Data:', response.data.leadsCreatedDailyData);
        console.log('Leads Daily Data (Order Won):', response.data.leadsDailyData);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testApi();
