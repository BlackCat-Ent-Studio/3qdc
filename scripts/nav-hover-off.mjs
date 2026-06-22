// Disable the bright hover state of the 3 nav buttons: copy each button's NORMAL
// background data-URI into its :hover rule, so hovering shows the same (dark)
// image — no orange flash. Backs up the CSS first.
import { readdir, readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(dir, out = []) { for (const e of await readdir(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) await walk(p, out); else if (e.name.endsWith('.css')) out.push(p); } return out; }
const cssFiles = await walk('mirror');
const BAK = 'image-backup/css-nav-hover-off';
await mkdir(BAK, { recursive: true });
const keys = ['store', 'exchange', 'index'];
let done = 0;

for (const css of cssFiles) {
  let txt = await readFile(css, 'utf8');
  let changed = 0;
  for (const key of keys) {
    // NORMAL rule (no :hover): .star-site-fab-kv-link_box-<key>{...background:url(DATA)}
    const reNorm = new RegExp('\\.star-site-fab-kv-link_box-' + key + '\\b(?!:)[^{}]*\\{[^}]*?background:url\\((data:image/[a-z]+;base64,[^)]+)\\)');
    const reHover = new RegExp('(\\.star-site-fab-kv-link_box-' + key + ':hover\\{[^}]*?background:url\\()data:image/[a-z]+;base64,[^)]+(\\))');
    const mN = txt.match(reNorm);
    if (mN && reHover.test(txt)) {
      txt = txt.replace(reHover, `$1${mN[1]}$2`);
      changed++; done++;
    }
  }
  if (changed) { await copyFile(css, join(BAK, css.split(/[\\/]/).pop())); await writeFile(css, txt); console.log(`${changed} hover→normal in ${css.split(/[\\/]/).pop()}`); }
}
console.log(`hover disabled (=normal) for: ${done} button(s)`);
