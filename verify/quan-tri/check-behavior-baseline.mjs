// check-behavior-baseline.mjs — pins down what visitors and editors can see today, so every later change can be compared.
//
//   node verify/quan-tri/check-behavior-baseline.mjs --save                 write baseline/*.json from this server
//   node verify/quan-tri/check-behavior-baseline.mjs --compare              request the same things again and diff
//   options  --port 13399          the draft server (default 13399)
//            --host-ip 127.0.0.1   where to connect (the Host header is set per request)
//            --data-dir <dir>      data/news folder of this server, for the Claude-code record check
//                                  (default: NEWS_DATA_DIR, else ./data/news)
//            --live                public GET pages only, nothing written, nothing signed in; for the live server
//                                  (--port 3399). Skips entries that need the draft's test fixtures.
//            --skip-ui             do not compare the bodies of the editor pages (/quan-tri HTML), only their status
//            --dir <folder>        where the baseline lives (default verify/quan-tri/baseline next to this file)
//
// What it covers (see the group names in the baseline): public pages and API, the side site (Host 3qdaichien…),
// the ticket host (Host phieubengoan…), /mcp, the /quan-tri pages, and the /quan-tri/api role × path matrix
// (anonymous, manager, editor, ticket role). The POST requests only probe the permission layer (ids that do not exist,
// bodies that are refused), so nothing is written. Signed-in and POST requests run only against a draft server that has
// the fixtures of make-test-accounts.mjs; they are refused on port 3399.
// Bodies are hashed after the parts that change on every request are replaced (script nonces, the server's own address,
// the Google client id, the time a Claude code was last used, the time stamp in a download name). Personal data is never stored: only hashes,
// lengths, key names and counts.
import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_ACCOUNTS, TEST_PASSWORD, TEST_MCP_CODE, TEST_MCP_LABEL, SIDE_POST, TRASH_FILE } from './make-test-accounts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const SAVE = flag('--save');
const COMPARE = flag('--compare');
const LIVE = flag('--live');
const SKIP_UI = flag('--skip-ui');
const PORT = Number(opt('--port', '13399'));
const HOST_IP = opt('--host-ip', '127.0.0.1');
const DIR = opt('--dir', join(HERE, 'baseline'));
const DATA_DIR = opt('--data-dir', process.env.NEWS_DATA_DIR || join(process.cwd(), 'data', 'news'));

if (SAVE === COMPARE) { console.error('use exactly one of --save / --compare'); process.exit(2); }
if (LIVE && SAVE) { console.error('--live only compares'); process.exit(2); }
if (PORT === 3399 && !LIVE) { console.error('port 3399 is the live server: use --live (public GET pages only)'); process.exit(2); }

const MAIN = '3qdc.wanmeivn.com';
const SIDE = '3qdaichien.wanmeivn.com';
const TICKET = 'phieubengoan.3qdc.wanmeivn.com';
const ORIGIN = `http://127.0.0.1:${PORT}`; // the draft server's own address = its allowed Origin for POST
const sha = (b) => createHash('sha256').update(b).digest('hex');

