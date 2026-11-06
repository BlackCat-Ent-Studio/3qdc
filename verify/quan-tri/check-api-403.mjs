// check-api-403.mjs — the server itself refuses what an account has no right to (not only hidden buttons):
// the wall between games, each part's permissions, the owner-only pages, rights taken away while signed in.
//   node verify/quan-tri/check-api-403.mjs      (run from the project folder; needs nothing running, uses a temp data folder)
// A temporary server is started on a free port; a preload switches the news part on for the second game (skystory) in that
// child process only. Accounts are written straight into its users.json.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
const MCP_VIET = '3qp_ThuNghiemChiViet0123456789abcdefghijklmnopq';
const MCP_DUYET = '3qp_ThuNghiemChiDuyet0123456789abcdefghijklmnop';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
let n = 0;
const ok = (name) => { n++; console.log(`ok   ${name}`); };
const dirs = [];
const tmpDir = () => { const d = mkdtempSync(join(tmpdir(), 'api403-')); dirs.push(d); return d; };
const put = (root, rel, text) => { const f = join(root, ...rel.split('/')); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
const freePort = () => new Promise((done) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });

const { hashPassword } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/admin-auth.mjs')).href);
const now = new Date().toISOString();
const secret = await hashPassword(PASSWORD);
const acct = (username, role, grants, extra = {}) => ({ username, name: username, role, ...(grants ? { grants } : {}), ...secret, disabled: false, createdAt: now, passwordSetAt: now, ...extra });
const G3 = (grants) => ({ '3qdc': grants });
const USERS = [
  acct('chu', 'owner'),
  acct('chu2', 'owner'),
  acct('quanly', 'member', G3('*')),
  acct('viet3', 'member', G3({ 'tin-tuc': ['viet'] })),
  acct('tintuc3', 'member', G3({ 'tin-tuc': ['duyet'] })),
  acct('duyet3', 'member', G3({ 'phieu-be-ngoan': ['duyet'] })),
  acct('qlphieu3', 'member', G3({ 'phieu-be-ngoan': ['quan-ly'] })),
  acct('sky', 'member', { skystory: { 'tin-tuc': ['viet'] } }),
  acct('rong', 'member', {}),
  acct('cho', 'pending', undefined, { wantGrants: G3({ 'tin-tuc': ['viet'] }) }),
];

const root = tmpDir();
put(root, 'he-thong/users.json', JSON.stringify(USERS));
put(root, 'he-thong/mcp-tokens.json', JSON.stringify([
  { id: 'a1a1a1a1a1a1', username: 'viet3', label: 'v', hint: 'pqrs', hash: sha256(MCP_VIET), createdBy: 'chu', createdAt: now.slice(0, 19) },
  { id: 'b2b2b2b2b2b2', username: 'duyet3', label: 'd', hint: 'mnop', hash: sha256(MCP_DUYET), createdBy: 'chu', createdAt: now.slice(0, 19) },
]));
const article = (id, slug) => JSON.stringify({
  id, slug, title: `Bài ${slug}`, category: 'thong-bao', status: 'published', content: '<p>x</p>', summary: 's', cover: '', author: 'a',
  publishAt: '2026-01-01T08:00:00+07:00', createdAt: '2026-01-01T08:00:00.000+07:00', updatedAt: '2026-01-01T08:00:00.000+07:00', updatedBy: 'a',
});
put(root, 'games/3qdc/tin-tuc/posts/1.json', article(1, 'bai-cua-3qdc'));
const TICKET = 'abc123xyz789';
put(root, 'games/3qdc/phieu-be-ngoan/phieu.json', JSON.stringify({ items: [{ id: TICKET, email: 'nguoi.choi@example.com', ten: 'Người Chơi', acc: 'acc1', server: 'S1', qua: ['x'], ghiChu: '', luc: '2026-01-01T08:00:00+07:00', ngay: '2026-01-01', st: 'cho', phanHoi: '' }] }));

