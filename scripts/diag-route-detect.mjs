// diag-route-detect.mjs — does a bare visit auto-route to PC (#/fab) vs mobile (#/m/fab)?
import { chromium } from 'playwright';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const cases = [
  { label: 'desktop UA + 1920', ua: UA_PC, vp: { width: 1920, height: 1080 } },
  { label: 'mobile UA + 393',  ua: UA_M, vp: { width: 393, height: 852, isMobile: true } },
  { label: 'desktop UA + 600 (narrow)', ua: UA_PC, vp: { width: 600, height: 900 } },
];
const b = await chromium.launch();
for (const c of cases) {
  const ctx = await b.newContext({ viewport: c.vp, userAgent: c.ua });
  const p = await ctx.newPage();
  try {
    for (let a = 1; ; a++) { try { await p.goto('https://sgzhx.lingxigames.com/', { waitUntil: 'domcontentloaded', timeout: 40000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(1500); } }
    await p.waitForTimeout(3500);
    console.log(`[${c.label}]  final hash: ${await p.evaluate(() => location.hash || '(none)')}`);
  } catch (e) { console.log(`[${c.label}]  ERROR ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
