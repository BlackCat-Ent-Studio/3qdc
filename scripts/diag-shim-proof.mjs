// diag-shim-proof.mjs — prove the UA-spoof shim forces #/m/fab under a DESKTOP UA.
// Loads the running local clone (:8080) with a desktop UA; control (no shim)
// should land on #/fab, shim (addInitScript) should land on #/m/fab.
import { chromium } from 'playwright';
import { SHIM_JS } from './lib/ua-spoof-shim.mjs';

const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const b = await chromium.launch();

async function go(withShim) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, userAgent: UA_PC });
  const p = await ctx.newPage();
  if (withShim) await p.addInitScript(SHIM_JS);
  await p.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 15000 }); } catch {}
  await p.waitForTimeout(2500);
  const hash = await p.evaluate(() => location.hash || '(none)');
  await ctx.close();
  return hash;
}

const ctrl = await go(false);
const shim = await go(true);
await b.close();
console.log(`control (desktop UA, no shim): ${ctrl}   ${ctrl === '#/fab' ? '(PC ✓ expected)' : ''}`);
console.log(`with UA-spoof shim:            ${shim}   ${shim === '#/m/fab' ? 'FORCED MOBILE ✓' : 'FAILED ✗ (still ' + shim + ')'}`);
process.exit(shim === '#/m/fab' ? 0 : 1);
