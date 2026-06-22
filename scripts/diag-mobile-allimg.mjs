import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const out = await p.evaluate(() => {
  return [...document.querySelectorAll('img')].filter(i => i.offsetParent !== null).map((i, idx) => {
    const s = i.getAttribute('src') || '';
    const r = i.getBoundingClientRect();
    return { idx, top: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height), cls: String(i.className || i.parentElement?.className || '').slice(0, 40), type: s.startsWith('data:') ? `data(${s.length}b)` : s.split('/').pop(), data: s.startsWith('data:') ? s : '' };
  }).sort((a, b) => a.top - b.top);
});
await mkdir('site-images\\mobile-data-imgs', { recursive: true });
let saved = 0;
for (const r of out) {
  let extra = '';
  if (r.data && r.w > 40) { // save sizable data-URI imgs for inspection
    const m = r.data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (m) { const f = `site-images\\mobile-data-imgs\\m${r.top}-${r.idx}.${m[1]}`; await writeFile(f, Buffer.from(m[2], 'base64')); extra = ' → ' + f; saved++; }
  }
  console.log(`top=${String(r.top).padStart(5)} ${String(r.w)}x${r.h} | ${r.type.padEnd(28)} | ${r.cls}${extra}`);
}
console.log(`\nsaved ${saved} data-URI imgs to site-images/mobile-data-imgs/`);
await b.close();
