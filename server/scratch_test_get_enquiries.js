const axios = require('axios');
const http = require('http');

async function test() {
    try {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/enquiries?product_id=1',
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => console.log('Response:', res.statusCode, data));
        });
        req.on('error', e => console.error(e));
        req.end();
    } catch (e) {
        console.error(e.message);
    }
}
test();
