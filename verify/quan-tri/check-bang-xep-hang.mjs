// check-bang-xep-hang.mjs — the leaderboards of hoanmythegioi: the checking and cleaning of what Claude sends, the history,
// the two Claude tools by rights, the public address, the restore on the editor API, the record of changes.
//   node verify/quan-tri/check-bang-xep-hang.mjs      (run from the project folder; nothing is read from or written to the live data)
// The checks of the store run in this process on a temporary data folder; a temporary server (own data folder, free port)
// answers the rest.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const mkCode = (name) => `3qp_ThuBxh${name}`.padEnd(47, 'x');
let n = 0;
const ok = (name) => { n++; console.log(`ok   ${name}`); };
const dirs = [];
const tmpDir = () => { const d = mkdtempSync(join(tmpdir(), 'bxh-')); dirs.push(d); return d; };
const put = (root, rel, text) => { const f = join(root, ...rel.split('/')); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
const freePort = () => new Promise((done) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });

// ---------- the store, in this process ----------
const storeRoot = tmpDir();
process.env.DATA_ROOT = storeRoot;
const store = await import(pathToFileURL(join(ROOT, 'scripts/lib/bang-xep-hang/bxh-store.mjs')).href);
const { kiemBxh, thayBxh, dsLichSu, docHienTai, khoiPhuc, LIMITS } = store;

const row = (ten, gt = [1], lop) => ({ ten, ...(lop !== undefined ? { lop } : {}), gt });
const board = (ten, rows = [row('A')], cot = ['Cấp']) => ({ ten, cot, dong: rows });
const good = (b) => ({ bang: Array.isArray(b) ? b : [b] });
const err = (input, re, what) => { const r = kiemBxh(input); assert.ok(r.error, `${what}: should be refused`); assert.match(r.error, re, `${what}: ${r.error}`); };
const clean = (input) => { const r = kiemBxh(input); assert.ok(!r.error, `should pass: ${r.error}`); return r; };
const chars = (k) => 'Đ'.repeat(k);

// 1. limits
let r = clean(good(board('Cấp độ', [row('Nguyệt Hàn', [105], 7)])));
assert.deepEqual(r.data, { mayChu: '', bang: [{ ten: 'Cấp độ', cot: ['Cấp'], dong: [{ ten: 'Nguyệt Hàn', lop: 'cleric', gt: [105] }] }] });
ok('the smallest valid set passes and comes out in the stored shape');
const big = Array.from({ length: 10 }, (_, k) => board(`Bảng ${k}`, Array.from({ length: 200 }, (_, i) => row(`Nhân vật ${i}`, [i * 1e9, i, `${i}%`], i % 10)), ['Lực chiến', 'Cấp', 'Tỉ lệ']));
r = clean({ may_chu: 'Bạch Hổ', bang: big });
assert.equal(r.data.bang.length, 10);
assert.equal(r.data.bang[9].dong.length, 200);
assert.equal(r.data.bang[3].dong[17].ten, 'Nhân vật 17', 'rows keep the order they were sent in');
ok('10 boards x 200 rows x 3 columns pass; the order of the rows is kept');
err(good(Array.from({ length: 11 }, (_, k) => board(`B${k}`))), /Tối đa 10 bảng/, '11 boards');
err(good(board('X', Array.from({ length: 201 }, (_, i) => row(`N${i}`)))), /tối đa 200 dòng/, '201 rows');
err(good(board('X', [row('A')], [])), /từ 1 đến 3 tên cột/, '0 columns');
err(good(board('X', [row('A', [1, 2, 3, 4])], ['a', 'b', 'c', 'd'])), /từ 1 đến 3 tên cột/, '4 columns');
err(good(board('X', [row('A', [1, 2])], ['a'])), /gt phải có đúng 1 giá trị/, 'gt shorter or longer than the columns');
err(good(board('X', [row('A', [1])], ['a', 'b'])), /gt phải có đúng 2 giá trị/, 'gt fewer than the columns');
err(good(board('X', [])), /ít nhất 1 dòng/, 'a board without rows');
ok('11 boards, 201 rows, 0 or 4 columns, values not matching the columns, a board without rows: all refused with the reason');
clean(good(board(chars(32), [row(chars(32), [`${'9'.repeat(24)}`])], [chars(16)])));
err(good(board(chars(33))), /dài quá 32/, 'board name 33');
err(good(board('X', [row(chars(33))])), /dài quá 32/, 'row name 33');
err(good(board('X', [row('A')], [chars(17)])), /dài quá 16/, 'column name 17');
err(good(board('X', [row('A', ['1'.repeat(25)])])), /dài quá 24/, 'text value 25');
err({ may_chu: chars(33), bang: [] }, /dài quá 32/, 'server name 33');
ok('names of 32, columns of 16 and text values of 24 characters pass, one more is refused (counted in characters, not bytes)');

