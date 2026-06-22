// Replace mobile base64 imgs (title 版本内容 + exchange nav) inside the mobile JS
// chunk with Vietnamese versions. Literal string replace of the exact old
// data-URI captured from the rendered DOM. Backs up the chunk first.
import { chromium } from 'playwright';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';

const JS = 'mirror/cdn-cn.lingxigames.com/wukongbuild/star-gw/1.0.0/prod/views/p__web_m__Fab__Fab.8e33ff58.async.js';
const BAK = 'image-backup/mobile-js-pre-vi';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/__internal/m/', { waitUntil: 'domcontentloaded', timeout: 40000 });
try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
await p.waitForTimeout(2500);
const old = await p.evaluate(() => {
  const t = document.querySelector('.title___1Zo6r img');
  const navs = [...document.querySelectorAll('img')].filter(i => { const r = i.getBoundingClientRect(); return Math.abs(r.top + window.scrollY - 79) < 5 && r.width < 120; });
  return { title: t ? t.getAttribute('src') : null, exchange: navs[1] ? navs[1].getAttribute('src') : null };
});
await b.close();

const titleVN = 'data:image/png;base64,' + (await readFile('new site-image/accordion-title.5558b04b.png')).toString('base64');
const exchangeVN = 'data:image/jpeg;base64,' + (await readFile('new site-image/nav-exchange.jpg')).toString('base64');

let txt = await readFile(JS, 'utf8');
await mkdir(BAK, { recursive: true });
await copyFile(JS, BAK + '/p__web_m__Fab__Fab.8e33ff58.async.js');

let done = [];
if (old.title && txt.includes(old.title)) { txt = txt.replace(old.title, titleVN); done.push('title'); }
else console.log('TITLE old data-URI not found literally in JS');
if (old.exchange && txt.includes(old.exchange)) { txt = txt.replace(old.exchange, exchangeVN); done.push('exchange'); }
else console.log('EXCHANGE old data-URI not found literally in JS');

await writeFile(JS, txt);
console.log('replaced in mobile JS chunk:', done.join(', ') || '(none)');
