const { spawnSync } = require('child_process');
const { readdirSync } = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, '..', 'tests', 'e2e');
let files = readdirSync(testsDir).filter(f => f.endsWith('.spec.ts') || f.endsWith('.spec.js'));

// Optionally run a single test file by setting TEST_FILE env var to its filename
if (process.env.TEST_FILE) {
  const single = process.env.TEST_FILE
  if (files.includes(single)) {
    files = [single]
  } else {
    console.error('TEST_FILE set but not found in', testsDir, single)
    process.exit(2)
  }
}
if (files.length === 0) {
  console.error('No test files found in', testsDir);
  process.exit(1);
}

let failed = false;
for (const file of files) {
  console.log('\n=== Running', file, '===');
  const full = path.join('tests', 'e2e', file);
  const res = spawnSync('npx', ['playwright', 'test', full, '--project=chromium', '--workers=1', '--config=playwright.config.ts'], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error('Test failed:', file);
    failed = true;
    // continue running remaining tests to collect artifacts
  }
}

process.exit(failed ? 1 : 0);
