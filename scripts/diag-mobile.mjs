// diag-mobile.mjs — probe the LIVE mobile route #/m/fab at a phone viewport.
// Confirms it's a distinct route, lists the assets it loads, diffs vs mirror/,
// and screenshots it. Read-only investigation.
import { chromium } from 'playwright';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const URL_M = 'https://sgzhx.lingxigames.com/#/m/fab';
const REFERER = 'https://sgzhx.lingxigames.com/';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ASSET_HOSTS = new Set(['cdn-cn.lingxigames.com', 'cdn.aligames.com']);
const exists = (p) => access(p).then(() => true).catch(() => false);

await mkdir('audit-out', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852, isMobile: true, deviceScaleFactor: 3 }, userAgent: UA_M, extraHTTPHeaders: { Referer: REFERER } });
const p = await ctx.newPage();
const reqs = [];
p.on('request', (r) => reqs.push({ url: r.url(), type: r.resourceType() }));

for (let a = 1; ; a++) { try { await p.goto(URL_M, { waitUntil: 'domcontentloaded', timeout: 45000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(1500); } }
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
await p.waitForTimeout(1500);

const finalUrl = p.url();
const rootLen = await p.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
await p.screenshot({ path: 'audit-out/m-fab-393.png', fullPage: true });

// distinct chunks for the mobile route?
const chunks = [...new Set(reqs.filter(r => /\.(js|css)$/.test(r.url.split('?')[0])).map(r => r.url.split('/').pop()))];
const mobileChunks = chunks.filter(c => /m[_-]|mobile|__m_|p__m/i.test(c));
// asset diff
const assetUrls = [...new Set(reqs.filter(r => ['image', 'media', 'font'].includes(r.type)).map(r => r.url))];
const missing = [];
for (const u of assetUrls) {
  try { const x = new URL(u); if (!ASSET_HOSTS.has(x.hostname)) continue; const local = join('mirror', x.hostname, x.pathname); if (!(await exists(local))) missing.push(u); } catch {}
}
await b.close();

console.log('final URL:', finalUrl);
console.log('#root rendered:', rootLen, rootLen > 500 ? '(distinct route renders ✓)' : '(blank/redirected ✗)');
console.log('total requests:', reqs.length, '| js/css chunks:', chunks.length, '| asset urls:', assetUrls.length);
console.log('\nchunks with mobile-ish names:'); for (const c of (mobileChunks.length ? mobileChunks : ['(none obviously mobile-named)'])) console.log('  ', c);
console.log('\nALL js/css chunks loaded:'); for (const c of chunks) console.log('  ', c);
console.log('\nmobile assets NOT in mirror/ (' + missing.length + '):'); for (const m of missing.slice(0, 40)) console.log('  ', m);
