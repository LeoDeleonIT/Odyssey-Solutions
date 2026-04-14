const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname);
const PORT = 5500;

const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
               '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon' };

http.createServer((req, res) => {
  const file = path.join(root, req.url === '/' ? '/TDC-IT-Asset-Tracker.html' : req.url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`TDC Asset Tracker running at http://localhost:${PORT}`));
