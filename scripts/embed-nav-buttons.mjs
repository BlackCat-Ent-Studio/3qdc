// embed-nav-buttons.mjs — replace the 3 nav button base64 data-URIs in the CSS
// with the Vietnamese versions from new site-image/. Non-destructive: backs up
// the CSS first. Each class' `url(data:image/png;base64,...)` → new jpeg data URI.
import { readFile, writeFile, readdir, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const NEWDIR = 'new site-image';
const BAK = 'image-backup\\css-nav-pre-vi';
const MAP = {
  'kv-link_box-store': 'nav-store.jpg',
  'kv-link_box-exchange': 'nav-exchange.jpg',
  'kv-link_box-index': 'nav-index.jpg',
};

// find CSS files under mirror that contain the classes
async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith('.css')) out.push(p);
  }
  return out;
}

const cssFiles = await walk('mirror');
await mkdir(BAK, { recursive: true });
let totalReplaced = 0;

for (const css of cssFiles) {
  let txt = await readFile(css, 'utf8');
  let changed = 0;
  for (const [cls, imgName] of Object.entries(MAP)) {
    // match: .star-site-fab-<cls>{ ... background:url(data:image/...;base64,XXXX)
    const re = new RegExp('(\\.star-site-fab-' + cls.replace(/[-]/g, '\\-') + '\\b[^}]*?background:url\\()data:image\\/[a-z]+;base64,[^)]+(\\))');
    if (re.test(txt)) {
      const b64 = (await readFile(join(NEWDIR, imgName))).toString('base64');
      txt = txt.replace(re, `$1data:image/jpeg;base64,${b64}$2`);
      changed++;
    }
  }
  if (changed) {
    const bakPath = join(BAK, css.split(/[\\/]/).pop());
    try { await copyFile(css, bakPath); } catch {}
    await writeFile(css, txt);
    totalReplaced += changed;
    console.log(`  ${changed} nav button(s) embedded in ${css.replace(/\\/g, '/').replace('mirror/', '')}`);
  }
}
console.log(`\nTotal nav buttons embedded: ${totalReplaced}/3 (backup: ${BAK})`);
