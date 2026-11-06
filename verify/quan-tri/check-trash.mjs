// check-trash.mjs — deleting moves an item to the trash instead of destroying it, for every part that has one (news, gift
// tickets, early sign-ups, music): the item leaves every public page and the CSV, shows in the trash with who deleted it,
// when and through what, comes back whole, and only an owner can delete it for good.
//   node verify/quan-tri/check-trash.mjs      (run from the project folder; starts its own server on a free port with a temp data folder)
// The music part works on the real folder overrides/home/nhac (the player reads that folder): the test song is added and removed again.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
const SONG = 'Kiểm tra thùng rác - Thử nghiệm.mp3';
const SONG_FILE = join(ROOT, 'overrides', 'home', 'nhac', SONG);
let n = 0;
const ok = (name) => { n++; console.log(`ok   ${name}`); };
const dirs = [];
const tmpDir = () => { const d = mkdtempSync(join(tmpdir(), 'trash-')); dirs.push(d); return d; };
const put = (root, rel, text) => { const f = join(root, ...rel.split('/')); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
const freePort = () => new Promise((done) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });

// the in-process part of the test (the shared functions) keeps its own data folder; the server below gets another one
const coreRoot = tmpDir();
process.env.DATA_ROOT = coreRoot;
const { hashPassword } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/admin-auth.mjs')).href);
const { siteNow } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/news-files.mjs')).href);
const today = siteNow().slice(0, 10);
const now = new Date().toISOString();
const secret = await hashPassword(PASSWORD);
const acct = (username, role, grants) => ({ username, name: `Tên ${username}`, role, ...(grants ? { grants } : {}), ...secret, disabled: false, createdAt: now, passwordSetAt: now });
const G3 = (grants) => ({ '3qdc': grants });
const USERS = [
  acct('chu', 'owner'),
  acct('quanly', 'member', G3('*')),
  acct('viet3', 'member', G3({ 'tin-tuc': ['viet'] })),
  acct('tintuc3', 'member', G3({ 'tin-tuc': ['duyet'] })),
  acct('duyet3', 'member', G3({ 'phieu-be-ngoan': ['duyet'] })),
  acct('qlphieu3', 'member', G3({ 'phieu-be-ngoan': ['quan-ly'] })),
  acct('dky3', 'member', G3({ 'dang-ky-som': ['quan-ly'] })),
  acct('nhac3', 'member', G3({ nhac: ['quan-ly'] })),
  acct('sky', 'member', { skystory: '*' }),
];

// ---------- data in the layout that existed before the trash (no trash files anywhere) ----------
const article = (id, slug, extra = {}) => JSON.stringify({
  id, slug, title: `Bài ${slug}`, category: 'thong-bao', status: 'published', content: '<p>x</p>', summary: 's', cover: '', author: 'a',
  publishAt: '2026-01-01T08:00:00+07:00', createdAt: '2026-01-01T08:00:00.000+07:00', updatedAt: '2026-01-01T08:00:00.000+07:00', updatedBy: 'a', ...extra,
});
const ticket = (id, email, extra = {}) => ({ id, email, ten: 'Người Chơi', acc: `nv-${id}`, server: 'S1', qua: ['Quà thử'], ghiChu: '', luc: `${today}T08:00:00+07:00`, ngay: today, st: 'cho', phanHoi: '', xuLyBoi: '', xuLyLuc: '', ...extra });
const signupRows = ['0912000001', '0912000002', '0912000003'].map((sdt, i) => ({ sdt, luc: `${today}T0${i + 1}:00:00+07:00`, ip: '', nguon: '' }));
function seed(root) {
  put(root, 'he-thong/users.json', JSON.stringify(USERS));
  put(root, 'games/3qdc/tin-tuc/posts/1.json', article(1, 'bai-cua-3qdc'));
  put(root, 'games/3qdc/tin-tuc/posts/2.json', article(2, 'bai-thu-hai'));
  put(root, 'games/3qdc/phieu-be-ngoan/phieu.json', JSON.stringify({ items: [ticket('old000000001', 'cu1@example.com'), ticket('old000000002', 'cu2@example.com', { st: 'tra', phanHoi: 'Đã gửi quà' })] }));
  put(root, 'games/3qdc/dang-ky-som/dang-ky.jsonl', signupRows.map((r) => JSON.stringify(r) + '\n').join(''));
}
const root = tmpDir();
seed(root);
seed(coreRoot);

