const axios = require('axios');

async function testApi() {
    try {
        const response = await axios.get('http://localhost:5000/api/swat-performance/stats', {
            params: {
                date: '2026-03-19',
                product_id: 1,
                user_id: 1 // Assuming user 1 exists and has dev role or access
            },
            headers: {
                // I need a valid token here to bypass auth if middleware is active
                // Since I don't have one easily, I might need to check the middleware.
                // Alternatively, I can temporarily disable auth for this endpoint.
            }
        });
        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testApi();
