const { spawn, spawnSync } = require('child_process');
const path = require('path');

function runBuild() {
  console.log('Running production build (this may take a while)...');
  const res = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status || 1);
}

function startServer() {
  console.log('Starting production server (next start)...');
  const child = spawn('npm', ['run', 'start'], { stdio: 'inherit', shell: true });
  return child;
}

function runTests() {
  console.log('Running Playwright tests...');
  const res = spawnSync('npx', ['playwright', 'test', '--project=chromium', '--workers=1', '--config=playwright.config.ts'], { stdio: 'inherit', shell: true });
  return res.status;
}

(async () => {
  try {
    runBuild();

    const server = startServer();

    // Wait a short moment for server to boot
    await new Promise((r) => setTimeout(r, 5000));

    const status = runTests();

    console.log('Tests finished with status', status);

    if (server && !server.killed) {
      try { server.kill(); } catch (e) { /* ignore */ }
    }

    process.exit(status || 0);
  } catch (err) {
    console.error('Error running prod e2e:', err);
    process.exit(1);
  }
})();