// 2. cleaning
r = clean(good(board('Cấp​ độ‮', [row('Tên\u0000   hai  khoảng', [1]), row('<b>x</b><script>', [2])])));
assert.equal(r.data.bang[0].ten, 'Cấp độ');
assert.equal(r.data.bang[0].dong[0].ten, 'Tên hai khoảng');
assert.ok(!/[<>]/.test(r.data.bang[0].dong[1].ten) && !/[​‮\u0000]/.test(JSON.stringify(r.data)), r.data.bang[0].dong[1].ten);
ok('invisible (zero-width, bidi override), control characters and angle brackets are cleaned, spaces merged');
err(good(board('​​')), /trống/, 'only invisible characters');
err(good(board('X', [row('   ')])), /trống/, 'only spaces');
ok('a name that is empty after cleaning is refused');
err({ bang: [], id: 'admin' }, /không nhận trường "id"/, 'unknown root key id');
err({ bang: [], email: 'a@b.c' }, /không nhận trường "email"/, 'unknown root key email');
err(good({ ...board('X'), extra: 1 }), /không nhận trường "extra"/, 'unknown board key');
err(good(board('X', [{ ten: 'A', gt: [1], email: 'a@b.c' }])), /không nhận trường "email"/, 'unknown row key');
err(JSON.parse('{"__proto__": {"x": 1}, "bang": []}'), /không nhận trường "__proto__"/, '__proto__ key');
err('bang', /phải là một đối tượng/, 'not an object');
err({ bang: 'x' }, /danh sách/, 'bang not a list');
ok('keys that are not part of the set (id, email, __proto__…) are refused by name');
err(good(board('X', [row('lien.he@gmail.com')])), /dấu @/, '@ in a name');
err(good(board('X', [row('A', ['a@b'])])), /dấu @/, '@ in a text value');
err(good(board('a@b')), /dấu @/, '@ in a board name');
ok('an "@" anywhere (names, values) is refused so an e-mail address cannot slip out');
err(good([board('Cấp'), board('CẤP')]), /trùng tên/, 'duplicate board name (case does not matter)');
ok('two boards with the same name are refused');

// 3. classes
const lop = (v) => { const x = clean(good(board('X', [row('A', [1], v)]))); return { code: x.data.bang[0].dong[0].lop, warn: x.canhBao }; };
for (const [v, code] of [[7, 'cleric'], ['7', 'cleric'], ['vũ linh', 'cleric'], ['VŨ LINH', 'cleric'], ['Vũ Linh', 'cleric'], ['cleric', 'cleric'], [0, 'blademaster'], ['Mị Linh', 'mystic'], [null, null], [undefined, null], ['', null]]) {
  const x = lop(v);
  assert.equal(x.code, code, `class ${JSON.stringify(v)}`);
  assert.deepEqual(x.warn, [], `no warning for ${JSON.stringify(v)}`);
}
for (const v of ['Vu Linh', 10, -1, '12', 'rogue', 3.5, true, {}]) {
  const x = lop(v);
  assert.equal(x.code, null, `class ${JSON.stringify(v)} is dropped`);
  assert.equal(x.warn.length, 1, `a warning for ${JSON.stringify(v)}`);
}
ok('class: 7, "7", names in any case, codes and none are understood; unknown ones (also the unaccented "Vu Linh") become null with a warning');
r = clean(good(board('X', Array.from({ length: 30 }, (_, i) => row(`N${i}`, [1], 'sai')))));
assert.equal(r.canhBao.length, 9);
assert.match(r.canhBao[8], /và 22 cảnh báo/);
ok('a long list of class warnings is cut short');

