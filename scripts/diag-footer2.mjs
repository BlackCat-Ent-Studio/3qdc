import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const out = await p.evaluate(() => {
  const docH = document.body.scrollHeight;
  const names = ['container___', 'wrapper___', 'side___', 'view___', 'summary___'];
  return names.map(n => {
    const e = document.querySelector('[class*="' + n + '"]');
    if (!e) return n + ': none';
    const r = e.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const containsHero = !!e.querySelector('.star-site-fab-kv-logo, [class*="accordion"], [class*="kv-"]');
    return `${e.className} | top=${Math.round(top)}/${docH} h=${Math.round(r.height)} | chứa hero/accordion: ${containsHero}`;
  });
});
out.forEach(l => console.log(l));
await b.close();
