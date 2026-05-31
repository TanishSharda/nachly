const http = require('http');

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end('Method Not Allowed');
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  try {
    const json = JSON.parse(body);
    console.log('[REMOTE-LOG RECEIVED]', new Date().toISOString());
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('[REMOTE-LOG RECEIVED] Non-JSON body:', body);
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});

server.listen(port, () => {
  console.log(`Remote log receiver listening on http://localhost:${port}/`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

module.exports = server;
