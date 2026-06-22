import { chromium } from 'playwright';
const b = await chromium.launch();
async function chk(label, url, ua, vp, sel) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
  const r = await p.evaluate((s) => { const e = [...document.querySelectorAll(s)]; return { n: e.length, vis: e.filter(x => x.offsetParent !== null).length }; }, sel);
  console.log(`${label} ${sel}: ${r.n} tồn tại, ${r.vis} đang hiện`);
  await ctx.close();
}
const UP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await chk('PC', 'http://localhost:3300/__internal/pc/', UP, { width: 1920, height: 1080 }, '.star-site-fab-kv-link_box');
await chk('MOBILE', 'http://localhost:3300/__internal/m/', UM, { width: 393, height: 852 }, '.btns___vyge_');
await b.close();