// ---------- HTTP ----------
function request({ host, method = 'GET', path, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    const req = http.request({ host: HOST_IP, port: PORT, method, path, headers: { Host: host, ...headers, ...(data ? { 'Content-Length': data.length } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(30000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ---------- normalising ----------
const TEXTUAL = /^(text\/|application\/(json|javascript|xml))/i;
function normalise(buf, ct) {
  if (!TEXTUAL.test(ct || '')) return buf;
  return Buffer.from(buf.toString('utf8')
    .replace(/nonce="[^"]*"/g, 'nonce="N"')
    .replace(/nonce-[A-Za-z0-9+/=_-]+/g, 'nonce-N')
    .replace(/http:\/\/127\.0\.0\.1:\d+/g, 'https://3qdc.wanmeivn.com')
    .replace(/http%3A%2F%2F127\.0\.0\.1%3A\d+/g, 'https%3A%2F%2F3qdc.wanmeivn.com')
    .replace(/"host":"127\.0\.0\.1:\d+"/g, '"host":"3qdc.wanmeivn.com"')
    .replace(/"lastUsedAt":"[^"]*"/g, '"lastUsedAt":"T"')
    .replace(/"clientId":"[^"]*"/g, '"clientId":"ID"'), 'utf8'); // the draft has a placeholder Google client id
}
const normHeader = (v) => String(v ?? '').replace(/nonce-[A-Za-z0-9+/=_-]+/g, 'nonce-N').replace(/\d{8}-\d{4}/g, 'STAMP');

// what is kept of a JSON body besides its hash: the shape, never the values
function shapeOf(v, depth = 0) {
  if (Array.isArray(v)) return `[${v.length}]` + (v.length && depth < 1 && v[0] && typeof v[0] === 'object' ? shapeOf(v[0], depth + 1) : '');
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => (depth < 1 && v[k] && typeof v[k] === 'object' ? `${k}:${shapeOf(v[k], depth + 1)}` : k)).join(',') + '}';
  return typeof v;
}

async function observe(spec, res) {
  const ct = String(res.headers['content-type'] || '');
  const norm = normalise(res.body, ct);
  const o = { status: res.status };
  for (const [k, h] of [['ct', 'content-type'], ['cache', 'cache-control'], ['location', 'location'], ['allow', 'allow'], ['www', 'www-authenticate'], ['disp', 'content-disposition'], ['robots', 'x-robots-tag'], ['csp', 'content-security-policy']]) {
    if (res.headers[h] !== undefined) o[k] = normHeader(res.headers[h]);
  }
  if (res.headers['set-cookie']) o.setsCookie = true;
  if (spec.ui) o.ui = true;
  if (!spec.loose) { o.len = norm.length; o.sha = sha(norm); }
  if (!spec.loose && /json/i.test(ct)) {
    try {
      const j = JSON.parse(res.body.toString('utf8'));
      o.shape = shapeOf(j);
      if (j && j.result && Array.isArray(j.result.tools)) o.tools = j.result.tools.map((t) => t.name);
      if (j && j.result && j.result.serverInfo) o.server = j.result.serverInfo.name;
      if (j && j.result && j.result.isError !== undefined) o.isError = !!j.result.isError;
    } catch { o.shape = 'unparsable'; }
  }
  if (spec.checkEmail) o.hasEmail = /"email"/.test(res.body.toString('utf8'));
  return o;
}

// ---------- accounts ----------
const cookies = {}; // role → "name=value"
async function signInAll() {
  for (const a of TEST_ACCOUNTS) {
    const r = await request({ host: MAIN, method: 'POST', path: '/quan-tri/api/dang-nhap', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: { username: a.username, password: TEST_PASSWORD } });
    const c = [].concat(r.headers['set-cookie'] || [])[0];
    if (r.status !== 200 || !c) throw new Error(`test account ${a.username} could not sign in (status ${r.status}); run make-test-accounts.mjs and restart the draft server`);
    cookies[a.role] = c.split(';')[0];
  }
}

// ---------- the list of things to ask ----------
const ROLES = ['anon', 'manager', 'editor', 'phieu'];
const JSON_H = { 'Content-Type': 'application/json' };

function buildPlan(d) {
  const E = [];
  const add = (group, name, spec) => E.push({ group, name, host: MAIN, method: 'GET', ...spec });
  const fixture = { fixture: true };

  // --- public, main site (Host 3qdc) ---
  const pub = (name, path, extra = {}) => add('public', name, { path, live: true, ...extra });
  pub('home', '/');
  pub('news-list', '/tin-tuc');
  for (const m of ['thong-bao', 'su-kien', 'cam-nang']) pub(`news-list-${m}`, `/tin-tuc?muc=${m}`);
  pub('news-404', '/tin-tuc/khong-co');
  pub('news-bad-slug', '/tin-tuc/Khong_Hop-Le');
  pub('api-news-all', '/api/tin-tuc?limit=50');
  for (const m of ['thong-bao', 'su-kien', 'cam-nang']) pub(`api-news-${m}`, `/api/tin-tuc?muc=${m}&limit=50`);
  pub('api-news-default', '/api/tin-tuc');
  for (const s of d.visibleSlugs) pub(`article-${s}`, `/tin-tuc/${s}`);
  for (const s of d.hiddenSlugs) pub(`article-hidden-${s}`, `/tin-tuc/${s}`);
  for (const u of d.images) pub(`image-${u}`, u, { loose: false });
  pub('signup-page', '/dang-ky-som');
  pub('signup-api', '/api/dang-ky-som');
  pub('privacy', '/privacy');
  pub('music-list', '/3qdc-vi/api/nhac');
  pub('logo', '/3qdc-vi/home/logo-3qdc.webp');
  pub('main-redirect-home', '/home');
  // the side-site article is invisible on the main site
  add('public', 'article-side-on-main', { path: `/tin-tuc/${SIDE_POST.slug}`, live: false, ...fixture });

  // --- side site (Host 3qdaichien) ---
  const side = (name, path, extra = {}) => add('side-site', name, { host: SIDE, path, live: true, ...extra });
  side('api-news', '/api/tin-tuc', fixture);
  side('api-news-all', '/api/tin-tuc?limit=50', fixture);
  side('news-list', '/tin-tuc', fixture);
  side('article-side', `/tin-tuc/${SIDE_POST.slug}`, fixture);
  if (d.visibleSlugs[0]) side('article-main-on-side', `/tin-tuc/${d.visibleSlugs[0]}`, fixture);

  // --- ticket host (Host phieubengoan) ---
  const tk = (name, path, extra = {}) => add('ticket-host', name, { host: TICKET, path, live: true, ...extra });
  tk('page', '/');
  tk('me-anonymous', '/api/phieu/toi');
  tk('logo', '/3qdc-vi/home/logo-3qdc.webp');
  for (const p of ['/tin-tuc', '/quan-tri', '/quan-tri/api/toi', '/dang-ky-som', '/mcp', '/api/tin-tuc', '/api/phieu/khong-co', '/robots.txt']) tk(`other${p.replace(/\W+/g, '-')}`, p);

  // --- /mcp ---
  const rpc = (id, method, params) => ({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) });
  const mcp = (name, headers, body, extra = {}) => add('mcp', name, { method: 'POST', path: '/mcp', headers: { 'Content-Type': 'application/json', ...headers }, body, draftOnly: true, ...extra });
  const bearer = { Authorization: `Bearer ${TEST_MCP_CODE}` };
  mcp('no-code', {}, rpc(1, 'initialize', {}));
  mcp('wrong-code', { Authorization: 'Bearer 3qp_codesai' }, rpc(1, 'initialize', {}));
  mcp('initialize', bearer, rpc(1, 'initialize', { protocolVersion: '2025-06-18' }), fixture);
  mcp('tools-list', bearer, rpc(2, 'tools/list'), fixture);
  mcp('ping', bearer, rpc(3, 'ping'), fixture);
  mcp('xem-phieu', bearer, rpc(4, 'tools/call', { name: 'xem_phieu', arguments: { ngay: 'tat-ca', trang_thai: 'tat-ca' } }), { ...fixture, checkEmail: true });
  mcp('xem-phieu-cho', bearer, rpc(5, 'tools/call', { name: 'xem_phieu', arguments: { ngay: 'tat-ca', trang_thai: 'cho' } }), { ...fixture, checkEmail: true });
  mcp('tra-qua-bad-id', bearer, rpc(6, 'tools/call', { name: 'tra_qua', arguments: { id: 'zzzzzz9' } }), fixture);
  mcp('tu-choi-no-reason', bearer, rpc(7, 'tools/call', { name: 'tu_choi', arguments: { id: 'zzzzzz9' } }), fixture);
  mcp('unknown-tool', bearer, rpc(8, 'tools/call', { name: 'khong_co', arguments: {} }), fixture);
  mcp('unknown-method', bearer, rpc(9, 'khong/co'), fixture);
  add('mcp', 'get-not-allowed', { path: '/mcp', draftOnly: true, live: false, headers: bearer, ...fixture });
  add('mcp', 'get-no-code', { path: '/mcp', draftOnly: true, live: false });

  // --- /quan-tri pages ---
  const page = (name, path, extra = {}) => add('admin-pages', name, { path, ui: true, live: !extra.role, ...extra });
  page('app', '/quan-tri'); page('register', '/quan-tri/dang-ky'); page('set-password', '/quan-tri/dat-mat-khau'); page('invite', '/quan-tri/moi');
  page('preview-anon', `/quan-tri/xem-truoc/${d.postId}`);
  page('unknown', '/quan-tri/khong-co');
  page('unknown-deep', '/quan-tri/api-khong-co/x');
  add('admin-pages', 'post-not-allowed', { method: 'POST', path: '/quan-tri', draftOnly: true, headers: { Origin: ORIGIN }, ui: true });
  for (const r of ['manager', 'editor', 'phieu']) {
    page(`preview-${r}`, `/quan-tri/xem-truoc/${d.postId}`, { role: r, draftOnly: true, ui: false, loose: false });
    page(`preview-missing-${r}`, '/quan-tri/xem-truoc/999999', { role: r, draftOnly: true });
  }

  // --- /quan-tri/api matrix ---
  const api = '/quan-tri/api';
  const gets = ['/toi', '/bai', `/bai/${d.postId}`, `/bai/${d.postId}/lich-su/${d.rev}`, '/bai/999999', '/anh', '/nhac', '/dang-ky-som', '/dang-ky-som?q=0', '/dang-ky-som/csv',
    '/phieu-be-ngoan?ngay=tat-ca', '/phieu-be-ngoan?ngay=tat-ca&st=cho', '/phieu-be-ngoan', '/phieu-be-ngoan/csv?ngay=tat-ca', '/thung-rac', '/nguoi-dung', '/khong-co'];
  for (const r of ROLES) {
    for (const g of gets) {
      add('admin-api-get', `${r} GET ${g}`, { path: api + g, role: r, draftOnly: true, checkEmail: g.startsWith('/phieu-be-ngoan') && !g.includes('csv'), loose: g === '/phieu-be-ngoan', ...(r === 'anon' ? {} : fixture) });
    }
  }
  const empty = {};
  const posts = [
    ['/bai/999999', empty], ['/bai/999999/xoa', { baseUpdatedAt: 'x' }], ['/bai/999999/khoa', empty], ['/nhac/x/xoa', empty], ['/dang-ky-som/xoa', { sdt: '' }], ['/dang-ky-som/moc', empty],
    ['/phieu-be-ngoan/zzzzzz9', { st: 'tra' }], ['/phieu-be-ngoan/zzzzzz9', { st: 'sai' }], ['/phieu-be-ngoan/zzzzzz9/xoa', empty],
    ['/loi-moi', empty], ['/loi-moi/ffffffffffff/huy', empty], ['/ma-claude', empty], ['/ma-claude/ffffffffffff/thu-hoi', empty], ['/nguoi-dung/khong-co', empty], ['/nguoi-dung/khong-co', { action: 'khoa' }],
    ['/thung-rac/khong-co.json/khoi-phuc', empty], ['/khong-co', empty],
  ];
  const trashAll = ['/thung-rac/don-sach', empty]; // only for roles that must be refused (it would empty the trash for a manager)
  for (const r of ROLES) {
    for (const [p, b] of posts) add('admin-api-post', `${r} POST ${p} ${JSON.stringify(b)}`, { method: 'POST', path: api + p, role: r, headers: { Origin: ORIGIN, ...JSON_H }, body: b, draftOnly: true, ...(r === 'anon' ? {} : fixture) });
  }
  for (const r of ['anon', 'editor', 'phieu']) add('admin-api-post', `${r} POST ${trashAll[0]}`, { method: 'POST', path: api + trashAll[0], role: r, headers: { Origin: ORIGIN, ...JSON_H }, body: trashAll[1], draftOnly: true, ...(r === 'anon' ? {} : fixture) });
  // origin and content-type checks
  for (const r of ['anon', 'manager', 'phieu']) {
    add('admin-api-post', `${r} POST no-origin /bai/999999`, { method: 'POST', path: `${api}/bai/999999`, role: r, headers: JSON_H, body: empty, draftOnly: true, ...(r === 'anon' ? {} : fixture) });
    add('admin-api-post', `${r} POST foreign-origin /bai/999999`, { method: 'POST', path: `${api}/bai/999999`, role: r, headers: { Origin: 'https://example.org', ...JSON_H }, body: empty, draftOnly: true, ...(r === 'anon' ? {} : fixture) });
    add('admin-api-post', `${r} POST not-json /bai/999999`, { method: 'POST', path: `${api}/bai/999999`, role: r, headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' }, body: 'x', draftOnly: true, ...(r === 'anon' ? {} : fixture) });
  }
  add('admin-api-post', 'anon POST sign-in wrong password', { method: 'POST', path: `${api}/dang-nhap`, headers: { Origin: ORIGIN, ...JSON_H }, body: { username: 'thu-khong-co-' + Math.random().toString(36).slice(2, 8), password: 'sai-mat-khau-0000' }, draftOnly: true });
  add('admin-api-post', 'anon PUT /toi', { method: 'PUT', path: `${api}/toi`, headers: { Origin: ORIGIN }, draftOnly: true });
  return E;
}

// ---------- discovery (only when saving) ----------
async function discover() {
  await signInAll();
  const get = (host, path, role = 'manager') => request({ host, path, headers: role ? { Cookie: cookies[role] } : {} });
  const jget = async (host, path, role) => JSON.parse((await get(host, path, role)).body.toString('utf8'));
  const all = (await jget(MAIN, '/quan-tri/api/bai')).items;
  const visibleSlugs = [];
  const hiddenSlugs = [];
  for (const p of all) {
    if (p.id === SIDE_POST.id) continue;
    const r = await get(MAIN, `/tin-tuc/${p.slug}`, null);
    (r.status === 200 ? visibleSlugs : hiddenSlugs).push(p.slug);
  }
  // pictures: the covers and every <img src> of the visible articles, plus the pictures of the side-site article
  const images = new Set();
  const grab = (html) => { for (const m of html.matchAll(/(?:src|href)="(\/(?:tin-tuc-anh|3qdc-vi)\/[^"?#]+\.(?:webp|png|jpe?g|gif|svg|mp3))"/gi)) images.add(m[1]); };
  for (const s of visibleSlugs) grab((await get(MAIN, `/tin-tuc/${s}`, null)).body.toString('utf8'));
  for (const p of all) if (p.cover && p.cover.startsWith('/') && visibleSlugs.includes(p.slug)) images.add(p.cover);
  for (const path of ['/tin-tuc', '/']) grab((await get(MAIN, path, null)).body.toString('utf8'));
  // one article that has saved versions, for the article and history paths
  let pick = null;
  for (const id of all.filter((x) => x.id < 9000).map((x) => x.id).sort((x, y) => x - y)) {
    const j = await jget(MAIN, `/quan-tri/api/bai/${id}`);
    if (j.history && j.history.length) { pick = { id, rev: j.history[0].rev }; break; }
  }
  if (!pick) throw new Error('no article with saved versions to pin');
  return { visibleSlugs: visibleSlugs.sort(), hiddenSlugs: hiddenSlugs.sort(), images: [...images].sort(), postId: pick.id, rev: pick.rev, counts: { articles: all.length, visible: visibleSlugs.length, hidden: hiddenSlugs.length, images: images.size } };
}

// ---------- the Claude-code record (hash only; nothing secret is read out) ----------
async function codeRecord() {
  const read = async (f) => { try { return JSON.parse(await readFile(join(DATA_DIR, f), 'utf8')); } catch { return null; } };
  const users = (await read('users.json')) || [];
  const codes = (await read('mcp-tokens.json')) || [];
  const real = codes.filter((c) => !c.revoked && c.label !== TEST_MCP_LABEL);
  const roles = real.map((c) => (users.find((u) => u.username === c.username) || { role: 'missing' }).role).sort();
  return {
    liveRealCodes: real.length,
    liveRealCodeRoles: roles,
    allHaveSha256: real.every((c) => /^[a-f0-9]{64}$/.test(String(c.hash || ''))),
    accountsActiveForCodes: real.every((c) => { const u = users.find((x) => x.username === c.username); return !!(u && !u.disabled && u.hash); }),
    userRoles: users.filter((u) => !u.testFixture).map((u) => u.role).sort(),
    openInvites: ((await read('invites.json')) || []).filter((i) => !i.usedBy && !i.revoked && i.exp > Date.now()).length,
  };
}

// ---------- run ----------
async function runEntry(e) {
  const headers = { ...(e.headers || {}) };
  if (e.role && e.role !== 'anon') headers.Cookie = cookies[e.role];
  const res = await request({ host: e.host, method: e.method, path: e.path, headers, body: e.body });
  return observe(e, res);
}

const fileOf = (group) => join(DIR, `${group}.json`);

async function main() {
  if (!LIVE) await signInAll().catch((e) => { throw e; });
  let disc;
  if (SAVE) {
    disc = await discover();
    await mkdir(DIR, { recursive: true });
    await writeFile(join(DIR, '_discovery.json'), JSON.stringify(disc, null, 2));
  } else {
    disc = JSON.parse(await readFile(join(DIR, '_discovery.json'), 'utf8'));
  }
  let plan = buildPlan(disc);
  if (LIVE) plan = plan.filter((e) => e.live && !e.fixture && !e.draftOnly);

  const groups = {};
  let failures = 0;
  const report = [];
  for (const e of plan) {
    let got;
    try { got = await runEntry(e); } catch (err) { got = { error: String(err.message || err) }; }
    (groups[e.group] ||= {})[e.name] = got;
  }
  if (!LIVE) groups['claude-code-record'] = { record: await codeRecord() };

  if (SAVE) {
    for (const [g, entries] of Object.entries(groups)) await writeFile(fileOf(g), JSON.stringify(entries, null, 1) + '\n');
    const errors = Object.values(groups).flatMap((g) => Object.entries(g).filter(([, v]) => v.error)).length;
    console.log(`saved ${Object.values(groups).reduce((n, g) => n + Object.keys(g).length, 0)} entries in ${Object.keys(groups).length} groups -> ${DIR}`);
    for (const [g, entries] of Object.entries(groups)) console.log(`  ${g}: ${Object.keys(entries).length}`);
    console.log('discovered:', JSON.stringify(disc.counts), 'post', disc.postId, 'rev', disc.rev);
    if (errors) { console.log(`${errors} request(s) failed to complete`); process.exitCode = 1; }
    return;
  }

  // compare
  let checked = 0;
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  for (const f of files) {
    const g = f.slice(0, -5);
    const want = JSON.parse(await readFile(join(DIR, f), 'utf8'));
    const have = groups[g] || {};
    for (const [name, w] of Object.entries(want)) {
      if (!(name in have)) { if (LIVE) continue; failures++; report.push(`MISSING [${g}] ${name}`); continue; }
      checked++;
      const h = have[name];
      const keys = new Set([...Object.keys(w), ...Object.keys(h)]);
      const diffs = [];
      for (const k of keys) {
        if (SKIP_UI && w.ui && (k === 'sha' || k === 'len')) continue;
        if (JSON.stringify(w[k]) !== JSON.stringify(h[k])) diffs.push(`${k}: ${JSON.stringify(w[k])} -> ${JSON.stringify(h[k])}`);
      }
      if (diffs.length) { failures++; report.push(`DIFF [${g}] ${name}\n    ${diffs.join('\n    ')}`); }
    }
  }
  if (failures) {
    console.log(report.slice(0, 60).join('\n'));
    if (report.length > 60) console.log(`... and ${report.length - 60} more`);
    if (Object.values(groups).some((g) => Object.values(g).some((v) => v.status === 429))) {
      console.log('\nA 429 answer means a request limit was reached (each run sends 2 refused Claude codes; 30 per 15 minutes are allowed): restart the draft server and run again.');
    }
    console.log(`\n${failures} of ${checked} checks FAILED`);
    process.exitCode = 1;
  } else {
    console.log(`${checked} entries compared${LIVE ? ' (public pages of the live server, GET only)' : ''}`);
    console.log('ALL CHECKS PASSED');
  }
}

main().catch((e) => { console.error('check-behavior-baseline: ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; });
