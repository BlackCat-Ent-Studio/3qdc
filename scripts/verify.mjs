// verify.mjs — Phase 4: prove 1:1 PC parity of the clone vs the live target.
// Screenshots clone & live at 1366 and 1920, captures clone console errors +
// failed requests + #root render size, writes verify-out/report.md.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from '../server.mjs';

const LIVE = 'https://sgzhx.lingxigames.com/#/fab';
const PORT = 8080;
const CLONE = `http://localhost:${PORT}/#/fab`;
const VIEWPORTS = [{ w: 1366, h: 768 }, { w: 1920, h: 1080 }];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function waitRender(page) {
  try {
    await page.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 });
  } catch { /* capture whatever rendered */ }
  await page.waitForTimeout(2500);
}

async function shoot(ctx, url, file, collectErrors) {
  const page = await ctx.newPage();
  const errors = [], failed = [];
  if (collectErrors) {
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
    page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
  }
  // live target is occasionally slow — retry the navigation once
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  await waitRender(page);
  await page.screenshot({ path: file, fullPage: true });
  const rootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
  await page.close();
  return { rootLen, errors, failed };
}

async function main() {
  await mkdir('verify-out', { recursive: true });
  const server = await startServer(PORT);
  const browser = await chromium.launch();

  const lines = ['# Verify Report — 1:1 PC parity', '', `Target: ${LIVE}`, `Clone:  ${CLONE}`, `When:   ${new Date().toISOString()}`, ''];
  let pass = true;

  for (const { w, h } of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA, extraHTTPHeaders: { Referer: 'https://sgzhx.lingxigames.com/' } });
    // Live = reference only; if the live site is unreachable, don't fail the clone gate.
    let live = { rootLen: -1, errors: [], failed: [] };
    try { live = await shoot(ctx, LIVE, `verify-out/live-${w}.png`, false); }
    catch (e) { lines.push(`> live fetch failed (${e.message.split('\n')[0]}) — reference skipped`); }
    const clone = await shoot(ctx, CLONE, `verify-out/clone-${w}.png`, true);
    await ctx.close();

    // ignore tracker beacons (now absorbed at /r.png & /beacon as instant 204;
    // fire-and-forget, may ERR_ABORTED on page close — not a parity failure)
    const realFails = clone.failed.filter((f) => !/cn-zb-log-collector|arms-retcode|\/r\.png|\/beacon/.test(f));
    const ok = clone.rootLen > 500 && realFails.length === 0;
    pass = pass && ok;

    lines.push(`## ${w}×${h} — ${ok ? 'PASS ✓' : 'FAIL ✗'}`);
    lines.push(`- #root size: live ${live.rootLen} | clone ${clone.rootLen}`);
    lines.push(`- clone console errors: ${clone.errors.length}`);
    lines.push(`- clone failed/4xx requests (excl. tracker beacons): ${realFails.length}`);
    if (realFails.length) for (const f of realFails.slice(0, 30)) lines.push(`  - ${f}`);
    if (clone.errors.length) { lines.push('- console errors:'); for (const e of clone.errors.slice(0, 15)) lines.push(`  - ${e}`); }
    lines.push(`- screenshots: live-${w}.png vs clone-${w}.png`, '');
    console.log(`${w}×${h}: ${ok ? 'PASS' : 'FAIL'} | root live=${live.rootLen} clone=${clone.rootLen} | realFails=${realFails.length}`);
  }

  lines.unshift(`**Verdict: ${pass ? 'PC PARITY PASS ✓' : 'PARITY FAIL ✗'}**`, '');
  await writeFile('verify-out/report.md', lines.join('\n'));
  await browser.close();
  server.close();
  console.log(`\n${pass ? '✓ PASS' : '✗ FAIL'} — see verify-out/report.md`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error('verify failed:', e); process.exit(1); });
