// google-token.mjs — checks the ID token the "Sign in with Google" button hands the page, without any library:
// the RS256 signature against Google's published keys, then issuer, audience (our client id), expiry and that the
// email is verified. No client secret is needed for this; the client id is public.
import { createPublicKey, verify } from 'node:crypto';

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const SKEW_S = 60;

const b64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// Google's keys, cached for as long as Google's Cache-Control allows; refetched at most once a minute when a token
// names a key we do not have (Google rotates keys).
let keys = new Map();
let keysUntil = 0;
let lastFetch = 0;

async function defaultFetchJwks() {
  const r = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('jwks ' + r.status);
  const maxAge = Number((/max-age=(\d+)/.exec(r.headers.get('cache-control') || '') || [])[1] || 3600);
  return { jwks: await r.json(), maxAge };
}

async function keyFor(kid, fetchJwks, now) {
  if (now < keysUntil && keys.has(kid)) return keys.get(kid);
  if (now - lastFetch >= 60e3 || !keys.size) {
    lastFetch = now;
    const { jwks, maxAge } = await fetchJwks();
    keys = new Map((jwks.keys || []).filter((k) => k.kty === 'RSA' && k.kid).map((k) => [k.kid, createPublicKey({ key: k, format: 'jwk' })]));
    keysUntil = now + maxAge * 1000;
  }
  return keys.get(kid) || null;
}

// → { email, name } for a good token, or throws an Error whose message can be shown to the player.
export async function verifyIdToken(jwt, clientId, { fetchJwks = defaultFetchJwks, now = Date.now() } = {}) {
  const fail = (m) => { throw Object.assign(new Error(m), { expose: true }); };
  if (!clientId) fail('Đăng nhập Google chưa được bật.');
  const parts = String(jwt || '').split('.');
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) fail('Phiên đăng nhập Google không hợp lệ.');
  let header, claims;
  try {
    header = JSON.parse(b64url(parts[0]).toString('utf8'));
    claims = JSON.parse(b64url(parts[1]).toString('utf8'));
  } catch { fail('Phiên đăng nhập Google không hợp lệ.'); }
  if (header.alg !== 'RS256' || !header.kid) fail('Phiên đăng nhập Google không hợp lệ.');
  let key;
  try { key = await keyFor(header.kid, fetchJwks, now); } catch { fail('Không kiểm được tài khoản Google lúc này. Thử lại sau ít phút.'); }
  if (!key) fail('Phiên đăng nhập Google không hợp lệ.');
  const ok = verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, b64url(parts[2]));
  if (!ok) fail('Phiên đăng nhập Google không hợp lệ.');
  const t = Math.floor(now / 1000);
  if (!ISSUERS.includes(claims.iss)) fail('Phiên đăng nhập Google không hợp lệ.');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(clientId)) fail('Phiên đăng nhập Google không dành cho trang này.');
  if (!(Number(claims.exp) + SKEW_S > t)) fail('Phiên đăng nhập Google đã hết hạn. Đăng nhập lại.');
  if (claims.email_verified !== true && claims.email_verified !== 'true') fail('Email Google chưa được xác minh.');
  const email = String(claims.email || '').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 254) fail('Tài khoản Google không có email.');
  return { email, name: String(claims.name || '').slice(0, 80) };
}

// for tests
export function _resetKeys() { keys = new Map(); keysUntil = 0; lastFetch = 0; }
