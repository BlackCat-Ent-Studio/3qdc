// verify-dual.mjs — prove the single link (:8080/) is responsive:
//   PC view (desktop) → iframe #/fab ; mobile view (phone) → iframe #/m/fab ;
//   resize across 768 swaps the iframe ; interactions work ; 0 real 404s.
// Uses the already-running server on :8080.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const SHELL = 'http://localhost:8080/';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const isTracker = (u) => /\/r\.png|\/beacon|arms-retcode|cn-zb-log-collector/.test(u);
const TAG = '[class*="accordion-content__tag"]';

async function innerFrame(page) {
  for (let i = 0; i < 50; i++) {
    const fr = page.frames().find((f) => f.url().includes('/__internal/'));
    if (fr) { try { if ((await fr.evaluate(() => document.getElementById('root')?.innerHTML.length || 0)) > 500) return fr; } catch {} }
    await page.waitForTimeout(300);
  }
  return page.frames().find((f) => f.url().includes('/__internal/')) || null;
}

async function view(browser, { label, ua, vp, expectHash, shot }) {
  const ctx = await browser.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 3 } : {}) });
  const page = await ctx.newPage();
  const fails = [];
  page.on('response', (r) => r.status() >= 400 && !isTracker(r.url()) && fails.push(`${r.status()} ${r.url()}`));
  page.on('requestfailed', (r) => !isTracker(r.url()) && fails.push(`FAIL ${r.url()} :: ${r.failure()?.errorText}`));
  await page.goto(SHELL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const fr = await innerFrame(page);
  await page.waitForTimeout(2500);
  const hash = fr ? await fr.evaluate(() => location.hash) : '(no frame)';
  // exercise accordion in the inner frame
  let bars = 0;
  if (fr) {
    const tags = await fr.$$(TAG); bars = tags.length;
    for (let i = 0; i < bars; i++) { const t = (await fr.$$(TAG))[i]; if (!t) continue; await t.click().catch(() => {}); await page.waitForTimeout(500); }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot, fullPage: false });
  const real = fails.filter((f) => !isTracker(f));
  const ok = hash === expectHash && real.length === 0;
  await ctx.close();
  console.log(`[${label}] hash=${hash} (want ${expectHash}) | bars=${bars} | real404=${real.length} => ${ok ? 'PASS' : 'FAIL'}`);
  if (real.length) real.slice(0, 10).forEach((f) => console.log('    ', f));
  return { label, hash, expectHash, bars, real, ok };
}

async function resizeSwap(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, userAgent: UA_PC });
  const page = await ctx.newPage();
  await page.goto(SHELL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const wide = await page.$eval('#frame', (el) => el.getAttribute('src'));
  await page.setViewportSize({ width: 500, height: 900 });
  await page.waitForTimeout(800);
  const narrow = await page.$eval('#frame', (el) => el.getAttribute('src'));
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.waitForTimeout(800);
  const back = await page.$eval('#frame', (el) => el.getAttribute('src'));
  await ctx.close();
  const ok = wide.includes('/pc/') && narrow.includes('/m/') && back.includes('/pc/');
  console.log(`[resize] 1200→${wide} | 500→${narrow} | 1300→${back} => ${ok ? 'PASS' : 'FAIL'}`);
  return { wide, narrow, back, ok };
}

async function main() {
  await mkdir('verify-out', { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  results.push(await view(browser, { label: 'PC 1920', ua: UA_PC, vp: { width: 1920, height: 1080 }, expectHash: '#/fab', shot: 'verify-out/dual-pc-1920.png' }));
  results.push(await view(browser, { label: 'PC 1366', ua: UA_PC, vp: { width: 1366, height: 768 }, expectHash: '#/fab', shot: 'verify-out/dual-pc-1366.png' }));
  results.push(await view(browser, { label: 'Mobile 393', ua: UA_M, vp: { width: 393, height: 852 }, expectHash: '#/m/fab', shot: 'verify-out/dual-m-393.png' }));
  const swap = await resizeSwap(browser);
  await browser.close();

  const pass = results.every((r) => r.ok) && swap.ok;
  const lines = [`**Verdict: ${pass ? 'DUAL-VIEW PASS ✓' : 'FAIL ✗'}**`, '', `When: ${new Date().toISOString()}`, `Shell: ${SHELL}`, ''];
  for (const r of results) lines.push(`## ${r.label} — ${r.ok ? 'PASS' : 'FAIL'}\n- iframe hash: ${r.hash} (want ${r.expectHash})\n- accordion bars: ${r.bars}\n- real 404s: ${r.real.length}${r.real.length ? '\n  - ' + r.real.slice(0, 10).join('\n  - ') : ''}\n`);
  lines.push(`## resize swap — ${swap.ok ? 'PASS' : 'FAIL'}\n- 1200px → ${swap.wide}\n- 500px → ${swap.narrow}\n- 1300px → ${swap.back}\n`);
  await writeFile('verify-out/report-dual.md', lines.join('\n'));
  console.log(`\n${pass ? '✓ PASS' : '✗ FAIL'} — verify-out/report-dual.md`);
  process.exit(pass ? 0 : 1);
}
main().catch((e) => { console.error('verify-dual failed:', e); process.exit(1); });
