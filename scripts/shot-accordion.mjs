// shot-accordion.mjs — screenshot the clone with an accordion bar activated,
// to visually confirm the expansion image + glow render. Uses running :8080.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await p.goto('http://localhost:8080/#/fab', { waitUntil: 'domcontentloaded', timeout: 30000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const tags = await p.$$('.star-site-accordion-content__tag');
const target = tags[3] || tags[tags.length - 1];
if (target) { await target.scrollIntoViewIfNeeded(); await target.hover(); await target.click(); await p.waitForTimeout(1200); }
const sec = await p.$('.accordion-wrapper');
await (sec || p).screenshot({ path: 'verify-out/clone-accordion-active.png' });
console.log('saved verify-out/clone-accordion-active.png; bars=', tags.length);
await b.close();
