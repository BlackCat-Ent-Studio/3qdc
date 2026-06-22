// Replace the :hover (bright) state data-URI of nav buttons in CSS with VN versions.
// Only the keys passed on argv (default: exchange index) — store skipped (wrong content).
import { readdir, readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['exchange', 'index'];
const SRC = { store: 'nav-store-bright-1.jpg', exchange: 'nav-exchange-bright-1.jpg', index: 'nav-index-bright-1.jpg' };
const BAK = 'image-backup/css-nav-hover-pre-vi';
await mkdir(BAK, { recursive: true });

async function walk(dir, out = []) { for (const e of await readdir(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) await walk(p, out); else if (e.name.endsWith('.css')) out.push(p); } return out; }
const cssFiles = await walk('mirror');
let done = 0;
for (const css of cssFiles) {
  let txt = await readFile(css, 'utf8'); let changed = 0;
  for (const key of keys) {
    const re = new RegExp('(\\.star-site-fab-kv-link_box-' + key + ':hover\\{[^}]*?background:url\\()data:image/[a-z]+;base64,[^)]+(\\))');
    if (re.test(txt)) {
      const b64 = (await readFile(join('new site-image', SRC[key]))).toString('base64');
      txt = txt.replace(re, `$1data:image/jpeg;base64,${b64}$2`);
      changed++; done++;
    }
  }
  if (changed) { await copyFile(css, join(BAK, css.split(/[\\/]/).pop())); await writeFile(css, txt); console.log(`${changed} hover button(s) in ${css.split(/[\\/]/).pop()}`); }
}
console.log(`embedded hover states: ${keys.join(', ')} (${done})`);
