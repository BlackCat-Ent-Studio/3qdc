import { chromium } from 'playwright';
const b = await chromium.launch();
async function probe(label, url, ua, vp) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    return [...document.querySelectorAll('a')].map(a => ({
      href: a.getAttribute('href'),
      cls: String(a.className).slice(0, 45),
      neutered: !!a.getAttribute('data-mirror-neutered')
    })).filter(x => x.href && x.href !== '#');  // anything NOT neutered to '#'
  });
  console.log(`\n=== ${label}: ${r.length} link CÒN sống (href != #) ===`);
  r.forEach(x => console.log(`  href=${x.href}  neutered=${x.neutered}  cls=${x.cls}`));
  await ctx.close();
}
const UP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await probe('PC', 'http://localhost:3300/__internal/pc/', UP, { width: 1920, height: 1080 });
await probe('MOBILE', 'http://localhost:3300/__internal/m/', UM, { width: 393, height: 852 });
await b.close();
