// diag-force-route.mjs — can we force a route under a MISMATCHED UA?
// Critical for the iframe-shell: a desktop browser narrowed must be able to
// load #/m/fab and KEEP it (not get UA-redirected back to #/fab).
import { chromium } from 'playwright';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const cases = [
  { label: 'FORCE #/m/fab  w/ DESKTOP UA @ 500w', url: 'https://sgzhx.lingxigames.com/#/m/fab', ua: UA_PC, vp: { width: 500, height: 900 } },
  { label: 'FORCE #/m/fab  w/ DESKTOP UA @ 1920', url: 'https://sgzhx.lingxigames.com/#/m/fab', ua: UA_PC, vp: { width: 1920, height: 1080 } },
  { label: 'FORCE #/fab    w/ MOBILE UA  @ 393',  url: 'https://sgzhx.lingxigames.com/#/fab',   ua: UA_M,  vp: { width: 393, height: 852, isMobile: true } },
];
const b = await chromium.launch();
for (const c of cases) {
  const ctx = await b.newContext({ viewport: c.vp, userAgent: c.ua });
  const p = await ctx.newPage();
  try {
    for (let a = 1; ; a++) { try { await p.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 40000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(1500); } }
    await p.waitForTimeout(3500);
    const hash = await p.evaluate(() => location.hash || '(none)');
    const held = hash === new URL(c.url).hash;
    console.log(`[${c.label}]\n   final hash: ${hash}  => ${held ? 'HELD ✓ (route honored regardless of UA)' : 'REDIRECTED ✗ (UA wins)'}`);
  } catch (e) { console.log(`[${c.label}]  ERROR ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
