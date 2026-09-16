// admin-auth.mjs — accounts, passwords, sign-in sessions and request checks for the editor pages (/quan-tri).
//   accounts   data/news/users.json, managed with scripts/news-user.mjs; passwords are stored only as scrypt hashes
//   first use  the account command prints a one-time link (/quan-tri/dat-mat-khau#<token>, 30 minutes) — nobody ever
//              sends a password in chat; the token is in the # part, so it never reaches server or proxy logs
//   sessions   random 32-byte token in an HttpOnly, SameSite=Strict cookie limited to /quan-tri; kept in memory, so a
//              service restart signs everybody out; ends after 2 idle hours or 12 hours in total
//   sign-in    5 wrong attempts for one name from one address (or 20 from one address) → 15 minutes blocked; attempts
//              are counted before the password is checked, so a burst of parallel requests cannot slip past the limit,
//              and at most 8 password checks run at once (scrypt shares Node's small thread pool with file serving)
//   sign-out   disabling or resetting an account (account command) or setting its password ends its older sessions
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { DATA_DIR, ALLOWED_ORIGINS, SECURE_COOKIE } from './news-config.mjs';
import { readJson, writeJsonAtomic, siteNow } from './news-files.mjs';

const scrypt = promisify(scryptCb);
const SCRYPT = { N: 16384, r: 8, p: 1 };
export const COOKIE = '3qdc_qt';
const IDLE_MS = 2 * 3600e3;
const MAX_AGE_S = 12 * 3600;
const RESET_MS = 30 * 60e3;
export const PASSWORD_MIN = 10;
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export const usersFile = () => join(DATA_DIR, 'users.json');

// ---------- accounts ----------
export async function readUsers() {
  const list = await readJson(usersFile(), []);
  return Array.isArray(list) ? list : [];
}
export async function writeUsers(list) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeJsonAtomic(usersFile(), list);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64, SCRYPT)).toString('hex');
  return { salt, hash };
}

