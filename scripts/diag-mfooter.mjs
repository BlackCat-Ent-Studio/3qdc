import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const out = await p.evaluate(() => {
  const el = document.querySelector('.textList___3yO14');
  if (!el) return { found: false };
  const docH = document.body.scrollHeight;
  let node = el, chain = [];
  for (let i = 0; i < 7 && node && node.id !== 'root'; i++) {
    const r = node.getBoundingClientRect();
    const containsHero = !!node.querySelector('[class*="accordion"], [class*="kv"], [class*="m-fab"], img[src*="ml4u"]');
    chain.push(`${node.tagName}.${String(node.className).trim().replace(/\s+/g,'.')} | top=${Math.round(r.top+window.scrollY)}/${docH} h=${Math.round(r.height)} | chứa nội dung chính: ${containsHero}`);
    node = node.parentElement;
  }
  return { found: true, chain };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
