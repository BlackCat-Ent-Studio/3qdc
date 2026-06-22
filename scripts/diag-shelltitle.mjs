import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3300/', { waitUntil:'domcontentloaded', timeout:40000 });
await p.waitForTimeout(2000);
console.log('SHELL tab title:', await p.title());
const fav = await p.evaluate(()=>{ const l=document.querySelector('link[rel*="icon"]'); return l?l.getAttribute('href'):'(none)'; });
console.log('SHELL favicon:', fav);
await b.close();
