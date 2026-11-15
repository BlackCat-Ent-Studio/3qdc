// check-game-registry.mjs — the book of games: wrong books are refused, addresses reach the right game.
// Offline part: node verify/quan-tri/check-game-registry.mjs
// Online part (the draft server with the test accounts of make-test-accounts.mjs): add --port 13399
import assert from 'node:assert/strict';
import { checkGames, MODULES } from '../../scripts/lib/admin/modules.mjs';
import { gamesOf } from '../../scripts/lib/admin/grants.mjs';
import { GAMES, GAME_ID_RE, gameOfHost } from '../../scripts/lib/admin/games.mjs';
import { TEST_PASSWORD } from './make-test-accounts.mjs';
import { SITES, siteOfHost, IMAGE_LIBRARY } from '../../scripts/lib/news/news-config.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`ok   ${name}`); };
const throwsWith = (re, books) => assert.throws(() => checkGames(books, MODULES), re);
const game = (over = {}) => ({ id: 'game-a', name: 'A', logo: '', sites: [], modules: {}, ...over });

ok('the real book passes', () => checkGames());
ok('ids: letters first or mixed, never digits only', () => {
  for (const id of ['3qdc', 'skystory', 'game-2', 'ab']) assert.ok(GAME_ID_RE.test(id), id);
  for (const id of ['2026', 'a', 'Abc', '-ab', 'a_b', 'x'.repeat(25), '']) assert.ok(!GAME_ID_RE.test(id), id);
});
ok('duplicate game id', () => throwsWith(/duplicate game id "game-a"/, [game(), game()]));
ok('bad game id', () => throwsWith(/invalid game id/, [game({ id: '2026' })]));
ok('unknown module', () => throwsWith(/unknown module "bay-gio"/, [game({ modules: { 'bay-gio': {} } })]));
ok('tickets and early sign-ups are for 3qdc only: another game cannot switch them on; music is per game', () => {
  checkGames([game({ modules: { nhac: {} } })], MODULES);
  for (const mid of ['phieu-be-ngoan', 'dang-ky-som']) {
    throwsWith(new RegExp(`module "${mid}" is only for 3qdc`), [game({ modules: { [mid]: {} } })]);
    checkGames([game({ id: '3qdc', modules: { [mid]: {} } })], MODULES);
  }
  checkGames([game({ modules: { 'tin-tuc': {} } })], MODULES);
});
ok('same host in two games', () => throwsWith(/host "a.example.com" is used by both "game-a" and "game-b"/, [
  game({ sites: [{ id: 's', hosts: ['a.example.com'] }] }),
  game({ id: 'game-b', sites: [{ id: 's', hosts: ['a.example.com'] }] }),
]));
ok('site of a module the game has not switched on', () => throwsWith(/has not switched on/, [game({ sites: [{ id: 's', module: 'tin-tuc' }] })]));
ok('duplicate site id', () => throwsWith(/duplicate site id/, [game({ sites: [{ id: 's' }, { id: 's' }] })]));
ok('bad host', () => throwsWith(/bad host/, [game({ sites: [{ id: 's', hosts: ['Not A Host'] }] })]));
ok('a game written without a sites list does not break the host lookup', () => {
  GAMES.push({ id: 'khong-sites', name: 'X', modules: {} });
  try { assert.equal(gameOfHost('la.example.com').id, '3qdc'); assert.equal(gameOfHost('3qdaichien.wanmeivn.com').id, '3qdc'); } finally { GAMES.pop(); }
});

