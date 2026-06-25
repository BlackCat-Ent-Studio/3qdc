// recap-person2 — thorough: drive the person swiper via its instance (slideToLoop)
// so EVERY hero (incl tail) lazy-loads its avatar, then click to fetch detail.
// Captures galaxias-api (data) + cloud (avatars/portraits) into unified mirror.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
const ORIGIN = 'https://sgzhx.lingxigames.com/';
const TARGET = ORIGIN + '#/main/person';
const MIRROR = 'C:\\web\\web1\\3qdc-unified\\mirror';
const HOSTS = new Set(['galaxias-api.lingxigames.com', 'cloud.lingxigames.com']);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const bk = (post) => (post ? '__b' + createHash('sha1').update(post).digest('hex').slice(0, 16) : '');
function urlToLocal(raw) { const u = new URL(raw); let p = u.pathname; if (p.endsWith('/')) p += 'index.html'; let l = join(MIRROR, u.hostname, p); if (u.search) l += '__' + u.search.slice(1).replace(/[^a-z0-9=&._-]/gi, '_'); return l; }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: UA, extraHTTPHeaders: { Referer: ORIGIN } });
const page = await ctx.newPage();
const seen = new Set(); const writes = []; let nApi = 0, nImg = 0;
page.on('response', (res) => { writes.push((async () => {
  const req = res.request(); if (res.status() < 200 || res.status() >= 300) return;
  let host = ''; try { host = new URL(res.url()).hostname; } catch { return; }
  if (!HOSTS.has(host)) return;
  const k = res.url() + bk(req.postData()); if (seen.has(k)) return; seen.add(k);
  try { const body = await res.body(); const l = urlToLocal(res.url()) + bk(req.postData()); await mkdir(dirname(l), { recursive: true }); await writeFile(l, body); host.startsWith('galaxias') ? nApi++ : nImg++; } catch {}
})()); });
await page.goto(TARGET, { waitUntil: 'load', timeout: 35000 });
await page.waitForSelector('[class$="tab-wrapper"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
const factions = await page.locator('[class$="tab-wrapper"]').count();
console.log('factions:', factions);
for (let f = 0; f < factions; f++) {
  if (f > 0) { await page.goto(TARGET, { waitUntil: 'load', timeout: 35000 }); await page.waitForSelector('[class$="tab-wrapper"]', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(2000); }
  await page.locator('[class$="tab-wrapper"]').nth(f).click({ timeout: 5000, force: true }).catch(() => {});
  await page.waitForTimeout(2500);
  const total = await page.evaluate(() => { const sw = document.querySelector('.star-site-person-battle-swiper')?.swiper; if (!sw) return 0; return new Set(sw.slides.map(s => s.getAttribute('data-swiper-slide-index'))).size; });
  let done = 0;
  for (let i = 0; i < total; i++) {
    await page.evaluate((idx) => { const sw = document.querySelector('.star-site-person-battle-swiper')?.swiper; if (sw) sw.slideToLoop(idx, 0); }, i);
    await page.waitForTimeout(500); // avatar lazy-load
    await page.locator('.swiper-slide-active img[alt="avater"]').click({ timeout: 2500, force: true }).catch(() => {});
    await page.waitForTimeout(1400); // detail cascade
    done++;
  }
  console.log(`  faction[${f}]: ${total} heroes, swept ${done}`);
}
await Promise.allSettled(writes);
await browser.close();
console.log(`done — API:${nApi} img:${nImg}`);
