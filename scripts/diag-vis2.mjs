import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const els = [...document.querySelectorAll('[class*="summary___"]')];
  return { n: els.length, vis: els.filter(e => e.offsetParent !== null).length };
});
console.log(`summary footer → ${r.n} tồn tại, ${r.vis} đang hiện`);
// also confirm privacy/ToS links above still visible
const links = await p.evaluate(() => [...document.querySelectorAll('[class*="view___"] a')].filter(a => a.offsetParent !== null).length);
console.log(`các link Chính sách/Điều khoản còn hiện: ${links}`);
await b.close();
