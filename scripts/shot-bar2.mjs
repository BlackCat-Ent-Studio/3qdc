import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const tags = await p.$$('.star-site-accordion-content__tag');
if (tags[1]) { await tags[1].scrollIntoViewIfNeeded(); await tags[1].hover(); await p.waitForTimeout(900); }
const sec = await p.$('[class*="accordion"]');
if (sec) await sec.scrollIntoViewIfNeeded();
await p.waitForTimeout(800);
await p.screenshot({ path: 'verify-out/bar2-active.png' });
console.log('saved');
await b.close();
