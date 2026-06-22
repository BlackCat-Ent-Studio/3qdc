import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(3000);
for (const s of ['.star-site-fab-main-qrcode', '[class*="tel___"]', '.star-site-fab-kv-logo']) {
  const r = await p.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)];
    return { n: els.length, visible: els.filter(e => e.offsetParent !== null && e.getClientRects().length > 0).length };
  }, s);
  console.log(`${s}  → ${r.n} tồn tại, ${r.visible} đang hiện`);
}
await b.close();
