// phieu-session.mjs — who is signed in on the ticket page: a random token in an HttpOnly cookie, the email it belongs
// to kept in memory (a restart signs everyone out, like /quan-tri). Separate from the /quan-tri cookie on purpose.
import { randomBytes } from 'node:crypto';
import { SECURE_COOKIE } from './phieu-config.mjs';

export const COOKIE = 'pbn_s';
const MAX_AGE_S = 7 * 24 * 3600;
const sessions = new Map(); // token → { email, ten, until }

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

const cookie = (token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`;

// → Set-Cookie header value for a new session
export function startSession(email, ten) {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { email, ten: ten || '', until: Date.now() + MAX_AGE_S * 1000 });
  return cookie(token, MAX_AGE_S);
}

export function endSession(req) {
  sessions.delete(cookieValue(req, COOKIE));
  return cookie('', 0);
}

// → { email, ten } or null
export function currentPlayer(req) {
  const s = sessions.get(cookieValue(req, COOKIE));
  if (!s) return null;
  if (s.until < Date.now()) { sessions.delete(cookieValue(req, COOKIE)); return null; }
  return { email: s.email, ten: s.ten };
}

// drop expired sessions now and then
setInterval(() => {
  const now = Date.now();
  for (const [k, s] of sessions) if (s.until < now) sessions.delete(k);
}, 3600e3).unref();
