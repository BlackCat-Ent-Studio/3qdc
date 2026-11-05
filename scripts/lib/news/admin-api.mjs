// admin-api.mjs — JSON answers under /quan-tri/api/ for the editor pages.
// Every change (POST) must: come from the site's own page (Origin), be JSON, be at most 1 MB, and — apart from signing
// in and setting a password — belong to a signed-in account allowed to make it (news-workflow.mjs decides).
//
// This file keeps what belongs to no game: signing in, accounts, invites, Claude codes. Everything about one game's
// content lives in a part (scripts/lib/admin/modules/) and is reached at /quan-tri/api/g/<game>/<address>.
import { signIn, endSession, setPassword, currentUser, sameOrigin, sessionCookie, clearedCookie, clientIp } from './admin-auth.mjs';
import { listInvites, createInvite, revokeInvite, acceptInvite, listCodes, createCode, revokeCode } from './admin-access.mjs';
import { register, listUsers, manageUser } from './admin-users.mjs';
import { USERNAME_RE } from './admin-auth.mjs';
import { siteNow } from './news-files.mjs';
import { GAME_ID_RE, gameById } from '../admin/games.mjs';
import { moduleOfPath, gamesFor } from '../admin/modules.mjs';
import { send, oops } from '../admin/api-http.mjs';

const BODY_MAX = 1_000_000;

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

// Which game and part an address belongs to.
//   /g/<game>/<address>  the game's own address
//   /<address>           the first tabs of the editor pages call addresses without a game; they mean the game 3qdc.
//                        Kept so those tabs keep working until the pages name the game themselves.
// → null when the address belongs to no part (or the game's part is not switched on); `sub` is the address below the game.
const GAME_PREFIX_RE = /^\/g\/([^/]+)(\/.*)$/;
function resolveTarget(path) {
  let m = GAME_PREFIX_RE.exec(path);
  if (m && !GAME_ID_RE.test(m[1])) m = null;
  const sub = m ? m[2] : path;
  const mod = moduleOfPath(sub);
  if (!mod) return null;
  const game = gameById(m ? m[1] : '3qdc');
  if (!game || !Object.hasOwn(game.modules, mod.id)) return null;
  return { game, mod, sub };
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
    // a picture or song upload: raw body, so the session is checked before a single byte is read
    const target = resolveTarget(path);
    if (target && target.mod.upload && await target.mod.upload(req, res, target.sub)) return;
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
  // a manager's invite link: the account is created active, with the invite's role
  if (method === 'POST' && path === '/nhan-loi-moi') {
    const r = await acceptInvite(body);
    if (r.error) return oops(res, r.status, r.error);
    return send(res, 201, { user: r.user });
  }

  // ----- signed in -----
  // the lock heartbeat alone must not keep a session alive
  const user = await currentUser(req, { touch: !path.endsWith('/khoa') });
  if (!user) return oops(res, 401, 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.');

  if (method === 'GET' && path === '/toi') {
    return send(res, 200, { user: { username: user.username, name: user.name, role: user.role }, games: gamesFor(user) });
  }

  const target = resolveTarget(path);
  const sub = target ? target.sub : path;

  // "Duyệt phiếu" accounts reach the ticket list and the give / refuse / back-to-waiting answer, nothing else
  // (no articles, pictures, music, sign-ups, trash, accounts; no CSV and no deleting tickets)
  if (user.role === 'phieu' && !((method === 'GET' && sub === '/phieu-be-ngoan') || (method === 'POST' && /^\/phieu-be-ngoan\/[a-z0-9]{6,20}$/.test(sub)))) {
    return oops(res, 403, 'Tài khoản Duyệt phiếu chỉ dùng được mục Phiếu Bé Ngoan.');
  }

  // a game's own address
  if (target) {
    const ctx = { game: target.game, user, method, can: (perm) => (target.mod.legacyRoles[perm] || []).includes(user.role) };
    if (await target.mod.api(ctx, req, res, target.sub, body)) return;
    return oops(res, 404, 'Không có địa chỉ này.');
  }

  // invite links for "Duyệt phiếu" accounts and codes for their Claude (managers only; shown on the accounts page).
  // A new link or code is in the answer once and never again.
  if (path === '/loi-moi' || path.startsWith('/loi-moi/') || path === '/ma-claude' || path.startsWith('/ma-claude/')) {
    if (user.role !== 'manager') return oops(res, 403, 'Chỉ Quản lý mới quản lý link mời và mã Claude.');
    let r = null, im, cm;
    if (method === 'POST' && path === '/loi-moi') r = await createInvite(user, body.role);
    else if (method === 'POST' && (im = path.match(/^\/loi-moi\/([a-f0-9]{12})\/huy$/))) r = await revokeInvite(user, im[1]);
    else if (method === 'POST' && path === '/ma-claude') r = await createCode(user, String(body.username || ''), body.label);
    else if (method === 'POST' && (cm = path.match(/^\/ma-claude\/([a-f0-9]{12})\/thu-hoi$/))) r = await revokeCode(user, cm[1]);
    else return oops(res, 404, 'Không có địa chỉ này.');
    if (r.error) return oops(res, r.status, r.error);
    return send(res, 200, { token: r.token, code: r.code, invites: await listInvites(), codes: await listCodes() });
  }

  // accounts page (managers only)
  if (path === '/nguoi-dung' || path.startsWith('/nguoi-dung/')) {
    if (user.role !== 'manager') return oops(res, 403, 'Chỉ Quản lý mới quản lý người dùng.');
    if (method === 'GET' && path === '/nguoi-dung') return send(res, 200, { users: await listUsers(), me: user.username, invites: await listInvites(), codes: await listCodes() });
    const name = path.slice('/nguoi-dung/'.length);
    if (method === 'POST' && USERNAME_RE.test(name)) {
      const r = await manageUser(user, name, { action: body.action, role: body.role });
      if (r.error) return oops(res, r.status, r.error);
      return send(res, 200, { users: r.users, me: user.username });
    }
    return oops(res, 404, 'Không có địa chỉ này.');
  }

  return oops(res, 404, 'Không có địa chỉ này.');
}
