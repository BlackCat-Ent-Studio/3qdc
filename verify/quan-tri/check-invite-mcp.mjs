// check-invite-mcp.mjs — invite links that carry rights, Claude codes by rights, the owner's tools on /mcp and the
// record of rights changes (data/he-thong/nhat-ky-quyen.jsonl).
//   node verify/quan-tri/check-invite-mcp.mjs      (run from the project folder; needs nothing running, uses a temp data folder)
// A temporary server is started on a free port with its own data folder; accounts and Claude codes are written straight
// into it (a copy of what the real files look like), so the real data is never touched.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
const PHIEU_CODE = '3qp_ThuNghiemMaPhieuDongVu0123456789abcdefghij';
const OLD_OWNER_CODE = '3qp_ThuNghiemMaChuCuKhongScope0123456789abcdef';
const SCOPED_MEMBER_CODE = '3qp_ThuNghiemMaScopeChoThanhVien0123456789abc';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
let n = 0;
const ok = (name) => { n++; console.log(`ok   ${name}`); };
const dirs = [];
const tmpDir = () => { const d = mkdtempSync(join(tmpdir(), 'invmcp-')); dirs.push(d); return d; };
const put = (root, rel, text) => { const f = join(root, ...rel.split('/')); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
const freePort = () => new Promise((done) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });

const { hashPassword } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/admin-auth.mjs')).href);
const now = new Date().toISOString();
const secret = await hashPassword(PASSWORD);
const acct = (username, role, grants, extra = {}) => ({ username, name: username, role, ...(grants ? { grants } : {}), ...secret, disabled: false, createdAt: now, passwordSetAt: now, ...extra });
const PHIEU = { '3qdc': { 'phieu-be-ngoan': ['duyet'] } };
const USERS = [
  acct('chu', 'owner'),
  acct('chu2', 'owner'),
  acct('dongvu', 'member', PHIEU),
  acct('rong', 'member', {}),
  acct('viet3', 'member', { '3qdc': { 'tin-tuc': ['viet'] } }),
  acct('khoa', 'member', {}, { disabled: true }),
  acct('cho', 'pending', undefined, { wantGrants: { '3qdc': { 'tin-tuc': ['viet'] } } }),
];
const root = tmpDir();
put(root, 'he-thong/users.json', JSON.stringify(USERS));
const code = (id, username, c, extra = {}) => ({ id, username, label: 'thu', hint: c.slice(-4), hash: sha256(c), createdBy: 'chu', createdAt: now.slice(0, 19), ...extra });
put(root, 'he-thong/mcp-tokens.json', JSON.stringify([
  code('a1a1a1a1a1a1', 'dongvu', PHIEU_CODE),
  code('b2b2b2b2b2b2', 'chu', OLD_OWNER_CODE), // made before codes had a scope
  code('c3c3c3c3c3c3', 'viet3', SCOPED_MEMBER_CODE, { scope: 'owner' }), // a member can never use an owner code
]));
const TICKET = 'abc123xyz789';
put(root, 'games/3qdc/phieu-be-ngoan/phieu.json', JSON.stringify({ items: [{ id: TICKET, email: 'nguoi.choi@example.com', ten: 'Người Chơi', acc: 'acc1', server: 'S1', qua: ['x'], ghiChu: '', luc: '2026-01-01T08:00:00+07:00', ngay: '2026-01-01', st: 'cho', phanHoi: '' }] }));