async function passwordMatches(user, password) {
  // an account without a password yet (or an unknown name) still costs one hash, so timing reveals nothing
  const salt = user && user.salt ? user.salt : '00000000000000000000000000000000';
  const got = await scrypt(String(password), salt, 64, SCRYPT);
  if (!user || !user.hash) return false;
  const want = Buffer.from(user.hash, 'hex');
  return want.length === got.length && timingSafeEqual(want, got);
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// A fresh one-time "set your password" token for an account (the caller saves the account list).
export function newResetToken(user) {
  const token = randomBytes(32).toString('base64url');
  user.resetHash = sha256(token);
  user.resetExp = Date.now() + RESET_MS;
  return token;
}

export const publicUser = (u) => ({ username: u.username, name: u.name, role: u.role });

// ---------- sessions ----------
const sessions = new Map(); // token → { username, created, seen }

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; Path=/quan-tri; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_S}${SECURE_COOKIE ? '; Secure' : ''}`;
}
export const clearedCookie = () => `${COOKIE}=; Path=/quan-tri; HttpOnly; SameSite=Strict; Max-Age=0${SECURE_COOKIE ? '; Secure' : ''}`;

function startSession(username) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  sessions.set(token, { username, created: now, seen: now });
  return token;
}

export function endSession(req) {
  sessions.delete(cookieValue(req, COOKIE));
}

function endSessionsOf(username) {
  for (const [t, s] of sessions) if (s.username === username) sessions.delete(t);
}

// The signed-in account for this request, or null. The account list is read every time, so disabling an account or
// changing its role takes effect on its next request.
// touch = false for background calls (the editor's lock heartbeat), so an open tab alone does not keep a session alive.
export async function currentUser(req, { touch = true } = {}) {
  const token = cookieValue(req, COOKIE);
  const s = token && sessions.get(token);
  if (!s) return null;
  const now = Date.now();
  if (now - s.seen > IDLE_MS || now - s.created > MAX_AGE_S * 1000) { sessions.delete(token); return null; }
  const user = (await readUsers()).find((u) => u.username === s.username);
  // (no hash = the password was reset with the account command: signed out until a new one is set)
  if (!user || user.disabled || !user.hash || !(user.role === 'manager' || user.role === 'editor') || s.created < (user.sessionsValidAfter || 0)) {
    sessions.delete(token);
    return null;
  }
  if (touch) s.seen = now;
  return publicUser(user);
}

// ---------- sign-in limits ----------
const failures = new Map(); // key → { count, first, until }
const inFlight = new Map(); // key → attempts being checked right now
const WINDOW_MS = 15 * 60e3;
const LIMIT_NAME = 5;
const LIMIT_IP = 20;
const HASHING_MAX = 8;
let hashing = 0;

// Wrong attempts counted for a key in the current window (Infinity while blocked).
function recentFailures(key, now) {
  const f = failures.get(key);
  if (!f) return 0;
  if (now - f.first > WINDOW_MS && !(f.until > now)) { failures.delete(key); return 0; }
  return f.until > now ? Infinity : f.count;
}
const overLimit = (key, limit, now) => recentFailures(key, now) + (inFlight.get(key) || 0) >= limit;
function reserve(keys, n) {
  for (const k of keys) {
    const v = (inFlight.get(k) || 0) + n;
    if (v > 0) inFlight.set(k, v); else inFlight.delete(k);
  }
}

function noteFailure(key, limit) {
  const now = Date.now();
  let f = failures.get(key);
  if (!f || (now - f.first > WINDOW_MS && !(f.until > now))) f = { count: 0, first: now, until: 0 };
  f.count++;
  if (f.count >= limit) f.until = now + WINDOW_MS;
  failures.set(key, f);
  if (failures.size > 5000) for (const [k, v] of failures) if (!(v.until > now) && now - v.first > WINDOW_MS) failures.delete(k);
}

// The visitor's address. Caddy runs on the same machine and adds the real address as the last X-Forwarded-For entry;
// the header is ignored for any other peer, so nobody can pick their own address to dodge the limits.
export function clientIp(req) {
  const peer = String(req.socket?.remoteAddress || '');
  const local = peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1';
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return local && fwd.length ? fwd[fwd.length - 1] : peer;
}

// Returns { token, user } on success, or { status, error }.
export async function signIn(req, username, password) {
  const ip = clientIp(req);
  const name = String(username || '').trim().toLowerCase().slice(0, 64);
  const keyName = `${ip}|${name}`;
  const keyIp = `${ip}|*`;
  const now = Date.now();
  if (overLimit(keyName, LIMIT_NAME, now) || overLimit(keyIp, LIMIT_IP, now)) {
    return { status: 429, error: 'Đăng nhập sai quá nhiều lần. Hãy thử lại sau 15 phút.' };
  }
  if (hashing >= HASHING_MAX) return { status: 429, error: 'Máy chủ đang bận. Hãy thử lại sau vài giây.' };
  // reserve this attempt before the first await: parallel requests see it at once
  const keys = [keyName, keyIp];
  hashing++;
  reserve(keys, 1);
  let user;
  let ok = false;
  try {
    user = (await readUsers()).find((u) => u.username === name);
    ok = await passwordMatches(user, String(password || '').slice(0, 1000));
  } finally {
    hashing--;
    reserve(keys, -1);
  }
  if (!ok || user.disabled) {
    noteFailure(keyName, LIMIT_NAME);
    noteFailure(keyIp, LIMIT_IP);
    console.warn(`[news-auth] ${siteNow()} sign-in failed name=${JSON.stringify(name)} ip=${ip}`);
    return { status: 401, error: 'Sai tên đăng nhập hoặc mật khẩu.' };
  }
  failures.delete(keyName);
  console.log(`[news-auth] ${siteNow()} signed in ${name} ip=${ip}`);
  return { token: startSession(user.username), user: publicUser(user) };
}

// Uses a one-time token to set a password. Returns { user } or { status, error }.
export async function setPassword(token, password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return { status: 400, error: `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.` };
  if (password.length > 200) return { status: 400, error: 'Mật khẩu dài quá 200 ký tự.' };
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return { status: 400, error: 'Link đặt mật khẩu không hợp lệ hoặc đã hết hạn. Hãy xin link mới.' };
  const users = await readUsers();
  const want = Buffer.from(sha256(token), 'hex');
  const user = users.find((u) => u.resetHash && Buffer.from(u.resetHash, 'hex').length === want.length && timingSafeEqual(Buffer.from(u.resetHash, 'hex'), want));
  if (!user || !(user.resetExp > Date.now()) || user.disabled) {
    return { status: 400, error: 'Link đặt mật khẩu không hợp lệ hoặc đã hết hạn. Hãy xin link mới.' };
  }
  Object.assign(user, await hashPassword(password));
  delete user.resetHash;
  delete user.resetExp;
  user.passwordSetAt = siteNow();
  user.sessionsValidAfter = Date.now();
  await writeUsers(users);
  endSessionsOf(user.username);
  console.log(`[news-auth] ${siteNow()} password set for ${user.username}`);
  return { user: publicUser(user) };
}

// ---------- request checks ----------
// Changes must come from the site's own pages: the browser's Origin header is compared with the allowed list.
export function sameOrigin(req) {
  const origin = String(req.headers.origin || '').replace(/\/+$/, '');
  return origin !== '' && ALLOWED_ORIGINS.includes(origin);
}
