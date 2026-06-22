import { chromium } from 'playwright';
const b = await chromium.launch();
const sels = ['.star-site-fab-main-qrcode', '[class*="tel___"]', '.star-site-fab-kv-logo', '.star-site-fab-main-qrcode-ul'];
async function probe(label, url, ua, vp) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
  console.log(`\n=== ${label} ===`);
  for (const s of sels) {
    const info = await p.evaluate((sel) => {
      const els = [...document.querySelectorAll(sel)];
      return els.slice(0, 4).map(e => (e.tagName + ' "' + (e.innerText || e.getAttribute('alt') || '').replace(/\s+/g, ' ').slice(0, 60) + '"'));
    }, s);
    console.log(`  ${s}  → ${info.length} match`);
    info.forEach(t => console.log('      ', t));
  }
  await ctx.close();
}
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await probe('PC', 'http://localhost:3300/__internal/pc/', UA_PC, { width: 1920, height: 1080 });
await probe('MOBILE', 'http://localhost:3300/__internal/m/', UA_M, { width: 393, height: 852 });
await b.close();
