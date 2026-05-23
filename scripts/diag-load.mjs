// diag-load.mjs — measure where the local clone spends time on load.
import { chromium } from 'playwright';
import { startServer } from '../server.mjs';

const server = await startServer(8080);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();

const reqs = new Map();
const t0 = Date.now();
p.on('request', (r) => reqs.set(r, { url: r.url(), start: Date.now() - t0, end: null, type: r.resourceType() }));
p.on('requestfinished', (r) => { const e = reqs.get(r); if (e) e.end = Date.now() - t0; });
p.on('requestfailed', (r) => { const e = reqs.get(r); if (e) { e.end = Date.now() - t0; e.failed = r.failure()?.errorText; } });

const TARGET = process.argv[2] || 'http://localhost:8080/#/fab';
console.log('TARGET:', TARGET);
let rootMs = null;
await p.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 30000 }); rootMs = Date.now() - t0; } catch {}
await p.waitForTimeout(8000); // observe what is still pending / slow

const all = [...reqs.values()];
const pending = all.filter((e) => e.end === null);
const live = all.filter((e) => !e.url.startsWith('http://localhost'));
const slow = all.filter((e) => e.end !== null).sort((a, b) => (b.end - b.start) - (a.end - a.start)).slice(0, 12);

console.log('TIME-TO-RENDER #root (ms):', rootMs);
console.log('total reqs:', all.length, '| local:', all.length - live.length, '| LIVE/cross-origin:', live.length, '| PENDING after 8s:', pending.length);
console.log('\n--- LIVE (cross-origin) requests ---');
for (const e of live) console.log((e.end === null ? 'PENDING' : (e.end - e.start) + 'ms').padEnd(9), e.type.padEnd(8), (e.failed || '').padEnd(16), e.url.slice(0, 95));
console.log('\n--- slowest finished ---');
for (const e of slow) console.log(((e.end - e.start) + 'ms').padEnd(8), e.type.padEnd(8), e.url.slice(0, 95));

await b.close();
server.close();
