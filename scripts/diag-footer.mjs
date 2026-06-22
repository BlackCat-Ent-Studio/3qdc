import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const out = await p.evaluate(() => {
  // find the element that contains the copyright text
  const all = [...document.querySelectorAll('*')];
  const hit = all.find(e => e.children.length === 0 && /lingxigames\.com.*?(Bản quyền|rights reserved)/i.test(e.textContent || ''));
  if (!hit) return { found: false };
  // climb up to a container that wraps the whole footer block (has the zhizhao img + agreement link)
  let node = hit, chain = [];
  for (let i = 0; i < 6 && node; i++) {
    chain.push(node.tagName + (node.className ? '.' + String(node.className).trim().replace(/\s+/g, '.') : '') +
      ` [imgs:${node.querySelectorAll('img').length} links:${node.querySelectorAll('a').length} text:"${(node.innerText || '').replace(/\s+/g, ' ').slice(0, 40)}"]`);
    node = node.parentElement;
  }
  // also locate the zhizhao img + agreement link wrapper
  const zhi = document.querySelector('img[src*="zhizhao"]');
  const agr = document.querySelector('a[href*="self-discipline"]');
  return { found: true, chain, zhizhaoParent: zhi ? (zhi.parentElement.tagName + '.' + zhi.parentElement.className) : null, agreementParent: agr ? (agr.parentElement.tagName + '.' + agr.parentElement.className) : null };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
