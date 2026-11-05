// shots-baseline.cjs — screenshots (1920x889) of the pages whose look must not change, one browser at a time.
//   node shots-baseline.cjs --base http://127.0.0.1:13399 --out <folder> [--playwright <path to playwright>] [--live-side]
// --base      the draft server (reached through an ssh tunnel). The two pages that depend on the Host header (the side
//             site's news, the ticket page) need a second tunnel on local port 80 to the same draft port, because Chrome
//             cannot be told to send another Host header and the ticket page only accepts its exact host name:
//               ssh -N -L 127.0.0.1:80:127.0.0.1:13399 vps40
// --out       where the .png files go
// --live-side also shoots the one-page site https://3qdaichien.wanmeivn.com/ (public, read-only): that page is served
//             by Caddy from its own folder, so the draft server cannot show it
// Signed-in pages use the test accounts of make-test-accounts.mjs through the real sign-in (no real password is used).
// Anything that looks like an e-mail address or a long number is blurred before the shot, so no player data is saved.
const path = require('node:path');
const fs = require('node:fs');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const BASE = opt('--base', 'http://127.0.0.1:13399').replace(/\/+$/, '');
const OUT = opt('--out', path.join(__dirname, 'shots'));
const PW = opt('--playwright', 'D:/workspace/3qdc/web1/zgshx/node_modules/playwright');
const DISC = opt('--discovery', path.join(__dirname, 'baseline', '_discovery.json'));
const { chromium } = require(PW);

const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
const ACCOUNTS = { manager: 'thu-quanly', editor: 'thu-bientap', phieu: 'thu-duyetphieu' };
const VIEW = { width: 1920, height: 889 };
const SIDE = '3qdaichien.wanmeivn.com';
const TICKET = 'phieubengoan.3qdc.wanmeivn.com';

async function blurPersonal(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length) continue;
      const t = el.textContent || '';
      if (/@/.test(t) || /\d{9,}/.test(t.replace(/[\s.]/g, ''))) el.style.filter = 'blur(6px)';
    }
  }).catch(() => {});
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const disc = JSON.parse(fs.readFileSync(DISC, 'utf8'));
  const article = disc.visibleSlugs[0];
  const shots = [];
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: [`--host-resolver-rules=MAP ${SIDE} 127.0.0.1, MAP ${TICKET} 127.0.0.1`] });
  try {
    // --- public pages, one fresh context each ---
    const pub = [
      ['home', BASE + '/', null],
      ['tin-tuc', BASE + '/tin-tuc', null],
      ['bai-viet', `${BASE}/tin-tuc/${article}`, null],
      ['dang-ky-som', BASE + '/dang-ky-som', null],
      ['side-tin-tuc', `http://${SIDE}/tin-tuc`, SIDE],
      ['phieubengoan', `http://${TICKET}/`, TICKET],
    ];
    for (const [name, url, host] of pub) {
      const ctx = await browser.newContext({ viewport: VIEW });
      const page = await ctx.newPage();
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(OUT, `${name}.png`) });
        shots.push(name);
      } catch (e) { console.log(`FAILED ${name}: ${e.message.split('\n')[0]}`); }
      await ctx.close();
    }
    // --- /quan-tri for each role ---
    const admin = [
      ['manager', '', 'quan-tri-quanly-bai'],
      ['manager', '#/phieu-be-ngoan', 'quan-tri-quanly-phieu'],
      ['manager', '#/nguoi-dung', 'quan-tri-quanly-nguoi-dung'],
      ['manager', '#/thung-rac', 'quan-tri-quanly-thung-rac'],
      ['manager', '#/nhac', 'quan-tri-quanly-nhac'],
      ['editor', '', 'quan-tri-bientap-bai'],
      ['phieu', '', 'quan-tri-duyetphieu-phieu'],
    ];
    for (const role of ['manager', 'editor', 'phieu']) {
      const ctx = await browser.newContext({ viewport: VIEW });
      const login = await ctx.request.post(BASE + '/quan-tri/api/dang-nhap', { headers: { Origin: BASE }, data: { username: ACCOUNTS[role], password: PASSWORD } });
      if (!login.ok()) { console.log(`FAILED sign-in ${role}: ${login.status()}`); await ctx.close(); continue; }
      const page = await ctx.newPage();
      for (const [r, hash, name] of admin.filter((a) => a[0] === role)) {
        try {
          await page.goto(BASE + '/quan-tri' + hash, { waitUntil: 'load', timeout: 45000 });
          await page.evaluate((h) => { location.hash = h || '#/'; }, hash);
          await page.waitForTimeout(2500);
          if (hash === '#/phieu-be-ngoan' || role === 'phieu') {
            await page.selectOption('select', 'tat-ca').catch(() => {}); // every day, so the table has rows to compare
            await page.waitForTimeout(1500);
          }
          await blurPersonal(page);
          await page.screenshot({ path: path.join(OUT, `${name}.png`) });
          shots.push(name);
        } catch (e) { console.log(`FAILED ${name}: ${e.message.split('\n')[0]}`); }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  if (argv.includes('--live-side')) {
    // its own browser: the host-name mapping above would send the real address to the tunnel
    const live = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await (await live.newContext({ viewport: VIEW })).newPage();
      await page.goto('https://' + SIDE + '/', { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(OUT, 'side-trang-chu-live.png') });
      shots.push('side-trang-chu-live');
    } catch (e) { console.log(`FAILED side-trang-chu-live: ${String(e.message).split('\n')[0]}`); }
    await live.close();
  }
  console.log(`${shots.length} screenshots in ${OUT}: ${shots.join(', ')}`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
