// phieu-routes.mjs — everything served under the ticket page's own host name (phieubengoan.3qdc.wanmeivn.com):
//   /                         the page
//   /api/phieu/toi            who is signed in, today's ticket and the history
//   /api/phieu/dang-nhap      POST {credential}: Google ID token → session cookie
//   /api/phieu/dang-xuat      POST: end the session
//   /api/phieu/gui            POST {acc, server, qua[], ghiChu}: send today's ticket
//   /api/phieu/dang-nhap-thu  POST {email}: test sign-in, only when PHIEU_DEV_LOGIN=1 (draft server)
// The site's artwork (/3qdc-vi/...) is left to server.mjs; every other address on this host is a 404, so the editor
// pages and the main site are never reachable through it.
import { clientIp } from '../news/admin-auth.mjs';
import { siteNow } from '../news/news-files.mjs';
import { isPhieuHost, ORIGINS, GOOGLE_CLIENT_ID, DEV_LOGIN, SERVERS, cleanAcc, ACC_MAX, GIFTS_MAX, GIFT_MAX, NOTE_MAX } from './phieu-config.mjs';
import { addPhieu, myPhieu, playerView } from './phieu-store.mjs';
import { verifyIdToken } from './google-token.mjs';
import { startSession, endSession, currentPlayer } from './phieu-session.mjs';
import { allowAttempt } from './phieu-limit.mjs';
import { renderPhieuPage } from './phieu-page.mjs';

const BODY_MAX = 8 * 1024;
const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };

function sendJson(req, res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY, ...headers });
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data));
}

// the body as text, or null when it is larger than BODY_MAX (the rest is not read)
function readSmallBody(req) {
  if (Number(req.headers['content-length']) > BODY_MAX) return Promise.resolve(null);
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on('data', (c) => {
      size += c.length;
      if (size > BODY_MAX) { chunks.length = 0; finish(null); return; }
      chunks.push(c);
    });
    req.on('end', () => finish(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => finish(null));
  });
}

// Common checks for every POST; → the parsed body, or null after an error answer has been sent.
async function postBody(req, res) {
  const origin = String(req.headers.origin || '').replace(/\/+$/, '');
  if (!origin || !ORIGINS.includes(origin)) { sendJson(req, res, 403, { error: 'Yêu cầu không đến từ trang Phiếu Bé Ngoan.' }); return null; }
  if (!/^application\/json(\s*;|$)/i.test(String(req.headers['content-type'] || ''))) { sendJson(req, res, 415, { error: 'Chỉ nhận dữ liệu JSON.' }); return null; }
  if (!allowAttempt(clientIp(req))) { sendJson(req, res, 429, { error: 'Bạn thao tác quá nhanh. Chờ vài phút rồi thử lại.' }, { 'Retry-After': '600' }); return null; }
  const text = await readSmallBody(req);
  if (text === null) { sendJson(req, res, 413, { error: 'Dữ liệu gửi lên quá lớn.' }, { Connection: 'close' }); return null; }
  let body;
  try { body = JSON.parse(text || '{}'); } catch { body = null; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) { sendJson(req, res, 400, { error: 'Dữ liệu gửi lên không đọc được.' }); return null; }
  return body;
}