const port = await freePort();
const env = { ...process.env, PORT: String(port), DATA_ROOT: root, NEWS_INSECURE_COOKIE: '1', NEWS_SITE_ORIGIN: `http://127.0.0.1:${port}`, NEWS_ALLOWED_ORIGINS: '', PHIEU_GOOGLE_CLIENT_ID: 'x', NEWS_DATA_DIR: '', PHIEU_DATA_DIR: '', SIGNUP_DATA_DIR: '' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`;
const seen = []; // every answer body, scanned at the end for anything secret

function req(method, path, { cookie, body, headers: extra } = {}) {
  return new Promise((done, fail) => {
    const data = body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const headers = { Host: `127.0.0.1:${port}`, ...(cookie ? { Cookie: cookie } : {}), ...(extra || {}) };
    if (method === 'POST') { headers.Origin = origin; headers['Content-Type'] = 'application/json'; }
    if (data) headers['Content-Length'] = data.length;
    const r = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { const text = Buffer.concat(chunks).toString('utf8'); seen.push(text); done({ status: res.statusCode, headers: res.headers, text }); });
    });
    r.on('error', fail);
    r.end(data);
  });
}
const api = '/quan-tri/api';
const cookies = {};
const signIn = async (u, p = PASSWORD) => {
  const r = await req('POST', api + '/dang-nhap', { body: { username: u, password: p } });
  if (r.status === 200) cookies[u] = r.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  return r;
};
const get = (who, path) => req('GET', api + path, { cookie: cookies[who] });
const post = (who, path, body) => req('POST', api + path, { cookie: cookies[who], body: body === undefined ? {} : body });
const json = (r) => JSON.parse(r.text);
const expect = (r, status, what) => assert.equal(r.status, status, `${what}: ${r.status} ${String(r.text).slice(0, 160)}`);

let rpcId = 0;
const rpc = (code, method, params) => req('POST', '/mcp', { headers: { Authorization: `Bearer ${code}` }, body: { jsonrpc: '2.0', id: ++rpcId, method, params } });
const toolNames = async (c) => { const r = await rpc(c, 'tools/list'); expect(r, 200, 'tools/list'); return json(r).result.tools.map((t) => t.name).sort(); };
const call = async (c, name, args = {}) => { const r = await rpc(c, 'tools/call', { name, arguments: args }); expect(r, 200, `call ${name}`); return json(r).result; };
const say = (res) => res.content.map((x) => x.text).join('\n');
const usersFile = () => JSON.parse(readFileSync(join(root, 'he-thong', 'users.json'), 'utf8'));
const userOf = (name) => usersFile().find((u) => u.username === name);
const auditLines = () => { try { return readFileSync(join(root, 'he-thong', 'nhat-ky-quyen.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const TICKET_TOOLS = ['tra_qua', 'tu_choi', 'xem_phieu'];
const OWNER_TOOLS = ['cap_quyen', 'ds_game', 'tao_link_moi', 'thu_quyen', 'xem_quyen'];
const TV3 = { '3qdc': { 'tin-tuc': ['viet'] } };

try {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('server exited early:\n' + log);
    try { if ((await req('GET', '/tin-tuc')).status === 200) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  for (const u of ['chu', 'chu2', 'dongvu', 'rong', 'viet3']) expect(await signIn(u), 200, `sign in ${u}`);

  // ---------- invite links carry rights ----------
  const bad = async (grants, what) => { const r = await post('chu', '/loi-moi', { grants }); expect(r, 400, what); };
  await bad(undefined, 'no grants');
  await bad({}, 'empty grants');
  await bad({ khong: '*' }, 'unknown game');
  await bad({ '3qdc': { 'tin-tuc': ['bay'] } }, 'unknown permission');
  await bad({ '3qdc': { 'khong-co': ['viet'] } }, 'unknown part');
  await bad({ skystory: { 'phieu-be-ngoan': ['duyet'] } }, 'a part the game has not switched on');
  await bad({ '3qdc': { 'tin-tuc': ['viet'] }, owner: '*' }, 'nothing about owner');
  expect(await post('viet3', '/loi-moi', { grants: TV3 }), 403, 'a member cannot make links');
  ok('a link needs real grants; members cannot make one');

  const made = await post('chu', '/loi-moi', { grants: TV3 });
  expect(made, 200, 'make link');
  const token = json(made).token;
  assert.match(token, /^[A-Za-z0-9_-]{40,60}$/);
  const inv = JSON.parse(readFileSync(join(root, 'he-thong', 'invites.json'), 'utf8'));
  assert.equal(inv.length, 1);
  assert.deepEqual(inv[0].grants, TV3);
  assert.equal('role' in inv[0], false, 'no role on a new invite');
  assert.ok(!readFileSync(join(root, 'he-thong', 'invites.json'), 'utf8').includes(token), 'the token itself is not stored');
  assert.ok(Math.abs((inv[0].exp - Date.now()) - 7 * 86400e3) < 60e3, 'valid for 7 days');
  ok('the link is stored with its grants, only as a hash, valid 7 days');

  // what the link shows before sign-up: same refusal for every bad token, and no ids or hashes in a good answer
  const peek = (t) => req('POST', api + '/xem-loi-moi', { body: { token: t } });
  const peekBad = [await peek(''), await peek('abc'), await peek('x'.repeat(43))];
  for (const r of peekBad) expect(r, 400, 'a wrong token is refused');
  assert.equal(new Set(peekBad.map((r) => r.text)).size, 1, 'every wrong token gets the same answer');
  const shownLink = await peek(token);
  expect(shownLink, 200, 'a good token shows what it carries');
  assert.deepEqual(Object.keys(json(shownLink)).sort(), ['exp', 'games'], 'only games and expiry');
  assert.ok(!shownLink.text.includes(sha256(token)) && !shownLink.text.includes('"chu"'), 'no hash and no maker');
  ok('/xem-loi-moi: wrong tokens get one refusal; a good token shows only games and expiry');

  const accept = (t, username) => req('POST', api + '/nhan-loi-moi', { body: { token: t, username, name: 'Người Mới', password: PASSWORD } });
  expect(await accept(token, 'moi1'), 201, 'accept');
  assert.equal(userOf('moi1').role, 'pending');
  assert.deepEqual(userOf('moi1').wantGrants, TV3);
  assert.equal((await signIn('moi1')).status, 403, 'waits for approval');
  expect(await accept(token, 'moi2'), 400, 'second use');
  expect(await peek(token), 400, 'a used link shows nothing');
  assert.equal(userOf('moi2'), undefined);
  ok('accepted: pending with wantGrants, cannot sign in; the same link a second time is refused');

  const appr = await post('chu', '/nguoi-dung/moi1', { action: 'duyet' });
  expect(appr, 200, 'approve with the invite grants');
  assert.deepEqual(userOf('moi1').grants, TV3);
  expect(await signIn('moi1'), 200, 'sign in after approval');
  const me = json(await get('moi1', '/toi'));
  assert.deepEqual(me.games.map((g) => g.id), ['3qdc']);
  assert.deepEqual(me.games[0].menu.map((m) => m[0]), ['posts']);
  assert.deepEqual(Object.keys(me.games[0].perms), ['tin-tuc']);
  expect(await get('moi1', '/g/3qdc/phieu-be-ngoan'), 403, 'no tickets');
  expect(await get('moi1', '/g/3qdc/nhac'), 403, 'no music');
  expect(await get('moi1', '/nguoi-dung'), 403, 'no accounts page');
  ok('approved: signs in and sees only the news of 3qdc');

  // a link whose rights match none of the kinds of the accounts page: approving without rights gives exactly the link's rights
  const CUSTOM = { '3qdc': { 'tin-tuc': ['viet', 'duyet'] } };
  const customToken = json(await post('chu', '/loi-moi', { grants: CUSTOM })).token;
  expect(await accept(customToken, 'moi-tc'), 201, 'accept the custom link');
  const wanted = userOf('moi-tc').wantGrants;
  assert.deepEqual(wanted, CUSTOM);
  const shown = json(await get('chu', '/nguoi-dung')).users.find((u) => u.username === 'moi-tc');
  assert.deepEqual(shown.wantGrants, CUSTOM, 'the accounts page gets the rights the link offers');
  expect(await post('chu', '/nguoi-dung/moi-tc', { action: 'duyet' }), 200, 'approve a custom link without rights');
  assert.deepEqual(userOf('moi-tc').grants, wanted, 'exactly the rights of the link, not a kind picked by the page');
  assert.equal(userOf('moi-tc').wantGrants, undefined);
  const page = (await req('GET', '/quan-tri', { cookie: cookies.chu })).text;
  assert.ok(page.includes('Link mời cho') && page.includes("{ action: 'duyet' }") && !page.includes('PRESET_GRANTS'), 'the page shows the rights the link offers and approves without sending any');
  ok('a custom link: approving sends no rights, the account gets exactly the link rights; the page shows what the link offers');

  const second = json(await post('chu', '/loi-moi', { grants: TV3 })).token;
  const file = join(root, 'he-thong', 'invites.json');
  const list = JSON.parse(readFileSync(file, 'utf8'));
  list.find((i) => i.hash === sha256(second)).exp = Date.now() - 1000;
  writeFileSync(file, JSON.stringify(list));
  expect(await accept(second, 'moi3'), 400, 'expired link');
  assert.equal(userOf('moi3'), undefined);
  const third = json(await post('chu', '/loi-moi', { grants: TV3 }));
  expect(await post('chu', `/loi-moi/${third.invites.find((i) => i.id).id}/huy`), 200, 'cancel');
  expect(await accept(third.token, 'moi4'), 400, 'cancelled link');
  ok('an expired link and a cancelled link are refused');

  // an invite made before invites carried grants (only a role) still works
  const old = 'LegacyInviteTokenForTheOldFormat0123456789abcdefg';
  const l2 = JSON.parse(readFileSync(file, 'utf8'));
  l2.push({ id: 'ddddddddddd1', hash: sha256(old), role: 'phieu', createdBy: 'chu', createdAt: now.slice(0, 19), exp: Date.now() + 86400e3 });
  writeFileSync(file, JSON.stringify(l2));
  expect(await accept(old, 'moi5'), 201, 'old invite');
  assert.deepEqual(userOf('moi5').wantGrants, PHIEU);
  ok('an older invite with only a role still gives the tickets reviewer rights');

  // ---------- a normal code: tools follow the rights ----------
  assert.deepEqual(await toolNames(PHIEU_CODE), TICKET_TOOLS);
  const init = json(await rpc(PHIEU_CODE, 'initialize', { protocolVersion: '2025-06-18' })).result;
  assert.equal(init.serverInfo.name, '3qdc-quan-tri');
  assert.ok(!/xem_quyen|cap_quyen/.test(init.instructions), 'no owner text for an ordinary code');
  const listed = await call(PHIEU_CODE, 'xem_phieu', { ngay: 'tat-ca' });
  assert.ok(say(listed).includes(TICKET) && !say(listed).includes('example.com'));
  for (const t of OWNER_TOOLS) {
    const r = await call(PHIEU_CODE, t, { username: 'rong', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'], grants: TV3 });
    assert.equal(r.isError, true, t);
    assert.match(say(r), /Không có công cụ/);
  }
  assert.deepEqual(userOf('rong').grants, {});
  ok('the ticket reviewer code lists exactly 3 tools; owner tools are "no such tool"');

  expect(await post('chu', '/nguoi-dung/dongvu', { action: 'quyen', grants: TV3 }), 200, 'take the tickets away');
  assert.ok(!(await toolNames(PHIEU_CODE)).some((t) => TICKET_TOOLS.includes(t)), 'the ticket tools are gone with the right');
  assert.equal((await call(PHIEU_CODE, 'xem_phieu', {})).isError, true);
  // the accounts page always leaves a member at least one right: empty the rights in the file, as the owner's thu_quyen does
  const emptied = usersFile();
  emptied.find((u) => u.username === 'dongvu').grants = {};
  writeFileSync(join(root, 'he-thong', 'users.json'), JSON.stringify(emptied));
  assert.equal((await rpc(PHIEU_CODE, 'tools/list')).status, 401, 'code dead once no right is left');
  expect(await post('chu', '/nguoi-dung/dongvu', { action: 'quyen', grants: PHIEU }), 200, 'give the tickets back');
  assert.deepEqual(await toolNames(PHIEU_CODE), TICKET_TOOLS);
  ok('taking the tickets right away removes its tools at once, the last right kills the code (401); giving it back revives it');

  // ---------- owner codes ----------
  expect(await post('chu', '/ma-claude', { username: 'chu', label: 'x', scope: 'nope' }), 400, 'unknown scope');
  expect(await post('chu', '/ma-claude', { username: 'chu2', label: 'x', scope: 'owner' }), 400, 'owner code for someone else');
  expect(await post('chu', '/ma-claude', { username: 'dongvu', label: 'x', scope: 'owner' }), 400, 'owner code for a member');
  expect(await post('dongvu', '/ma-claude', { username: 'dongvu', label: 'x', scope: 'owner' }), 403, 'a member cannot make codes');
  const mk = async (label) => { const r = await post('chu', '/ma-claude', { username: 'chu', label, scope: 'owner' }); expect(r, 200, 'owner code'); return { code: json(r).code, list: json(r).codes }; };
  const oc = await mk('chu-1');
  assert.match(oc.code, /^3qp_/);
  const rec = JSON.parse(readFileSync(join(root, 'he-thong', 'mcp-tokens.json'), 'utf8')).find((c) => c.hash === sha256(oc.code));
  assert.equal(rec.scope, 'owner');
  assert.ok(!readFileSync(join(root, 'he-thong', 'mcp-tokens.json'), 'utf8').includes(oc.code), 'only the hash is stored');
  assert.equal(oc.list.find((c) => c.id === rec.id).scope, 'owner');
  ok('an owner code is made only by an owner for himself, shown once, stored as a hash with its scope');

  // an owner has every right, so every work tool (their lists are in check-mcp-tools.mjs); the owner's own 5 only with the scope
  const ownerNames = await toolNames(oc.code);
  assert.deepEqual(ownerNames.filter((t) => OWNER_TOOLS.includes(t)), [...OWNER_TOOLS].sort());
  assert.ok(TICKET_TOOLS.every((t) => ownerNames.includes(t)));
  assert.match(json(await rpc(oc.code, 'initialize', {})).result.instructions, /cap_quyen/);
  assert.deepEqual(await toolNames(OLD_OWNER_CODE), ownerNames.filter((t) => !OWNER_TOOLS.includes(t)));
  assert.equal((await call(OLD_OWNER_CODE, 'cap_quyen', { username: 'rong', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] })).isError, true);
  assert.deepEqual(userOf('rong').grants, {});
  assert.equal((await rpc(SCOPED_MEMBER_CODE, 'tools/list')).status, 401, 'an owner scope on a member account is dead');
  ok('owner code: the 5 owner tools on top of the work tools; an old owner code without scope has no owner tool; an owner scope on a member is refused');

  // reading
  const ds = await call(oc.code, 'ds_game');
  assert.match(say(ds), /3qdc/); assert.match(say(ds), /skystory/);
  assert.deepEqual(Object.keys(ds.structuredContent.games.find((g) => g.id === '3qdc').phan.find((p) => p.id === 'tin-tuc').quyen), ['viet', 'duyet']);
  const xq = await call(oc.code, 'xem_quyen', { username: 'dongvu' });
  assert.deepEqual(xq.structuredContent.users[0].quyen, PHIEU);
  const xall = await call(oc.code, 'xem_quyen');
  assert.ok(xall.structuredContent.users.length >= 7);
  assert.equal((await call(oc.code, 'xem_quyen', { username: 'khong-co' })).isError, true);
  ok('ds_game and xem_quyen list games, parts, permissions and each account\'s rights');

  // giving rights
  const cap = await call(oc.code, 'cap_quyen', { username: 'rong', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] });
  assert.ok(!cap.isError, say(cap));
  assert.deepEqual(userOf('rong').grants, TV3);
  expect(await signIn('rong'), 200, 'rong signs in');
  assert.deepEqual(json(await get('rong', '/toi')).games[0].menu.map((m) => m[0]), ['posts']);
  await call(oc.code, 'cap_quyen', { username: 'rong', game: '3qdc', phan: 'tin-tuc', quyen: ['duyet'] });
  await call(oc.code, 'cap_quyen', { username: 'rong', game: '3qdc', phan: 'phieu-be-ngoan', quyen: ['duyet'] });
  assert.deepEqual(userOf('rong').grants, { '3qdc': { 'tin-tuc': ['viet', 'duyet'], 'phieu-be-ngoan': ['duyet'] } });
  assert.match(say(await call(oc.code, 'cap_quyen', { username: 'rong', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] })), /đã có sẵn/);
  expect(await get('rong', '/g/3qdc/phieu-be-ngoan'), 200, 'new right is live without signing in again');
  const all = await call(oc.code, 'cap_quyen', { username: 'rong', game: '3qdc', quyen: 'quan-ly-game' });
  assert.ok(!all.isError, say(all));
  assert.deepEqual(userOf('rong').grants, { '3qdc': '*' });
  ok('cap_quyen adds rights part by part and the whole game; effective at once');

  // what it must refuse
  const refuse = async (args, re, what) => {
    const before = JSON.stringify(usersFile());
    const r = await call(oc.code, 'cap_quyen', args);
    assert.equal(r.isError, true, `${what}: ${say(r)}`);
    if (re) assert.match(say(r), re, what);
    assert.equal(JSON.stringify(usersFile()), before, `${what}: users.json untouched`);
  };
  await refuse({ username: 'chu2', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] }, /chủ/, 'cap to another owner');
  await refuse({ username: 'chu2', game: '3qdc', quyen: 'quan-ly-game' }, /chủ/, 'whole game to an owner');
  await refuse({ username: 'chu', game: '3qdc', quyen: 'quan-ly-game' }, /chủ/, 'to himself');
  await refuse({ username: 'cho', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] }, /chờ duyệt/, 'to a waiting account');
  await refuse({ username: 'khoa', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] }, /khoá/, 'to a locked account');
  await refuse({ username: 'khong-co', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] }, /Không tìm thấy/, 'no such account');
  await refuse({ username: 'viet3', game: 'khong-co', phan: 'tin-tuc', quyen: ['viet'] }, /không có trong sổ/, 'unknown game');
  await refuse({ username: 'viet3', game: '3qdc', phan: 'khong-co', quyen: ['viet'] }, /không có trong sổ/, 'unknown part');
  await refuse({ username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: ['bay'] }, /không có trong/, 'unknown permission');
  await refuse({ username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: ['owner'] }, /không có trong/, 'owner as a permission');
  await refuse({ username: 'viet3', game: 'skystory', phan: 'phieu-be-ngoan', quyen: ['duyet'] }, /chưa bật/, 'part not switched on');
  await refuse({ username: 'viet3', game: '3qdc', quyen: ['viet'] }, /phan/, 'list without a part');
  await refuse({ username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: 'quan-ly-game' }, /bỏ trống phan/, 'whole game with a part');
  await refuse({ username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: [] }, null, 'empty list');
  await refuse({ username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: '*' }, null, 'star is not a word here');
  assert.equal(userOf('chu2').role, 'owner');
  assert.equal(userOf('chu').grants, undefined);
  ok('cap_quyen refuses owners (also himself), waiting / locked / unknown accounts, unknown game / part / permission, bad shapes');

  // taking rights
  await call(oc.code, 'cap_quyen', { username: 'viet3', game: '3qdc', phan: 'phieu-be-ngoan', quyen: ['duyet'] });
  assert.deepEqual(userOf('viet3').grants, { '3qdc': { 'tin-tuc': ['viet'], 'phieu-be-ngoan': ['duyet'] } });
  const th = await call(oc.code, 'thu_quyen', { username: 'viet3', game: '3qdc', phan: 'phieu-be-ngoan' });
  assert.ok(!th.isError, say(th));
  assert.deepEqual(userOf('viet3').grants, TV3);
  expect(await get('viet3', '/g/3qdc/phieu-be-ngoan'), 403, 'right gone at once');
  assert.equal((await call(oc.code, 'thu_quyen', { username: 'viet3', game: '3qdc', phan: 'phieu-be-ngoan' })).isError, true, 'not held');
  assert.equal((await call(oc.code, 'thu_quyen', { username: 'rong', game: '3qdc', phan: 'tin-tuc' })).isError, true, 'a game manager loses the whole game, not a part');
  assert.equal((await call(oc.code, 'thu_quyen', { username: 'chu2', game: '3qdc' })).isError, true, 'not an owner');
  assert.equal((await call(oc.code, 'thu_quyen', { username: 'chu2', game: '3qdc', phan: 'tin-tuc' })).isError, true);
  const thAll = await call(oc.code, 'thu_quyen', { username: 'rong', game: '3qdc' });
  assert.ok(!thAll.isError, say(thAll));
  assert.deepEqual(userOf('rong').grants, {});
  expect(await get('rong', '/g/3qdc/phieu-be-ngoan'), 403, 'whole game gone');
  assert.equal(userOf('chu2').role, 'owner');
  ok('thu_quyen removes a part or the whole game at once, and refuses owners / rights not held');

  // links
  const lk = await call(oc.code, 'tao_link_moi', { grants: PHIEU });
  assert.ok(!lk.isError, say(lk));
  const link = lk.structuredContent.link;
  assert.match(link, /\/quan-tri\/moi#[A-Za-z0-9_-]{40,60}$/);
  const tk = link.split('#')[1];
  expect(await accept(tk, 'moi6'), 201, 'accept the link Claude made');
  assert.deepEqual(userOf('moi6').wantGrants, PHIEU);
  assert.ok(!readFileSync(file, 'utf8').includes(tk));
  for (const g of [{}, { owner: '*' }, { khong: '*' }, { '3qdc': { 'tin-tuc': ['bay'] } }]) assert.equal((await call(oc.code, 'tao_link_moi', { grants: g })).isError, true, JSON.stringify(g));
  assert.equal((await call(oc.code, 'tao_link_moi', {})).isError, true);
  ok('tao_link_moi gives a one-time link once; bad grants refused');

  // the owner's rights are checked again at every call
  const oc2 = await mk('chu-2');
  expect(await post('chu2', '/ma-claude/' + rec.id + '/thu-hoi'), 200, 'revoke by another owner');
  assert.equal((await rpc(oc.code, 'tools/list')).status, 401, 'a revoked owner code is dead');
  assert.equal((await call(oc2.code, 'xem_quyen', { username: 'rong' })).isError, undefined);
  ok('a revoked owner code is 401');

  // ---------- the limit: 20 writes an hour per owner, all his codes together ----------
  const mk2 = async (label) => { const r = await post('chu2', '/ma-claude', { username: 'chu2', label, scope: 'owner' }); expect(r, 200, 'owner code'); return json(r).code; };
  const lim = await mk2('chu2-limit');
  for (let i = 0; i < 20; i++) {
    const r = await call(lim, 'cap_quyen', { username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] });
    assert.ok(!r.isError, `write ${i + 1}: ${say(r)}`);
  }
  const over = await call(lim, 'cap_quyen', { username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: ['duyet'] });
  assert.equal(over.isError, true);
  assert.match(say(over), /20 lần.*1 giờ/);
  assert.deepEqual(userOf('viet3').grants, TV3, 'the 21st did nothing');
  assert.equal((await call(lim, 'thu_quyen', { username: 'viet3', game: '3qdc', phan: 'tin-tuc' })).isError, true);
  assert.equal((await call(lim, 'tao_link_moi', { grants: PHIEU })).isError, true);
  assert.deepEqual(userOf('viet3').grants, TV3);
  assert.ok(!(await call(lim, 'xem_quyen', { username: 'viet3' })).isError, 'reading is not limited');
  assert.ok(!(await call(oc2.code, 'cap_quyen', { username: 'viet3', game: '3qdc', phan: 'tin-tuc', quyen: ['duyet'] })).isError, 'another owner has his own count');
  // a second code of the owner who used up the count shares it (the number of owner codes is limited, so one of chu's is given up first)
  const ocId = JSON.parse(readFileSync(join(root, 'he-thong', 'mcp-tokens.json'), 'utf8')).find((c) => c.hash === sha256(oc2.code)).id;
  expect(await post('chu2', '/ma-claude/' + ocId + '/thu-hoi'), 200, 'give up a code to make room');
  const lim2 = await mk2('chu2-second');
  const beforeShared = JSON.stringify(userOf('viet3').grants);
  assert.equal((await call(lim2, 'thu_quyen', { username: 'viet3', game: '3qdc', phan: 'tin-tuc' })).isError, true, 'a second code of the same owner shares the count');
  assert.equal(JSON.stringify(userOf('viet3').grants), beforeShared, 'and did nothing');
  ok('the 21st write in an hour is refused with a clear message (all 3 write tools); a second code of the owner shares the count; reads and other owners are not affected');

  // ---------- the record ----------
  const web = await get('chu', '/nhat-ky');
  expect(web, 200, 'record');
  const page1 = json(web);
  assert.equal(page1.page, 1);
  assert.ok(page1.items.length > 0 && page1.items.length <= 50);
  const lines = auditLines();
  assert.equal(page1.items[0].luc >= page1.items[page1.items.length - 1].luc, true, 'newest first');
  const find = (viec, ai, who) => lines.find((l) => l.viec === viec && l.ai === ai && (!who || l.doiTuong === who));
  assert.ok(find('cap-quyen', 'chu (Claude)', 'rong'), 'Claude grant');
  assert.equal(find('cap-quyen', 'chu (Claude)', 'rong').qua, 'claude');
  assert.ok(find('thu-quyen', 'chu (Claude)', 'viet3'), 'Claude revoke');
  assert.deepEqual(find('thu-quyen', 'chu (Claude)', 'viet3').truoc, { '3qdc': { 'tin-tuc': ['viet'], 'phieu-be-ngoan': ['duyet'] } });
  assert.ok(find('tao-link-moi', 'chu (Claude)'), 'Claude link');
  assert.ok(find('tao-link-moi', 'chu'), 'web link');
  assert.ok(find('huy-link-moi', 'chu'), 'web cancel link');
  assert.ok(find('duyet', 'chu', 'moi1'), 'web approve');
  assert.ok(find('quyen', 'chu', 'dongvu'), 'web change of rights');
  assert.ok(find('tao-ma', 'chu'), 'code made');
  assert.ok(find('thu-hoi-ma', 'chu2'), 'code revoked');
  for (const l of lines) assert.ok(typeof l.luc === 'string' && l.ai && l.viec && l.qua, JSON.stringify(l));
  const rawAudit = readFileSync(join(root, 'he-thong', 'nhat-ky-quyen.jsonl'), 'utf8');
  for (const t of [token, tk, oc.code, oc2.code, PHIEU_CODE, PASSWORD, secret.hash, secret.salt]) assert.ok(!rawAudit.includes(t), 'no secret in the record');
  expect(await get('dongvu', '/nhat-ky'), 403, 'members cannot read the record');
  assert.equal((await req('GET', api + '/nhat-ky')).status, 401);
  ok('every change is in the record ("<owner> (Claude)" for Claude), newest first, owners only, no secrets');

  // paging: 50 a page, newest first, read from the end
  const total0 = auditLines().length;
  appendFileSync(join(root, 'he-thong', 'nhat-ky-quyen.jsonl'), Array.from({ length: 120 }, (_, i) => JSON.stringify({ luc: '2030-01-01T00:00:00.000+07:00', ai: 'x', qua: 'web', viec: 'thu', doiTuong: `s${i}` })).join('\n') + '\n');
  const total = total0 + 120;
  const p = async (q) => json(await get('chu', '/nhat-ky' + q));
  const a = await p('?trang=1'), b = await p('?trang=2'), c = await p('?trang=3');
  assert.equal(a.items.length, 50); assert.equal(a.more, true);
  assert.equal(a.items[0].doiTuong, 's119'); assert.equal(b.items[0].doiTuong, 's69');
  assert.equal(c.items.length, Math.min(50, total - 100)); assert.equal(c.items[0].doiTuong, 's19');
  const last = await p(`?trang=${Math.ceil(total / 50)}`);
  assert.equal(last.items.length, total - 50 * (Math.ceil(total / 50) - 1)); assert.equal(last.more, false);
  assert.equal((await p(`?trang=${Math.ceil(total / 50) + 1}`)).items.length, 0);
  for (const bad of ['?trang=0', '?trang=abc', '?trang=-1', '?trang=1.5', '?trang=99999999']) assert.equal((await p(bad)).page, 1, bad);
  ok('the record pages 50 at a time, newest first');

  // ---------- nothing secret on any road ----------
  const blob = seen.join('\n');
  for (const word of ['"hash"', '"salt"', 'resetHash', 'passwordHash']) assert.ok(!blob.includes(word), `answers never contain ${word}`);
  assert.ok(!blob.includes(secret.hash) && !blob.includes(secret.salt));
  assert.ok(!blob.includes(OLD_OWNER_CODE) && !blob.includes(PHIEU_CODE));
  ok('no answer carries a hash, salt, reset token or a stored code');
} catch (e) {
  console.error(e && e.stack ? e.stack : e);
  console.error('--- server log (tail) ---\n' + log.slice(-1500));
  process.exitCode = 1;
} finally {
  child.kill();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
if (!process.exitCode) console.log(`\n${n} checks passed`);
