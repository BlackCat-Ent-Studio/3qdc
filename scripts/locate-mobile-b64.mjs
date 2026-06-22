// Grab the exact data-URI for the mobile title + exchange nav img, take a unique
// marker, and find which mirror file embeds it (JS chunk vs CSS).
import { chromium } from 'playwright';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const markers = await p.evaluate(() => {
  const out = {};
  const t = document.querySelector('.title___1Zo6r img') || document.querySelector('.title___1Zo6r');
  const titleSrc = t && t.tagName === 'IMG' ? t.getAttribute('src') : (t ? getComputedStyle(t).backgroundImage : '');
  out.title = (titleSrc || '').replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
  // the 3 small nav imgs at top ~79
  const navs = [...document.querySelectorAll('img')].filter(i => { const r = i.getBoundingClientRect(); return Math.abs(r.top + window.scrollY - 79) < 5 && r.width < 120; }).map(i => i.getAttribute('src'));
  out.navs = navs;
  return out;
});
await b.close();

function marker(dataUri) { const m = dataUri && dataUri.match(/base64,(.+)$/); return m ? m[1].slice(40, 100) : null; }
const titleM = marker(markers.title);
const exchangeM = marker(markers.navs[1]); // 0=store,1=exchange,2=index

// search mirror JS + CSS for the markers
async function walk(dir, out = []) { for (const e of await readdir(dir, { withFileTypes: true })) { const pth = join(dir, e.name); if (e.isDirectory()) await walk(pth, out); else if (/\.(js|css)$/.test(e.name)) out.push(pth); } return out; }
const files = await walk('mirror');
for (const [name, mk] of [['TITLE', titleM], ['EXCHANGE', exchangeM]]) {
  console.log(`\n=== ${name} marker: ${mk ? mk.slice(0, 30) + '...' : '(none)'} ===`);
  if (!mk) continue;
  for (const f of files) { const txt = await readFile(f, 'utf8'); if (txt.includes(mk)) console.log('  FOUND in', f.replace(/\\/g, '/').replace('mirror/', '')); }
}
console.log('\nnav count:', markers.navs.length);
