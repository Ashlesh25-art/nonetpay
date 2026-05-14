const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 7777;
const BASE = 'c:\\Users\\ashle\\Desktop\\NoNetPay\\nonetpay\\backend\\public';
const MIME = {
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  let fp = path.join(BASE, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(fp)) { res.writeHead(404); return res.end('Not found'); }
  const ext = fp.split('.').pop();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => console.log('Server ready on http://localhost:' + PORT));
