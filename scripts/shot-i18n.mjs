import { chromium } from 'playwright';
const b = await chromium.launch();
// mobile (translated header visible)
const m = await (await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })).newPage();
await m.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await m.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await m.waitForTimeout(3500);
await m.screenshot({ path: 'verify-out/i18n-mobile-top.png' });
// pc footer (translated legal/social)
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' })).newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(3500);
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1500);
await p.screenshot({ path: 'verify-out/i18n-pc-footer.png' });
console.log('saved');
await b.close();
