import { chromium } from 'playwright';
const b = await chromium.launch();
const all = new Map(); // href -> {labels:Set, where:Set}
async function collect(label, url, ua, vp) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, ...(vp.width < 768 ? { isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  try { await p.waitForFunction(() => (document.getElementById('root')?.innerHTML.length || 0) > 500, { timeout: 20000 }); } catch {}
  await p.waitForTimeout(2500);
  const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({
    href: a.href, txt: (a.innerText || a.getAttribute('alt') || a.className || '').replace(/\s+/g, ' ').trim().slice(0, 40)
  })));
  for (const l of links) {
    if (!/^https?:/.test(l.href)) continue;
    if (!all.has(l.href)) all.set(l.href, { labels: new Set(), where: new Set() });
    const e = all.get(l.href); if (l.txt) e.labels.add(l.txt); e.where.add(label);
  }
  await ctx.close();
}
const UP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36';
const UM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
await collect('PC', 'http://localhost:3300/__internal/pc/', UP, { width: 1920, height: 1080 });
await collect('Mobile', 'http://localhost:3300/__internal/m/', UM, { width: 393, height: 852 });
await b.close();
const rows = [...all.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log(`TOTAL unique outbound links: ${rows.length}\n`);
for (const [href, e] of rows) console.log(`[${[...e.where].join('/')}] ${[...e.labels][0] || ''}\n  ${href}`);
