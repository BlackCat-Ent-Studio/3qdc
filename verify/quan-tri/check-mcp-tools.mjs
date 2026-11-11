// check-mcp-tools.mjs — Claude's tools on /mcp for every part, by rights: who sees which tools, that a tool outside the rights is
// refused, that deleting only moves into the trash (and the web brings it back), that taking a right away removes the tools
// at once, that links to inside the network or to servers off the allowed list are refused, and that the record of work through Claude is complete.
//   node verify/quan-tri/check-mcp-tools.mjs      (run from the project folder on a machine that can reach https://3qdc.wanmeivn.com)
// A temporary server is started with its own data folder; accounts and Claude codes are written into it. The two downloads
// (a picture and a song) read public files of the live site and nothing is changed there. The music folder is the real
// overrides/home/nhac of this project (the player reads it): the test song is added and removed again.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const mkCode = (name) => `3qp_ThuNghiem${name}`.padEnd(47, 'x');
let n = 0;
const ok = (name) => { n++; console.log(`ok   ${name}`); };
const dirs = [];
const tmpDir = () => { const d = mkdtempSync(join(tmpdir(), 'mcptools-')); dirs.push(d); return d; };
const put = (root, rel, text) => { const f = join(root, ...rel.split('/')); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
const freePort = () => new Promise((done) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });

const { hashPassword } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/admin-auth.mjs')).href);
const { REPLY_MAX } = await import(pathToFileURL(join(ROOT, 'scripts/lib/phieu/phieu-config.mjs')).href);
const safe = await import(pathToFileURL(join(ROOT, 'scripts/lib/admin/mcp/safe-fetch.mjs')).href);

const now = new Date().toISOString();
const secret = await hashPassword(PASSWORD);
const acct = (username, role, grants, extra = {}) => ({ username, name: `Tên ${username}`, role, ...(grants ? { grants } : {}), ...secret, disabled: false, createdAt: now, passwordSetAt: now, ...extra });
const g3 = (part, ...perms) => ({ '3qdc': { [part]: perms } });
const USERS = [
  acct('chu', 'owner'),
  acct('dongvu', 'member', g3('phieu-be-ngoan', 'duyet')),
  acct('viet', 'member', g3('tin-tuc', 'viet')),
  acct('duyet', 'member', g3('tin-tuc', 'duyet')),
  acct('pql', 'member', g3('phieu-be-ngoan', 'quan-ly')),
  acct('dk', 'member', g3('dang-ky-som', 'quan-ly')),
  acct('nh', 'member', g3('nhac', 'quan-ly')),
  acct('lim', 'member', g3('dang-ky-som', 'quan-ly')),
  acct('nhieu', 'member', { '3qdc': { 'tin-tuc': ['duyet'], 'phieu-be-ngoan': ['quan-ly'] } }),
  acct('quanly', 'member', { '3qdc': '*' }),
  acct('sky', 'member', { skystory: '*' }),
  acct('khoa', 'member', g3('tin-tuc', 'viet'), { disabled: true }),
];
const root = tmpDir();
put(root, 'he-thong/users.json', JSON.stringify(USERS));
const CODES = {
  dongvu: mkCode('Dongvu'), viet: mkCode('Viet'), duyet: mkCode('Duyet'), pql: mkCode('Pql'), dk: mkCode('Dk'), nh: mkCode('Nh'),
  nhieu: mkCode('Nhieu'), quanly: mkCode('Quanly'), sky: mkCode('Sky'), khoa: mkCode('Khoa'), ownerScoped: mkCode('OwnerScoped'), ownerPlain: mkCode('OwnerPlain'),
  lim1: mkCode('Lim1'), lim2: mkCode('Lim2'), lim3: mkCode('Lim3'), lim4: mkCode('Lim4'),
};
const rec = (id, username, c, extra = {}) => ({ id, username, label: 'thu', hint: c.slice(-4), hash: sha256(c), createdBy: 'chu', createdAt: now.slice(0, 19), ...extra });
put(root, 'he-thong/mcp-tokens.json', JSON.stringify([
  rec('a00000000001', 'dongvu', CODES.dongvu), rec('a00000000002', 'viet', CODES.viet), rec('a00000000003', 'duyet', CODES.duyet),
  rec('a00000000004', 'pql', CODES.pql), rec('a00000000005', 'dk', CODES.dk), rec('a00000000006', 'nh', CODES.nh),
  rec('a00000000007', 'nhieu', CODES.nhieu), rec('a00000000008', 'quanly', CODES.quanly), rec('a00000000009', 'sky', CODES.sky),
  rec('a0000000000a', 'khoa', CODES.khoa), rec('a0000000000b', 'chu', CODES.ownerScoped, { scope: 'owner' }), rec('a0000000000c', 'chu', CODES.ownerPlain),
  rec('a0000000000d', 'lim', CODES.lim1), rec('a0000000000e', 'lim', CODES.lim2), rec('a0000000000f', 'lim', CODES.lim3), rec('a00000000010', 'lim', CODES.lim4),
]));
const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const ticket = (id, email, acc) => ({ id, email, ten: 'Người Chơi', acc, server: 'S1', qua: ['Quà thử'], ghiChu: 'ghi chú thử', luc: `${today}T08:00:00+07:00`, ngay: today, st: 'cho', phanHoi: '' });
put(root, 'games/3qdc/phieu-be-ngoan/phieu.json', JSON.stringify({ items: [ticket('tk0000000001', 'nguoi.choi.mot@example.com', 'nv1'), ticket('tk0000000002', 'nguoi.choi.hai@example.com', 'nv2'), ticket('tk0000000003', 'nguoi.choi.ba@example.com', 'nv3'), ticket('tk0000000004', 'nguoi.choi.bon@example.com', 'nv4')] }));
const PHONES = ['0912000001', '0912000002', '0912000003'];
put(root, 'games/3qdc/dang-ky-som/dang-ky.jsonl', PHONES.map((sdt, i) => JSON.stringify({ sdt, luc: `2026-11-0${i + 1}T10:00:00+07:00`, ip: '203.0.113.5', nguon: 'thu' })).join('\n') + '\n');

