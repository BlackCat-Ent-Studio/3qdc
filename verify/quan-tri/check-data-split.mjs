// check-data-split.mjs — data kept per game: the migration script, the start-up refusals, and two games side by side.
//   node verify/quan-tri/check-data-split.mjs        (run from the project folder; needs nothing running, uses temp folders)
// A temporary server is started on a free port with its own DATA_ROOT; a preload switches the news part on for the second game
// of the book (skystory) in that child process only, the book of games itself is not changed.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { layoutProblems } from '../../scripts/lib/admin/data-layout.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const MIGRATE = join(ROOT, 'scripts', 'migrate-games-data.mjs');
const PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
let n = 0;
const ok = (name) => { n++; console.log(`ok   ${name}`); };
const tmp = [];
const tmpDir = () => { const d = mkdtempSync(join(tmpdir(), 'split-')); tmp.push(d); return d; };
const put = (root, rel, text) => { const f = join(root, ...rel.split('/')); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };

// every file of a tree as "relative path sha256", sorted
function treeSum(root) {
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r); else out.push(`${r} ${createHash('sha256').update(readFileSync(join(root, r))).digest('hex')}`);
    }
  };
  walk('');
  return out.sort().join('\n');
}

const post = (id, slug, extra = {}) => JSON.stringify({
  id, slug, title: `Bài ${slug}`, category: 'thong-bao', status: 'published', content: '<p>x</p>', summary: 's', cover: '', author: 'a',
  publishAt: '2026-01-01T08:00:00+07:00', createdAt: '2026-01-01T08:00:00.000+07:00', updatedAt: '2026-01-01T08:00:00.000+07:00', updatedBy: 'a', ...extra,
});
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(40)]);