// The fields of a ticket, cleaned; → { fields } or { error, field }
function readTicket(body) {
  if (!String(body.acc ?? '').trim()) return { field: 'acc', error: 'Đây là câu hỏi bắt buộc.' };
  const acc = cleanAcc(body.acc);
  if (!acc) return { field: 'acc', error: `Tên nhân vật tối đa ${ACC_MAX} ký tự và không chứa ký tự ẩn.` };
  const server = String(body.server ?? '');
  if (!SERVERS.some((s) => s.id === server)) return { field: 'server', error: 'Chọn server.' };
  if (!Array.isArray(body.qua)) return { field: 'qua', error: 'Ghi ít nhất một món quà.' };
  const qua = body.qua.map((g) => String(g ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!qua.length) return { field: 'qua', error: 'Ghi ít nhất một món quà.' };
  if (qua.length > GIFTS_MAX) return { field: 'qua', error: `Tối đa ${GIFTS_MAX} món mỗi phiếu.` };
  if (qua.some((g) => g.length > GIFT_MAX)) return { field: 'qua', error: `Mỗi món quà tối đa ${GIFT_MAX} ký tự.` };
  const ghiChu = String(body.ghiChu ?? '').trim();
  if (ghiChu.length > NOTE_MAX) return { field: 'ghiChu', error: `Ghi chú tối đa ${NOTE_MAX} ký tự.` };
  return { fields: { acc, server, qua, ghiChu } };
}

async function api(req, res, path) {
  const get = req.method === 'GET' || req.method === 'HEAD';
  if (path === '/toi') {
    if (!get) return sendJson(req, res, 405, { error: 'Phương thức không hỗ trợ.' }, { Allow: 'GET, HEAD' });
    const me = currentPlayer(req);
    if (!me) return sendJson(req, res, 200, { dangNhap: false, clientId: GOOGLE_CLIENT_ID, thu: DEV_LOGIN });
    const { homNay, lichSu } = await myPhieu(me.email);
    return sendJson(req, res, 200, { dangNhap: true, email: me.email, ten: me.ten, homNay: homNay && playerView(homNay), lichSu: lichSu.map(playerView), servers: SERVERS });
  }
  if (req.method !== 'POST') return sendJson(req, res, 405, { error: 'Phương thức không hỗ trợ.' }, { Allow: 'POST' });

  if (path === '/dang-nhap') {
    const body = await postBody(req, res);
    if (!body) return;
    let who;
    try {
      who = await verifyIdToken(body.credential, GOOGLE_CLIENT_ID);
    } catch (e) {
      return sendJson(req, res, 401, { error: e.expose ? e.message : 'Đăng nhập Google không thành công.' });
    }
    return sendJson(req, res, 200, { ok: true }, { 'Set-Cookie': startSession(who.email, who.name) });
  }
  if (path === '/dang-nhap-thu' && DEV_LOGIN) {
    const body = await postBody(req, res);
    if (!body) return;
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return sendJson(req, res, 400, { error: 'Nhập một email.' });
    return sendJson(req, res, 200, { ok: true }, { 'Set-Cookie': startSession(email, '') });
  }
  if (path === '/dang-xuat') {
    const body = await postBody(req, res);
    if (!body) return;
    return sendJson(req, res, 200, { ok: true }, { 'Set-Cookie': endSession(req) });
  }
  if (path === '/gui') {
    const body = await postBody(req, res);
    if (!body) return;
    const me = currentPlayer(req);
    if (!me) return sendJson(req, res, 401, { error: 'Phiên đăng nhập đã hết. Đăng nhập lại để gửi phiếu.' });
    const t = readTicket(body);
    if (t.error) return sendJson(req, res, 400, { error: t.error, field: t.field });
    const r = await addPhieu({ email: me.email, ten: me.ten, ...t.fields });
    if (r.already) return sendJson(req, res, 409, { error: 'Hôm nay bạn đã gửi phiếu. Phiếu mới mở lại lúc 00:00.', item: playerView(r.item) });
    console.log(`[phieu] ${siteNow()} ticket ${r.item.id} sent (${r.item.qua.length} gift line(s))`);
    return sendJson(req, res, 201, { ok: true, item: playerView(r.item) });
  }
  return sendJson(req, res, 404, { error: 'Không có địa chỉ này.' });
}

// pathname = decoded path. Returns false when the request is not for the ticket host (or is its artwork).
export async function handlePhieu(req, res, pathname) {
  if (!isPhieuHost(req.headers.host)) return false;
  if (pathname.startsWith('/3qdc-vi/')) return false; // logo, font: served by server.mjs as on the main site
  try {
    if (pathname === '/' || pathname === '') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(req, res, 405, { error: 'Phương thức không hỗ trợ.' }, { Allow: 'GET, HEAD' });
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ...SECURITY,
          // the Google sign-in popup needs to talk back to this page
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        });
        res.end(req.method === 'HEAD' ? undefined : renderPhieuPage());
      }
    } else if (pathname === '/api/phieu' || pathname.startsWith('/api/phieu/')) {
      await api(req, res, pathname.slice('/api/phieu'.length).replace(/\/$/, '') || '/');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY });
      res.end('404');
    }
  } catch (e) {
    console.error('[phieu] error', pathname, e && e.stack ? e.stack : e);
    if (!res.headersSent) sendJson(req, res, 500, { error: 'Máy chủ gặp lỗi. Thử lại sau ít phút.' });
    else res.destroy();
  }
  return true;
}
