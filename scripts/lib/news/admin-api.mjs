// admin-api.mjs — JSON answers under /quan-tri/api/ for the editor pages.
// Every change (POST) must: come from the site's own page (Origin), be JSON, be at most 1 MB, and — apart from signing
// in and setting a password — belong to a signed-in account allowed to make it (news-workflow.mjs decides).
import { signIn, endSession, setPassword, currentUser, sameOrigin, sessionCookie, clearedCookie, clientIp } from './admin-auth.mjs';
import { change, allPosts, listRevisions, readRevision, stampAfter, isVisible, listTrash, TRASH_NAME_RE } from './news-store.mjs';
import { saveUpload, recentUploads } from './news-uploads.mjs';
import { listSongs, saveSong, removeSong, SONG_MAX, FOLDER_MAX } from '../home/music-store.mjs';
import { decide, mayDelete, summaryOf } from './news-workflow.mjs';
import { register, listUsers, manageUser } from './admin-users.mjs';
import { USERNAME_RE } from './admin-auth.mjs';
import { siteNow, siteNowSeconds } from './news-files.mjs';

const BODY_MAX = 1_000_000;
const LOCK_MS = 90e3;
const locks = new Map(); // article id → { username, name, until }

function send(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow', ...headers,
  });
  res.end(JSON.stringify(data));
}
const oops = (res, status, error, headers) => send(res, status, { error }, headers);

// Reads a JSON body of at most BODY_MAX bytes; anything larger is refused without reading it (see refuseTooBig).
function readBody(req) {
  if (Number(req.headers['content-length']) > BODY_MAX) return Promise.resolve({ tooBig: true });
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on('data', (c) => {
      size += c.length;
      if (size > BODY_MAX) { chunks.length = 0; finish({ tooBig: true }); return; }
      chunks.push(c);
    });
    req.on('end', () => finish({ text: Buffer.concat(chunks).toString('utf8') }));
    req.on('error', () => finish({ tooBig: true }));
  });
}

// Answers 413 and closes the connection, so the rest of an oversized upload is never read.
function refuseTooBig(req, res) {
  res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'close' });
  res.end(JSON.stringify({ error: 'Dữ liệu gửi lên quá lớn.' }), () => req.destroy());
}

// Answers and closes the connection (used when an upload body may still be arriving).
function sendAndClose(req, res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Connection: 'close' });
  res.end(JSON.stringify(data), () => req.destroy());
}

