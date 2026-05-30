const http = require('http');
const host = process.env.CI_HTTP_HOST || '127.0.0.1';
const port = process.env.CI_HTTP_PORT || 3000;
const endpoints = ['/api/test/create-user', '/api/test/create-published-submission', '/api/test/debug-session'];

function checkEndpoint(path) {
  const options = { hostname: host, port, path, method: 'GET', timeout: 5000 };
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      resolve({ path, status: res.statusCode });
    });
    req.on('error', (e) => resolve({ path, error: e.message }));
    req.end();
  });
}

(async function () {
  const results = [];
  for (const p of endpoints) {
    // try / without env enabling test api; expecting 404 or 403
    const r = await checkEndpoint(p);
    results.push(r);
  }

  let failed = false;
  for (const r of results) {
    if (r.error) {
      console.error('ERROR', r.path, r.error);
      failed = true;
      continue;
    }
    console.log(r.path, '->', r.status);
    if (r.status === 200) {
      console.error('Test-only endpoint returned 200:', r.path);
      failed = true;
    }
  }

  if (failed) process.exit(2);
  console.log('All test endpoints are protected');
  process.exit(0);
})();