// ---------- 1. the layout check ----------
{
  const root = tmpDir();
  assert.deepEqual(layoutProblems(root, {}), []);
  ok('layout: empty data folder is fine');
  put(root, 'games/3qdc/tin-tuc/posts/1.json', '{}');
  mkdirSync(join(root, 'news', 'posts'), { recursive: true });
  assert.deepEqual(layoutProblems(root, {}), []);
  ok('layout: empty old folders do not count');
  put(root, 'news/posts/1.json', '{}');
  assert.match(layoutProblems(root, {}).join(' '), /old layout.*news\//);
  ok('layout: files left in the old folder are refused');
  assert.match(layoutProblems(tmpDir(), { NEWS_DATA_DIR: '/x' }).join(' '), /NEWS_DATA_DIR is no longer used/);
  assert.match(layoutProblems(tmpDir(), { PHIEU_DATA_DIR: '/x' }).join(' '), /PHIEU_DATA_DIR/);
  assert.match(layoutProblems(tmpDir(), { SIGNUP_DATA_DIR: '/x' }).join(' '), /SIGNUP_DATA_DIR/);
  ok('layout: old data variables are refused');
}

// ---------- 2. the migration script ----------
const migrate = (root, ...args) => spawnSync(process.execPath, [MIGRATE, '--root', root, ...args], { encoding: 'utf8' });
function oldLayout() {
  const root = tmpDir();
  put(root, 'news/users.json', '[{"u":1}]');
  put(root, 'news/invites.json', '[]');
  put(root, 'news/mcp-tokens.json', '[]');
  put(root, 'news/posts/4.json', post(4, 'bai-bon'));
  put(root, 'news/posts/5.json', post(5, 'bai-nam'));
  put(root, 'news/revisions/4/20260101080000000.json', '{}');
  put(root, 'news/uploads/2026/09/0123456789abcdef.png', 'png');
  mkdirSync(join(root, 'news', 'trash'));
  put(root, 'phieu-be-ngoan/phieu.json', '[1,2,3]');
  put(root, 'phieu-be-ngoan/phieu.json.bak-1', '[1]');
  put(root, 'dang-ky-som/dang-ky.jsonl', 'a\nb\n');
  return root;
}
{
  const root = oldLayout();
  const before = treeSum(root);
  const dry = migrate(root, '--dry-run');
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /news\/posts -> games\/3qdc\/tin-tuc\/posts\s+2 file/);
  assert.match(dry.stdout, /nothing was changed/);
  assert.equal(treeSum(root), before);
  assert.equal(migrate(root).status, 0);
  assert.equal(treeSum(root), before);
  ok('migrate: dry run (also the default) lists the moves and changes nothing');

  const applied = migrate(root, '--apply', '--nhap');
  assert.equal(applied.status, 0, applied.stderr + applied.stdout);
  assert.match(applied.stdout, /10 file\(s\) moved, counts before = after/);
  for (const f of ['he-thong/users.json', 'he-thong/invites.json', 'he-thong/mcp-tokens.json', 'games/3qdc/tin-tuc/posts/4.json', 'games/3qdc/tin-tuc/posts/5.json',
    'games/3qdc/tin-tuc/revisions/4/20260101080000000.json', 'games/3qdc/tin-tuc/uploads/2026/09/0123456789abcdef.png', 'games/3qdc/phieu-be-ngoan/phieu.json',
    'games/3qdc/phieu-be-ngoan/phieu.json.bak-1', 'games/3qdc/dang-ky-som/dang-ky.jsonl', 'he-thong/chuyen-du-lieu.json']) assert.ok(existsSync(join(root, f)), f);
  for (const d of ['news', 'phieu-be-ngoan', 'dang-ky-som']) assert.ok(!existsSync(join(root, d)), `${d} should be gone`);
  assert.deepEqual(layoutProblems(root, {}), []);
  const log = JSON.parse(readFileSync(join(root, 'he-thong', 'chuyen-du-lieu.json'), 'utf8'));
  assert.deepEqual(log.before, log.after);
  assert.equal(log.before['tin-tuc/posts'].files, 2);
  ok('migrate: apply moves every file, counts before = after, old folders gone, log written');

  assert.equal(migrate(root, '--apply', '--nhap').status, 1);
  ok('migrate: a second apply is refused while the log is there');

  const undone = migrate(root, '--undo', '--nhap');
  assert.equal(undone.status, 0, undone.stderr);
  const afterUndo = treeSum(root).split('\n').filter((l) => !l.startsWith('he-thong/chuyen-du-lieu')).join('\n');
  assert.equal(afterUndo, before.split('\n').join('\n'));
  assert.ok(existsSync(join(root, 'news', 'trash')) === false, 'empty folders are not part of the undo');
  ok('migrate: undo puts every file back (same names, same content)');
}
{
  const root = oldLayout();
  put(root, 'news/zzz-unknown.txt', 'who');
  const r = migrate(root, '--apply', '--nhap');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown entries.*zzz-unknown\.txt/);
  assert.ok(existsSync(join(root, 'news', 'posts', '4.json')) && !existsSync(join(root, 'he-thong')));
  const allowed = migrate(root, '--apply', '--nhap', '--cho-phep', 'zzz-unknown.txt');
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.ok(existsSync(join(root, 'he-thong', 'chua-phan-loai', 'zzz-unknown.txt')));
  ok('migrate: an unknown file stops the run unless it is named with --cho-phep');
}
{
  const root = oldLayout();
  put(root, 'games/3qdc/tin-tuc/posts/4.json', post(4, 'bai-bon'));
  const r = migrate(root, '--apply', '--nhap');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /both exist/);
  assert.ok(existsSync(join(root, 'news', 'posts', '5.json')));
  ok('migrate: a file present in both places stops the run before anything moves');
}
{
  // tracked articles already moved by git when the code was merged: only the rest moves, counts still match
  const root = oldLayout();
  put(root, 'games/3qdc/tin-tuc/posts/9.json', post(9, 'bai-chin'));
  rmSync(join(root, 'news', 'posts'), { recursive: true });
  const r = migrate(root, '--apply', '--nhap');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /tin-tuc\/posts\s+1 file/);
  assert.ok(existsSync(join(root, 'games', '3qdc', 'tin-tuc', 'posts', '9.json')));
  ok('migrate: files already at their new place are counted and left alone');
}

