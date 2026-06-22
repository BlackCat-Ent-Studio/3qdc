// diag-cjk.mjs — audit where Chinese (Han) text lives on each route:
// DOM text nodes (translatable by editing strings) vs images (baked-in art).
import { chromium } from 'playwright';

const HAN = /[㐀-鿿豈-﫿]/;
const b = await chromium.launch();

async function audit(label, url, ua, vp) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 3 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const HAN = /[㐀-鿿豈-﫿]/;
    // visible DOM text nodes containing Han
    const texts = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue.trim();
      if (t && HAN.test(t)) {
        const el = n.parentElement;
        const vis = el && el.offsetParent !== null;
        if (vis) texts.add(t.replace(/\s+/g, ' '));
      }
    }
    // also Han in attributes that render (alt, title, placeholder, value)
    const attrTexts = new Set();
    document.querySelectorAll('[alt],[title],[placeholder],[value]').forEach((e) => {
      ['alt', 'title', 'placeholder', 'value'].forEach((a) => { const v = e.getAttribute(a); if (v && HAN.test(v)) attrTexts.add(a + '=' + v); });
    });
    const imgs = document.querySelectorAll('img').length;
    let bg = 0;
    document.querySelectorAll('*').forEach((e) => { const b = getComputedStyle(e).backgroundImage; if (b && b !== 'none' && b.includes('url(')) bg++; });
    return { texts: [...texts], attrTexts: [...attrTexts], imgs, bg };
  });
  await ctx.close();
  console.log(`\n===== ${label} (${url}) =====`);
  console.log(`DOM text nodes w/ Han: ${r.texts.length} | Han in attrs: ${r.attrTexts.length} | <img>: ${r.imgs} | bg-image els: ${r.bg}`);
  console.log('--- DOM Han text (these ARE translatable by string edit) ---');
  r.texts.slice(0, 80).forEach((t) => console.log('  •', t.slice(0, 80)));
  if (r.attrTexts.length) { console.log('--- Han in attributes ---'); r.attrTexts.slice(0, 30).forEach((t) => console.log('  •', t.slice(0, 90))); }
  return r;
}

const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const pc = await audit('PC', 'http://localhost:3300/__internal/pc/', UA_PC, { width: 1920, height: 1080 });
const m = await audit('MOBILE', 'http://localhost:3300/__internal/m/', UA_M, { width: 393, height: 852 });
await b.close();
console.log(`\n===== SUMMARY =====`);
console.log(`PC: ${pc.texts.length} DOM-Han strings, ${pc.imgs} imgs, ${pc.bg} bg-images`);
console.log(`MOBILE: ${m.texts.length} DOM-Han strings, ${m.imgs} imgs, ${m.bg} bg-images`);
