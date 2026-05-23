// capture.mjs — Phase 2: persist the live /fab runtime asset graph into mirror/.
//   - entry document  -> mirror/index.html
//   - every other 2xx -> mirror/<host>/<path>[__<query>]
//   - dynamic JSON     -> snapshotted same way, flagged in manifest
//   - trackers/beacons -> recorded in manifest, NOT written to disk
// Wait strategy: 'load' + poll #root + settle (NEVER networkidle — beacons keep it open).
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ORIGIN = 'https://sgzhx.lingxigames.com/';
const MIRROR = 'mirror';

// Route config — `node scripts/capture.mjs [pc|m]` (default pc). Mobile pass
// uses an iPhone UA + phone viewport so the app self-routes to #/m/fab.
const ROUTES = {
  pc: {
    target: 'https://sgzhx.lingxigames.com/#/fab',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    shot: 'audit-out/fab-1920.png',
    manifest: 'audit-out/manifest.json',
  },
  m: {
    target: 'https://sgzhx.lingxigames.com/#/m/fab',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852, isMobile: true, deviceScaleFactor: 3 },
    shot: 'audit-out/m-fab-393.png',
    manifest: 'audit-out/manifest-m.json',
  },
};
const ROUTE = process.argv[2] === 'm' ? 'm' : 'pc';
const CFG = ROUTES[ROUTE];
const TARGET = CFG.target;
const UA = CFG.ua;

// Hosts whose payloads are pure tracking — record but never persist/serve.
const TRACKER_HOSTS = new Set(['cn-zb-log-collector.9game.cn', 'arms-retcode.aliyuncs.com']);
// Script files that are trackers (stubbed in Phase 3, not needed on disk now).
const TRACKER_FILE = /\/(grey|bl)\.js(\?|$)/;

function urlToLocal(rawUrl, isDocument) {
  if (isDocument) return join(MIRROR, 'index.html');
  const u = new URL(rawUrl);
  let p = u.pathname;
  if (p.endsWith('/')) p += 'index.html';
  let local = join(MIRROR, u.hostname, p);
  if (u.search) {
    const q = u.search.slice(1).replace(/[^a-z0-9=&._-]/gi, '_');
    local += '__' + q;
  }
  return local;
}

async function main() {
  await mkdir('audit-out', { recursive: true });
  await mkdir(MIRROR, { recursive: true });

  console.log(`route: ${ROUTE}  (${TARGET})`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: CFG.viewport,
    userAgent: UA,
    extraHTTPHeaders: { Referer: ORIGIN },
  });
  const page = await context.newPage();

  const manifest = [];
  const writes = [];
  const seen = new Set();

  page.on('response', (res) => {
    writes.push(
      (async () => {
        const req = res.request();
        const url = res.url();
        const status = res.status();
        const type = req.resourceType();
        const ct = (res.headers()['content-type'] || '').split(';')[0];
        const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
        const isDocument = type === 'document' && req.isNavigationRequest() && url.startsWith(ORIGIN);
        const tracker = TRACKER_HOSTS.has(host) || type === 'ping' || TRACKER_FILE.test(url);
        const dynamic = type === 'xhr' || type === 'fetch' || ct.includes('json');

        const entry = { url, host, status, type, ct, dynamic, tracker, local: null };

        // Persist only successful, non-tracker, body-bearing responses, once each.
        if (status >= 200 && status < 300 && !tracker && !seen.has(url)) {
          seen.add(url);
          try {
            const body = await res.body();
            const local = urlToLocal(url, isDocument);
            await mkdir(dirname(local), { recursive: true });
            await writeFile(local, body);
            entry.local = local.replace(/\\/g, '/');
          } catch (e) {
            entry.error = e.message.split('\n')[0];
          }
        }
        manifest.push(entry);
      })()
    );
  });

  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => errors.push(`FAILED ${r.url()} :: ${r.failure()?.errorText}`));

  console.log('→ navigating', TARGET);
  await page.goto(TARGET, { waitUntil: 'load', timeout: 30000 });
  try {
    await page.waitForFunction(
      () => (document.getElementById('root')?.innerHTML.length || 0) > 500,
      { timeout: 20000 }
    );
  } catch {
    console.log('#root did not populate within 20s — capturing whatever rendered');
  }
  // settle + a scroll pass to trigger any viewport-lazy assets
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: CFG.shot, fullPage: true });
  await Promise.allSettled(writes);
  await browser.close();

  // ---- manifest summary ----
  const persisted = manifest.filter((m) => m.local);
  const dynamics = manifest.filter((m) => m.dynamic);
  const trackers = manifest.filter((m) => m.tracker);
  const summary = {
    target: TARGET,
    capturedAt: new Date().toISOString(),
    totals: { responses: manifest.length, persisted: persisted.length, dynamic: dynamics.length, tracker: trackers.length },
    hosts: [...new Set(persisted.map((m) => m.host))],
    dynamicEndpoints: dynamics.map((m) => ({ url: m.url, local: m.local, status: m.status })),
    trackers: trackers.map((m) => m.url),
    entries: manifest,
  };
  await writeFile(CFG.manifest, JSON.stringify(summary, null, 2));

  console.log(`\nResponses: ${manifest.length} | persisted: ${persisted.length} | dynamic: ${dynamics.length} | tracker(skip): ${trackers.length}`);
  console.log('Hosts mirrored:', summary.hosts.join(', '));
  console.log('Dynamic endpoints (snapshotted):');
  for (const d of summary.dynamicEndpoints) console.log('  ', d.local || '(not persisted)', '←', d.url);
  if (errors.length) { console.log('\nErrors/failed:'); for (const e of errors) console.log('  ', e); }
  const anyErr = persisted.some((m) => m.error);
  console.log(anyErr ? '\n⚠ some writes errored — see manifest' : '\n✓ all persisted writes OK');
}

main().catch((e) => { console.error('capture failed:', e); process.exit(1); });