// ---------- 3. a server needs the new layout ----------
const freePort = () => new Promise((ok2) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok2(p)); }); });
const SERVER_ENV = (root, port) => ({
  ...process.env, PORT: String(port), DATA_ROOT: root, NEWS_INSECURE_COOKIE: '1', NEWS_SITE_ORIGIN: `http://127.0.0.1:${port}`,
  NEWS_ALLOWED_ORIGINS: '', PHIEU_GOOGLE_CLIENT_ID: 'x', NEWS_DATA_DIR: '', PHIEU_DATA_DIR: '', SIGNUP_DATA_DIR: '',
});
{
  const root = oldLayout();
  const r = spawnSync(process.execPath, ['server.mjs'], { cwd: ROOT, env: SERVER_ENV(root, await freePort()), encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /will not start/);
  assert.match(r.stderr, /migrate-games-data\.mjs --dry-run/);
  const r2 = spawnSync(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...SERVER_ENV(tmpDir(), await freePort()), NEWS_DATA_DIR: '/srv/x' }, encoding: 'utf8', timeout: 20000 });
  assert.equal(r2.status, 1);
  assert.match(r2.stderr, /NEWS_DATA_DIR is no longer used/);
  ok('server: refuses to start on data in the old folders, or with an old data variable (clear message, exit 1)');
}

// ---------- 4. two games side by side ----------
const root = tmpDir();
const preload = join(tmpDir(), 'preload.mjs');
writeFileSync(preload, `import { GAMES } from ${JSON.stringify(pathToFileURL(join(ROOT, 'scripts/lib/admin/games.mjs')).href)};\nGAMES.find((g) => g.id === 'skystory').modules['tin-tuc'] = {};\n`);
const { hashPassword } = await import(pathToFileURL(join(ROOT, 'scripts/lib/news/admin-auth.mjs')).href);
const now = new Date().toISOString();
const acct = async (username, name, role, grants) => ({ username, name, role, ...(grants ? { grants } : {}), ...(await hashPassword(PASSWORD)), disabled: false, createdAt: now, passwordSetAt: now });
put(root, 'he-thong/users.json', JSON.stringify([
  await acct('quan-ly', 'Quản Lý', 'owner'),
  await acct('bien-tap', 'Biên Tập', 'member', { '3qdc': { 'tin-tuc': ['viet'] }, skystory: { 'tin-tuc': ['viet'] } }),
]));
put(root, 'games/3qdc/tin-tuc/posts/1.json', post(1, 'bai-cua-3qdc'));
const OLD_PIC = '0123456789abcdef';
mkdirSync(join(root, 'games', '3qdc', 'tin-tuc', 'uploads', '2026', '09'), { recursive: true });
writeFileSync(join(root, 'games', '3qdc', 'tin-tuc', 'uploads', '2026', '09', `${OLD_PIC}.png`), PNG);

