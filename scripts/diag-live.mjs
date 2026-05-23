// diag-live.mjs — confirm the deployed public URL renders both views over HTTPS.
import { chromium } from 'playwright';
const URL = 'https://3qdc.wanmeivn.com/';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const b = await chromium.launch();
async function check(label, ua, vp, want) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 3 } : {}) });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
  let hash = '(none)', rootLen = 0;
  for (let i = 0; i < 40; i++) {
    const fr = p.frames().find((f) => f.url().includes('/__internal/'));
    if (fr) { try { rootLen = await fr.evaluate(() => document.getElementById('root')?.innerHTML.length || 0); if (rootLen > 500) { hash = await fr.evaluate(() => location.hash); break; } } catch {} }
    await p.waitForTimeout(300);
  }
  await ctx.close();
  const ok = hash === want && rootLen > 500;
  console.log(`[${label}] iframe hash=${hash} (want ${want}) root=${rootLen} => ${ok ? 'PASS' : 'FAIL'}`);
  return ok;
}
const a = await check('PC 1920', UA_PC, { width: 1920, height: 1080 }, '#/fab');
const m = await check('Mobile 393', UA_M, { width: 393, height: 852 }, '#/m/fab');
await b.close();
console.log(a && m ? '\n✓ LIVE dual-view PASS' : '\n✗ FAIL');
process.exit(a && m ? 0 : 1);
