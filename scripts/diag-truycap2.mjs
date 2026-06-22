import { chromium } from 'playwright';
const b = await chromium.launch();
async function probe(label, url, ua, vp) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    // find elements whose class/bg points to the 进入官网 emblem (mjtehzy / book / kv-link...index) or labeled 官网/website
    const cand = [...document.querySelectorAll('*')].filter(e => {
      const c = String(e.className || '');
      const bg = getComputedStyle(e).backgroundImage || '';
      return /kv-link_box-index|book|enterOfficial|official|官网/i.test(c) || /mjtehzy|book-btn|book_btn/.test(bg);
    });
    return cand.slice(0, 12).map(e => ({
      tag: e.tagName, cls: String(e.className).slice(0, 40),
      href: e.getAttribute && e.getAttribute('href'),
      hasOnclick: !!e.onclick || e.hasAttribute('onclick'),
      neutered: e.getAttribute && !!e.getAttribute('data-mirror-neutered'),
      bg: (getComputedStyle(e).backgroundImage || '').slice(0, 30)
    }));
  });
  console.log(`\n=== ${label} — ứng viên nút truy cập web ===`);
  r.forEach(x => console.log(`  <${x.tag}> cls=${x.cls} href=${x.href} onclick=${x.hasOnclick} neutered=${x.neutered}`));
  await ctx.close();
}
const UP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await probe('PC', 'http://localhost:3300/__internal/pc/', UP, { width: 1920, height: 1080 });
await probe('MOBILE', 'http://localhost:3300/__internal/m/', UM, { width: 393, height: 852 });
await b.close();
