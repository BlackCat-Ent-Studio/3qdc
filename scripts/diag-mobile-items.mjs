import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const out = await p.evaluate(() => {
  const res = { titleImgs: [], navLinks: [], bgWithData: [] };
  // 1) all <img> file srcs (non-data) — to find the mobile 版本内容 title
  [...document.querySelectorAll('img')].forEach(i => {
    const s = i.getAttribute('src') || '';
    if (s && !s.startsWith('data:')) res.titleImgs.push({ cls: i.className || i.parentElement?.className || '', file: s.split('/').pop() });
  });
  // 2) anchors that look like the 3 nav buttons (store/exchange/index)
  [...document.querySelectorAll('a')].forEach(a => {
    const h = a.getAttribute('href') || '';
    if (/shop\.lingxigames|r\.lingxigames|\/index|充值|兑换|官网/.test(h) || /exchange|store|index|recharge|nav/i.test(a.className)) {
      const bg = getComputedStyle(a).backgroundImage;
      res.navLinks.push({ cls: a.className, href: h.slice(0, 50), hasBgImg: bg && bg !== 'none' });
    }
  });
  // 3) elements whose bg is a data: image (base64 nav buttons on mobile?)
  [...document.querySelectorAll('*')].forEach(e => {
    const bg = getComputedStyle(e).backgroundImage;
    if (bg && bg.includes('data:image')) res.bgWithData.push(e.className);
  });
  return res;
});
console.log('--- mobile <img> files (looking for 版本内容 title) ---');
out.titleImgs.forEach(t => console.log('  ', t.file, '   cls:', String(t.cls).slice(0,50)));
console.log('\n--- mobile nav-like links ---');
out.navLinks.forEach(n => console.log('  cls:', String(n.cls).slice(0,40), '| href:', n.href, '| bgImg:', n.hasBgImg));
console.log('\n--- elements with data:image bg (base64) ---');
[...new Set(out.bgWithData)].slice(0,20).forEach(c => console.log('  ', String(c).slice(0,60)));
await b.close();
