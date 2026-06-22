import { chromium } from 'playwright';
const b = await chromium.launch();
async function shot(label, url, ua, vp, file) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}), bypassCSP: true });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(3000);
  // scroll accordion into view
  const el = await p.$('[class*="accordion"]');
  if (el) await el.scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(1200);
  await p.screenshot({ path: file });
  await ctx.close();
  console.log(label, '→', file);
}
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await shot('PC', 'http://localhost:3300/__internal/pc/', UA_PC, { width: 1920, height: 1080 }, 'verify-out/bars-pc.png');
await shot('Mobile', 'http://localhost:3300/__internal/m/', UA_M, { width: 393, height: 852 }, 'verify-out/bars-mobile.png');
await b.close();
