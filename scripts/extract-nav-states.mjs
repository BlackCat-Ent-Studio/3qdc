// Find ALL data-URIs for the 3 nav buttons (normal + hover/active states) in CSS,
// decode each to a file so the user can see/translate the bright state too.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(dir, out = []) { for (const e of await readdir(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) await walk(p, out); else if (e.name.endsWith('.css')) out.push(p); } return out; }
const cssFiles = await walk('mirror');
const OUT = 'site-images/nav-buttons-preview';
await mkdir(OUT, { recursive: true });

// match any selector containing kv-link_box-<key> (incl :hover, -active) followed by a bg data-URI
const keys = ['store', 'exchange', 'index'];
let n = 0;
for (const css of cssFiles) {
  const txt = await readFile(css, 'utf8');
  for (const key of keys) {
    // global regex: capture the FULL selector chunk + its data URI
    const re = new RegExp('([.][^{}]*kv-link_box-' + key + '[^{}]*)\\{[^}]*?url\\(data:image/(\\w+);base64,([^)]+)\\)', 'g');
    let m, i = 0;
    while ((m = re.exec(txt)) !== null) {
      const sel = m[1].replace(/\s+/g, ' ').trim().slice(0, 70);
      const ext = m[2], b64 = m[3];
      const state = /hover|active|on\b|cur/i.test(sel) ? 'bright' : 'normal';
      const f = join(OUT, `nav-${key}-${state}${i ? '-' + i : ''}.${ext}`);
      await writeFile(f, Buffer.from(b64, 'base64'));
      console.log(`${key.padEnd(9)} [${state}] ${b64.length}b → ${f}\n   sel: ${sel}`);
      i++; n++;
    }
  }
}
console.log(`\nextracted ${n} data-URIs`);