// 4. values
clean(good(board('X', [row('A', [1e15]), row('B', [-1e15]), row('C', [0]), row('D', [1.5])])));
err(good(board('X', [row('A', [1e15 + 2e8])])), /không quá/, '1e15 and over');
err(good(board('X', [row('A', [Infinity])])), /hữu hạn/, 'Infinity');
err(good(board('X', [row('A', [true])])), /phải là chữ/, 'boolean value');
err(good(board('X', [row('A', [null])])), /phải là chữ/, 'null value');
err(good(board('X', [row('A', [{ a: 1 }])])), /phải là chữ/, 'object value');
ok('values: finite numbers up to 1e15 pass; infinity, booleans, null, objects are refused');
r = clean({ bang: [] });
assert.deepEqual(r.data, { mayChu: '', bang: [] });
clean({ may_chu: ' Bạch  Hổ ', bang: [] });
assert.equal(kiemBxh({ may_chu: ' Bạch  Hổ ', bang: [] }).data.mayChu, 'Bạch Hổ');
ok('an empty list of boards is allowed (clears the home page); the server name is cleaned');

// 5. storage: history of 50, parallel swaps, restore
const G = 'thu-bang';
const sample = (tag) => clean(good(board('Cấp', [row(tag, [1])]))).data;
assert.equal(await docHienTai(G), null);
assert.deepEqual(await dsLichSu(G), []);
let first = await thayBxh(G, sample('v0'), { ai: 'bx', qua: 'claude' });
assert.equal(first.keyCu, null);
for (let i = 1; i <= 51; i++) await thayBxh(G, sample(`v${i}`), { ai: 'bx', qua: 'claude' });
let hist = await dsLichSu(G);
assert.equal(hist.length, 50, 'the history keeps the newest 50');
assert.equal(readdirSync(join(storeRoot, 'games', G, 'bang-xep-hang', 'lich-su')).length, 50, 'older files are gone from the disk');
assert.equal(new Set(hist.map((h) => h.key)).size, 50);
assert.deepEqual(hist.map((h) => h.key), [...hist.map((h) => h.key)].sort().reverse(), 'newest first');
assert.equal((await docHienTai(G)).bang[0].dong[0].ten, 'v51');
assert.equal((await store.docLichSu(G, hist[0].key)).bang[0].dong[0].ten, 'v50');
assert.equal((await store.docLichSu(G, hist[49].key)).bang[0].dong[0].ten, 'v1', 'v0 (the oldest of 52 sets) was dropped');
ok('52 swaps leave 50 in the history, newest first, the oldest dropped from the disk');
const G2 = 'thu-song-song';
await Promise.all(Array.from({ length: 8 }, (_, i) => thayBxh(G2, sample(`p${i}`), { ai: 'bx', qua: 'claude' })));
hist = await dsLichSu(G2);
assert.equal(hist.length, 7, '8 swaps at once: 7 replaced sets, none lost');
const tags = new Set();
for (const h of hist) tags.add((await store.docLichSu(G2, h.key)).bang[0].dong[0].ten);
tags.add((await docHienTai(G2)).bang[0].dong[0].ten);
assert.equal(tags.size, 8, 'every one of the 8 sets is somewhere (on show or in the history)');
ok('8 swaps at once lose nothing');
const back = await khoiPhuc(G, (await dsLichSu(G))[3].key, { ai: 'chu', qua: 'web' });
assert.equal(back.soBang, 1);
assert.equal((await docHienTai(G)).bang[0].dong[0].ten, 'v47', 'restoring the fourth newest brings v47 back');
assert.equal((await docHienTai(G)).boi, 'chu');
assert.equal((await dsLichSu(G))[0].thayBoi, 'chu', 'who replaced the set is written in the history');
assert.equal((await dsLichSu(G))[0].boi, 'bx', 'and who had sent it');
assert.equal((await khoiPhuc(G, '12345', { ai: 'chu', qua: 'web' })).status, 404);
assert.equal((await khoiPhuc(G, '../../he-thong/users', { ai: 'chu', qua: 'web' })).status, 404);
assert.equal((await khoiPhuc(G, '20200101000000000', { ai: 'chu', qua: 'web' })).status, 404);
ok('restore brings the chosen set back and puts the shown one in the history; a bad or unknown key is 404 (no path can be named)');
const pub = store.congKhai({ capNhat: 'x', boi: 'bx', qua: 'claude', mayChu: 'S', bang: [{ ten: 'T', cot: ['c'], dong: [{ ten: 'a', lop: 'hack', gt: [1], email: 'e@x' }], secret: 1 }], id: 5 });
assert.deepEqual(Object.keys(pub), ['capNhat', 'mayChu', 'bang']);
assert.deepEqual(pub.bang[0].dong[0], { ten: 'a', lop: null, gt: [1] });
assert.deepEqual(Object.keys(pub.bang[0]), ['ten', 'cot', 'dong']);
ok('the public shape carries names, class codes and values only (nothing about who sent it, no extra field, an unknown class code dropped)');