const port = await freePort();
const child = spawn(process.execPath, ['--import', pathToFileURL(preload).href, 'server.mjs'], { cwd: ROOT, env: SERVER_ENV(root, port), stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`;

function req(method, path, { host, cookie, body, raw, type } = {}) {
  return new Promise((done, fail) => {
    const data = raw || (body ? Buffer.from(JSON.stringify(body)) : null);
    const headers = { Host: host || `127.0.0.1:${port}`, ...(cookie ? { Cookie: cookie } : {}) };
    if (method === 'POST') { headers.Origin = origin; headers['Content-Type'] = type || 'application/json'; }
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
const json = (r) => JSON.parse(r.text);
const MAIN = '3qdc.wanmeivn.com';
const SIDE = '3qdaichien.wanmeivn.com';

try {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('server exited early:\n' + log);
    try { if ((await req('GET', '/tin-tuc')).status === 200) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  const signIn = async (username) => {
    const r = await req('POST', '/quan-tri/api/dang-nhap', { body: { username, password: PASSWORD } });
    assert.equal(r.status, 200, r.text);
    return r.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  };
  const boss = await signIn('quan-ly');
  const editor = await signIn('bien-tap');

  // a post of the second game (it gets id 1, like the 3qdc post: ids are per game)
  const created = await req('POST', '/quan-tri/api/g/skystory/bai', { cookie: boss, body: { action: 'dang-ngay', title: 'Bài của Skystory', slug: 'bai-cua-skystory', summary: 'Tóm tắt bài Skystory', category: 'thong-bao', cover: '/3qdc-vi/home/anh-nen-slogan-vi.webp', content: '<p>sky</p>', pinned: false, site: 'chinh' } });
  assert.equal(created.status, 200, created.text);
  assert.equal(json(created).post.id, 1);
  assert.ok(existsSync(join(root, 'games', 'skystory', 'tin-tuc', 'posts', '1.json')));
  assert.ok(!existsSync(join(root, 'games', '3qdc', 'tin-tuc', 'posts', '2.json')));
  assert.deepEqual(readdirSync(join(root, 'games', '3qdc', 'tin-tuc', 'posts')), ['1.json']);
  assert.equal(JSON.parse(readFileSync(join(root, 'games', '3qdc', 'tin-tuc', 'posts', '1.json'), 'utf8')).slug, 'bai-cua-3qdc');
  ok('a post of game B lands in data/games/B/tin-tuc, game A keeps its file with the same id');

  for (const host of [MAIN, SIDE, undefined]) {
    const list = await req('GET', '/api/tin-tuc', { host });
    assert.equal(list.status, 200);
    const slugs = json(list).map((p) => p.slug);
    assert.ok(!slugs.includes('bai-cua-skystory'), `${host}: ${slugs}`);
    if (host !== SIDE) assert.deepEqual(slugs, ['bai-cua-3qdc']);
    const page = await req('GET', '/tin-tuc', { host });
    assert.ok(!page.text.includes('bai-cua-skystory') && !page.text.includes('Bài của Skystory'));
    assert.equal((await req('GET', '/tin-tuc/bai-cua-skystory', { host })).status, 404);
  }
  assert.equal((await req('GET', '/tin-tuc/bai-cua-3qdc', { host: MAIN })).status, 200);
  assert.equal((await req('GET', '/tin-tuc/bai-cua-3qdc', { host: SIDE })).status, 404); // a main-site post is not on the side site, as before
  ok('/tin-tuc and /api/tin-tuc (Host 3qdc, 3qdaichien, unknown) never show the other game\'s post');

  const bossList = json(await req('GET', '/quan-tri/api/g/3qdc/bai', { cookie: boss })).items.map((p) => p.slug);
  const skyList = json(await req('GET', '/quan-tri/api/g/skystory/bai', { cookie: boss })).items.map((p) => p.slug);
  assert.deepEqual(bossList, ['bai-cua-3qdc']);
  assert.deepEqual(skyList, ['bai-cua-skystory']);
  assert.deepEqual(json(await req('GET', '/quan-tri/api/bai', { cookie: boss })).items.map((p) => p.slug), ['bai-cua-3qdc']);
  ok('the editor lists are per game (the old address without a game is 3qdc)');

  // edit locks: same post id in two games, separate locks
  await req('POST', '/quan-tri/api/g/skystory/bai/1/khoa', { cookie: boss, body: { release: true } }); // saving the post took a hold
  assert.equal(json(await req('POST', '/quan-tri/api/g/3qdc/bai/1/khoa', { cookie: boss, body: {} })).lockedBy, '');
  assert.equal(json(await req('POST', '/quan-tri/api/g/skystory/bai/1/khoa', { cookie: editor, body: {} })).lockedBy, '');
  assert.equal(json(await req('POST', '/quan-tri/api/g/3qdc/bai/1/khoa', { cookie: editor, body: {} })).lockedBy, 'Quản Lý');
  assert.equal(json(await req('POST', '/quan-tri/api/g/skystory/bai/1/khoa', { cookie: boss, body: {} })).lockedBy, 'Biên Tập');
  ok('post id 1 of two games: edit locks do not mix');

  // pictures
  const old = await req('GET', `/tin-tuc-anh/2026/09/${OLD_PIC}.png`);
  assert.equal(old.status, 200);
  assert.equal(old.headers['content-type'], 'image/png');
  const up3 = await req('POST', '/quan-tri/api/anh', { cookie: boss, raw: PNG, type: 'image/png' });
  assert.equal(up3.status, 201, up3.text);
  assert.match(json(up3).url, /^\/tin-tuc-anh\/\d{4}\/\d{2}\/[a-f0-9]{16}\.png$/);
  const upSky = await req('POST', '/quan-tri/api/g/skystory/anh', { cookie: boss, raw: PNG, type: 'image/png' });
  assert.equal(upSky.status, 201, upSky.text);
  const skyUrl = json(upSky).url;
  assert.match(skyUrl, /^\/tin-tuc-anh\/skystory\/\d{4}\/\d{2}\/[a-f0-9]{16}\.png$/);
  assert.ok(existsSync(join(root, 'games', 'skystory', 'tin-tuc', 'uploads', ...skyUrl.split('/').slice(3))));
  assert.equal((await req('GET', skyUrl)).status, 200);
  assert.equal((await req('GET', json(up3).url)).status, 200);
  assert.ok(json(await req('GET', '/quan-tri/api/g/skystory/anh', { cookie: boss })).items.every((i) => i.url.startsWith('/tin-tuc-anh/skystory/')));
  assert.ok(json(await req('GET', '/quan-tri/api/anh', { cookie: boss })).items.every((i) => !i.url.startsWith('/tin-tuc-anh/skystory/')));
  ok('pictures: old addresses still open; other games upload and open under /tin-tuc-anh/<game>/');

  const bad = ['/tin-tuc-anh/skystory/2026/09/' + OLD_PIC + '.png', // that picture belongs to 3qdc
    `/tin-tuc-anh/3qdc/2026/09/${OLD_PIC}.png`, `/tin-tuc-anh/khong-co/2026/09/${OLD_PIC}.png`, `/tin-tuc-anh/2026/2026/09/${OLD_PIC}.png`,
    `/tin-tuc-anh/%2e%2e/he-thong/users.json`, `/tin-tuc-anh/skystory/../../he-thong/users.json`, `/tin-tuc-anh/skystory/2026/09/../../../../he-thong/users.json`,
    `/tin-tuc-anh/2026/09/${OLD_PIC}.svg`, `/tin-tuc-anh/..%2fhe-thong%2fusers.json`];
  for (const p of bad) assert.equal((await req('GET', p)).status, 404, p);
  ok('pictures: wrong game, unknown game, ../ and odd names are 404');

  // preview
  assert.equal((await req('GET', '/quan-tri/xem-truoc/1', { cookie: boss })).status, 200);
  const prevSky = await req('GET', '/quan-tri/xem-truoc/1?game=skystory', { cookie: boss });
  assert.equal(prevSky.status, 200);
  assert.ok(prevSky.text.includes('Bài của Skystory') && !prevSky.text.includes('Bài bai-cua-3qdc'));
  assert.ok((await req('GET', '/quan-tri/xem-truoc/1', { cookie: boss })).text.includes('Bài bai-cua-3qdc'));
  assert.equal((await req('GET', '/quan-tri/xem-truoc/1?game=khong-co', { cookie: boss })).status, 404);
  assert.equal((await req('GET', '/quan-tri/xem-truoc/2?game=skystory', { cookie: boss })).status, 404);
  assert.equal((await req('GET', '/quan-tri/xem-truoc/1?game=skystory')).status, 302);
  ok('preview: ?game picks the game (default 3qdc), unknown game or id is 404, signed out is redirected');

  // data kept where it should be
  assert.ok(existsSync(join(root, 'he-thong', 'users.json')) && !existsSync(join(root, 'news')));
  ok('no old folder is recreated');
} finally {
  child.kill();
  for (const d of tmp) rmSync(d, { recursive: true, force: true });
}
console.log(`${n} checks passed`);