async function uploadPicture(req, res) {
  const user = await currentUser(req);
  if (!user) return sendAndClose(req, res, 401, { error: 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.' });
  const r = await saveUpload(req);
  if (r.error) return sendAndClose(req, res, r.status, { error: r.error });
  console.log(`[news] ${siteNow()} ${user.username} uploaded ${r.url} (${r.bytes} bytes)`);
  return send(res, 201, { url: r.url, bytes: r.bytes });
}

// One song of the home page's player. The file name (with its Vietnamese text) travels in a header because the body is
// the sound itself; the store cleans it and keeps names unique.
async function uploadSong(req, res) {
  const user = await currentUser(req);
  if (!user) return sendAndClose(req, res, 401, { error: 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.' });
  if (user.role !== 'manager') return sendAndClose(req, res, 403, { error: 'Chỉ Quản lý mới thêm được nhạc nền.' });
  let raw = '';
  try { raw = decodeURIComponent(String(req.headers['x-ten-file'] || '')); } catch { raw = ''; }
  const r = await saveSong(req, raw);
  if (r.error) return sendAndClose(req, res, r.status, { error: r.error });
  console.log(`[news] ${siteNow()} ${user.username} uploaded song ${r.name} (${r.bytes} bytes)`);
  return send(res, 201, { name: r.name, bytes: r.bytes, items: await listSongs() });
}

// Someone else's current hold on an article, or null.
function otherLock(id, user) {
  const l = locks.get(id);
  if (!l || l.until < Date.now()) { if (l) locks.delete(id); return null; }
  return l.username === user.username ? null : { name: l.name };
}

// path = everything after /quan-tri/api. Unexpected failures are logged and answered with a plain 500 (no file paths).
export async function handleAdminApi(req, res, path) {
  try {
    await route(req, res, path);
  } catch (e) {
    console.error('[news] admin API error', path, e && e.stack ? e.stack : e);
    if (!res.headersSent) oops(res, 500, 'Máy chủ gặp lỗi khi xử lý. Thử lại sau ít phút; nếu vẫn lỗi, báo người quản trị máy chủ.');
    else res.destroy();
  }
}

async function route(req, res, path) {
  const method = req.method;
  if (method !== 'GET' && method !== 'POST') return oops(res, 405, 'Phương thức không hỗ trợ.', { Allow: 'GET, POST' });

  let body = {};
  if (method === 'POST') {
    if (!sameOrigin(req)) {
      console.warn(`[news-auth] ${siteNow()} refused POST ${path} origin=${JSON.stringify(req.headers.origin || '')} ip=${clientIp(req)}`);
      return oops(res, 403, 'Yêu cầu không đến từ trang quản trị.');
    }
    // a picture upload: raw image body, so the session is checked before a single byte is read
    if (path === '/anh') return uploadPicture(req, res);
    // a song upload: same, raw audio body (the file name comes in a header, the body is the sound)
    if (path === '/nhac') return uploadSong(req, res);
    if (!/^application\/json(\s*;|$)/i.test(String(req.headers['content-type'] || ''))) return oops(res, 415, 'Chỉ nhận dữ liệu JSON.');
    const got = await readBody(req);
    if (got.tooBig) return refuseTooBig(req, res);
    try {
      body = got.text ? JSON.parse(got.text) : {};
    } catch {
      return oops(res, 400, 'Dữ liệu gửi lên không đọc được.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return oops(res, 400, 'Dữ liệu gửi lên không đọc được.');
  }

  // ----- no account needed -----
  if (method === 'POST' && path === '/dang-nhap') {
    const r = await signIn(req, body.username, body.password);
    if (r.error) return oops(res, r.status, r.error);
    return send(res, 200, { user: r.user }, { 'Set-Cookie': sessionCookie(r.token) });
  }
  if (method === 'POST' && path === '/dat-mat-khau') {
    const r = await setPassword(body.token, body.password);
    if (r.error) return oops(res, r.status, r.error);
    return send(res, 200, { user: r.user });
  }
  if (method === 'POST' && path === '/dang-ky') {
    const r = await register(req, body);
    if (r.error) return oops(res, r.status, r.error);
    return send(res, 201, { user: r.user });
  }
  if (method === 'POST' && path === '/dang-xuat') {
    endSession(req);
    return send(res, 200, { ok: true }, { 'Set-Cookie': clearedCookie() });
  }

  // ----- signed in -----
  // the lock heartbeat alone must not keep a session alive
  const user = await currentUser(req, { touch: !path.endsWith('/khoa') });
  if (!user) return oops(res, 401, 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.');

  if (method === 'GET' && path === '/toi') return send(res, 200, { user: { username: user.username, name: user.name, role: user.role } });

  // pictures uploaded recently (both roles: editors write articles with pictures too)
  if (method === 'GET' && path === '/anh') return send(res, 200, { items: await recentUploads(40) });

  // background music of the home page (managers only): the songs are plain files in overrides/home/nhac, so the list is
  // the folder itself and a change is live at once (the player reads the same folder)
  if (path === '/nhac' || path.startsWith('/nhac/')) {
    if (user.role !== 'manager') return oops(res, 403, 'Chỉ Quản lý mới quản lý nhạc nền.');
    if (method === 'GET' && path === '/nhac') return send(res, 200, { items: await listSongs(), max: SONG_MAX, total: FOLDER_MAX });
    const nm = path.match(/^\/nhac\/([^/]+)\/xoa$/);
    if (method === 'POST' && nm) {
      const r = await removeSong(decodeURIComponent(nm[1]));
      if (r.error) return oops(res, r.status, r.error);
      console.log(`[news] ${siteNow()} ${user.username} deleted song ${decodeURIComponent(nm[1])}`);
      return send(res, 200, { items: await listSongs() });
    }
    return oops(res, 404, 'Không có địa chỉ này.');
  }

  // trash (managers only): list deleted articles, bring one back as a draft
  if (path === '/thung-rac' || path.startsWith('/thung-rac/')) {
    if (user.role !== 'manager') return oops(res, 403, 'Chỉ Quản lý mới xem được thùng rác.');
    if (method === 'GET' && path === '/thung-rac') return send(res, 200, { items: await listTrash() });
    const tm = path.match(/^\/thung-rac\/([^/]+)\/khoi-phuc$/);
    if (method === 'POST' && tm && TRASH_NAME_RE.test(tm[1])) {
      const r = await change(({ restore }) => restore(tm[1], user.name, stampAfter(null)));
      if (r.error) return oops(res, r.status, r.error);
      console.log(`[news] ${siteNow()} ${user.username} restored article ${r.post.id} from ${tm[1]} (as draft)`);
      return send(res, 200, { post: r.post, items: await listTrash() });
    }
    return oops(res, 404, 'Không có địa chỉ này.');
  }

  // accounts page (managers only)
  if (path === '/nguoi-dung' || path.startsWith('/nguoi-dung/')) {
    if (user.role !== 'manager') return oops(res, 403, 'Chỉ Quản lý mới quản lý người dùng.');
    if (method === 'GET' && path === '/nguoi-dung') return send(res, 200, { users: await listUsers(), me: user.username });
    const name = path.slice('/nguoi-dung/'.length);
    if (method === 'POST' && USERNAME_RE.test(name)) {
      const r = await manageUser(user, name, { action: body.action, role: body.role });
      if (r.error) return oops(res, r.status, r.error);
      return send(res, 200, { users: r.users, me: user.username });
    }
    return oops(res, 404, 'Không có địa chỉ này.');
  }

  if (method === 'GET' && path === '/bai') {
    const posts = await allPosts();
    const items = posts.map((p) => ({ ...summaryOf(p), visible: isVisible(p), lockedBy: (otherLock(p.id, user) || {}).name || '' }));
    return send(res, 200, { items });
  }

  let m;
  if ((m = path.match(/^\/bai\/(\d{1,9})$/)) && method === 'GET') {
    const id = +m[1];
    const post = (await allPosts()).find((p) => p.id === id);
    if (!post) return oops(res, 404, 'Không tìm thấy bài (có thể đã bị xoá).');
    return send(res, 200, { post: { ...post, visible: isVisible(post) }, lockedBy: (otherLock(id, user) || {}).name || '', history: await listRevisions(id) });
  }

  if ((m = path.match(/^\/bai\/(\d{1,9})\/lich-su\/(\d{1,17})$/)) && method === 'GET') {
    const r = await readRevision(+m[1], m[2]);
    if (!r || !r.post) return oops(res, 404, 'Không tìm thấy bản lưu này.');
    return send(res, 200, { revision: r });
  }

  // save: create (POST /bai) or change (POST /bai/<id>), with one action from news-workflow.mjs
  if (method === 'POST' && (path === '/bai' || (m = path.match(/^\/bai\/(\d{1,9})$/)))) {
    const id = m ? +m[1] : null;
    const r = await change(async ({ posts, save, nextId }) => {
      const cur = id ? posts.find((p) => p.id === id) : null;
      if (id && !cur) return { status: 404, error: 'Không tìm thấy bài (có thể đã bị xoá).' };
      if (cur && body.baseUpdatedAt !== cur.updatedAt) {
        return { status: 409, error: `Bài đã được ${cur.updatedBy || 'người khác'} sửa lúc ${String(cur.updatedAt).slice(11, 16)} ngày ${String(cur.updatedAt).slice(8, 10)}/${String(cur.updatedAt).slice(5, 7)}. Tải lại để xem bản mới rồi sửa tiếp.` };
      }
      const now = Date.now();
      const ctx = { posts, now, nowText: stampAfter(cur && cur.updatedAt), nowPublish: siteNowSeconds(now), newId: cur ? cur.id : await nextId(posts) };
      const d = decide(user, cur, body, ctx);
      if (d.error) return d;
      // unpin the others first: if that fails, nothing of this save is stored and a retry starts clean
      for (const otherId of d.unpin) {
        const o = posts.find((p) => p.id === otherId);
        if (o) await save({ ...o, pinned: false, updatedBy: user.name, updatedAt: stampAfter(o.updatedAt) }, { action: 'bo-ghim', actor: user.name });
      }
      await save(d.post, { action: body.action, actor: user.name });
      return { post: d.post };
    });
    if (r.error) return oops(res, r.status, r.error);
    locks.set(r.post.id, { username: user.username, name: user.name, until: Date.now() + LOCK_MS });
    console.log(`[news] ${siteNow()} ${user.username} ${body.action} article ${r.post.id} → ${r.post.status}`);
    return send(res, 200, { post: { ...r.post, visible: isVisible(r.post) }, history: await listRevisions(r.post.id) });
  }

  // "I am editing this": refreshed every 30 s by the open editor; answers who else holds it
  if ((m = path.match(/^\/bai\/(\d{1,9})\/khoa$/)) && method === 'POST') {
    const id = +m[1];
    if (!(await allPosts()).some((p) => p.id === id)) return oops(res, 404, 'Không tìm thấy bài (có thể đã bị xoá).');
    const other = otherLock(id, user);
    if (body.release === true) {
      if (!other) locks.delete(id);
    } else if (!other) {
      locks.set(id, { username: user.username, name: user.name, until: Date.now() + LOCK_MS });
    }
    return send(res, 200, { lockedBy: other ? other.name : '' });
  }

  if ((m = path.match(/^\/bai\/(\d{1,9})\/xoa$/)) && method === 'POST') {
    if (!mayDelete(user)) return oops(res, 403, 'Chỉ Quản lý mới xoá bài.');
    const id = +m[1];
    const r = await change(async ({ posts, remove }) => {
      const cur = posts.find((p) => p.id === id);
      if (!cur) return { status: 404, error: 'Không tìm thấy bài (có thể đã bị xoá).' };
      if (body.baseUpdatedAt !== cur.updatedAt) return { status: 409, error: 'Bài vừa được sửa. Tải lại trước khi xoá.' };
      await remove(cur, user.name);
      return { ok: true };
    });
    if (r.error) return oops(res, r.status, r.error);
    locks.delete(id);
    console.log(`[news] ${siteNow()} ${user.username} deleted article ${id} (moved to trash)`);
    return send(res, 200, { ok: true });
  }

  return oops(res, 404, 'Không có địa chỉ này.');
}
