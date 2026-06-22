import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const el = await p.$('.title___1Zo6r');
if (el) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await el.screenshot({ path: 'verify-out/m-title-el.png' }); console.log('saved title element'); }
else console.log('title element not found');
await b.close();
