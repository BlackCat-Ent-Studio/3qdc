import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' })).newPage();
await p.goto('http://localhost:3300/__internal/pc/', { waitUntil:'domcontentloaded', timeout:40000 });
try { await p.waitForFunction(()=>(document.getElementById('root')?.innerHTML.length||0)>500,{timeout:20000}); } catch {}
await p.waitForTimeout(3500);
console.log('title:', await p.title());
// favicon link href + served status
const fav = await p.evaluate(()=>{ const l=document.querySelector('link[rel*="icon"]'); return l?l.getAttribute('href'):'(none)'; });
console.log('favicon href:', fav);
await b.close();
