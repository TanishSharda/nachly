const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (['node_modules', '.git', '.next', 'playwright-report', 'scripts'].includes(e.name)) continue;
      walk(full, cb);
    } else if (e.isFile()) {
      cb(full);
    }
  }
}

const root = process.cwd();
const occurrences = [];
let allowlist = [];
const allowlistPath = path.join(process.cwd(), '.service-role-allowed.json');
try {
  if (fs.existsSync(allowlistPath)) {
    allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) || [];
  }
} catch (e) {
  // ignore malformed allowlist
  allowlist = [];
}
walk(root, (file) => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.jsx')) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('createServiceRoleClient(')) {
      let rel = path.relative(root, file);
        // normalize to forward slashes for consistent allowlist matching
        rel = rel.replace(/\\/g, '/');
      occurrences.push({ file: rel, line: i + 1, text: lines[i].trim() });
    }
  }
});

// Filter out allowlisted occurrences
// normalize allowlist file paths
allowlist = (allowlist || []).map((a) => ({ ...a, file: (a.file || '').replace(/\\\\/g, '/') }));
allowlist = (allowlist || []).map((a) => ({ ...a, file: (a.file || '').replace(/\\/g, '/') }));

const remaining = occurrences.filter((o) => {
  return !allowlist.some((a) => a.file === o.file && (!a.line || Number(a.line) === Number(o.line)));
});

if (remaining.length === 0) {
  console.log('No createServiceRoleClient occurrences found (after allowlist).');
  process.exit(0);
}

console.log('Found createServiceRoleClient occurrences (not allowlisted):');
for (const o of remaining) {
  console.log(`${o.file}:${o.line}: ${o.text}`);
}

if (allowlist.length > 0) {
  console.log('\nAllowlist entries applied (ignored):');
  for (const a of allowlist) {
    console.log(`- ${a.file}${a.line ? ':' + a.line : ''}  // ${a.reason || ''}`);
  }
}

console.log('\nReview each remaining occurrence to ensure service-role usage is server-only and audited.');
// Exit with non-zero code so CI can fail when unexpected service-role occurrences exist.
process.exit(1);
