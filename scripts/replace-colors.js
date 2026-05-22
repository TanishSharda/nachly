const fs = require('fs').promises;
const path = require('path');

const root = path.resolve(__dirname, '..');
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.mjs', '.json']);
const ignoreDirs = new Set(['node_modules', '.git', 'playwright-report', 'test-results', 'public/icons']);

const replacements = [
  { re: /#F3B2AB/gi, to: '#F3B2AB' },
  { re: /#D88B80/gi, to: '#D88B80' },
  { re: /#D88B80/gi, to: '#D88B80' },
  { re: /rgba\(196,255,0,([^\)]+)\)/gi, to: 'rgba(243,178,171,$1)' },
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (ignoreDirs.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else {
      const ext = path.extname(e.name);
      if (!exts.has(ext)) continue;
      try {
        let src = await fs.readFile(full, 'utf8');
        let out = src;
        for (const { re, to } of replacements) out = out.replace(re, to);
        if (out !== src) {
          await fs.writeFile(full, out, 'utf8');
          console.log('patched', path.relative(root, full));
        }
      } catch (err) {
        console.error('err', full, err.message);
      }
    }
  }
}

walk(root).then(() => console.log('done')).catch(console.error);
