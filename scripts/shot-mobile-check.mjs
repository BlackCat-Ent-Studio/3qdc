import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(3000);
await p.screenshot({ path: 'verify-out/m-nav.png', clip: { x: 0, y: 60, width: 393, height: 90 } });
// scroll to the title region (~665)
await p.evaluate(() => window.scrollTo(0, 600));
await p.waitForTimeout(800);
await p.screenshot({ path: 'verify-out/m-title.png', clip: { x: 0, y: 40, width: 393, height: 140 } });
console.log('saved');
await b.close();
