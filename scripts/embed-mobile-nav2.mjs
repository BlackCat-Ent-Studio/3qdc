// Replace remaining mobile nav base64 (store + index) in the mobile JS chunk.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

const JS = 'mirror/cdn-cn.lingxigames.com/wukongbuild/star-gw/1.0.0/prod/views/p__web_m__Fab__Fab.8e33ff58.async.js';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const navs = await p.evaluate(() => [...document.querySelectorAll('img')]
  .filter(i => { const r = i.getBoundingClientRect(); return Math.abs(r.top + window.scrollY - 79) < 5 && r.width < 120; })
  .map(i => i.getAttribute('src')));
await b.close();
// navs: 0=store, 1=exchange(already VN), 2=index

const storeVN = 'data:image/jpeg;base64,' + (await readFile('new site-image/nav-store.jpg')).toString('base64');
const indexVN = 'data:image/jpeg;base64,' + (await readFile('new site-image/nav-index.jpg')).toString('base64');

let txt = await readFile(JS, 'utf8');
let done = [];
if (navs[0] && txt.includes(navs[0])) { txt = txt.replace(navs[0], storeVN); done.push('store'); } else console.log('store old not found (maybe already replaced)');
if (navs[2] && txt.includes(navs[2])) { txt = txt.replace(navs[2], indexVN); done.push('index'); } else console.log('index old not found');
await writeFile(JS, txt);
console.log('replaced:', done.join(', ') || '(none)');