const preload = join(tmpDir(), 'preload.mjs');
writeFileSync(preload, `import { GAMES } from ${JSON.stringify(pathToFileURL(join(ROOT, 'scripts/lib/admin/games.mjs')).href)};\nGAMES.find((g) => g.id === 'skystory').modules['tin-tuc'] = {};\n`);
const port = await freePort();
const env = {
  ...process.env, PORT: String(port), DATA_ROOT: root, NEWS_INSECURE_COOKIE: '1', NEWS_SITE_ORIGIN: `http://127.0.0.1:${port}`,
  NEWS_ALLOWED_ORIGINS: '', PHIEU_GOOGLE_CLIENT_ID: 'x', NEWS_DATA_DIR: '', PHIEU_DATA_DIR: '', SIGNUP_DATA_DIR: '',
};
const child = spawn(process.execPath, ['--import', pathToFileURL(preload).href, 'server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`;

function req(method, path, { cookie, body, raw, type, noOrigin, headers: extra } = {}) {
  return new Promise((done, fail) => {
    const data = raw || (body !== undefined ? Buffer.from(JSON.stringify(body)) : null);
    const headers = { Host: `127.0.0.1:${port}`, ...(cookie ? { Cookie: cookie } : {}), ...(extra || {}) };
    if (method === 'POST') { if (!noOrigin) headers.Origin = origin; headers['Content-Type'] = type || 'application/json'; }
    if (data) headers['Content-Length'] = data.length;
    const r = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', fail);
    r.end(data);
  });
}
const api = '/quan-tri/api';
const cookies = {};
const as = (who) => ({ cookie: cookies[who] });
const get = (who, path) => req('GET', api + path, as(who));
const post = (who, path, body) => req('POST', api + path, { ...as(who), body: body === undefined ? {} : body });
const expect = (r, status, what) => assert.equal(r.status, status, `${what}: ${r.status} ${String(r.text || "").slice(0, 120)}`);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(40)]);