// ---------- the server ----------
const { hashPassword } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/admin-auth.mjs')).href);
const now = new Date().toISOString();
const secret = await hashPassword(PASSWORD);
const acct = (username, role, grants) => ({ username, name: `Tên ${username}`, role, ...(grants ? { grants } : {}), ...secret, disabled: false, createdAt: now, passwordSetAt: now });
const HM = { hoanmythegioi: { 'bang-xep-hang': ['cap-nhat'] } };
const DV_OLD = { '3qdc': { 'tin-tuc': ['duyet'], nhac: ['quan-ly'], 'dang-ky-som': ['quan-ly'], 'phieu-be-ngoan': ['quan-ly'] } };
const USERS = [
  acct('chu', 'owner'),
  acct('bx', 'member', HM),
  acct('lim', 'member', HM),
  acct('dvthu', 'member', { ...DV_OLD, ...HM }),
  acct('dvcu', 'member', DV_OLD),
  acct('tin', 'member', { '3qdc': { 'tin-tuc': ['viet'] } }),
  acct('hmtin', 'member', { hoanmythegioi: { 'tin-tuc': ['viet'] } }),
];
const CODES = { bx: mkCode('Bx'), lim: mkCode('Lim'), dvthu: mkCode('DvThu'), dvcu: mkCode('DvCu'), tin: mkCode('Tin'), hmtin: mkCode('HmTin'), chu: mkCode('Chu') };
const root = tmpDir();
put(root, 'he-thong/users.json', JSON.stringify(USERS));
put(root, 'he-thong/mcp-tokens.json', JSON.stringify(Object.entries(CODES).map(([u, c], i) => ({ id: `a0000000000${i.toString(16)}`, username: u, label: 'thu', hint: c.slice(-4), hash: sha256(c), createdBy: 'chu', createdAt: now.slice(0, 19) }))));

