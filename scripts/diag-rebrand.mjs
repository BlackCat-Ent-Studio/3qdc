import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length||0)>500,{timeout:20000}); } catch {}
await p.waitForTimeout(4000);
const r = await p.evaluate(() => {
  const mt = document.querySelector('.mainTitle___qtaOT');
  const st = document.querySelector('.subTitle___kay_Y');
  return { main: mt ? mt.textContent : '(none)', subVisible: st ? st.offsetParent!==null : '(none)', title: document.title };
});
console.log('mainTitle:', r.main);
console.log('subTitle visible:', r.subVisible);
console.log('document.title:', r.title);
await b.close();
