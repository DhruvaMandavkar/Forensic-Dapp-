const http = require('http');

const options = { hostname: '127.0.0.1', port: 3001, path: '/', method: 'GET', timeout: 5000 };

const req = http.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('first200chars:', data.slice(0,200));
  });
});

req.on('error', (e) => {
  console.error('request error:', e.message);
});
req.on('timeout', () => { req.destroy(); console.error('request timeout'); });
req.end();