try {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('server exited early:\n' + log);
    try { if ((await req('GET', '/tin-tuc')).status === 200) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  for (const u of USERS.filter((x) => x.role !== 'pending')) {
    const r = await req('POST', api + '/dang-nhap', { body: { username: u.username, password: PASSWORD } });
    expect(r, 200, `sign in ${u.username}`);
    cookies[u.username] = r.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  }
  const pend = await req('POST', api + '/dang-nhap', { body: { username: 'cho', password: PASSWORD } });
  expect(pend, 403, 'a waiting account cannot sign in');
  ok('every account signs in with its password; the waiting one is refused');

  // ---------- the wall between games ----------
  // skystory has the news part (this test only); sky writes there and nowhere else
  expect(await get('sky', '/g/skystory/bai'), 200, 'sky reads its own game');
  const made = await post('sky', '/g/skystory/bai', { action: 'luu', title: 'Bản nháp Skystory', slug: 'ban-nhap-skystory', summary: 'Tóm tắt', category: 'thong-bao', cover: '/3qdc-vi/home/anh-nen-slogan-vi.webp', content: '<p>sky</p>', pinned: false, site: 'chinh' });
  expect(made, 200, 'sky saves a draft');
  expect(await get('sky', '/g/3qdc/bai'), 403, '3qdc articles for the skystory writer');
  expect(await get('sky', '/bai'), 403, 'old address (= 3qdc) for the skystory writer');
  expect(await get('sky', '/g/3qdc/anh'), 403, '3qdc pictures for the skystory writer');
  expect(await get('sky', '/g/3qdc/phieu-be-ngoan'), 403, '3qdc tickets for the skystory writer');
  expect(await req('POST', api + '/g/3qdc/anh', { ...as('sky'), raw: PNG, type: 'image/png' }), 403, 'picture upload into 3qdc by the skystory writer');
  expect(await get('sky', '/nguoi-dung'), 403, 'accounts page');
  for (const p of ['/danh-muc-quyen', '/nhat-ky']) {
    expect(await get('sky', p), 403, `owner-only ${p} for a member`);
    expect(await get('quanly', p), 403, `owner-only ${p} even for a manager of a game`);
    expect(await get('chu', p), 200, `${p} for the owner`);
    expect(await req('GET', api + p), 401, `${p} signed out`);
  }
  ok('only skystory rights: g/skystory works, every 3qdc address is 403');

  for (const who of ['viet3', 'tintuc3', 'quanly', 'duyet3', 'qlphieu3', 'rong']) {
    for (const p of ['/g/skystory/bai', '/g/skystory/anh', '/g/skystory/thung-rac', '/g/skystory/bai/1', '/g/skystory/phieu-be-ngoan']) expect(await get(who, p), 403, `${who} GET ${p}`);
    expect(await post(who, '/g/skystory/bai', { action: 'luu' }), 403, `${who} POST g/skystory/bai`);
    expect(await post(who, '/g/skystory/bai/1/xoa', { baseUpdatedAt: 'x' }), 403, `${who} POST g/skystory/bai/1/xoa`);
    expect(await req('POST', api + '/g/skystory/anh', { ...as(who), raw: PNG, type: 'image/png' }), 403, `${who} upload into skystory`);
    expect(await req('GET', '/quan-tri/xem-truoc/1?game=skystory', as(who)), 403, `${who} preview of skystory`);
  }
  ok('only 3qdc rights (any of them): every g/skystory address, upload and preview is 403');

  expect(await get('chu', '/g/skystory/bai'), 200, 'owner in skystory');
  expect(await get('chu', '/g/3qdc/bai'), 200, 'owner in 3qdc');
  expect(await get('chu', '/g/skystory/phieu-be-ngoan'), 404, 'a part skystory has not switched on (owner)');
  expect(await get('sky', '/g/skystory/phieu-be-ngoan'), 404, 'a part skystory has not switched on (member of the game)');
  expect(await get('sky', '/g/skystory/nhac'), 404, 'music not switched on');
  for (const who of ['chu', 'viet3', 'sky']) expect(await get(who, '/g/khong-co/bai'), 404, `${who} unknown game`);
  ok('owner reaches both games; a part the game has not switched on is 404; an unknown game is 404');

    // every address the book of parts names, for GET and POST: refused (401 signed out, 403 for an account with no right in the game)
  const { MODULES } = await import(pathToFileURL(join(ROOT, 'scripts/lib/admin/modules.mjs')).href);
  for (const m of Object.values(MODULES)) {
    for (const p of m.paths) {
      for (const prefix of ['/g/3qdc', '']) {
        expect(await req('GET', api + prefix + p), 401, `signed out GET ${prefix}${p}`);
        expect(await req('POST', api + prefix + p, { body: {} }), 401, `signed out POST ${prefix}${p}`);
        for (const who of ['rong', 'sky']) {
          expect(await get(who, prefix + p), 403, `${who} GET ${prefix}${p}`);
          expect(await post(who, prefix + p, {}), 403, `${who} POST ${prefix}${p}`);
        }
      }
    }
  }
  ok('every address of every part is 401 signed out and 403 for an account without a right in the game');

  // ---------- parts of 3qdc ----------
  const probe = async (who, want) => {
    const tries = [['/bai', 'viet'], ['/thung-rac', 'duyet'], ['/phieu-be-ngoan?ngay=tat-ca', 'phieu'], ['/nhac', 'nhac'], ['/dang-ky-som', 'dky'], ['/nguoi-dung', 'owner']];
    for (const [p, key] of tries) expect(await get(who, p), want.includes(key) ? 200 : 403, `${who} GET ${p}`);
  };
  await probe('rong', []);
  await probe('viet3', ['viet']);
  await probe('tintuc3', ['viet', 'duyet']);
  await probe('duyet3', ['phieu']);
  await probe('qlphieu3', ['phieu']);
  await probe('quanly', ['viet', 'duyet', 'phieu', 'nhac', 'dky']);
  await probe('chu', ['viet', 'duyet', 'phieu', 'nhac', 'dky', 'owner']);
  ok('3qdc: each account sees exactly the parts its rights name; accounts page only for the owner');

  for (const who of ['rong', 'viet3', 'tintuc3', 'duyet3', 'qlphieu3', 'quanly']) {
    for (const [p, b] of [['/loi-moi', { role: 'phieu' }], ['/loi-moi/ffffffffffff/huy', {}], ['/ma-claude', { username: 'duyet3' }], ['/ma-claude/ffffffffffff/thu-hoi', {}], ['/nguoi-dung/viet3', { action: 'khoa' }]]) {
      expect(await post(who, p, b), 403, `${who} POST ${p}`);
    }
  }
  ok('invites, Claude codes and account changes: 403 for everyone but the owner (even the whole-game manager)');

  expect(await req('POST', api + '/g/3qdc/nhac', { ...as('viet3'), raw: Buffer.from('x'), type: 'audio/mpeg', headers: { 'X-Ten-File': 'a.mp3' } }), 403, 'song upload by a writer');
  expect(await req('POST', api + '/anh', { ...as('duyet3'), raw: PNG, type: 'image/png' }), 403, 'picture upload by a tickets reviewer');
  expect(await req('POST', api + '/anh', { raw: PNG, type: 'image/png' }), 401, 'picture upload without sign-in');
  ok('raw uploads (pictures, music) check the right before reading the body');

  // tickets: a reviewer sees no e-mail, no CSV, cannot delete
  const list = await get('duyet3', '/phieu-be-ngoan?ngay=tat-ca');
  assert.ok(!/"email"/.test(list.text) && list.text.includes(TICKET), 'reviewer sees the ticket without an e-mail');
  assert.ok(/"email"/.test((await get('qlphieu3', '/phieu-be-ngoan?ngay=tat-ca')).text), 'tickets manager sees the e-mail');
  expect(await get('duyet3', '/phieu-be-ngoan/csv?ngay=tat-ca'), 403, 'reviewer CSV');
  expect(await post('duyet3', `/phieu-be-ngoan/${TICKET}/xoa`), 403, 'reviewer deletes a ticket');
  expect(await get('qlphieu3', '/phieu-be-ngoan/csv?ngay=tat-ca'), 200, 'tickets manager CSV');
  expect(await post('duyet3', `/phieu-be-ngoan/${TICKET}`, { st: 'tra' }), 200, 'reviewer answers a ticket');
  assert.ok(!/"email"/.test((await post('duyet3', `/phieu-be-ngoan/${TICKET}`, { st: 'cho' })).text), 'the answer has no e-mail for the reviewer');
  ok('tickets: a reviewer answers but sees no e-mail, no CSV, cannot delete');

  // article rules follow the news role of the account in that game
  const art = (extra) => ({ title: 'Bài mới', slug: 'bai-moi', summary: 'Tóm tắt', category: 'thong-bao', cover: '/3qdc-vi/home/anh-nen-slogan-vi.webp', content: '<p>x</p>', pinned: false, site: 'chinh', ...extra });
  expect(await post('viet3', '/g/3qdc/bai', art({ action: 'dang-ngay' })), 403, 'a writer publishes directly');
  const w = await post('viet3', '/g/3qdc/bai', art({ action: 'luu' }));
  expect(w, 200, 'a writer saves a draft');
  const wid = JSON.parse(w.text).post;
  expect(await post('viet3', `/g/3qdc/bai/${wid.id}/xoa`, { baseUpdatedAt: wid.updatedAt }), 403, 'a writer deletes');
  const pub = await post('tintuc3', `/g/3qdc/bai/${wid.id}`, art({ action: 'dang-ngay', baseUpdatedAt: wid.updatedAt }));
  expect(pub, 200, 'a reviewer publishes');
  expect(await post('tintuc3', `/g/3qdc/bai/${wid.id}/xoa`, { baseUpdatedAt: JSON.parse(pub.text).post.updatedAt }), 200, 'a reviewer deletes');
  ok('article rules: a writer saves and sends for review; publishing and deleting need the review right');

  // preview
  expect(await req('GET', '/quan-tri/xem-truoc/1', as('viet3')), 200, 'writer previews 3qdc');
  expect(await req('GET', '/quan-tri/xem-truoc/1', as('duyet3')), 403, 'tickets reviewer previews articles');
  expect(await req('GET', '/quan-tri/xem-truoc/1', as('sky')), 403, 'skystory writer previews 3qdc');
  expect(await req('GET', '/quan-tri/xem-truoc/1?game=skystory', as('sky')), 200, 'skystory writer previews skystory');
  expect(await req('GET', '/quan-tri/xem-truoc/1'), 302, 'signed out preview');
  ok('preview: needs the news right of that game; signed out goes to the sign-in page');

  // origin / content type are still checked for the owner
  expect(await req('POST', api + '/g/3qdc/bai/999999', { ...as('chu'), body: {}, noOrigin: true }), 403, 'no Origin');
  expect(await req('POST', api + '/g/3qdc/bai/999999', { ...as('chu'), body: {}, headers: { Origin: 'https://example.org' }, noOrigin: true }), 403, 'foreign Origin');
  expect(await req('GET', api + '/g/3qdc/bai'), 401, 'no session');
  expect(await req('GET', api + '/toi'), 401, 'no session /toi');
  ok('the owner is not exempt: no Origin / foreign Origin is 403, no session is 401');

  // /toi
  const me = JSON.parse((await get('viet3', '/toi')).text);
  assert.deepEqual([me.user.role, me.user.grants, me.games.map((g) => g.id), me.games[0].menu.map((m) => m[0])], ['member', G3({ 'tin-tuc': ['viet'] }), ['3qdc'], ['posts']]);
  assert.deepEqual(JSON.parse((await get('rong', '/toi')).text).games, []);
  assert.deepEqual(JSON.parse((await get('chu', '/toi')).text).games.map((g) => g.id), ['3qdc', 'skystory']);
  ok('/toi: the account, its grants and only the games and menu it may open');

  // Claude codes follow the rights
  const mcp = (code) => req('POST', '/mcp', { body: { jsonrpc: '2.0', id: 1, method: 'ping' }, headers: { Authorization: `Bearer ${code}` }, noOrigin: true });
  assert.equal((await mcp(MCP_DUYET)).status, 200);
  assert.equal((await mcp(MCP_VIET)).status, 200);
  const mcpTools = async (code) => JSON.parse((await req('POST', '/mcp', { body: { jsonrpc: '2.0', id: 2, method: 'tools/list' }, headers: { Authorization: `Bearer ${code}` }, noOrigin: true })).text).result.tools.map((t) => t.name);
  assert.ok((await mcpTools(MCP_DUYET)).includes('xem_phieu') && !(await mcpTools(MCP_DUYET)).includes('viet_bai'));
  assert.ok((await mcpTools(MCP_VIET)).includes('viet_bai') && !(await mcpTools(MCP_VIET)).includes('xem_phieu'));
  ok('Claude code: every part has tools, an account gets the tools of the rights it holds only');

  // ---------- rights change while signed in ----------
  expect(await get('viet3', '/bai'), 200, 'before');
  const q = await post('chu', '/nguoi-dung/viet3', { action: 'quyen', grants: G3({ 'phieu-be-ngoan': ['duyet'] }) });
  expect(q, 200, 'owner changes the rights');
  expect(await get('viet3', '/bai'), 403, 'the very next request after the right is taken away');
  expect(await get('viet3', '/phieu-be-ngoan?ngay=tat-ca'), 200, 'the new right works without signing in again');
  expect(await mcp(MCP_VIET), 200, 'its Claude code follows the new right');
  const dropped = await post('chu', '/nguoi-dung/duyet3', { action: 'quyen', grants: G3({ 'tin-tuc': ['viet'] }) });
  expect(dropped, 200, 'owner takes the tickets right away');
  assert.ok(!(await mcpTools(MCP_DUYET)).includes('xem_phieu') && (await mcpTools(MCP_DUYET)).includes('viet_bai'), 'the ticket tools stop with the right');
  ok('rights taken away or given apply on the very next request (no sign-out), Claude codes included');

  // ---------- the accounts page rules ----------
  const bad = async (who, target, body, status, what) => expect(await post(who, '/nguoi-dung/' + target, body), status, what);
  await bad('chu', 'chu', { action: 'khoa' }, 400, 'nobody changes themselves');
  await bad('chu', 'chu2', { action: 'quyen', grants: G3('*') }, 400, 'an owner is not changed by grants');
  await bad('chu', 'viet3', { action: 'quyen', grants: { 'khong-co': '*' } }, 400, 'unknown game');
  await bad('chu', 'viet3', { action: 'quyen', grants: { '3qdc': { 'tin-tuc': ['bay'] } } }, 400, 'unknown right');
  await bad('chu', 'viet3', { action: 'quyen', grants: { skystory: { nhac: ['quan-ly'] } } }, 400, 'a part the game has not switched on');
  await bad('chu', 'viet3', { action: 'quyen', grants: {} }, 400, 'no rights at all');
  await bad('chu', 'viet3', { action: 'quyen', role: 'owner' }, 400, 'no call makes an owner (role is ignored, grants missing)');
  await bad('chu', 'viet3', { action: 'vai-tro', role: 'manager' }, 400, 'the old role action is gone');
  assert.equal(JSON.parse((await get('chu', '/nguoi-dung')).text).users.find((u) => u.username === 'viet3').role, 'member');
  await bad('chu', 'cho', { action: 'duyet' }, 200, 'approve with the rights the person asked for');
  const first = await req('POST', api + '/dang-nhap', { body: { username: 'cho', password: PASSWORD } });
  expect(first, 200, 'the approved account signs in');
  expect(await req('GET', api + '/g/3qdc/bai', { cookie: first.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ') }), 200, 'with the rights it asked for');
  await bad('chu', 'cho', { action: 'khoa' }, 200, 'lock');
  expect(await req('GET', api + '/g/3qdc/bai', { cookie: first.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ') }), 401, 'a locked account is signed out');
  await bad('chu2', 'chu', { action: 'khoa' }, 200, 'an owner can lock another while one stays active');
  expect(await get('chu', '/g/3qdc/bai'), 401, 'the locked owner is out');
  ok('accounts page: grants checked against the books, no way to make an owner, approval uses the asked-for rights, locking signs out');

  // ---------- the account script keeps one owner ----------
  const cli = (...a) => spawnSync(process.execPath, ['scripts/news-user.mjs', ...a], { cwd: ROOT, env: { ...env, DATA_ROOT: root }, encoding: 'utf8' });
  const lock = cli('role', 'chu2', 'editor');
  assert.notEqual(lock.status, 0);
  assert.match(lock.stderr, /at least one active owner/);
  assert.notEqual(cli('disable', 'chu2').status, 0);
  const made2 = cli('add', 'moi', 'Người Mới', '{"3qdc":{"tin-tuc":["viet"],"nhac":["quan-ly"]}}');
  assert.notEqual(cli('add', 'moi1', 'Người Mới', '{"skystory":{"tin-tuc":["viet"]}}').status, 0); // skystory has no news part in the real book
  assert.equal(made2.status, 0, made2.stderr);
  assert.notEqual(cli('add', 'moi2', 'Người Mới', '{"khong-co":"*"}').status, 0);
  assert.notEqual(cli('add', 'moi3', 'Người Mới', 'manager2').status, 0);
  assert.equal(cli('add', 'moi4', 'Người Mới', 'phieu').status, 0);
  assert.match(cli('list').stdout, /moi4\s+member \{"3qdc":\{"phieu-be-ngoan":\["duyet"\]\}\}/);
  ok('account script: owners and grants understood, the last active owner stays');
} finally {
  child.kill();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
console.log(`${n} checks passed`);
