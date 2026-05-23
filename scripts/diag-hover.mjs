// diag-hover.mjs — find assets that load only when interacting with the
// 版本内容 accordion (hover/click each bar). Compares live (what SHOULD load)
// vs clone (what 404s). Reveals lazy interaction assets capture missed.
import { chromium } from 'playwright';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
// Uses the already-running server on :8080 (started via `npm run serve`).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const TAG = '.star-site-accordion-content__tag';

async function waitRender(p) {
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
}

async function interact(p) {
  // scroll the accordion section into view, then hover+click every bar
  const tags = await p.$$(TAG);
  const n = tags.length;
  if (n) await tags[0].scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(500);
  for (let i = 0; i < n; i++) {
    const t = (await p.$$(TAG))[i];
    if (!t) continue;
    await t.hover().catch(() => {});
    await p.waitForTimeout(300);
    await t.click().catch(() => {});
    await p.waitForTimeout(700);
  }
  return n;
}

async function run(browser, url, label, collect404) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: UA, extraHTTPHeaders: { Referer: 'https://sgzhx.lingxigames.com/' } });
  const p = await ctx.newPage();
  const assets = new Set(), fails = [], errors = [];
  p.on('request', (r) => { if (['image', 'media', 'font', 'xhr', 'fetch'].includes(r.resourceType())) assets.add(r.url()); });
  if (collect404) {
    p.on('response', (r) => r.status() >= 400 && fails.push(`${r.status()} ${r.url()}`));
    p.on('requestfailed', (r) => { const u = r.url(); if (!/r\.png|\/beacon|arms-retcode|9game/.test(u)) fails.push(`FAIL ${u} :: ${r.failure()?.errorText}`); });
    p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  }
  for (let attempt = 1; ; attempt++) {
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); break; }
    catch (e) { if (attempt >= 3) throw e; await p.waitForTimeout(1500); }
  }
  await waitRender(p);
  const n = await interact(p);
  await p.waitForTimeout(1000);
  await ctx.close();
  console.log(`[${label}] accordion bars: ${n} | asset reqs: ${assets.size}` + (collect404 ? ` | 404/fail: ${fails.length} | console err: ${errors.length}` : ''));
  return { assets: [...assets], fails, errors };
}

const browser = await chromium.launch();

const live = await run(browser, 'https://sgzhx.lingxigames.com/#/fab', 'LIVE', false);
const clone = await run(browser, 'http://localhost:8080/#/fab', 'CLONE', true);

// which live assets are missing from our mirror?
function toLocal(u) {
  try { const x = new URL(u); if (x.hostname === 'localhost') return null;
    return join('mirror', x.hostname, x.pathname); } catch { return null; }
}
const missing = [];
for (const u of live.assets) {
  const local = toLocal(u);
  if (!local) continue;
  try { await access(local); } catch { missing.push(u); }
}

console.log('\n--- LIVE assets NOT present in mirror/ (' + missing.length + ') ---');
for (const m of missing) console.log('  ', m);
console.log('\n--- CLONE 404/failed during interaction (' + clone.fails.length + ') ---');
for (const f of clone.fails.slice(0, 40)) console.log('  ', f);
console.log('\n--- CLONE console errors (' + clone.errors.length + ') ---');
for (const e of clone.errors.slice(0, 20)) console.log('  ', e);

await browser.close();