const port = await freePort();
const env = { ...process.env, PORT: String(port), DATA_ROOT: root, NEWS_INSECURE_COOKIE: '1', NEWS_SITE_ORIGIN: `http://127.0.0.1:${port}`, NEWS_ALLOWED_ORIGINS: '', PHIEU_GOOGLE_CLIENT_ID: 'x', NEWS_DATA_DIR: '', PHIEU_DATA_DIR: '', SIGNUP_DATA_DIR: '' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`;
const HOSTS = { hm: 'hoanmythegioi.wanmeivn.com', q3: '3qdc.wanmeivn.com', sky: 'skystory.wanmeivn.com' };

function req(method, path, { cookie, body, headers: extra, raw } = {}) {
  return new Promise((done, fail) => {
    const data = raw !== undefined ? Buffer.from(raw) : body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const headers = { Host: `127.0.0.1:${port}`, ...(cookie ? { Cookie: cookie } : {}), ...(extra || {}) };
    if (method === 'POST') { headers.Origin = origin; headers['Content-Type'] = 'application/json'; }
    if (data) headers['Content-Length'] = data.length;
    const r = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', (e) => (raw !== undefined && e.code === 'ECONNRESET' ? done({ status: 'reset', headers: {}, text: '' }) : fail(e)));
    r.end(data);
  });
}
const api = '/quan-tri/api';
const cookies = {};
const signIn = async (u) => {
  const r = await req('POST', api + '/dang-nhap', { body: { username: u, password: PASSWORD } });
  if (r.status === 200) cookies[u] = r.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  return r;
};
const get = (who, path) => req('GET', api + path, { cookie: cookies[who] });
const post = (who, path, body) => req('POST', api + path, { cookie: cookies[who], body: body === undefined ? {} : body });
const json = (r) => JSON.parse(r.text);
const expect = (r, status, what) => assert.equal(r.status, status, `${what}: ${r.status} ${String(r.text).slice(0, 200)}`);
let rpcId = 0;
const rpc = (code, method, params) => req('POST', '/mcp', { headers: { Authorization: `Bearer ${code}` }, body: { jsonrpc: '2.0', id: ++rpcId, method, params } });
const listTools = async (c) => { const r = await rpc(c, 'tools/list'); expect(r, 200, 'tools/list'); return json(r).result.tools; };
const toolNames = async (c) => (await listTools(c)).map((t) => t.name).sort();
const call = async (c, name, args = {}) => { const r = await rpc(c, 'tools/call', { name, arguments: args }); expect(r, 200, `call ${name}`); return json(r).result; };
const say = (res) => res.content.map((x) => x.text).join('\n');
const done = async (c, name, args) => { const r = await call(c, name, args); assert.ok(!r.isError, `${name}: ${say(r)}`); return r; };
const refusedWith = async (c, name, args, re) => { const r = await call(c, name, args); assert.equal(r.isError, true, `${name} should be refused: ${say(r)}`); assert.match(say(r), re, say(r)); return r; };
const pubGet = (host) => req('GET', '/api/bang-xep-hang', { headers: { Host: host } });
const auditLines = () => { try { return readFileSync(join(root, 'he-thong', 'nhat-ky-quyen.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const SET = (tag, rows = 3) => ({
  may_chu: 'Bạch Hổ',
  bang: [{ ten: 'Cấp độ', cot: ['Cấp'], dong: Array.from({ length: rows }, (_, i) => ({ ten: `${tag} ${i + 1}`, lop: i % 10, gt: [100 - i] })) }, { ten: 'Lực chiến', cot: ['Lực chiến', 'Danh vọng'], dong: [{ ten: `${tag} X`, gt: [123456789, 77] }] }],
});

try {
  for (let i = 0; i < 60; i++) { try { if ((await req('GET', '/quan-tri')).status === 200) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 150)); }
  for (const u of ['chu', 'bx', 'tin', 'hmtin']) expect(await signIn(u), 200, `sign in ${u}`);

  // ----- tools by rights -----
  assert.deepEqual(await toolNames(CODES.bx), ['cap_nhat_bxh', 'xem_bxh']);
  const bxTools = await listTools(CODES.bx);
  for (const t of bxTools) assert.ok(!(t.inputSchema.required || []).includes('game'), `${t.name}: game is not required for a one-game account`);
  assert.deepEqual(bxTools.find((t) => t.name === 'cap_nhat_bxh').inputSchema.required, ['bang']);
  const sch = bxTools.find((t) => t.name === 'cap_nhat_bxh').inputSchema.properties.bang;
  assert.equal(sch.maxItems, 10);
  assert.equal(sch.items.properties.dong.maxItems, 200);
  assert.equal(sch.items.properties.cot.maxItems, 3);
  assert.equal(sch.items.properties.ten.maxLength, 32);
  assert.equal(sch.items.properties.cot.items.maxLength, 16);
  ok('a code with only the leaderboard right lists exactly xem_bxh and cap_nhat_bxh; the schema carries the limits (10 / 200 / 3, 32 / 16)');
  const oldTools = await listTools(CODES.dvcu);
  const newTools = await listTools(CODES.dvthu);
  assert.deepEqual(newTools.filter((t) => !['xem_bxh', 'cap_nhat_bxh'].includes(t.name)), oldTools, 'the old tools of the same account are identical (names, wording, parameters) after the new right is added');
  assert.deepEqual(newTools.map((t) => t.name).filter((x) => !oldTools.some((o) => o.name === x)).sort(), ['cap_nhat_bxh', 'xem_bxh']);
  assert.ok(newTools.every((t) => !(t.inputSchema.required || []).includes('game')), 'no tool got a required game');
  assert.ok(!(await toolNames(CODES.dvcu)).includes('cap_nhat_bxh'));
  ok('an account like dongvu: the same code lists its old tools unchanged plus the two new ones; without the right it has only the old ones; no tool asks for a game');
  assert.ok(!(await toolNames(CODES.tin)).some((x) => /bxh/.test(x)));
  assert.ok(!(await toolNames(CODES.hmtin)).some((x) => /bxh/.test(x)), 'hoanmythegioi news right is not the leaderboard right');
  await refusedWith(CODES.tin, 'cap_nhat_bxh', SET('x'), /Không có công cụ/);
  await refusedWith(CODES.hmtin, 'xem_bxh', {}, /Không có công cụ/);
  ok('accounts without the leaderboard right do not see the tools and a call is "no such tool"');
  const ins = (await call(CODES.bx, 'xem_bxh'));
  assert.match(say(ins), /Chưa có bảng xếp hạng/);
  const hello = json(await rpc(CODES.bx, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } })).result.instructions;
  assert.match(hello, /Bảng xếp hạng Hoàn Mỹ Thế Giới: chỉ gửi số đọc từ dữ liệu game/);
  ok('xem_bxh says there is nothing yet; the server instructions carry the rule for the leaderboards');

  // ----- sending, the public address -----
  let pub0 = await pubGet(HOSTS.hm);
  expect(pub0, 200, 'public before any set');
  assert.deepEqual(json(pub0), { capNhat: null, mayChu: '', bang: [] });
  assert.equal(pub0.headers['cache-control'], 'no-store');
  assert.equal(pub0.headers['x-content-type-options'], 'nosniff');
  const sent = await done(CODES.bx, 'cap_nhat_bxh', SET('Bản một'));
  assert.match(say(sent), /Đã cập nhật 2 bảng, 4 dòng/);
  assert.match(say(sent), /bộ đầu tiên/);
  let p = await pubGet(HOSTS.hm);
  expect(p, 200, 'public after a set');
  const shown = json(p);
  assert.deepEqual(Object.keys(shown), ['capNhat', 'mayChu', 'bang']);
  assert.equal(shown.mayChu, 'Bạch Hổ');
  assert.equal(shown.bang[0].dong[0].lop, 'blademaster');
  assert.deepEqual(shown.bang[1].dong[0], { ten: 'Bản một X', lop: null, gt: [123456789, 77] });
  assert.ok(!/"boi"|"qua"|"claude"|"bx"|@|"id"|"email"|thayBoi/.test(p.text), 'nothing about who sent it, no @');
  assert.match((await done(CODES.bx, 'xem_bxh', {})).content[0].text, /Đang hiện 2 bảng, máy chủ Bạch Hổ; cập nhật lúc .* bởi bx \(Claude\)/);
  ok('cap_nhat_bxh puts the set on the public address at once; the answer has names, class codes and values only, no sender, no @');
  const head = await req('HEAD', '/api/bang-xep-hang', { headers: { Host: HOSTS.hm } });
  expect(head, 200, 'HEAD');
  assert.equal(head.text, '');
  const postPub = await req('POST', '/api/bang-xep-hang', { headers: { Host: HOSTS.hm }, body: {} });
  expect(postPub, 405, 'POST on the public address');
  for (const host of [HOSTS.q3, HOSTS.sky, `127.0.0.1:${port}`]) {
    const o = await pubGet(host);
    assert.equal(o.status, 404, `${host} is not a leaderboard host`);
    assert.ok(!/"bang"/.test(o.text), `${host} answers nothing of the leaderboards`);
  }
  ok('HEAD works, POST is 405; 3qdc, skystory and a bare address do not answer the leaderboard address (they go on as before)');

  // ----- refused data keeps the old set -----
  await refusedWith(CODES.bx, 'cap_nhat_bxh', { bang: [{ ten: 'X', cot: ['a'], dong: [{ ten: 'mail@x.vn', gt: [1] }] }] }, /dấu @.*Bảng đang hiện không đổi/s);
  await refusedWith(CODES.bx, 'cap_nhat_bxh', { bang: Array.from({ length: 11 }, (_, k) => ({ ten: `B${k}`, cot: ['a'], dong: [{ ten: 'x', gt: [1] }] })) }, /Tối đa 10 bảng/);
  assert.equal(json(await pubGet(HOSTS.hm)).bang[0].dong[0].ten, 'Bản một 1', 'a refused set changes nothing');
  const xss = await done(CODES.bx, 'cap_nhat_bxh', { bang: [{ ten: 'Hiển thị', cot: ['Cấp'], dong: [{ ten: '<img src=x onerror=alert(1)>​', lop: 'lạ', gt: [1] }] }] });
  assert.match(say(xss), /Lưu ý/);
  const clean2 = json(await pubGet(HOSTS.hm));
  assert.equal(clean2.bang[0].dong[0].ten, 'img src=x onerror=alert(1)');
  assert.equal(clean2.bang[0].dong[0].lop, null);
  ok('refused data changes nothing and names the reason; markup and hidden characters are cleaned; a class that is not known gives a warning');

  // ----- size of the request -----
  const bigSet = { may_chu: 'Bạch Hổ', bang: Array.from({ length: 10 }, (_, k) => ({ ten: `Bảng số ${k}`, cot: ['Lực chiến', 'Danh vọng', 'Điểm'], dong: Array.from({ length: 200 }, (_, i) => ({ ten: `Nhân vật hạng ${i + 1} ${'ă'.repeat(10)}`, lop: i % 10, gt: [900000000000 - i * 1000, 1234567 + i, `Hạng ${i}`] })) })) };
  const bigText = JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'cap_nhat_bxh', arguments: bigSet } });
  assert.ok(bigText.length > 100 * 1024 && bigText.length < 256 * 1024, `the full set is ${bigText.length} bytes`);
  const bigRes = await req('POST', '/mcp', { headers: { Authorization: `Bearer ${CODES.bx}` }, raw: bigText });
  expect(bigRes, 200, 'the biggest set');
  assert.ok(!JSON.parse(bigRes.text).result.isError, bigRes.text.slice(0, 300));
  const fullPub = json(await pubGet(HOSTS.hm));
  assert.equal(fullPub.bang.length, 10);
  assert.equal(fullPub.bang[9].dong.length, 200);
  const tooBig = await req('POST', '/mcp', { headers: { Authorization: `Bearer ${CODES.bx}` }, raw: JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'xem_bxh', arguments: { pad: 'x'.repeat(300 * 1024) } } }) });
  assert.ok(tooBig.status === 413 || tooBig.status === 'reset', `over 256 KB is refused: ${tooBig.status}`);
  ok(`the biggest set (${(bigText.length / 1024).toFixed(0)} KB, 10 x 200 x 3) goes through /mcp; a request over 256 KB is refused (413)`);

  // ----- the history and the restore on the web -----
  await done(CODES.bx, 'cap_nhat_bxh', SET('Bản hai', 2));
  const hist2 = json(await get('chu', '/g/hoanmythegioi/bang-xep-hang'));
  assert.equal(hist2.hienTai.bang[0].dong[0].ten, 'Bản hai 1');
  assert.equal(hist2.hienTai.boi, 'bx');
  assert.equal(hist2.hienTai.qua, 'claude');
  assert.equal(hist2.lichSu.length, 3, "the three sets that were replaced");
  assert.deepEqual(Object.keys(hist2.lichSu[0]).sort(), ['boi', 'capNhat', 'key', 'qua', 'soBang', 'soDong', 'thayBoi', 'thayLuc'].sort());
  const bigKey = hist2.lichSu.find((h) => h.soDong === 2000).key;
  const detail = json(await get('chu', `/g/hoanmythegioi/bang-xep-hang/lich-su/${bigKey}`));
  assert.equal(detail.bang.length, 10);
  expect(await get('chu', '/g/hoanmythegioi/bang-xep-hang/lich-su/abc'), 404, 'bad key');
  const back1 = await post('chu', `/g/hoanmythegioi/bang-xep-hang/khoi-phuc/${bigKey}`);
  expect(back1, 200, 'restore the big set');
  assert.equal(json(await pubGet(HOSTS.hm)).bang.length, 10, 'the public address shows the restored set');
  assert.equal(json(back1).hienTai.boi, 'chu');
  assert.equal(json(back1).hienTai.qua, 'web');
  assert.ok(json(back1).lichSu.some((h) => h.soDong === 4 || h.soDong === 3), 'the set that was on show is in the history now');
  expect(await post('chu', '/g/hoanmythegioi/bang-xep-hang/khoi-phuc/20200101000000000'), 404, 'unknown key');
  expect(await post('chu', '/g/hoanmythegioi/bang-xep-hang/khoi-phuc/..%2F..%2Fhe-thong%2Fusers'), 404, 'path in the key');
  ok('the editor API lists the shown set and the history, reads one old set, restores it (public address follows) and refuses unknown keys');
  // rights on the editor API
  expect(await get('bx', '/g/hoanmythegioi/bang-xep-hang'), 200, 'bx reads');
  expect(await get('tin', '/g/hoanmythegioi/bang-xep-hang'), 403, 'tin (3qdc only) reads');
  expect(await post('tin', `/g/hoanmythegioi/bang-xep-hang/khoi-phuc/${bigKey}`), 403, 'tin restores');
  expect(await get('hmtin', '/g/hoanmythegioi/bang-xep-hang'), 403, 'hmtin (news right only) reads');
  expect(await post('hmtin', `/g/hoanmythegioi/bang-xep-hang/khoi-phuc/${bigKey}`), 403, 'hmtin restores');
  expect(await get('bx', '/g/3qdc/bang-xep-hang'), 403, '3qdc has no leaderboards (and bx has no right there)');
  expect(await get('chu', '/g/3qdc/bang-xep-hang'), 404, '3qdc has not switched the part on (owner)');
  expect(await get('chu', '/g/skystory/bang-xep-hang'), 404, 'skystory has not switched the part on (owner)');
  const me = json(await get('bx', '/toi'));
  assert.deepEqual(me.games.map((g) => g.id), ['hoanmythegioi']);
  assert.deepEqual(me.games[0].menu, [['bxh', '#/bang-xep-hang', 'Bảng xếp hạng']]);
  assert.deepEqual(me.games[0].trash, [], 'no shared trash for the leaderboards');
  ok('rights: the leaderboard right reads and restores; a 3qdc-only account, a news-only account are 403; other games 403/404; the menu has one entry and no trash');

  // ----- a right taken away -----
  const dv = await toolNames(CODES.dvthu);
  assert.ok(dv.includes('cap_nhat_bxh'));
  put(root, 'he-thong/users.json', JSON.stringify(USERS.map((u) => (u.username === 'dvthu' ? { ...u, grants: DV_OLD } : u))));
  assert.ok(!(await toolNames(CODES.dvthu)).includes('cap_nhat_bxh'), 'the tool is gone from the next list');
  await refusedWith(CODES.dvthu, 'cap_nhat_bxh', SET('x'), /Không có công cụ/);
  put(root, 'he-thong/users.json', JSON.stringify(USERS));
  assert.ok((await toolNames(CODES.dvthu)).includes('cap_nhat_bxh'), 'and back when the right is given again');
  ok('taking the right away removes the tools at the next request (the same code), giving it back restores them');

  // ----- the allowance: 12 an hour -----
  for (let i = 1; i <= 12; i++) await done(CODES.lim, 'cap_nhat_bxh', SET(`L${i}`, 1));
  const slow = await refusedWith(CODES.lim, 'cap_nhat_bxh', SET('L13', 1), /12 lần cập nhật bảng xếp hạng trong 1 giờ/);
  assert.match(say(slow), /Thử lại sau/);
  await done(CODES.lim, 'xem_bxh', {});
  await refusedWith(CODES.lim, 'cap_nhat_bxh', { bang: 'x' }, /Không cập nhật: bang phải là một danh sách/);
  assert.ok((await dsLastTitle()).startsWith('L12'), 'the 13th set was not kept');
  ok('12 updates an hour per person: the 13th is refused with the wait time, reading still works, data is checked before the allowance');
  async function dsLastTitle() { return json(await pubGet(HOSTS.hm)).bang[0].dong[0].ten; }

  // ----- the record -----
  const lines = auditLines();
  const sends = lines.filter((l) => l.viec === 'bxh-cap-nhat');
  assert.ok(sends.length >= 14);
  assert.ok(sends.every((l) => l.game === 'hoanmythegioi' && l.phan === 'bang-xep-hang' && l.qua === 'claude' && /^(bx|lim) \(Claude\)$/.test(l.ai)), JSON.stringify(sends[0]));
  assert.match(sends[0].doiTuong, /^\d+ bảng, \d+ dòng$/);
  const restores = lines.filter((l) => l.viec === 'bxh-khoi-phuc');
  assert.equal(restores.length, 1);
  assert.equal(restores[0].ai, 'chu');
  assert.equal(restores[0].qua, 'web');
  const rawLog = readFileSync(join(root, 'he-thong', 'nhat-ky-quyen.jsonl'), 'utf8');
  assert.ok(!Object.values(CODES).some((c) => rawLog.includes(c)) && !rawLog.includes(sha256(CODES.bx)) && !/@/.test(rawLog), 'no code, hash or "@" in the record');
  ok('the record has a line per update ("bx (Claude)", game, part, counts) and one for the web restore; no code, hash or e-mail in it');
} catch (e) {
  console.error(e && e.stack ? e.stack : e);
  console.error('--- server log (tail) ---\n' + log.slice(-1500));
  process.exitCode = 1;
} finally {
  child.kill();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
if (!process.exitCode) console.log(`\n${n} checks passed`);
