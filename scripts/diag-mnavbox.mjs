import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  // the 3 nav imgs sit near top (~79). Find them + climb to common parent.
  const imgs = [...document.querySelectorAll('img')].filter(i => { const r = i.getBoundingClientRect(); return Math.abs(r.top + window.scrollY - 79) < 8 && r.width < 120; });
  if (imgs.length < 2) return { found: false };
  // chain of first img
  let node = imgs[0], chain = [];
  for (let i = 0; i < 5 && node && node.id !== 'root'; i++) { chain.push(node.tagName + '.' + String(node.className).trim().replace(/\s+/g, '.')); node = node.parentElement; }
  // common parent that contains all 3
  let cp = imgs[0].parentElement;
  while (cp && !imgs.every(im => cp.contains(im))) cp = cp.parentElement;
  return { found: true, n: imgs.length, chain, commonParent: cp ? (cp.tagName + '.' + String(cp.className).trim().replace(/\s+/g, '.')) : null, cpKids: cp ? cp.children.length : 0 };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
