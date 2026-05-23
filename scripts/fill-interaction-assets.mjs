// fill-interaction-assets.mjs — capture interaction-lazy assets that the
// initial visit never requested. Drives the LIVE /fab page (scroll + click/hover
// every accordion bar), collects asset URLs, and additively downloads any that
// are missing from mirror/. Does NOT overwrite existing files.
import { chromium } from 'playwright';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';

// `node scripts/fill-interaction-assets.mjs [pc|m]` (default pc).
const ROUTE = process.argv[2] === 'm' ? 'm' : 'pc';
const ROUTES = {
  pc: { url: 'https://sgzhx.lingxigames.com/#/fab', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36', vp: { width: 1920, height: 1080 } },
  m:  { url: 'https://sgzhx.lingxigames.com/#/m/fab', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', vp: { width: 393, height: 852, isMobile: true, deviceScaleFactor: 3 } },
};
const LIVE = ROUTES[ROUTE].url;
const REFERER = 'https://sgzhx.lingxigames.com/';
const UA = ROUTES[ROUTE].ua;
// broad selector catches both PC (.star-site-accordion-content__tag) and mobile variants
const TAG = '[class*="accordion-content__tag"]';
// hosts we self-host; everything else (trackers, outbound) is left live
const ASSET_HOSTS = new Set(['cdn-cn.lingxigames.com', 'cdn.aligames.com']);
const exists = (p) => access(p).then(() => true).catch(() => false);

function urlToLocal(rawUrl) {
  const u = new URL(rawUrl);
  if (!ASSET_HOSTS.has(u.hostname)) return null;
  let p = u.pathname;
  if (p.endsWith('/')) p += 'index.html';
  let local = join('mirror', u.hostname, p);
  if (u.search) local += '__' + u.search.slice(1).replace(/[^a-z0-9=&._-]/gi, '_');
  return local;
}

async function interact(p) {
  // full-page scroll to trigger viewport-lazy images
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(500);
  // hover + click every accordion bar
  const n = (await p.$$(TAG)).length;
  for (let i = 0; i < n; i++) {
    const t = (await p.$$(TAG))[i];
    if (!t) continue;
    await t.scrollIntoViewIfNeeded().catch(() => {});
    await t.hover().catch(() => {});
    await p.waitForTimeout(250);
    await t.click().catch(() => {});
    await p.waitForTimeout(700);
  }
  return n;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: ROUTES[ROUTE].vp, userAgent: UA, extraHTTPHeaders: { Referer: REFERER } });
const page = await ctx.newPage();
const urls = new Set();
page.on('request', (r) => { if (['image', 'media', 'font'].includes(r.resourceType())) urls.add(r.url()); });

for (let attempt = 1; ; attempt++) {
  try { await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 45000 }); break; }
  catch (e) { if (attempt >= 3) throw e; await page.waitForTimeout(1500); }
}
try { await page.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await page.waitForTimeout(2000);
const bars = await interact(page);
await page.waitForTimeout(800);
await browser.close();

// diff + download
let have = 0, got = 0; const failed = [];
for (const u of urls) {
  const local = urlToLocal(u);
  if (!local) continue;
  if (await exists(local)) { have++; continue; }
  try {
    const res = await fetch(u, { headers: { Referer: REFERER } });
    if (!res.ok) throw new Error('status ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(local), { recursive: true });
    await writeFile(local, buf);
    got++;
    console.log(`  + ${local.replace(/\\/g, '/').replace('mirror/', '')} (${buf.length} B)`);
  } catch (e) { failed.push(`${u} :: ${e.message}`); }
}

console.log(`\naccordion bars exercised: ${bars} | asset URLs seen: ${urls.size} | already had: ${have} | downloaded: ${got} | failed: ${failed.length}`);
if (failed.length) { console.log('Failed:'); for (const f of failed) console.log('  -', f); }
