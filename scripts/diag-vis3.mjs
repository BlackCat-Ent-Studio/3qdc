import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const f = document.querySelector('.container___1rGy1');
  const heroVis = !!document.querySelector('[class*="accordion"]')?.offsetParent;
  return { footer: f ? (f.offsetParent !== null ? 'CÒN HIỆN' : 'đã ẩn') : 'không thấy', accordionStillVisible: heroVis };
});
console.log(`footer .container___1rGy1: ${r.footer}`);
console.log(`accordion (phần nội dung trên) còn hiện: ${r.accordionStillVisible}`);
await b.close();
