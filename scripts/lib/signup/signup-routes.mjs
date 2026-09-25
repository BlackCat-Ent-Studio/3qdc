// signup-routes.mjs — /dang-ky-som (the page) and /api/dang-ky-som (count + milestones; POST = sign up).
// The public answers carry only the count and the milestones, never a phone number. A sign-up must come from the
// site's own page (Origin), be a small JSON body and stay under the per-address limit; a filled-in hidden field
// (left there for robots) is answered like a success but not written.
import { clientIp, sameOrigin } from '../news/admin-auth.mjs';
import { siteNow } from '../news/news-files.mjs';
import { addSignup, signupCount, readMilestones, normalizePhone } from './signup-store.mjs';
import { allowAttempt } from './signup-limit.mjs';
import { renderSignupPage } from './signup-page.mjs';

const BODY_MAX = 1024;
const TAG_RE = /^[a-z0-9-]{1,32}$/;

function sendJson(req, res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data));
}

// the JSON body as text, or null when it is larger than BODY_MAX (the rest is not read)
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

async function signUp(req, res) {
  const ip = clientIp(req);
  if (!sameOrigin(req)) return sendJson(req, res, 403, { error: 'Yêu cầu không đến từ trang đăng ký.' });
  if (!/^application\/json(\s*;|$)/i.test(String(req.headers['content-type'] || ''))) return sendJson(req, res, 415, { error: 'Chỉ nhận dữ liệu JSON.' });
  const text = await readSmallBody(req);
  if (text === null) return sendJson(req, res, 413, { error: 'Dữ liệu gửi lên quá lớn.' }, { Connection: 'close' });
  let body;
  try { body = JSON.parse(text || '{}'); } catch { body = null; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return sendJson(req, res, 400, { error: 'Dữ liệu gửi lên không đọc được.' });

  if (!allowAttempt(ip)) return sendJson(req, res, 429, { error: 'Bạn thử quá nhiều lần. Chờ khoảng 10 phút rồi đăng ký lại.' }, { 'Retry-After': '600' });
  if (body.web) {
    console.warn(`[signup] ${siteNow()} hidden field filled, not saved ip=${ip}`);
    return sendJson(req, res, 201, { ok: true, count: await signupCount() });
  }
  const sdt = normalizePhone(body.sdt);
  if (!sdt) return sendJson(req, res, 400, { error: 'Số điện thoại chưa đúng. Nhập số di động Việt Nam 10 số, ví dụ 0912 345 678.' });
  const nguon = TAG_RE.test(String(body.nguon || '')) ? String(body.nguon) : '';
  const r = await addSignup({ sdt, ip, nguon });
  if (r.already) return sendJson(req, res, 200, { already: true, count: r.count });
  return sendJson(req, res, 201, { ok: true, count: r.count });
}

// cleanPath = decoded path without a trailing slash (as server.mjs computes it). Returns false for other addresses.
export async function handleSignup(req, res, cleanPath) {
  if (cleanPath !== '/dang-ky-som' && cleanPath !== '/api/dang-ky-som') return false;
  const get = req.method === 'GET' || req.method === 'HEAD';
  try {
    if (cleanPath === '/dang-ky-som') {
      if (!get) {
        sendJson(req, res, 405, { error: 'Phương thức không hỗ trợ.' }, { Allow: 'GET, HEAD' });
      } else {
        const html = renderSignupPage({ count: await signupCount(), milestones: await readMilestones() });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
        res.end(req.method === 'HEAD' ? undefined : html);
      }
    } else if (get) sendJson(req, res, 200, { count: await signupCount(), milestones: await readMilestones() });
    else if (req.method === 'POST') await signUp(req, res);
    else sendJson(req, res, 405, { error: 'Phương thức không hỗ trợ.' }, { Allow: 'GET, HEAD, POST' });
  } catch (e) {
    console.error('[signup] error', cleanPath, e && e.stack ? e.stack : e);
    if (!res.headersSent) sendJson(req, res, 500, { error: 'Máy chủ gặp lỗi. Thử lại sau ít phút.' });
    else res.destroy();
  }
  return true;
}
