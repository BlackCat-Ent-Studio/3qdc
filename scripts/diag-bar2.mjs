import { chromium } from 'playwright';
const b = await chromium.launch();
async function probe(label, url, ua, vp) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(3000);
  const info = await p.evaluate(() => {
    const out = [];
    // every accordion tag/strip + any img inside, report the image URL
    document.querySelectorAll('[class*="accordion-content__tag"], [class*="accordion"] li, [class*="accordion"] img').forEach((el, i) => {
      const tag = el.tagName;
      const cls = el.className;
      let url = '';
      if (tag === 'IMG') url = el.currentSrc || el.src;
      else { const bg = getComputedStyle(el).backgroundImage; const m = bg && bg.match(/url\(["']?([^"')]+)/); if (m) url = m[1]; }
      if (url) out.push(`${i} <${tag}> ${String(cls).slice(0,40)} -> ${url.split('/').pop()}`);
    });
    return out;
  });
  console.log(`\n=== ${label} ===`);
  info.forEach((l) => console.log(' ', l));
  await ctx.close();
}
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await probe('PC', 'http://localhost:3300/__internal/pc/', UA_PC, { width: 1920, height: 1080 });
await probe('MOBILE', 'http://localhost:3300/__internal/m/', UA_M, { width: 393, height: 852 });
await b.close();