const port = await freePort();
const env = { ...process.env, PORT: String(port), DATA_ROOT: root, NEWS_INSECURE_COOKIE: '1', NEWS_SITE_ORIGIN: `http://127.0.0.1:${port}`, NEWS_ALLOWED_ORIGINS: '', PHIEU_GOOGLE_CLIENT_ID: 'x', NEWS_DATA_DIR: '', PHIEU_DATA_DIR: '', SIGNUP_DATA_DIR: '' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`;
const seen = [];
const SONG = 'Kiểm tra MCP - Thử nghiệm.mp3';
const SONG_FILE = join(ROOT, 'overrides', 'home', 'nhac', SONG);
const LIVE = 'https://3qdc.wanmeivn.com';
const LIVE_PICTURE = `${LIVE}/3qdc-vi/home/anh-nen-slogan-vi.webp`;
const LIVE_SONG = `${LIVE}/3qdc-vi/home/nhac/${encodeURIComponent('Nhạc nền 1 - 3Q Đại Chiến.mp3')}`;

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
const done = async (c, name, args) => { const r = await call(c, name, args); assert.ok(!r.isError, `${name} ${JSON.stringify(args)}: ${say(r)}`); return r; };
const refusedWith = async (c, name, args, re) => { const r = await call(c, name, args); assert.equal(r.isError, true, `${name} should be refused: ${say(r)}`); if (re) assert.match(say(r), re, `${name}: ${say(r)}`); return r; };
const noTool = (c, name, args = {}) => refusedWith(c, name, args, /Không có công cụ/);
const auditLines = () => { try { return readFileSync(join(root, 'he-thong', 'nhat-ky-quyen.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const auditRaw = () => { try { return readFileSync(join(root, 'he-thong', 'nhat-ky-quyen.jsonl'), 'utf8'); } catch { return ''; } };
const usersFile = () => JSON.parse(readFileSync(join(root, 'he-thong', 'users.json'), 'utf8'));
const idOf = (res) => Number(say(res).match(/#(\d+)/)[1]);
const publicStatus = async (slug) => (await req('GET', `/tin-tuc/${slug}`)).status;

const NEWS_VIET = ['ds_anh', 'ds_bai', 'gui_duyet', 'rut_ve_nhap', 'tai_anh_tu_link', 'viet_bai', 'xem_bai'];
const NEWS_DUYET = [...NEWS_VIET, 'dang_bai', 'go_bai', 'tra_lai', 'xoa_bai'];
const TRASH = ['khoi_phuc', 'thung_rac'];
const TICKET_DUYET = ['tra_qua', 'tu_choi', 'xem_phieu'];
const TICKET_QL = [...TICKET_DUYET, 'dua_ve_cho', 'xoa_phieu', 'xuat_csv_phieu'];
const SIGNUP = ['ds_dang_ky', 'sua_moc', 'thong_ke_dang_ky', 'xoa_dang_ky', 'xuat_csv_dang_ky'];
const MUSIC = ['ds_nhac', 'tai_nhac_tu_link', 'xoa_nhac'];
const OWNER = ['cap_quyen', 'ds_game', 'tao_link_moi', 'thu_quyen', 'xem_quyen'];
const sorted = (...lists) => [...new Set(lists.flat())].sort();
const WORK_ALL = sorted(NEWS_DUYET, TRASH, TICKET_QL, SIGNUP, MUSIC);

// the three ticket tools exactly as they were before the other tools existed
const REPLY = (extra) => ({ id: { type: 'string', pattern: '^[a-z0-9]{6,20}$', description: 'Mã phiếu (id) lấy từ xem_phieu.' }, ...extra });
const OLD_TICKET_TOOLS = [
  {
    name: 'xem_phieu', title: 'Xem phiếu Bé Ngoan',
    description: 'Liệt kê phiếu xin quà theo ngày gửi và trạng thái (mặc định: phiếu đang chờ của hôm nay). Mỗi phiếu có mã (id), nhân vật, server, các món quà muốn nhận, ghi chú, trạng thái, phản hồi và người xử lý.',
    inputSchema: {
      type: 'object',
      properties: {
        ngay: { type: 'string', enum: ['hom-nay', 'hom-qua', 'tat-ca'], description: 'Ngày gửi: hôm nay, hôm qua, hoặc mọi ngày. Mặc định hom-nay.' },
        trang_thai: { type: 'string', enum: ['cho', 'tra', 'tu', 'tat-ca'], description: 'cho = đang chờ, tra = đã trả, tu = từ chối, tat-ca = mọi trạng thái. Mặc định cho.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'tra_qua', title: 'Đánh dấu đã trả quà',
    description: 'Đánh dấu một phiếu đang chờ là Đã trả, sau khi quà đã được trả trong game. Người chơi thấy trạng thái và phản hồi trong lịch sử phiếu. Phiếu đã xử lý rồi thì không đổi được.',
    inputSchema: { type: 'object', properties: REPLY({ phan_hoi: { type: 'string', maxLength: REPLY_MAX, description: `Lời nhắn cho người chơi (không bắt buộc, tối đa ${REPLY_MAX} ký tự).` } }), required: ['id'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'tu_choi', title: 'Từ chối phiếu',
    description: 'Đánh dấu một phiếu đang chờ là Từ chối, kèm lý do người chơi đọc được. Phiếu đã xử lý rồi thì không đổi được.',
    inputSchema: { type: 'object', properties: REPLY({ phan_hoi: { type: 'string', minLength: 1, maxLength: REPLY_MAX, description: `Lý do từ chối cho người chơi (bắt buộc, tối đa ${REPLY_MAX} ký tự).` } }), required: ['id', 'phan_hoi'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
];

try {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('server exited early:\n' + log);
    try { if ((await req('GET', '/tin-tuc')).status === 200) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  for (const u of ['chu', 'duyet']) expect(await signIn(u), 200, `sign in ${u}`);

  // ---------- the tools each kind of account sees ----------
  const initial = json(await rpc(CODES.dongvu, 'initialize', { protocolVersion: '2025-06-18' })).result;
  assert.equal(initial.serverInfo.name, '3qdc-quan-tri');
  assert.match(initial.instructions, /tra_qua/);
  assert.doesNotMatch(initial.instructions, /thung_rac|ds_dang_ky|dang_bai/, 'a ticket reviewer is told nothing about parts they cannot use');
  assert.deepEqual(await toolNames(CODES.dongvu), TICKET_DUYET);
  assert.deepEqual(await listTools(CODES.dongvu), OLD_TICKET_TOOLS, 'a ticket reviewer sees the three old tools unchanged (names, wording, parameters)');
  ok('a code with only "duyet phiếu" lists exactly the 3 old tools, identical in name, wording and parameters');

  assert.deepEqual(await toolNames(CODES.viet), NEWS_VIET);
  assert.deepEqual(await toolNames(CODES.duyet), sorted(NEWS_DUYET, TRASH));
  assert.deepEqual(await toolNames(CODES.pql), sorted(TICKET_QL, TRASH));
  assert.deepEqual(await toolNames(CODES.dk), sorted(SIGNUP, TRASH));
  assert.deepEqual(await toolNames(CODES.nh), sorted(MUSIC, TRASH));
  assert.deepEqual(await toolNames(CODES.nhieu), sorted(NEWS_DUYET, TICKET_QL, TRASH));
  assert.deepEqual(await toolNames(CODES.quanly), WORK_ALL);
  assert.deepEqual(await toolNames(CODES.ownerPlain), WORK_ALL, 'an owner code without scope has every work tool and no owner tool');
  assert.deepEqual(await toolNames(CODES.ownerScoped), sorted(WORK_ALL, OWNER), 'an owner code with scope has every tool plus the 5 owner tools');
  ok('tool sets: writer, reviewer, ticket reviewer, ticket manager, sign-ups, music, mixed, game manager, owner (plain and scoped)');

  const statuses = [];
  for (const c of [CODES.sky, CODES.khoa]) statuses.push((await rpc(c, 'tools/list')).status);
  // skystory has the news part switched on (10/11): a right there makes the code work; a locked account's code is dead
  assert.deepEqual(statuses, [200, 401], 'a skystory right works now that skystory has its news part; a locked account → the code is dead');
  const gameProp = (await listTools(CODES.viet)).find((t) => t.name === 'viet_bai').inputSchema.properties.game;
  assert.deepEqual(gameProp.enum, ['3qdc']);
  assert.ok(!(await listTools(CODES.viet)).find((t) => t.name === 'viet_bai').inputSchema.required);
  ok('a game-less or locked account has no code that works; the game parameter is optional with one game');

  // ---------- a tool outside the rights is refused ----------
  for (const name of ['dang_bai', 'tra_lai', 'go_bai', 'xoa_bai', 'thung_rac', 'khoi_phuc', 'xem_phieu', 'ds_dang_ky', 'ds_nhac', 'cap_quyen']) await noTool(CODES.viet, name, { id: 1 });
  for (const name of ['xuat_csv_phieu', 'xoa_phieu', 'dua_ve_cho', 'thung_rac', 'ds_bai', 'ds_nhac']) await noTool(CODES.dongvu, name, { id: 'tk0000000001' });
  for (const name of ['xem_phieu', 'xoa_bai', 'ds_nhac', 'xoa_nhac']) await noTool(CODES.dk, name, { id: 1, ten: 'x' });
  await noTool(CODES.ownerPlain, 'xem_quyen');
  await noTool(CODES.pql, 'xem_quyen');
  await refusedWith(CODES.viet, 'viet_bai', { game: 'skystory', tieu_de: 'x', muc: 'thong-bao' }, /không có quyền|Không có game|Game dùng được/);
  await refusedWith(CODES.viet, 'viet_bai', { game: 'khong-co', tieu_de: 'x', muc: 'thong-bao' }, /Không có game/);
  ok('every tool outside the rights is "no such tool"; a game outside the rights is refused');

  // ---------- news: writer ----------
  const lib = (await done(CODES.viet, 'ds_anh')).structuredContent.thuVien;
  assert.ok(lib.length >= 3);
  const dirty = '<p>Xin chào <strong>mọi người</strong></p><script>alert(1)</script><img src="https://evil.example/x.png"><img src="' + lib[1] + '"><a href="javascript:alert(1)">bẫy</a>';
  const created = await done(CODES.viet, 'viet_bai', { tieu_de: 'Bài thử qua Claude', muc: 'thong-bao', tom_tat: 'Tóm tắt thử', anh_bia: lib[0], noi_dung: dirty });
  const A = idOf(created);
  assert.match(say(created), /Nháp/);
  const read = await done(CODES.viet, 'xem_bai', { id: A });
  assert.ok(!/<script|evil\.example|javascript:/.test(say(read)), 'the HTML is filtered by the same filter the web uses');
  assert.ok(say(read).includes(lib[1]) && say(read).includes('<strong>mọi người</strong>'));
  assert.match(say(read), /Đường dẫn: bai-thu-qua-claude\n/);
  const twin = await done(CODES.viet, 'viet_bai', { tieu_de: 'Bài thử qua Claude', muc: 'su-kien' });
  assert.match(say(twin), /bai-thu-qua-claude-2/, 'a second article with the same title gets its own address');
  const B = idOf(twin);
  await refusedWith(CODES.viet, 'viet_bai', { tieu_de: '', muc: 'thong-bao' }, /tiêu đề/i);
  await refusedWith(CODES.viet, 'viet_bai', { tieu_de: 'Không có mục' }, /mục/);
  await refusedWith(CODES.viet, 'viet_bai', { tieu_de: 'Sai kiểu', muc: 'thong-bao', anh_bia: 'https://evil.example/x.png' }, /Ảnh bìa không hợp lệ/);
  ok('writer: create a draft, same HTML filter as the web, address made from the title, wrong input refused');

  const stale = await refusedWith(CODES.viet, 'viet_bai', { id: A, tom_tat: 'Tóm tắt mới', cap_nhat_luc: '2020-01-01T00:00:00.000+07:00' }, /sửa lúc|Tải lại/);
  assert.ok(stale.isError);
  const edited = await done(CODES.viet, 'viet_bai', { id: A, tom_tat: 'Tóm tắt mới' });
  assert.match(say(await done(CODES.viet, 'xem_bai', { id: A })), /Tóm tắt: Tóm tắt mới/);
  assert.ok(say(edited).includes('cap_nhat_luc'));
  expect(await signIn('viet'), 200, 'viet signs in on the web');
  const sent = await done(CODES.viet, 'gui_duyet', { id: A });
  assert.match(say(sent), /Chờ duyệt/);
  await refusedWith(CODES.viet, 'viet_bai', { id: A, tom_tat: 'sửa khi đang chờ' }, /chờ duyệt/i);
  await done(CODES.viet, 'rut_ve_nhap', { id: A });
  await refusedWith(CODES.viet, 'gui_duyet', { id: B }, /ảnh bìa|tóm tắt|nội dung/);
  await done(CODES.viet, 'gui_duyet', { id: A });
  ok('writer: stale edit refused, send for review, cannot edit while pending, take back, incomplete article cannot be sent');

  // ---------- news: reviewer ----------
  const slugA = 'bai-thu-qua-claude';
  assert.equal(await publicStatus(slugA), 404, 'a pending article is not public');
  await refusedWith(CODES.duyet, 'tra_lai', { id: A, ghi_chu: ' ' }, /Ghi chú|ghi_chu|Ghi/i);
  await done(CODES.duyet, 'tra_lai', { id: A, ghi_chu: 'Thêm ảnh minh hoạ' });
  assert.match(say(await done(CODES.viet, 'xem_bai', { id: A })), /Ghi chú trả lại: Thêm ảnh minh hoạ/);
  await done(CODES.viet, 'gui_duyet', { id: A });
  const posted = await done(CODES.duyet, 'dang_bai', { id: A, ghim: true });
  assert.match(say(posted), /Đã đăng, ghim/);
  assert.equal(await publicStatus(slugA), 200, 'published: public');
  await refusedWith(CODES.viet, 'viet_bai', { id: A, tom_tat: 'người viết sửa bài đã đăng' }, /đã đăng|Quản lý/i);
  const soon = await refusedWith(CODES.duyet, 'dang_bai', { id: A, kieu: 'hen_gio', gio: '2020-01-01T10:00' }, /tương lai/);
  assert.ok(soon.isError);
  await refusedWith(CODES.duyet, 'dang_bai', { id: A, kieu: 'hen_gio' }, /gio/);
  await done(CODES.duyet, 'go_bai', { id: A });
  assert.equal(await publicStatus(slugA), 404, 'unpublished: gone from the public page');
  const future = new Date(Date.now() + 2 * 86400e3 + 7 * 3600e3).toISOString().slice(0, 16);
  const sched = await done(CODES.duyet, 'dang_bai', { id: A, kieu: 'hen_gio', gio: future, trang: 'chinh' });
  assert.match(say(sched), /hẹn giờ/);
  assert.equal(await publicStatus(slugA), 404, 'scheduled for later: not public yet');
  await done(CODES.duyet, 'dang_bai', { id: A, kieu: 'ngay' });
  assert.equal(await publicStatus(slugA), 200);
  ok('reviewer: send back with a note, publish + pin, unpublish, schedule, publish now; the public page follows each step');

  // ---------- delete → trash → the web brings it back ----------
  const del = await done(CODES.duyet, 'xoa_bai', { id: A });
  assert.match(say(del), /Thùng rác/);
  assert.equal(await publicStatus(slugA), 404, 'a deleted article is not public');
  assert.ok(!say(await done(CODES.duyet, 'ds_bai')).includes(`#${A} `), 'not in the list');
  const web = json(await get('chu', '/g/3qdc/thung-rac')).items;
  const hit = web.find((t) => t.id === A);
  assert.ok(hit, 'the web trash lists it');
  assert.equal(hit.deletedVia, 'claude');
  assert.equal(hit.deletedBy, 'duyet');
  const back = await post('chu', `/g/3qdc/thung-rac/${encodeURIComponent(hit.key)}/khoi-phuc`);
  expect(back, 200, 'owner brings it back on the web');
  assert.match(say(await done(CODES.duyet, 'xem_bai', { id: A })), /\[Nháp/);
  assert.equal(await publicStatus(slugA), 404, 'back as a draft: still not public');
  await done(CODES.duyet, 'xoa_bai', { id: B });
  const trashSay = say(await done(CODES.duyet, 'thung_rac'));
  assert.match(trashSay, /Tin tức/);
  const keyB = json(await get('chu', '/g/3qdc/thung-rac')).items.find((t) => t.id === B).key;
  assert.ok(trashSay.includes(keyB));
  await refusedWith(CODES.duyet, 'khoi_phuc', { phan: 'tin-tuc', key: 'khong-co.json' }, /Không tìm thấy/);
  await refusedWith(CODES.duyet, 'khoi_phuc', { phan: 'phieu-be-ngoan', key: 'tk0000000001' }, /không được khôi phục/);
  await refusedWith(CODES.duyet, 'thung_rac', { phan: 'phieu-be-ngoan' }, /không được mở/);
  await done(CODES.duyet, 'khoi_phuc', { phan: 'tin-tuc', key: keyB });
  assert.match(say(await done(CODES.duyet, 'xem_bai', { id: B })), /\[Nháp/);
  for (const t of await listTools(CODES.quanly)) assert.ok(!/xoa_han|don_sach|vinh_vien/i.test(t.name), 'no tool deletes for good');
  expect(await post('duyet', '/g/3qdc/thung-rac/x.json/xoa-han'), 403, 'a reviewer cannot delete for good on the web either');
  ok('delete → the article is in the trash (web lists who and "claude"), off the public page, the web and Claude both bring it back; no tool deletes for good');

  // ---------- tickets ----------
  const seen1 = await done(CODES.dongvu, 'xem_phieu');
  assert.ok(!/@|email/i.test(say(seen1) + JSON.stringify(seen1.structuredContent)), 'a reviewer never sees email addresses');
  assert.match(say(seen1), /Mã tk0000000001/);
  const paid = await done(CODES.dongvu, 'tra_qua', { id: 'tk0000000001', phan_hoi: 'Đã gửi quà' });
  assert.match(say(paid), /Đã đánh dấu phiếu tk0000000001: Đã trả/);
  await refusedWith(CODES.dongvu, 'tra_qua', { id: 'tk0000000001' }, /đã được xử lý trước đó/);
  await refusedWith(CODES.dongvu, 'tu_choi', { id: 'tk0000000002' }, /lý do/);
  await refusedWith(CODES.dongvu, 'tra_qua', { id: 'KHONG-HOP-LE' }, /Mã phiếu không hợp lệ/);
  await done(CODES.dongvu, 'tu_choi', { id: 'tk0000000002', phan_hoi: 'Sai tên nhân vật' });
  const ql = await done(CODES.pql, 'xem_phieu', { trang_thai: 'tat-ca' });
  assert.match(say(ql), /Email: nguoi\.choi\.mot@example\.com/, 'a ticket manager sees the email');
  assert.equal(ql.structuredContent.items[0].email !== undefined, true);
  const back1 = await done(CODES.pql, 'dua_ve_cho', { id: 'tk0000000001' });
  assert.match(say(back1), /Đang chờ/);
  const csv = await done(CODES.pql, 'xuat_csv_phieu', { ngay: 'tat-ca', trang_thai: 'tat-ca' });
  assert.ok(say(csv).includes('nguoi.choi.ba@example.com') && say(csv).includes('Gmail'));
  assert.match(say(csv), /trang 1\/1/);
  await done(CODES.pql, 'xoa_phieu', { id: 'tk0000000003' });
  const ticketTrash = json(await get('chu', '/g/3qdc/phieu-be-ngoan/thung-rac')).items;
  assert.equal(ticketTrash.length, 1);
  assert.equal(ticketTrash[0].key, 'tk0000000003');
  assert.equal(ticketTrash[0].deletedVia, 'claude');
  assert.ok(!say(await done(CODES.pql, 'xem_phieu', { trang_thai: 'tat-ca' })).includes('tk0000000003'), 'a trashed ticket is in no list');
  const tt = say(await done(CODES.pql, 'thung_rac', { phan: 'phieu-be-ngoan' }));
  assert.ok(tt.includes('tk0000000003') && !tt.includes('@'), 'the trash list carries no email');
  await done(CODES.pql, 'khoi_phuc', { phan: 'phieu-be-ngoan', key: 'tk0000000003' });
  assert.match(say(await done(CODES.pql, 'xem_phieu', { trang_thai: 'tat-ca' })), /tk0000000003/);
  ok('tickets: reviewer tools as before (no email); manager sees email, puts back, exports CSV, deletes into the trash and restores');

  // ---------- early sign-ups ----------
  const stat = await done(CODES.dk, 'thong_ke_dang_ky');
  assert.match(say(stat), /3 số/);
  assert.ok(!PHONES.some((p) => say(stat).includes(p)), 'the statistics carry no phone number');
  const list = await done(CODES.dk, 'ds_dang_ky');
  for (const p of PHONES) assert.ok(say(list).includes(p), `the list shows ${p}`);
  assert.match(say(await done(CODES.dk, 'ds_dang_ky', { tim: '0912000002' })), /khớp 1/);
  const dkcsv = await done(CODES.dk, 'xuat_csv_dang_ky');
  assert.ok(PHONES.every((p) => say(dkcsv).includes(p)) && say(dkcsv).includes('Số điện thoại'));
  await refusedWith(CODES.dk, 'sua_moc', { moc: [5, 3] }, /tăng dần/);
  await done(CODES.dk, 'sua_moc', { moc: [2, 10, 50] });
  assert.match(say(await done(CODES.dk, 'thong_ke_dang_ky')), /Mốc đang đặt: 2, 10, 50 · mốc kế tiếp: 10/);
  await refusedWith(CODES.dk, 'xoa_dang_ky', { sdt: '12345' }, /không hợp lệ/);
  const dres = await done(CODES.dk, 'xoa_dang_ky', { sdt: '0912 000 002' });
  assert.ok(!say(dres).includes('0912000002'), 'the answer masks the number');
  assert.match(say(await done(CODES.dk, 'thong_ke_dang_ky')), /2 số/);
  assert.equal(json(await get('chu', '/g/3qdc/dang-ky-som/thung-rac')).items[0].deletedVia, 'claude');
  const dkTrash = say(await done(CODES.dk, 'thung_rac'));
  assert.ok(dkTrash.includes('0912000002'));
  await done(CODES.dk, 'khoi_phuc', { phan: 'dang-ky-som', key: '0912000002' });
  assert.match(say(await done(CODES.dk, 'thong_ke_dang_ky')), /3 số/);
  ok('sign-ups: statistics without phones, list and CSV with phones, milestones, delete into the trash and restore');

  // ---------- links: nothing inside the network, only https ----------
  const blocked = [
    'http://example.com/a.png', 'https://127.0.0.1/a.png', 'https://localhost/a.png', 'https://sub.localhost/a.png', 'https://169.254.169.254/latest/meta-data',
    'https://10.0.0.5/a.png', 'https://172.16.3.4/a.png', 'https://192.168.1.1/a.png', 'https://100.64.0.1/a.png', 'https://0.0.0.0/a.png',
    'https://[::1]/a.png', 'https://[::ffff:127.0.0.1]/a.png', 'https://[::ffff:7f00:1]/a.png', 'https://[fe80::1]/a.png', 'https://[fd00::1]/a.png',
    'https://2130706433/a.png', 'https://0x7f.1/a.png', 'https://user:pass@example.com/a.png', 'https://example.com:8443/a.png',
    'ftp://example.com/a.png', 'file:///etc/passwd', 'khong-phai-link', '',
  ];
  for (const link of blocked) {
    for (const [code, name] of [[CODES.viet, 'tai_anh_tu_link'], [CODES.nh, 'tai_nhac_tu_link']]) {
      const r = await refusedWith(code, name, { link });
      assert.match(say(r), /nội bộ|https|Link|link/, `${name} ${link}: ${say(r)}`);
    }
  }
  const viaDns = await safe.openLink('https://localtest.me/a.png', { maxBytes: 1000, allowHost: () => true });
  assert.match(viaDns.error, /nội bộ|Không kết nối/, 'a public name that resolves to 127.0.0.1 is refused after the lookup');
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.1.1', '::1', '::ffff:10.0.0.1', '::ffff:a00:1', '64:ff9b::7f00:1', '2002:7f00:1::1', 'fc00::1', 'ff02::1',
    '64:ff9b:1::1', '64:ff9b:1::7f00:1', '2001::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '::ffff:0:7f00:1', '::ffff:0:a00:1', '2001:db8::1', '3fff::1', '5f00::1', '100::1']) assert.equal(safe.isBlockedIp(ip), true, `${ip} is refused`);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4001::1', '2001:4860:4860::8888', '::ffff:8.8.8.8']) assert.equal(safe.isBlockedIp(ip), false, `${ip} is public`);
  const big = await safe.openLink(LIVE_PICTURE, { maxBytes: 1000 });
  assert.match(big.error, /lớn hơn/, 'a file over the size limit is refused from its declared size');
  ok('links: http, ports, user:pass, localhost, 127.x, 10.x, 169.254.x, 192.168.x, IPv6 loopback / mapped / link-local, a name resolving to 127.0.0.1, oversize: all refused');

  // ---------- links: only servers on the allowed list, at every step ----------
  const offList = ['https://example.com/a.png', 'https://evil-imgur.com/a.png', 'https://i.imgur.com.evil.example/a.png', 'https://imgur.com.evil.example/a.png',
    'https://evilwanmeivn.com/a.png', 'https://x.i.imgur.com/a.png', 'https://xscontent.fbcdn.net/a.png', 'https://scontent.fbcdn.net.evil.example/a.png', 'https://8.8.8.8/a.png'];
  for (const link of offList) {
    for (const [code, name] of [[CODES.viet, 'tai_anh_tu_link'], [CODES.nh, 'tai_nhac_tu_link']]) {
      const r = await refusedWith(code, name, { link }, /danh sách/);
      assert.match(say(r), /ds_anh/, 'the refusal says to upload on the admin site and use ds_anh');
    }
  }
  const inList = ['https://3qdc.wanmeivn.com/a.png', 'https://wanmeivn.com/a.png', 'https://phieubengoan.3qdc.wanmeivn.com/a.png', 'https://i.imgur.com/a.png', 'https://lh3.googleusercontent.com/a',
    'https://drive.usercontent.google.com/a', 'https://cdn.discordapp.com/a.png', 'https://media.discordapp.net/a.png', 'https://scontent.fsgn2-1.fna.fbcdn.net/a.jpg', 'https://scontent-sin6-1.xx.fbcdn.net/a.jpg'];
  for (const link of inList) assert.ok(safe.checkLink(link).url, `${link} is on the list`);
  // a redirect is checked again: from a listed server to an unlisted one, to inside the network, and the other way round
  const realRequest = https.request;
  const answers = [];
  let asked = 0;
  https.request = (opts, cb) => {
    const r = new EventEmitter();
    r.end = () => {
      asked++;
      const a = answers.shift() || { statusCode: 404, headers: {} };
      setImmediate(() => cb(Object.assign(new EventEmitter(), { resume() {}, destroy() {}, pipe() { throw new Error('no body expected'); } }, a)));
    };
    r.destroy = (e) => { setImmediate(() => r.emit('error', e || new Error('destroyed'))); };
    return r;
  };
  try {
    answers.push({ statusCode: 302, headers: { location: 'https://evil.example/x.png' } });
    const hop1 = await safe.openLink('https://i.imgur.com/a.png', { maxBytes: 1000 });
    assert.match(hop1.error, /chuyển hướng không hợp lệ.*danh sách/, 'listed → unlisted redirect refused');
    assert.equal(asked, 1, 'the second server is never contacted');
    answers.push({ statusCode: 301, headers: { location: 'https://127.0.0.1/x.png' } });
    assert.match((await safe.openLink('https://i.imgur.com/a.png', { maxBytes: 1000 })).error, /chuyển hướng không hợp lệ/);
    answers.push({ statusCode: 302, headers: { location: 'https://cdn.discordapp.com/b.png' } }, { statusCode: 404, headers: {} });
    asked = 0;
    assert.match((await safe.openLink('https://i.imgur.com/a.png', { maxBytes: 1000 })).error, /mã 404/, 'listed → listed redirect is followed');
    assert.equal(asked, 2);
    // one overall time limit, however the server drips: a request that never finishes its answer stops at the limit
    https.request = () => {
      const r = new EventEmitter();
      r.end = () => {};
      r.destroy = (e) => { setImmediate(() => r.emit('error', e)); };
      return r;
    };
    const t0 = Date.now();
    const slow = await safe.openLink('https://i.imgur.com/a.png', { maxBytes: 1000, timeoutMs: 300 });
    assert.match(slow.error, /không trả lời kịp|quá lâu/);
    assert.ok(Date.now() - t0 < 2000, `stopped by the overall limit (${Date.now() - t0} ms)`);
  } finally {
    https.request = realRequest;
  }
  ok('links: only listed servers (evil-imgur.com, look-alike suffixes, IP numbers refused), the list applies to every redirect, one overall time limit, 3 more IPv6 ranges refused');

  // ---------- links: a real picture and a real song from public https ----------
  const pic = await done(CODES.viet, 'tai_anh_tu_link', { link: LIVE_PICTURE });
  const picUrl = say(pic).match(/\/tin-tuc-anh\/\d{4}\/\d{2}\/[a-f0-9]{16}\.webp/)[0];
  const served = await req('GET', picUrl);
  expect(served, 200, 'the uploaded picture is served');
  assert.equal(served.headers['content-type'], 'image/webp');
  assert.ok((await done(CODES.viet, 'ds_anh')).structuredContent.daTaiLen.some((x) => x.url === picUrl));
  await refusedWith(CODES.viet, 'tai_anh_tu_link', { link: `${LIVE}/tin-tuc` }, /không phải ảnh/);
  await refusedWith(CODES.nh, 'tai_nhac_tu_link', { link: LIVE_PICTURE }, /không phải file nhạc/);
  const song = await done(CODES.nh, 'tai_nhac_tu_link', { link: LIVE_SONG, ten: 'Kiểm tra MCP - Thử nghiệm' });
  assert.match(say(song), /Kiểm tra MCP - Thử nghiệm\.mp3/);
  assert.ok(existsSync(SONG_FILE), 'the song is in the player folder');
  assert.match(say(await done(CODES.nh, 'ds_nhac')), /Kiểm tra MCP - Thử nghiệm\.mp3/);
  assert.ok((await req('GET', '/3qdc-vi/api/nhac')).text.includes('Ki%E1%BB%83m'), 'the player list has it');
  await done(CODES.nh, 'xoa_nhac', { ten: SONG });
  assert.equal(existsSync(SONG_FILE), false);
  assert.ok(!(await req('GET', '/3qdc-vi/api/nhac')).text.includes('Ki%E1%BB%83m'), 'the player no longer lists it');
  const songTrash = json(await get('chu', '/g/3qdc/nhac/thung-rac')).items;
  assert.equal(songTrash.length, 1);
  assert.equal(songTrash[0].deletedVia, 'claude');
  await done(CODES.nh, 'khoi_phuc', { phan: 'nhac', key: songTrash[0].key });
  assert.ok(existsSync(SONG_FILE));
  await done(CODES.nh, 'xoa_nhac', { ten: SONG });
  let again = json(await get('chu', '/g/3qdc/nhac/thung-rac')).items;
  // a song of the same name is back in the folder: the restore refuses and leaves it alone
  writeFileSync(SONG_FILE, 'ID3-newer-upload');
  await refusedWith(CODES.nh, 'khoi_phuc', { phan: 'nhac', key: again[0].key }, /Đã có bài/);
  assert.equal(readFileSync(SONG_FILE, 'utf8'), 'ID3-newer-upload', 'the newer file is untouched');
  rmSync(SONG_FILE, { force: true });
  // two restores at the same moment: one brings it back, the other gets a plain answer (no server error), one file
  const both = await Promise.all([rpc(CODES.nh, 'tools/call', { name: 'khoi_phuc', arguments: { phan: 'nhac', key: again[0].key } }), rpc(CODES.nh, 'tools/call', { name: 'khoi_phuc', arguments: { phan: 'nhac', key: again[0].key } })]);
  assert.deepEqual(both.map((r) => r.status), [200, 200], 'no server error from two restores at once');
  const results = both.map((r) => json(r).result);
  assert.equal(results.filter((r) => !r.isError).length, 1, 'exactly one restore wins');
  assert.match(say(results.find((r) => r.isError)), /Không tìm thấy|Đã có bài/);
  assert.ok(existsSync(SONG_FILE));
  await done(CODES.nh, 'xoa_nhac', { ten: SONG });
  again = json(await get('chu', '/g/3qdc/nhac/thung-rac')).items;
  assert.equal(again.length, 1);
  expect(await post('chu', `/g/3qdc/nhac/thung-rac/${encodeURIComponent(again[0].key)}/xoa-han`), 200, 'the owner deletes the test song for good on the web');
  assert.equal(existsSync(SONG_FILE), false);
  ok('links: a real picture and song are fetched with the web limits and checks; song delete → trash → restore → web purge');

  // ---------- taking a right away removes the tools at once ----------
  assert.deepEqual(await toolNames(CODES.nhieu), sorted(NEWS_DUYET, TICKET_QL, TRASH));
  const gone = await done(CODES.ownerScoped, 'thu_quyen', { username: 'nhieu', game: '3qdc', phan: 'phieu-be-ngoan' });
  assert.ok(!say(gone).includes('phieu-be-ngoan ['));
  assert.deepEqual(await toolNames(CODES.nhieu), sorted(NEWS_DUYET, TRASH), 'the ticket tools are gone from the very next list');
  await noTool(CODES.nhieu, 'xem_phieu');
  await noTool(CODES.nhieu, 'xoa_phieu', { id: 'tk0000000001' });
  await refusedWith(CODES.nhieu, 'thung_rac', { phan: 'phieu-be-ngoan' }, /không được mở/);
  await done(CODES.ownerScoped, 'thu_quyen', { username: 'nhieu', game: '3qdc', phan: 'tin-tuc' });
  assert.equal((await rpc(CODES.nhieu, 'tools/list')).status, 401, 'no right left → the code is dead');
  assert.equal((await rpc(CODES.nhieu, 'tools/call', { name: 'ds_bai', arguments: {} })).status, 401);
  await done(CODES.ownerScoped, 'cap_quyen', { username: 'nhieu', game: '3qdc', phan: 'tin-tuc', quyen: ['viet'] });
  assert.deepEqual(await toolNames(CODES.nhieu), NEWS_VIET, 'a right given back brings the tools back (writer only)');
  ok('taking a right away: its tools vanish from the next list and calls are refused; the last right gone kills the code; a new right brings tools back');

  // ---------- the web side of the trash is recorded too ----------
  const curA = json(await get('chu', `/g/3qdc/bai/${A}`)).post;
  expect(await post('chu', `/g/3qdc/bai/${A}/xoa`, { baseUpdatedAt: curA.updatedAt }), 200, 'the owner deletes on the web');
  expect(await post('chu', '/g/3qdc/thung-rac/don-sach'), 200, 'the owner empties the news trash');
  ok('the owner deletes and empties on the web');

  // ---------- the record ----------
  const lines = auditLines();
  const by = (viec, who) => lines.filter((l) => l.viec === viec && (!who || l.ai === who));
  const must = (viec, who, qua = 'claude') => { const l = by(viec, who); assert.ok(l.length > 0, `record has ${viec} by ${who}`); assert.equal(l[0].qua, qua); };
  must('tin-tuc-tao', 'viet (Claude)'); must('tin-tuc-sua', 'viet (Claude)'); must('tin-tuc-gui-duyet', 'viet (Claude)'); must('tin-tuc-rut-ve', 'viet (Claude)');
  must('tin-tuc-tai-anh', 'viet (Claude)'); must('tin-tuc-dang', 'duyet (Claude)'); must('tin-tuc-tra-lai', 'duyet (Claude)'); must('tin-tuc-go-bai', 'duyet (Claude)');
  must('thung-rac-xoa', 'duyet (Claude)'); must('thung-rac-khoi-phuc', 'duyet (Claude)'); must('thung-rac-xoa', 'pql (Claude)'); must('thung-rac-xoa', 'dk (Claude)'); must('thung-rac-xoa', 'nh (Claude)');
  must('thung-rac-khoi-phuc', 'pql (Claude)'); must('thung-rac-khoi-phuc', 'dk (Claude)'); must('thung-rac-khoi-phuc', 'nh (Claude)');
  must('phieu-tra-qua', 'dongvu (Claude)'); must('phieu-tu-choi', 'dongvu (Claude)'); must('phieu-dua-ve-cho', 'pql (Claude)');
  must('xem-email-phieu', 'pql (Claude)'); must('xuat-csv-phieu', 'pql (Claude)');
  must('xem-sdt-dang-ky', 'dk (Claude)'); must('xuat-csv-dang-ky', 'dk (Claude)'); must('xem-sdt-thung-rac', 'dk (Claude)'); must('dang-ky-sua-moc', 'dk (Claude)');
  must('nhac-tai-len', 'nh (Claude)');
  must('thung-rac-xoa', 'chu', 'web'); must('thung-rac-khoi-phuc', 'chu', 'web'); must('thung-rac-xoa-han', 'chu', 'web'); must('thung-rac-don-sach', 'chu', 'web');
  assert.equal(by('xem-email-phieu', 'dongvu (Claude)').length, 0, 'a reviewer sees no email, so nothing to record');
  assert.ok(lines.every((l) => /^\d{4}-\d{2}-\d{2}T/.test(l.luc) && l.ai && l.viec), 'every line has a time, a name and a kind');
  const rawAudit = auditRaw();
  assert.ok(!/@|example\.com/.test(rawAudit), 'no email address in the record');
  assert.ok(!PHONES.some((p) => rawAudit.includes(p)), 'no full phone number in the record');
  assert.ok(!Object.values(CODES).some((c) => rawAudit.includes(c)) && !rawAudit.includes(secret.hash), 'no code or hash in the record');
  assert.ok(by('xem-sdt-dang-ky')[0].chiTiet.includes('trang'), 'what was looked at is written beside it');
  ok('the record: a line for every kind of write and every look at emails / phone numbers / CSV through Claude, web trash steps too; no email, phone, code or hash in it');

  // ---------- the write allowance, per person ----------
  const limCodes = [CODES.lim1, CODES.lim2, CODES.lim3, CODES.lim4];
  for (let i = 1; i <= 300; i++) await done(limCodes[i % 4], 'sua_moc', { moc: [i] });
  const over = await refusedWith(limCodes[0], 'sua_moc', { moc: [301] }, /300 lần ghi trong 1 giờ/);
  assert.match(say(over), /Thử lại sau/);
  await refusedWith(limCodes[2], 'xoa_dang_ky', { sdt: '0912000001' }, /300 lần ghi/);
  assert.match(say(await done(limCodes[1], 'thong_ke_dang_ky')), /Mốc đang đặt: 300/, 'reading still works and the 300th write was kept');
  await done(CODES.dk, 'sua_moc', { moc: [1000, 3000] });
  // reading personal data: 60 an hour per person, all codes together; reads without personal data are not counted
  const personal = limCodes.slice(0, 2);
  for (let i = 0; i < 60; i++) await done(personal[i % 2], i % 3 ? 'ds_dang_ky' : 'xuat_csv_dang_ky', {});
  await refusedWith(personal[0], 'ds_dang_ky', {}, /60 lần xem hoặc xuất dữ liệu cá nhân trong 1 giờ/);
  await refusedWith(personal[1], 'xuat_csv_dang_ky', {}, /60 lần/);
  await refusedWith(limCodes[3], 'thung_rac', { phan: 'dang-ky-som' }, /60 lần/);
  assert.match(say(await done(limCodes[2], 'thong_ke_dang_ky')), /Mốc đang đặt/, 'statistics (no personal data) are still readable');
  await done(CODES.dk, 'ds_dang_ky', {});
  ok('personal data allowance: 60 reads or exports an hour per person across codes; other tools and other people are not affected');
  ok('write allowance: 300 writes an hour per person across all his codes; reads and other people are not affected');
} catch (e) {
  console.error(e && e.stack ? e.stack : e);
  console.error('--- server log (tail) ---\n' + log.slice(-1500));
  process.exitCode = 1;
} finally {
  rmSync(SONG_FILE, { force: true });
  child.kill();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
if (!process.exitCode) console.log(`\n${n} checks passed`);
