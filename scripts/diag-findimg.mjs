import { chromium } from 'playwright';
const PREFIX = 'iVBORw0KGgoAAAANSUhEUgAAASAAAACeCAMAAA'; // unique start of the pasted base64
const b = await chromium.launch();
async function find(label, url, ua, vp) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
  const r = await p.evaluate((pfx) => {
    const imgs = [...document.querySelectorAll('img')].filter(i => (i.getAttribute('src') || '').includes(pfx));
    return imgs.map(img => {
      let node = img, chain = [];
      for (let i = 0; i < 5 && node && node.id !== 'root'; i++) {
        chain.push(node.tagName + (node.className ? '.' + String(node.className).trim().replace(/\s+/g, '.') : '') + (node.getAttribute && node.getAttribute('alt') ? `[alt=${node.getAttribute('alt')}]` : ''));
        node = node.parentElement;
      }
      const rect = img.getBoundingClientRect();
      return { chain, visible: img.offsetParent !== null, pos: `${Math.round(rect.top + window.scrollY)},${Math.round(rect.left)} ${Math.round(rect.width)}x${Math.round(rect.height)}` };
    });
  }, PREFIX);
  console.log(`\n=== ${label}: ${r.length} match ===`);
  r.forEach(m => { console.log('  visible:', m.visible, '| pos:', m.pos); console.log('  chain:', m.chain.join('  >  ')); });
  await ctx.close();
}
const UP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await find('PC', 'http://localhost:3300/__internal/pc/', UP, { width: 1920, height: 1080 });
await find('MOBILE', 'http://localhost:3300/__internal/m/', UM, { width: 393, height: 852 });
await b.close();