ok('3qdc: news sites and hosts as before', () => {
  assert.deepEqual(SITES.map((s) => s.id), ['chinh', 'phu']);
  assert.equal(siteOfHost('3qdaichien.wanmeivn.com'), 'phu');
  assert.equal(siteOfHost('3qdaichien.wanmeivn.com:443'), 'phu');
  assert.equal(siteOfHost('3qdc.wanmeivn.com'), 'chinh');
  assert.equal(siteOfHost('127.0.0.1:13399'), 'chinh');
  assert.equal(IMAGE_LIBRARY.length, 7);
});
ok('3qdc lists the pages without an admin part; skystory has news and music, hoanmythegioi news, leaderboards and music', () => {
  const g = GAMES.find((x) => x.id === '3qdc');
  const plain = g.sites.filter((s) => !s.module).map((s) => s.path || s.hosts[0]);
  assert.deepEqual(plain, ["phieubengoan.3qdc.wanmeivn.com", "/wiki/", "/hoi-dap/", "/duyet/", "/privacy"]);
  const sky = GAMES.find((x) => x.id === 'skystory');
  assert.equal(sky.name, 'Thiên Không Kỳ Truyện');
  assert.deepEqual(Object.keys(sky.modules), ['tin-tuc', 'nhac']);
  const hm = GAMES.find((x) => x.id === 'hoanmythegioi');
  assert.deepEqual(Object.keys(hm.modules), ['tin-tuc', 'bang-xep-hang', 'nhac']);
  assert.deepEqual(hm.modules['tin-tuc'].cats, ['su-kien']);
});
ok('tienmavogioi.com (and www, any case or port) opens Tiên Ma Vô Giới; an unknown host stays 3qdc', () => {
  for (const h of ['tienmavogioi.com', 'www.tienmavogioi.com', 'TIENMAVOGIOI.COM:443']) assert.equal(gameOfHost(h).id, 'hoanmythegioi', h);
  assert.equal(gameOfHost('la.example.com').id, '3qdc');
  // the admin status pings the first host of the home site
  assert.equal(GAMES.find((x) => x.id === 'hoanmythegioi').sites[0].hosts[0], 'tienmavogioi.com');
});
ok('menus by account', () => {
  const tabs = (user) => gamesOf(user).map((g) => [g.id, g.menu.map((m) => m[0]).join(',')]);
  const all = new Set(['posts', 'trash', 'phieu', 'signup', 'music']);
  assert.deepEqual(new Set(tabs({ role: 'owner' })[0][1].split(',')), all);
  assert.deepEqual(new Set(tabs({ role: 'member', grants: { '3qdc': '*' } })[0][1].split(',')), all);
  assert.deepEqual(tabs({ role: 'member', grants: { '3qdc': { 'tin-tuc': ['viet'] } } }), [['3qdc', 'posts']]);
  assert.deepEqual(tabs({ role: 'member', grants: { '3qdc': { 'phieu-be-ngoan': ['duyet'] } } }), [['3qdc', 'phieu']]);
  assert.deepEqual(tabs({ role: 'pending', grants: { '3qdc': '*' } }), []);
  // a game is listed for whoever has rights in it, with the menu of its parts; others do not see it
  assert.deepEqual(tabs({ role: 'member', grants: { skystory: '*' } }), [['skystory', 'posts,music,trash']]);
  assert.deepEqual(tabs({ role: 'member', grants: { '3qdc': { 'tin-tuc': ['viet'] } } }).map((x) => x[0]), ['3qdc']);
  // the leaderboards belong to hoanmythegioi only: one right there opens that game and nothing of 3qdc
  assert.deepEqual(tabs({ role: 'member', grants: { hoanmythegioi: { 'bang-xep-hang': ['cap-nhat'] } } }), [['hoanmythegioi', 'bxh']]);
  assert.deepEqual(tabs({ role: 'member', grants: { hoanmythegioi: { 'tin-tuc': ['viet'] } } }), [['hoanmythegioi', 'posts']]);
});

// ---- online part ----
const portAt = process.argv.indexOf('--port');
if (portAt > 0) {
  const port = process.argv[portAt + 1];
  const base = `http://127.0.0.1:${port}`;
  const origin = base;
  const pass = TEST_PASSWORD;
  const user = process.env.TEST_USER || 'thu-chu';
  {
    const login = await fetch(`${base}/quan-tri/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ username: user, password: pass }) });
    assert.equal(login.status, 200, 'test account sign-in');
    const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    const get = async (p) => { const r = await fetch(`${base}/quan-tri/api${p}`, { headers: { Cookie: cookie } }); return { status: r.status, text: await r.text() }; };
    const old = await get('/bai');
    const viaGame = await get('/g/3qdc/bai');
    assert.equal(old.status, 200);
    assert.deepEqual(viaGame, old); n++; console.log('ok   GET /g/3qdc/bai = GET /bai');
    for (const [p, want] of [['/g/skystory/khong-co', 404], ['/g/khong-co/bai', 404], ['/g/2026/bai', 404], ['/g/3qdc/khong-co', 404], ['/g/3qdc/toi', 404]]) {
      const r = await get(p);
      assert.equal(r.status, want, p); n++; console.log(`ok   GET ${p} -> ${want}`);
    }
    const me = JSON.parse((await get('/toi')).text);
    assert.deepEqual(me.games.map((g) => g.id), ['3qdc', 'skystory', 'hoanmythegioi']); n++; console.log('ok   /toi lists 3qdc, skystory and hoanmythegioi');
    const [g3, sk, hm] = me.games;
    assert.deepEqual(sk.parts.map((p) => p.id), ['tin-tuc']); assert.deepEqual(hm.parts.map((p) => p.id), ['tin-tuc']);
    assert.deepEqual(g3.parts.map((p) => p.id).sort(), ['dang-ky-som', 'nhac', 'phieu-be-ngoan', 'tin-tuc']);
    assert.ok(g3.sites.some((s) => s.id === 'chinh' && s.host === '3qdc.wanmeivn.com' && s.module === 'tin-tuc') && g3.sites.some((s) => s.id === 'wiki' && s.path === '/wiki/'));
    assert.ok(g3.parts.every((p) => p.perms && Object.keys(p.perms).length)); n++; console.log('ok   /toi carries the parts switched on (with permission labels) and the sites of each game');
    const st = JSON.parse((await get('/trang-thai-trang')).text);
    assert.deepEqual(Object.keys(st.sites).sort(), g3.sites.map((s) => '3qdc/' + s.id).sort());
    assert.ok(Object.values(st.sites).every((v) => typeof v.ok === 'boolean' && Number.isInteger(v.code))); n++; console.log('ok   /trang-thai-trang answers for each site of the games the account can open');
  }
}
console.log(`${n} checks passed`);
