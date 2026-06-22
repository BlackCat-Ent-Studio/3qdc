import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const out = await p.evaluate(() => {
  const rows = [];
  [...document.querySelectorAll('*')].forEach(e => {
    const bg = getComputedStyle(e).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      let u = bg.match(/url\(["']?([^"')]+)/)?.[1] || '';
      const tag = u.startsWith('data:') ? `data:${u.slice(11, 25)}...(${u.length}b)` : u.split('/').pop();
      const r = e.getBoundingClientRect();
      rows.push({ cls: String(e.className).slice(0, 45), u: tag, top: Math.round(r.top + window.scrollY), vis: e.offsetParent !== null });
    }
  });
  return rows.filter(r => r.vis).sort((a, b) => a.top - b.top);
});
out.forEach(r => console.log(`top=${String(r.top).padStart(5)} | ${r.u.padEnd(40)} | ${r.cls}`));
await b.close();
