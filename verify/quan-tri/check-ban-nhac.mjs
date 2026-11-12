// check-ban-nhac.mjs — the background music of each game: its own folder, the public list and files on the game's own web
// address (Range, 404 elsewhere), the admin screen API (upload, listen, delete, restore) and Claude's music tools by game,
// while 3qdc keeps its folder, its addresses and its tool list exactly as they were.
//   node verify/quan-tri/check-ban-nhac.mjs      (run from the project folder; a temporary server with its own data folder)
// Nothing is written to the live data or to overrides/home/nhac of this project (3qdc's folder is only read).
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const mkCode = (name) => `3qp_ThuNhac${name}`.padEnd(47, 'x');
let n = 0;
const ok = (name) => { n++; console.log(`ok   ${name}`); };
const dirs = [];
const tmpDir = () => { const d = mkdtempSync(join(tmpdir(), 'nhac-')); dirs.push(d); return d; };
const put = (root, rel, text) => { const f = join(root, ...rel.split('/')); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
const freePort = () => new Promise((done) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });
// a file that passes the "really an MP3" check (ID3 tag first) and is long enough to ask byte ranges from
const mp3 = (size = 6000, fill = 7) => Buffer.concat([Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00', 'latin1'), Buffer.alloc(size - 10, fill)]);
const asRequest = (buf, type = 'audio/mpeg') => Object.assign(Readable.from([buf]), { headers: { 'content-type': type, 'content-length': String(buf.length) } });

// ---------- the store, in this process ----------
const storeRoot = tmpDir();
process.env.DATA_ROOT = storeRoot;
const music = await import(pathToFileURL(join(ROOT, 'scripts/lib/home/music-store.mjs')).href);
const trashMod = await import(pathToFileURL(join(ROOT, 'scripts/lib/home/music-trash.mjs')).href);
const { musicDirOf, musicUrlOf, listSongs, saveSong, MUSIC_DIR, MUSIC_URL } = music;

assert.equal(musicDirOf('3qdc'), MUSIC_DIR);
assert.equal(musicDirOf(), MUSIC_DIR, 'no game = 3qdc, so every old caller is unchanged');
assert.equal(MUSIC_DIR, join(ROOT, 'overrides', 'home', 'nhac'));
assert.equal(musicUrlOf('3qdc'), '/3qdc-vi/home/nhac/');
assert.equal(musicDirOf('skystory'), join(storeRoot, 'games', 'skystory', 'nhac', 'bai'));
assert.equal(musicUrlOf('skystory'), '/nhac/');
assert.throws(() => musicDirOf('../x'), /invalid game id/);
assert.throws(() => musicDirOf('a/b'), /invalid game id/);
ok('folders and addresses: 3qdc as always (overrides/home/nhac, /3qdc-vi/home/nhac/), other games data/games/<game>/nhac/bai and /nhac/; a bad game id is refused');

const before3q = JSON.stringify(await listSongs('3qdc'));
assert.deepEqual(await listSongs('skystory'), [], 'no folder yet = no songs');
const s1 = await saveSong(asRequest(mp3()), 'Bài thử - Ca sĩ thử.mp3', 'skystory');
assert.equal(s1.name, 'Bài thử - Ca sĩ thử.mp3');
assert.ok(existsSync(join(storeRoot, 'games', 'skystory', 'nhac', 'bai', s1.name)));
const s2 = await saveSong(asRequest(mp3(6000, 9)), 'Bài thử - Ca sĩ thử.mp3', 'skystory');
assert.equal(s2.name, 'Bài thử - Ca sĩ thử (2).mp3', 'a taken name gets a number, nothing is overwritten');
await saveSong(asRequest(mp3()), 'Bài ở game khác.mp3', 'hoanmythegioi');
const skyList = await listSongs('skystory');
assert.deepEqual(skyList.map((s) => [s.title, s.artist, s.file]).sort((x, y) => x[1].length - y[1].length), [
  ['Bài thử', 'Ca sĩ thử', '/nhac/B%C3%A0i%20th%E1%BB%AD%20-%20Ca%20s%C4%A9%20th%E1%BB%AD.mp3'],
  ['Bài thử', 'Ca sĩ thử (2)', '/nhac/B%C3%A0i%20th%E1%BB%AD%20-%20Ca%20s%C4%A9%20th%E1%BB%AD%20(2).mp3'],
]);
assert.deepEqual((await listSongs('hoanmythegioi')).map((s) => s.title), ['Bài ở game khác'], 'each game sees only its own songs');
assert.equal(JSON.stringify(await listSongs('3qdc')), before3q, '3qdc list is untouched by the other games');
const bad = await saveSong(asRequest(Buffer.from('chỉ là chữ, đổi đuôi mp3')), 'Giả.mp3', 'skystory');
assert.equal(bad.status, 415);
assert.equal((await saveSong(asRequest(mp3()), 'x', 'skystory')).name.endsWith('.mp3'), true);
ok('upload goes to the game folder with the same naming (title - artist), numbering and checks; games do not see each other; the 3qdc list does not change');

const t = await trashMod.trashSong('skystory', s1.name, 'thu', 'web');
assert.ok(t.ok, JSON.stringify(t));
assert.ok(existsSync(join(storeRoot, 'games', 'skystory', 'nhac', 'thung-rac', t.id, s1.name)), 'trash is the sibling of bai/');
assert.ok(!(await listSongs('skystory')).some((x) => x.name === s1.name));
assert.deepEqual((await trashMod.listSongTrash('hoanmythegioi')).length, 0, 'the other game has nothing in its trash');
const back = await trashMod.restoreSong('skystory', t.id);
assert.ok(back.ok, JSON.stringify(back));
assert.ok((await listSongs('skystory')).some((x) => x.name === s1.name));
const t2 = await trashMod.trashSong('skystory', s1.name, 'thu', 'web');
assert.ok(t2.ok);
assert.equal((await trashMod.restoreSong('hoanmythegioi', t2.id)).status, 404, 'a trashed song cannot be restored into another game');
assert.ok((await trashMod.purgeSong('skystory', t2.id)).ok);
assert.equal((await trashMod.trashSong('skystory', '../y.mp3', 'thu', 'web')).status, 404);
assert.equal((await trashMod.trashSong('skystory', 'khong-co.mp3', 'thu', 'web')).status, 404);
assert.equal(JSON.stringify(await listSongs('3qdc')), before3q);
ok('trash: delete, restore and purge work per game; a song cannot be restored into another game; a path in the name is cut to its last part and stays inside the game folder');

// ---------- a temporary server ----------
const { hashPassword } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/admin-auth.mjs')).href);
const now = new Date().toISOString();
const secret = await hashPassword(PASSWORD);
const acct = (username, role, grants) => ({ username, name: `Tên ${username}`, role, ...(grants ? { grants } : {}), ...secret, disabled: false, createdAt: now, passwordSetAt: now });
const DV_OLD = { '3qdc': { 'tin-tuc': ['duyet'], nhac: ['quan-ly'], 'dang-ky-som': ['quan-ly'], 'phieu-be-ngoan': ['quan-ly'] } };
const USERS = [
  acct('chu', 'owner'),
  acct('dv', 'member', DV_OLD),
  acct('sk', 'member', { skystory: { nhac: ['quan-ly'] } }),
  acct('hm', 'member', { hoanmythegioi: { nhac: ['quan-ly'] } }),
  acct('tin', 'member', { skystory: { 'tin-tuc': ['viet'] } }),
];
const CODES = { chu: mkCode('Chu'), dv: mkCode('Dv'), sk: mkCode('Sk'), tin: mkCode('Tin') };
const root = tmpDir();
put(root, 'he-thong/users.json', JSON.stringify(USERS));
put(root, 'he-thong/mcp-tokens.json', JSON.stringify(Object.entries(CODES).map(([u, c], i) => ({ id: `b0000000000${i.toString(16)}`, username: u, label: 'thu', hint: c.slice(-4), hash: sha256(c), createdBy: 'chu', createdAt: now.slice(0, 19) }))));
// a ready song in skystory, as the deploy puts the default ones
mkdirSync(join(root, 'games', 'skystory', 'nhac', 'bai'), { recursive: true });
const READY = 'Nhạc nền 1 - Thiên Không Kỳ Truyện.mp3';
const READY_BYTES = mp3(6000, 5);
writeFileSync(join(root, 'games', 'skystory', 'nhac', 'bai', READY), READY_BYTES);
writeFileSync(join(root, 'games', 'skystory', 'nhac', 'bai', 'Nhạc nền 1 - Thiên Không Kỳ Truyện.webp'), Buffer.from('RIFFxxxxWEBP'));

const port = await freePort();
const env = { ...process.env, PORT: String(port), DATA_ROOT: root, NEWS_INSECURE_COOKIE: '1', NEWS_SITE_ORIGIN: `http://127.0.0.1:${port}`, NEWS_ALLOWED_ORIGINS: '', PHIEU_GOOGLE_CLIENT_ID: 'x', NEWS_DATA_DIR: '', PHIEU_DATA_DIR: '', SIGNUP_DATA_DIR: '' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`;
const HOSTS = { hm: 'hoanmythegioi.wanmeivn.com', q3: '3qdc.wanmeivn.com', sky: 'skystory.wanmeivn.com', q3b: '3qdaichien.wanmeivn.com' };

function req(method, path, { cookie, body, headers: extra, raw, binary } = {}) {
  return new Promise((done, fail) => {
    const data = raw !== undefined ? Buffer.from(raw) : body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const headers = { Host: `127.0.0.1:${port}`, ...(cookie ? { Cookie: cookie } : {}), ...(extra || {}) };
    if (method === 'POST') { headers.Origin = origin; if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'; }
    if (data) headers['Content-Length'] = data.length;
    const r = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { const b = Buffer.concat(chunks); done({ status: res.statusCode, headers: res.headers, buf: b, text: b.toString('utf8') }); });
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
const get = (who, path, headers) => req('GET', api + path, { cookie: cookies[who], headers, binary: true });
const post = (who, path, body) => req('POST', api + path, { cookie: cookies[who], body: body === undefined ? {} : body });
const upload = (who, game, name, buf, type = 'audio/mpeg') => req('POST', `${api}/g/${game}/nhac`, { cookie: cookies[who], raw: buf, headers: { 'Content-Type': type, 'X-Ten-File': encodeURIComponent(name) } });
const json = (r) => JSON.parse(r.text);
const expect = (r, status, what) => assert.equal(r.status, status, `${what}: ${r.status} ${String(r.text).slice(0, 200)}`);
let rpcId = 0;
const rpc = (code, method, params) => req('POST', '/mcp', { headers: { Authorization: `Bearer ${code}` }, body: { jsonrpc: '2.0', id: ++rpcId, method, params } });
const listTools = async (c) => { const r = await rpc(c, 'tools/list'); expect(r, 200, 'tools/list'); return json(r).result.tools; };
const call = async (c, name, args = {}) => { const r = await rpc(c, 'tools/call', { name, arguments: args }); expect(r, 200, `call ${name}`); return json(r).result; };
const say = (res) => res.content.map((x) => x.text).join('\n');
const quoted = (s) => encodeURIComponent(s);
const pub = (host, path, o = {}) => req(o.method || 'GET', path, { headers: { Host: host, ...(o.headers || {}) }, binary: true });

try {
  for (let i = 0; i < 60; i++) { try { if ((await req('GET', '/quan-tri')).status === 200) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 150)); }
  for (const u of ['chu', 'dv', 'sk', 'hm', 'tin']) expect(await signIn(u), 200, `sign in ${u}`);

  // ----- the public address of a game -----
  const list = await pub(HOSTS.sky, '/api/nhac');
  expect(list, 200, 'skystory list');
  assert.match(list.headers['content-type'], /application\/json/);
  assert.equal(list.headers['cache-control'], 'no-store');
  const songs = JSON.parse(list.buf.toString('utf8'));
  assert.deepEqual(songs, [{ file: '/nhac/' + quoted(READY), title: 'Nhạc nền 1', artist: 'Thiên Không Kỳ Truyện', cover: '/nhac/' + quoted('Nhạc nền 1 - Thiên Không Kỳ Truyện.webp') }]);
  assert.ok(!/bytes|"name"/.test(list.text), 'the player gets no file sizes or file names');
  assert.deepEqual(JSON.parse((await pub(HOSTS.hm, '/api/nhac')).buf.toString('utf8')), [], 'a game with no songs answers an empty list');
  ok('skystory lists its songs at /api/nhac (title, artist, cover, address); hoanmythegioi has none and answers []');

  const full = await pub(HOSTS.sky, songs[0].file);
  expect(full, 200, 'whole song');
  assert.equal(full.headers['content-type'], 'audio/mpeg');
  assert.equal(full.headers['accept-ranges'], 'bytes');
  assert.ok(full.buf.equals(READY_BYTES));
  const part = await pub(HOSTS.sky, songs[0].file, { headers: { Range: 'bytes=100-199' } });
  expect(part, 206, 'range');
  assert.equal(part.headers['content-range'], 'bytes 100-199/6000');
  assert.equal(part.buf.length, 100);
  assert.ok(part.buf.equals(READY_BYTES.subarray(100, 200)));
  const open = await pub(HOSTS.sky, songs[0].file, { headers: { Range: 'bytes=5900-' } });
  expect(open, 206, 'open-ended range');
  assert.equal(open.headers['content-range'], 'bytes 5900-5999/6000');
  const tail = await pub(HOSTS.sky, songs[0].file, { headers: { Range: 'bytes=-50' } });
  expect(tail, 206, 'suffix range');
  assert.equal(tail.headers['content-range'], 'bytes 5950-5999/6000');
  expect(await pub(HOSTS.sky, songs[0].file, { headers: { Range: 'bytes=9000-9999' } }), 416, 'range past the end');
  const tag = full.headers.etag;
  assert.ok(tag);
  expect(await pub(HOSTS.sky, songs[0].file, { headers: { 'If-None-Match': tag } }), 304, 'same ETag');
  const head = await pub(HOSTS.sky, songs[0].file, { method: 'HEAD' });
  expect(head, 200, 'HEAD');
  assert.equal(head.headers['content-length'], '6000');
  assert.equal(head.buf.length, 0);
  expect(await pub(HOSTS.sky, songs[0].cover, {}), 200, 'cover');
  ok('/nhac/<file> serves the whole song, byte ranges (closed, open, last N, past the end = 416), ETag 304, HEAD, and the cover');

  for (const [host, path] of [[HOSTS.sky, '/nhac/' + quoted('Không có.mp3')], [HOSTS.sky, '/nhac/..%2f..%2fhe-thong%2fusers.json'], [HOSTS.sky, '/nhac/' + quoted('../../he-thong/users.json')],
    [HOSTS.sky, '/nhac/thung-rac/x.mp3'], [HOSTS.sky, '/nhac/'], [HOSTS.sky, '/nhac'], [HOSTS.hm, '/nhac/' + quoted(READY)]]) {
    const r = await pub(host, path);
    assert.ok(r.status === 404 || r.status === 400, `${host}${path} -> ${r.status}`);
    assert.ok(!/ID3|"username"|passwordHash|hash/.test(r.buf.toString('latin1').slice(0, 3000)), 'nothing leaks');
  }
  expect(await pub(HOSTS.sky, '/nhac/' + quoted('x.json')), 404, 'an extension that is not audio or a picture');
  expect(await pub(HOSTS.sky, '/api/nhac', { method: 'POST' }), 405, 'POST on the list');
  expect(await pub(HOSTS.sky, '/nhac/' + quoted(READY), { method: 'POST' }), 405, 'POST on a song');
  ok('other names, folders, "..", other extensions and the other game\'s files are 404; POST is 405');

  const q3 = await pub(HOSTS.q3, '/3qdc-vi/api/nhac');
  expect(q3, 200, '3qdc own list');
  const q3songs = JSON.parse(q3.buf.toString('utf8'));
  assert.ok(Array.isArray(q3songs) && q3songs.length > 0 && q3songs.every((s) => s.file.startsWith('/3qdc-vi/home/nhac/')), '3qdc keeps its own list and addresses');
  expect(await pub(HOSTS.q3, q3songs[0].file, { headers: { Range: 'bytes=0-9' } }), 206, '3qdc song with a range');
  for (const host of [HOSTS.q3, HOSTS.q3b, `127.0.0.1:${port}`, 'khong-biet.example.com']) {
    for (const path of ['/api/nhac', '/nhac/' + quoted(READY)]) {
      const r = await pub(host, path);
      assert.equal(r.status, 404, `${host}${path} is not a music address of its own`);
      assert.ok(!/"title"|ID3/.test(r.buf.toString('utf8')), `${host}${path} lists nothing`);
    }
  }
  expect(await pub(HOSTS.sky, '/3qdc-vi/api/nhac'), 200, 'the old 3qdc address answers on every host as it always did');
  ok('3qdc: /3qdc-vi/api/nhac and /3qdc-vi/home/nhac/ as before; 3qdc, 3qdaichien, a bare address and an unknown host answer 404 on /api/nhac and /nhac/');

  // ----- the admin screen -----
  const gsky = await get('sk', '/g/skystory/nhac');
  expect(gsky, 200, 'skystory music API (skystory manager)');
  const g = json(gsky);
  assert.equal(g.items.length, 1);
  assert.equal(g.items[0].nghe, '/nhac/' + quoted(READY) + '/nghe');
  assert.equal(g.items[0].bytes, 6000);
  assert.equal(g.max, 15 * 1024 * 1024);
  assert.equal(g.total, 300 * 1024 * 1024);
  const listen = await get('sk', '/g/skystory' + g.items[0].nghe, { Range: 'bytes=0-99' });
  expect(listen, 206, 'listen through the admin address');
  assert.equal(listen.headers['content-range'], 'bytes 0-99/6000');
  expect(await get('sk', '/g/skystory' + g.items[0].nghe), 200, 'listen, whole');
  expect(await req('GET', `${api}/g/skystory${g.items[0].nghe}`), 401, 'listen when signed out');
  expect(await get('tin', '/g/skystory' + g.items[0].nghe), 403, 'listen with only the news right');
  expect(await get('hm', '/g/skystory' + g.items[0].nghe), 403, 'listen with the right of another game');
  expect(await get('sk', '/g/skystory/nhac/' + quoted('khong-co.mp3') + '/nghe'), 404, 'listen to a song that is not there');
  expect(await get('sk', '/g/skystory/nhac/' + quoted('../x.mp3') + '/nghe'), 404, 'listen with a path');
  const q3api = await get('chu', '/g/3qdc/nhac');
  expect(q3api, 200, '3qdc music API');
  assert.ok(json(q3api).items.every((s) => s.nghe === undefined && s.file.startsWith('/3qdc-vi/home/nhac/')), '3qdc screen keeps its own addresses, no new field');
  ok('admin screen: a game\'s list carries the "listen" address (session and rights checked, Range works, 401/403/404); 3qdc\'s list has no new field');

  expect(await get('tin', '/g/skystory/nhac'), 403, 'news right only');
  expect(await get('hm', '/g/skystory/nhac'), 403, 'right of another game');
  expect(await get('dv', '/g/skystory/nhac'), 403, 'dongvu has music in 3qdc only');
  expect(await get('dv', '/g/hoanmythegioi/nhac'), 403);
  expect(await get('sk', '/g/3qdc/nhac'), 403, 'skystory manager cannot open 3qdc music');
  expect(await get('sk', '/g/hoanmythegioi/nhac'), 403);
  expect(await get('dv', '/g/3qdc/nhac'), 200, 'dongvu keeps 3qdc music');
  expect(await get('chu', '/g/hoanmythegioi/nhac'), 200, 'owner, empty game');
  assert.deepEqual(json(await get('chu', '/g/hoanmythegioi/nhac')).items, []);
  expect(await req('POST', `${api}/g/skystory/nhac`, { raw: mp3(), headers: { 'Content-Type': 'audio/mpeg', 'X-Ten-File': 'a.mp3' } }), 401, 'upload signed out');
  expect(await upload('tin', 'skystory', 'a.mp3', mp3()), 403, 'upload with the news right');
  expect(await upload('hm', 'skystory', 'a.mp3', mp3()), 403, 'upload with another game\'s right');
  ok('rights are per game: the music of a game opens only for its own manager (and owners)');

  // ----- upload, delete, restore through the admin API -----
  const up = await upload('sk', 'skystory', 'Bài tải lên - Ca sĩ B.mp3', mp3(8000, 3));
  expect(up, 201, 'upload');
  const upj = json(up);
  assert.equal(upj.name, 'Bài tải lên - Ca sĩ B.mp3');
  assert.equal(upj.items.length, 2);
  assert.ok(upj.items.every((s) => s.nghe));
  assert.ok(existsSync(join(root, 'games', 'skystory', 'nhac', 'bai', upj.name)));
  assert.ok(!readdirSync(MUSIC_DIR_OF_PROJECT()).includes(upj.name), 'nothing went to the 3qdc folder');
  assert.equal(JSON.parse((await pub(HOSTS.sky, '/api/nhac')).buf.toString('utf8')).length, 2, 'the public list follows at once');
  expect(await upload('sk', 'skystory', 'Giả.mp3', Buffer.from('không phải nhạc thật')), 415, 'not a real mp3');
  expect(await upload('sk', 'skystory', 'Lạ.txt', mp3(), 'text/plain'), 415, 'not an audio type');
  const big = await req('POST', `${api}/g/skystory/nhac`, { cookie: cookies.sk, raw: Buffer.alloc(16 * 1024 * 1024, 1), headers: { 'Content-Type': 'audio/mpeg', 'X-Ten-File': 'To.mp3' } }).catch((e) => ({ status: 'reset', text: String(e) }));
  assert.ok(big.status === 413 || big.status === 'reset', `over 15 MB: ${big.status}`);
  expect(await post('sk', `/g/skystory/nhac/${quoted(upj.name)}/xoa`, {}), 200, 'delete');
  assert.ok(!existsSync(join(root, 'games', 'skystory', 'nhac', 'bai', upj.name)));
  assert.equal(JSON.parse((await pub(HOSTS.sky, '/api/nhac')).buf.toString('utf8')).length, 1, 'the public list drops it at once');
  const tr = json(await get('sk', '/g/skystory/nhac/thung-rac'));
  assert.equal(tr.items.length, 1);
  assert.equal(tr.items[0].name, upj.name);
  assert.ok(existsSync(join(root, 'games', 'skystory', 'nhac', 'thung-rac', tr.items[0].key, upj.name)));
  expect(await get('hm', '/g/skystory/nhac/thung-rac'), 403, 'another game\'s manager cannot see this trash');
  expect(await post('sk', `/g/skystory/nhac/thung-rac/${quoted(tr.items[0].key)}/khoi-phuc`, {}), 200, 'restore');
  assert.equal(JSON.parse((await pub(HOSTS.sky, '/api/nhac')).buf.toString('utf8')).length, 2, 'restored song is back on the list');
  expect(await post('sk', `/g/skystory/nhac/${quoted('khong-co.mp3')}/xoa`, {}), 404, 'delete a song that is not there');
  ok('upload, delete to the trash and restore through the admin API: files move only inside the game\'s folders, the public list follows at once, limits and type checks hold');

  // ----- Claude's tools -----
  const dvTools = await listTools(CODES.dv);
  const dvMusic = dvTools.filter((t) => ['ds_nhac', 'tai_nhac_tu_link', 'xoa_nhac'].includes(t.name));
  assert.equal(dvMusic.length, 3);
  for (const t of dvMusic) {
    assert.deepEqual(t.inputSchema.properties.game.enum, ['3qdc'], `${t.name}: an account with music in 3qdc only is offered 3qdc alone, as before`);
    assert.ok(!(t.inputSchema.required || []).includes('game'), `${t.name}: game stays optional for it`);
  }
  assert.deepEqual(dvMusic.find((t) => t.name === 'tai_nhac_tu_link').inputSchema.required, ['link']);
  assert.deepEqual(dvMusic.find((t) => t.name === 'xoa_nhac').inputSchema.required, ['ten']);
  const skTools = await listTools(CODES.sk);
  for (const name of ['ds_nhac', 'tai_nhac_tu_link', 'xoa_nhac']) assert.ok(skTools.some((t) => t.name === name), `a skystory music manager has ${name}`);
  assert.deepEqual(skTools.find((t) => t.name === 'ds_nhac').inputSchema.properties.game.enum, ['skystory'], 'one game = that game, optional');
  const chuTools = await listTools(CODES.chu);
  for (const name of ['ds_nhac', 'tai_nhac_tu_link', 'xoa_nhac']) {
    const t = chuTools.find((x) => x.name === name);
    assert.ok(t, `owner has ${name}`);
    assert.deepEqual(t.inputSchema.properties.game.enum.sort(), ['3qdc', 'hoanmythegioi', 'skystory'], `${name}: the owner picks among the 3 games`);
    assert.ok(t.inputSchema.required.includes('game'), `${name}: game is required for the owner`);
  }
  ok('Claude tools: dongvu-like accounts (music in 3qdc only) see ds_nhac / tai_nhac_tu_link / xoa_nhac with the game offered as 3qdc alone (optional) and the same required fields; an owner must choose among 3 games');

  const dsSky = await call(CODES.sk, 'ds_nhac', {});
  assert.ok(!dsSky.isError, say(dsSky));
  assert.match(say(dsSky), /2 bài/);
  assert.match(say(dsSky), /Nhạc nền 1 - Thiên Không Kỳ Truyện\.mp3/);
  assert.ok(!/Nhạc nền 1 - 3Q Đại Chiến/.test(say(dsSky)), 'a skystory account never sees 3qdc songs');
  const dsDv = await call(CODES.dv, 'ds_nhac', {});
  assert.match(say(dsDv), /3Q Đại Chiến/);
  assert.ok(!/Thiên Không Kỳ Truyện/.test(say(dsDv)), 'dongvu never sees skystory songs');
  const dsChuNoGame = await call(CODES.chu, 'ds_nhac', {});
  assert.equal(dsChuNoGame.isError, true, 'the owner must say which game');
  const dsChu = await call(CODES.chu, 'ds_nhac', { game: 'hoanmythegioi' });
  assert.ok(!dsChu.isError, say(dsChu));
  assert.match(say(dsChu), /0 bài/);
  const xo = await call(CODES.sk, 'xoa_nhac', { ten: upj.name });
  assert.ok(!xo.isError, say(xo));
  assert.equal(JSON.parse((await pub(HOSTS.sky, '/api/nhac')).buf.toString('utf8')).length, 1);
  const xo3 = await call(CODES.sk, 'xoa_nhac', { ten: 'Nhạc nền 1 - 3Q Đại Chiến.mp3' });
  assert.equal(xo3.isError, true, 'a skystory account cannot delete a 3qdc song by name');
  const xo4 = await call(CODES.dv, 'xoa_nhac', { ten: READY });
  assert.equal(xo4.isError, true, 'dongvu cannot delete a skystory song by name');
  assert.ok(existsSync(join(root, 'games', 'skystory', 'nhac', 'bai', READY)));
  const tl = await call(CODES.sk, 'tai_nhac_tu_link', { link: `http://127.0.0.1:${port}/nhac/x.mp3` });
  assert.equal(tl.isError, true, 'a link that is not https to an allowed host is refused as before');
  ok('ds_nhac / xoa_nhac / tai_nhac_tu_link act on the game of the account; no tool reaches another game\'s songs by name; an owner must name the game');

  assert.ok(!/Error|ERR_|TypeError/.test(log.replace(/NEWS_[A-Z_]+/g, '')), `server log is clean: ${log.slice(-400)}`);
  ok('the server log has no error');
  console.log(`${n} checks passed`);
} catch (e) {
  console.error(e);
  console.error('--- server log (tail) ---\n' + log.slice(-1500));
  process.exitCode = 1;
} finally {
  child.kill();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}

function MUSIC_DIR_OF_PROJECT() { return MUSIC_DIR; }
