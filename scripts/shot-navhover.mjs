import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(3000);
const box = await p.$('.star-site-fab-kv-link_box');
if (box) await box.scrollIntoViewIfNeeded();
// normal
await p.screenshot({ path: 'verify-out/navfx-normal.png', clip: await box.boundingBox() });
// hover the exchange button
const ex = await p.$('.star-site-fab-kv-link_box-exchange');
await ex.hover();
await p.waitForTimeout(400);
await p.screenshot({ path: 'verify-out/navfx-hover.png', clip: await box.boundingBox() });
// confirm style injected
const has = await p.evaluate(() => !!document.querySelector('style[data-mirror-navfx]'));
console.log('navfx style injected:', has, '| saved navfx-normal.png + navfx-hover.png');
await b.close();