const port = await freePort();
const env = {
  ...process.env, PORT: String(port), DATA_ROOT: root, NEWS_INSECURE_COOKIE: '1', NEWS_SITE_ORIGIN: `http://127.0.0.1:${port}`,
  NEWS_ALLOWED_ORIGINS: '', PHIEU_GOOGLE_CLIENT_ID: 'x', PHIEU_DEV_LOGIN: '1', PHIEU_EXTRA_HOSTS: 'phieu.test',
  NEWS_DATA_DIR: '', PHIEU_DATA_DIR: '', SIGNUP_DATA_DIR: '',
};
const child = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`;

function req(method, path, { cookie, body, raw, type, host, originHeader, headers: extra } = {}) {
  return new Promise((done, fail) => {
    const data = raw || (body !== undefined ? Buffer.from(JSON.stringify(body)) : null);
    const headers = { Host: host || `127.0.0.1:${port}`, ...(cookie ? { Cookie: cookie } : {}), ...(extra || {}) };
    if (method === 'POST') { headers.Origin = originHeader || origin; headers['Content-Type'] = type || 'application/json'; }
    if (data) headers['Content-Length'] = data.length;
    const r = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { /* not JSON */ }
        done({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    r.on('error', fail);
    r.end(data);
  });
}
const api = '/quan-tri/api';
const G = `${api}/g/3qdc`;
const cookies = {};
const as = (who) => ({ cookie: cookies[who] });
const get = (who, path) => req('GET', G + path, as(who));
const post = (who, path, body) => req('POST', G + path, { ...as(who), body: body === undefined ? {} : body });
const expect = (r, status, what) => assert.equal(r.status, status, `${what}: ${r.status} ${r.text.slice(0, 160)}`);
const keyOf = (items, pick) => (items.find(pick) || {}).key;
const q = encodeURIComponent;

// the public side: the player's page of tickets (its own host name), the sign-up count, the music list
const PH = { host: 'phieu.test', originHeader: 'http://phieu.test' };
const playerCookie = {};
async function playerLogin(email) {
  const r = await req('POST', '/api/phieu/dang-nhap-thu', { ...PH, body: { email } });
  expect(r, 200, 'player test sign-in');
  playerCookie[email] = r.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
}
const myTickets = async (email) => (await req('GET', '/api/phieu/toi', { ...PH, cookie: playerCookie[email] })).json;
const signupCount = async () => (await req('GET', '/api/dang-ky-som')).json.count;
const musicNames = async () => (await req('GET', '/3qdc-vi/api/nhac')).json.map((s) => s.title + (s.artist ? ' - ' + s.artist : ''));

try {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('server exited early:\n' + log);
    try { if ((await req('GET', '/tin-tuc')).status === 200) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  for (const u of USERS) {
    const r = await req('POST', api + '/dang-nhap', { body: { username: u.username, password: PASSWORD } });
    expect(r, 200, `sign in ${u.username}`);
    cookies[u.username] = r.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  }

  // ---------- data from before the trash reads as usual ----------
  for (const [path, who] of [['/thung-rac', 'tintuc3'], ['/phieu-be-ngoan/thung-rac', 'qlphieu3'], ['/dang-ky-som/thung-rac', 'dky3'], ['/nhac/thung-rac', 'nhac3']]) {
    const r = await get(who, path);
    expect(r, 200, `${path} with no trash file yet`);
    assert.deepEqual(r.json.items, [], `${path} starts empty`);
  }
  assert.equal((await get('qlphieu3', '/phieu-be-ngoan?ngay=tat-ca')).json.items.length, 2);
  assert.equal((await get('dky3', '/dang-ky-som')).json.total, 3);
  assert.equal(await signupCount(), 3);
  assert.equal((await req('GET', '/tin-tuc/bai-cua-3qdc')).status, 200);
  ok('data written before the trash existed reads as before; every trash starts empty');

  // ---------- who sees what ----------
  const menu = async (who) => (await req('GET', api + '/toi', as(who))).json.games.map((g) => ({ menu: g.menu.map((m) => m[0]), trash: g.trash.slice().sort() }));
  assert.deepEqual((await menu('chu'))[0].trash, ['dang-ky-som', 'nhac', 'phieu-be-ngoan', 'tin-tuc']);
  assert.deepEqual((await menu('quanly'))[0].trash, ['dang-ky-som', 'nhac', 'phieu-be-ngoan', 'tin-tuc']);
  assert.deepEqual((await menu('qlphieu3'))[0].trash, ['phieu-be-ngoan']);
  assert.deepEqual((await menu('dky3'))[0].trash, ['dang-ky-som']);
  assert.deepEqual((await menu('tintuc3'))[0].trash, ['tin-tuc']);
  for (const who of ['viet3', 'duyet3']) {
    const g = (await menu(who))[0];
    assert.deepEqual(g.trash, [], `${who} sees no trash part`);
    assert.ok(!g.menu.includes('trash'), `${who} has no Thùng rác entry`);
  }
  assert.ok((await menu('qlphieu3'))[0].menu.includes('trash'));
  const parts = [['/thung-rac', 'tintuc3'], ['/phieu-be-ngoan/thung-rac', 'qlphieu3'], ['/dang-ky-som/thung-rac', 'dky3'], ['/nhac/thung-rac', 'nhac3']];
  for (const [path, right] of parts) {
    for (const who of ['viet3', 'duyet3', 'sky', ...parts.map((p) => p[1]).filter((w) => w !== right)]) {
      expect(await get(who, path), 403, `${who} GET ${path}`);
      expect(await post(who, `${path}/don-sach`), 403, `${who} empties ${path}`);
    }
    expect(await req('GET', G + path), 401, `signed out ${path}`);
    expect(await get('chu', path), 200, `owner GET ${path}`);
  }
  expect(await req('GET', `${api}/g/skystory/nhac/thung-rac`, as('chu')), 404, 'a game that has not switched the part on');
  ok('each part opens only for its own permission; nobody else, nobody signed out, no other game');

  // ---------- news ----------
  const post1 = (await get('quanly', '/bai/1')).json.post;
  expect(await post('viet3', '/bai/1/xoa', { baseUpdatedAt: post1.updatedAt }), 403, 'a writer cannot delete');
  expect(await post('quanly', '/bai/1/xoa', { baseUpdatedAt: 'stale' }), 409, 'a stale delete is refused');
  expect(await post('quanly', '/bai/1/xoa', { baseUpdatedAt: post1.updatedAt }), 200, 'delete moves to the trash');
  assert.equal((await req('GET', '/tin-tuc/bai-cua-3qdc')).status, 404, 'a trashed article is not public');
  assert.ok(!(await get('quanly', '/bai')).json.items.some((p) => p.id === 1));
  let trash = (await get('tintuc3', '/thung-rac')).json.items;
  assert.equal(trash.length, 1);
  assert.equal(trash[0].id, 1);
  assert.equal(trash[0].deletedBy, 'quanly');
  assert.equal(trash[0].deletedVia, 'web');
  assert.match(trash[0].deletedAt, /^\d{4}-\d\d-\d\dT/);
  const nk = trash[0].key;
  expect(await post('viet3', `/thung-rac/${q(nk)}/khoi-phuc`), 403, 'a writer cannot restore');
  const back = await post('tintuc3', `/thung-rac/${q(nk)}/khoi-phuc`);
  expect(back, 200, 'a reviewer restores');
  assert.equal(back.json.post.status, 'draft');
  assert.deepEqual(back.json.items, []);
  assert.equal((await req('GET', '/tin-tuc/bai-cua-3qdc')).status, 404, 'a restored article is a draft, still not public');
  expect(await post('tintuc3', `/thung-rac/${q(nk)}/khoi-phuc`), 404, 'restoring twice');
  const d1 = (await get('quanly', '/bai/1')).json.post;
  expect(await post('quanly', '/bai/1/xoa', { baseUpdatedAt: d1.updatedAt }), 200);
  trash = (await get('tintuc3', '/thung-rac')).json.items;
  const nk2 = trash[0].key;
  for (const who of ['quanly', 'tintuc3']) {
    expect(await post(who, `/thung-rac/${q(nk2)}/xoa-han`), 403, `${who} (not an owner) cannot delete for good`);
    expect(await post(who, '/thung-rac/don-sach'), 403, `${who} cannot empty the trash`);
  }
  assert.equal((await get('tintuc3', '/thung-rac')).json.items.length, 1, 'refused deletions left the item');
  expect(await post('chu', `/thung-rac/${q('..%2F..%2Fx.json')}/xoa-han`), 404, 'a made-up name');
  expect(await post('chu', `/thung-rac/${q(nk2)}/xoa-han`), 200, 'an owner deletes for good');
  assert.deepEqual((await get('chu', '/thung-rac')).json.items, []);
  ok('news: delete → trash (not public) → restore as draft; deleting for good and emptying are owner-only');

  // ---------- gift tickets ----------
  await playerLogin('nguoi.choi@example.com');
  const sent = await req('POST', '/api/phieu/gui', { ...PH, cookie: playerCookie['nguoi.choi@example.com'], body: { acc: 'Nhân vật thử', server: 'S1', qua: ['Quà A'], ghiChu: '' } });
  expect(sent, 201, 'a player sends a ticket');
  const tid = sent.json.item.id;
  assert.equal((await myTickets('nguoi.choi@example.com')).lichSu.length, 1);
  expect(await post('duyet3', `/phieu-be-ngoan/${tid}/xoa`), 403, 'a ticket reviewer cannot delete');
  expect(await post('qlphieu3', `/phieu-be-ngoan/${tid}/xoa`), 200, 'a ticket manager deletes → trash');
  expect(await post('qlphieu3', `/phieu-be-ngoan/${tid}/xoa`), 404, 'deleting twice');
  let mine = await myTickets('nguoi.choi@example.com');
  assert.deepEqual(mine.lichSu, [], 'the player history does not show a trashed ticket');
  assert.equal(mine.homNay, null);
  const list = (await get('qlphieu3', '/phieu-be-ngoan?ngay=tat-ca')).json;
  assert.ok(!list.items.some((t) => t.id === tid));
  assert.equal(list.counts.all, 2);
  const csv = await req('GET', `${G}/phieu-be-ngoan/csv?ngay=tat-ca`, as('qlphieu3'));
  assert.ok(!csv.text.includes('nguoi.choi@example.com') && !csv.text.includes('Nhân vật thử'), 'the CSV leaves out a trashed ticket');
  assert.ok(csv.text.includes('cu1@example.com'));
  const pt = (await get('qlphieu3', '/phieu-be-ngoan/thung-rac')).json.items;
  assert.equal(pt.length, 1);
  assert.equal(pt[0].key, tid);
  assert.equal(pt[0].email, 'nguoi.choi@example.com');
  assert.equal(pt[0].deletedBy, 'qlphieu3');
  assert.equal(pt[0].deletedVia, 'web');
  expect(await post('duyet3', `/phieu-be-ngoan/thung-rac/${tid}/khoi-phuc`), 403, 'a ticket reviewer cannot restore');
  // the player may send another ticket today while the first one is in the trash; then the first cannot come back
  expect(await req('POST', '/api/phieu/gui', { ...PH, cookie: playerCookie['nguoi.choi@example.com'], body: { acc: 'Nhân vật hai', server: 'S1', qua: ['Quà B'], ghiChu: '' } }), 201, 'a new ticket while the old one is trashed');
  expect(await post('qlphieu3', `/phieu-be-ngoan/thung-rac/${tid}/khoi-phuc`), 409, 'restoring beside a ticket of the same day');
  const tid2 = (await myTickets('nguoi.choi@example.com')).homNay.id;
  expect(await post('qlphieu3', `/phieu-be-ngoan/${tid2}/xoa`), 200);
  expect(await post('qlphieu3', `/phieu-be-ngoan/thung-rac/${tid}/khoi-phuc`), 200, 'restoring once the day is free');
  mine = await myTickets('nguoi.choi@example.com');
  assert.deepEqual(mine.lichSu.map((t) => t.id), [tid], 'the restored ticket is back in the history');
  assert.ok((await req('GET', `${G}/phieu-be-ngoan/csv?ngay=tat-ca`, as('qlphieu3'))).text.includes('Nhân vật thử'));
  // deleting for good: owners only
  expect(await post('qlphieu3', `/phieu-be-ngoan/${tid}/xoa`), 200);
  expect(await post('qlphieu3', `/phieu-be-ngoan/thung-rac/${tid}/xoa-han`), 403, 'a ticket manager cannot delete for good');
  expect(await post('quanly', `/phieu-be-ngoan/thung-rac/${tid}/xoa-han`), 403, 'a manager of the game is not an owner');
  expect(await post('chu', `/phieu-be-ngoan/thung-rac/${tid}/xoa-han`), 200, 'an owner does');
  expect(await post('chu', `/phieu-be-ngoan/thung-rac/${tid}/xoa-han`), 404);
  expect(await post('quanly', '/phieu-be-ngoan/thung-rac/don-sach'), 403);
  expect(await post('chu', '/phieu-be-ngoan/thung-rac/don-sach'), 200);
  assert.equal((await get('chu', '/phieu-be-ngoan/thung-rac')).json.items.length, 0);
  assert.equal((await get('chu', '/phieu-be-ngoan?ngay=tat-ca')).json.items.length, 2, 'the old tickets are untouched');
  ok('tickets: delete → trash (not in the player history, list, counts or CSV) → restore (one ticket a day kept); owner-only purge');

  // ---------- early sign-ups ----------
  const sign = (sdt) => req('POST', '/api/dang-ky-som', { body: { sdt } });
  expect(await post('dky3', '/dang-ky-som/xoa', { sdt: '0912000002' }), 200, 'delete → trash');
  assert.equal(await signupCount(), 2, 'the public count drops');
  assert.ok(!(await get('dky3', '/dang-ky-som?q=0912000002')).json.items.length, 'search no longer finds it');
  assert.ok(!(await req('GET', `${G}/dang-ky-som/csv`, as('dky3'))).text.includes('0912000002'), 'the CSV leaves it out');
  expect(await post('dky3', '/dang-ky-som/xoa', { sdt: '0912000002' }), 404, 'deleting twice');
  const st = (await get('dky3', '/dang-ky-som/thung-rac')).json.items;
  assert.equal(st.length, 1);
  assert.equal(st[0].sdt, '0912000002');
  assert.equal(st[0].deletedBy, 'dky3');
  assert.equal(st[0].deletedVia, 'web');
  expect(await post('qlphieu3', '/dang-ky-som/thung-rac/0912000002/khoi-phuc'), 403, 'other managers cannot restore it');
  expect(await post('dky3', '/dang-ky-som/thung-rac/0912000002/khoi-phuc'), 200, 'restore');
  assert.equal(await signupCount(), 3);
  assert.deepEqual((await get('dky3', '/dang-ky-som')).json.items.map((r) => r.sdt), ['0912000003', '0912000002', '0912000001'], 'back in its place by sign-up time');
  // a number that signs up again while it is in the trash cannot be restored on top of itself
  expect(await post('dky3', '/dang-ky-som/xoa', { sdt: '0912000001' }), 200);
  expect(await sign('0912000001'), 201, 'the number may sign up again');
  expect(await post('dky3', '/dang-ky-som/thung-rac/0912000001/khoi-phuc'), 409, 'restoring beside the new sign-up');
  expect(await post('dky3', '/dang-ky-som/thung-rac/0912000001/xoa-han'), 403, 'a sign-up manager cannot delete for good');
  expect(await post('chu', '/dang-ky-som/thung-rac/0912000001/xoa-han'), 200);
  expect(await post('chu', '/dang-ky-som/thung-rac/don-sach'), 200);
  assert.equal((await get('chu', '/dang-ky-som/thung-rac')).json.items.length, 0);
  assert.equal(await signupCount(), 3);
  ok('sign-ups: delete → trash (not in the count, search or CSV) → restore in place; owner-only purge');

  // ---------- music ----------
  const mp3 = Buffer.concat([Buffer.from('ID3'), randomBytes(64)]);
  const up = await req('POST', G + '/nhac', { ...as('nhac3'), raw: mp3, type: 'audio/mpeg', headers: { 'X-Ten-File': encodeURIComponent(SONG) } });
  expect(up, 201, 'a song is uploaded');
  const songName = up.json.name;
  const url = `/3qdc-vi/home/nhac/${q(songName)}`;
  assert.ok((await musicNames()).includes('Kiểm tra thùng rác - Thử nghiệm'));
  assert.equal((await req('GET', url)).status, 200);
  expect(await post('nhac3', `/nhac/${q(songName)}/xoa`), 200, 'delete → trash');
  assert.ok(!(await musicNames()).includes('Kiểm tra thùng rác - Thử nghiệm'), 'the player no longer lists it');
  assert.equal((await req('GET', url)).status, 404, 'the file is no longer served');
  const mt = (await get('nhac3', '/nhac/thung-rac')).json.items;
  assert.equal(mt.length, 1);
  assert.equal(mt[0].name, songName);
  assert.equal(mt[0].deletedBy, 'nhac3');
  assert.equal(mt[0].deletedVia, 'web');
  expect(await post('tintuc3', `/nhac/thung-rac/${q(mt[0].key)}/khoi-phuc`), 403);
  expect(await post('nhac3', `/nhac/thung-rac/${q('../../x')}/khoi-phuc`), 404, 'a made-up key');
  expect(await post('nhac3', `/nhac/thung-rac/${q(mt[0].key)}/khoi-phuc`), 200, 'restore');
  assert.equal((await req('GET', url)).status, 200);
  assert.ok((await musicNames()).includes('Kiểm tra thùng rác - Thử nghiệm'));
  expect(await post('nhac3', `/nhac/${q(songName)}/xoa`), 200);
  const k3 = (await get('nhac3', '/nhac/thung-rac')).json.items[0].key;
  expect(await post('nhac3', `/nhac/thung-rac/${q(k3)}/xoa-han`), 403, 'a music manager cannot delete for good');
  expect(await post('chu', `/nhac/thung-rac/${q(k3)}/xoa-han`), 200, 'an owner does');
  assert.equal((await get('chu', '/nhac/thung-rac')).json.items.length, 0);
  assert.equal(existsSync(SONG_FILE), false, 'nothing of the test song is left in the player folder');
  ok('music: delete → trash (gone from the player and the file URL) → restore; owner-only purge');

  // ---------- the shared functions Claude's tools use: "claude" is written on the item ----------
  const core = await import(pathToFileURL(join(ROOT, 'scripts/lib/admin/trash.mjs')).href);
  const asClaude = { actor: 'quanly', via: 'claude' };
  assert.ok((await core.moveToTrash('3qdc', 'phieu-be-ngoan', 'old000000001', asClaude)).ok);
  assert.ok((await core.moveToTrash('3qdc', 'dang-ky-som', '0912 000 001', asClaude)).ok);
  assert.ok((await core.moveToTrash('3qdc', 'tin-tuc', 2, asClaude)).ok);
  assert.equal((await core.moveToTrash('3qdc', 'tin-tuc', 2, asClaude)).status, 404);
  assert.equal((await core.moveToTrash('3qdc', 'khong-co', 'x', asClaude)).status, 404);
  assert.equal((await core.moveToTrash('skystory', 'tin-tuc', 2, asClaude)).status, 404);
  for (const part of ['phieu-be-ngoan', 'dang-ky-som', 'tin-tuc']) {
    const items = (await core.listTrash('3qdc', part)).items;
    assert.equal(items.length, 1, part);
    assert.equal(items[0].deletedVia, 'claude', part);
    assert.equal(items[0].deletedBy, 'quanly', part);
    const back2 = await core.restoreFromTrash('3qdc', part, items[0].key, asClaude);
    assert.ok(back2.ok, `${part}: ${JSON.stringify(back2)}`);
    assert.equal((await core.listTrash('3qdc', part)).items.length, 0);
  }
  writeFileSync(SONG_FILE, mp3);
  const sm = await core.moveToTrash('3qdc', 'nhac', SONG, asClaude);
  assert.ok(sm.ok, JSON.stringify(sm));
  assert.equal(existsSync(SONG_FILE), false);
  assert.equal((await core.listTrash('3qdc', 'nhac')).items[0].deletedVia, 'claude');
  assert.ok((await core.restoreFromTrash('3qdc', 'nhac', sm.id, asClaude)).ok);
  assert.equal(existsSync(SONG_FILE), true);
  assert.deepEqual(readFileSync(SONG_FILE), mp3);
  rmSync(SONG_FILE);
  // the shared module has no function that deletes for good by a name Claude's tools would use: purge is separate
  assert.equal(typeof core.purgeFromTrash, 'function');
  ok('shared functions: move / list / restore for every part, "claude" recorded, wrong part or game refused');
} finally {
  child.kill();
  rmSync(SONG_FILE, { force: true });
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
console.log(`${n} checks passed`);
