const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const exts = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir) {
  const results = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else if (stat.isFile() && exts.includes(path.extname(name))) {
      results.push(full);
    }
  }
  return results;
}

function isUnder(p, folderName) {
  return p.split(path.sep).includes(folderName);
}

const files = walk(SRC);
const errs = [];
const warns = [];

for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');

  // 1) Test API routes must be gated
  if (rel.startsWith('src/app/api/test/')) {
    if (!/ENABLE_TEST_API/.test(content) && !/NODE_ENV\s*===\s*['"]development['"]/.test(content)) {
      errs.push({ file: rel, problem: 'test route missing dev/ENABLE_TEST_API guard' });
    }
  }

  // 2) createServiceRoleClient usage outside allowed server dirs
  if (/createServiceRoleClient\s*\(/.test(content) || /createServiceRoleClient\s*/.test(content)) {
    // If this is a client file (contains "use client") that's an error.
    const isClient = /['"]use client['"]/.test(content);
    if (isClient) {
      errs.push({ file: rel, problem: 'createServiceRoleClient used inside a client component' });
    }
    // otherwise assume server component or API route is acceptable
  }

  // 3) SUPABASE_SERVICE_ROLE_KEY referenced in client or non-server files
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(content)) {
    const isClient = /['"]use client['"]/.test(content);
    if (isClient) {
      warns.push({ file: rel, problem: 'SERVICE_ROLE env var referenced inside a client file' });
    }
  }

  // 4) direct storage uploads in non-server code
  if (/\.storage\s*\.\s*upload\s*\(/.test(content)) {
    if (!rel.startsWith('src/app/api/') && !rel.startsWith('src/lib/')) {
      errs.push({ file: rel, problem: 'direct storage upload call found outside server code' });
    }
  }
}

if (errs.length === 0 && warns.length === 0) {
  console.log('Security audit: OK — no obvious issues found');
  process.exit(0);
}

if (errs.length > 0) {
  console.error('Security audit — ERRORS:');
  for (const e of errs) console.error(` - ${e.file}: ${e.problem}`);
}
if (warns.length > 0) {
  console.warn('Security audit — WARNINGS:');
  for (const w of warns) console.warn(` - ${w.file}: ${w.problem}`);
}

if (errs.length > 0) process.exit(2);
process.exit(0);
