// recap-person.mjs — re-capture hero detail data for /#/main/person from the LIVE
// origin, writing ONLY API (galaxias-api) + hero art (cloud) into the UNIFIED mirror
// (body-keyed). Sweeps all factions + every avatar so each hero's detail snapshots.
// Whitelisted hosts → never clobbers localized assets/chunks.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const ORIGIN = 'https://sgzhx.lingxigames.com/';
const TARGET = ORIGIN + '#/main/person';
const MIRROR = 'C:\\web\\web1\\3qdc-unified\\mirror';
const HOSTS = new Set(['galaxias-api.lingxigames.com', 'cloud.lingxigames.com']);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const bodyKeyOf = (post) => (post ? '__b' + createHash('sha1').update(post).digest('hex').slice(0, 16) : '');

function urlToLocal(rawUrl) {
  const u = new URL(rawUrl);
  let p = u.pathname; if (p.endsWith('/')) p += 'index.html';
  let local = join(MIRROR, u.hostname, p);
  if (u.search) local += '__' + u.search.slice(1).replace(/[^a-z0-9=&._-]/gi, '_');
  return local;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: UA, extraHTTPHeaders: { Referer: ORIGIN } });
const page = await ctx.newPage();
const seen = new Set();
const writes = [];
let nApi = 0, nImg = 0;
page.on('response', (res) => {
  writes.push((async () => {
    const req = res.request(); const url = res.url(), status = res.status();
    if (status < 200 || status >= 300) return;
    let host = ''; try { host = new URL(url).hostname; } catch { return; }
    if (!HOSTS.has(host)) return; // surgical: only data + hero art
    const bk = bodyKeyOf(req.postData());
    const dedup = url + bk; if (seen.has(dedup)) return; seen.add(dedup);
    try {
      const body = await res.body();
      const local = urlToLocal(url) + bk;
      await mkdir(dirname(local), { recursive: true });
      await writeFile(local, body);
      if (host.startsWith('galaxias')) nApi++; else nImg++;
    } catch {}
  })());
});

console.log('→ crawling live person, 4 factions…');
await page.goto(TARGET, { waitUntil: 'load', timeout: 35000 });
await page.waitForSelector('[class$="tab-wrapper"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
const factions = await page.locator('[class$="tab-wrapper"]').count();
console.log('faction tabs:', factions);
for (let f = 0; f < factions; f++) {
  if (f > 0) {
    await page.goto(TARGET, { waitUntil: 'load', timeout: 35000 });
    await page.waitForSelector('[class$="tab-wrapper"]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  await page.locator('[class$="tab-wrapper"]').nth(f).click({ timeout: 5000, force: true }).catch(() => {});
  await page.waitForTimeout(2500);
  // unique hero slides (swiper loop mode duplicates DOM slides → key by index)
  const uniq = await page.evaluate(() => {
    const s = new Set(); document.querySelectorAll('.swiper-slide[data-swiper-slide-index]').forEach(e => s.add(e.getAttribute('data-swiper-slide-index'))); return s.size;
  });
  let clicked = 0;
  for (let i = 0; i < uniq; i++) {
    // force-click the real slide (triggers app's hero-select handler → detail API fires)
    const h = await page.$(`.swiper-slide[data-swiper-slide-index="${i}"] img[alt="avater"]`);
    if (h) { await h.click({ timeout: 2500, force: true }).catch(() => {}); clicked++; }
    await page.waitForTimeout(1500); // live latency: main detail (~8KB) + skill (tbId) cascade
  }
  console.log(`  faction[${f}]: ${uniq} heroes, clicked ${clicked}`);
}
await Promise.allSettled(writes);
await browser.close();
console.log(`done — API:${nApi} img:${nImg} written to unified mirror`);
