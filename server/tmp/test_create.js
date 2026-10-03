const http = require('http');

const data = JSON.stringify({
  company_name: 'Test Company DB',
  date: new Date().toISOString(),
  product_or_service: 'Product',
  product_id: 2,
  industry_id: 1,
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/call-tracker',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer test' // Might fail if strict auth, let's see. Need a real token?
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', console.error);
req.write(data);
req.end();
