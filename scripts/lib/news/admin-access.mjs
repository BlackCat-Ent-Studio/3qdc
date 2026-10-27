// admin-access.mjs — two ways a manager lets someone in without the register-and-wait flow:
//   invites       a one-time link (/quan-tri/moi#<token>, 7 days) for one role, today only "phieu" (Duyệt phiếu: the
//                 gift tickets and nothing else). Whoever opens it picks a username, display name and password and the
//                 account is active at once. data/news/invites.json; only a SHA-256 of the token is stored.
//   Claude codes  a bearer code for one "phieu" account, used by that person's Claude to reach /mcp (phieu-mcp.mjs)
//                 over HTTPS without a browser. Shown once when made; only its SHA-256 is stored
//                 (data/news/mcp-tokens.json). A code works only while its account is active and still allowed to
//                 handle tickets, so locking the account or changing its role switches its codes off as well.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { DATA_DIR } from './news-config.mjs';
import { readJson, writeJsonAtomic, siteNow } from './news-files.mjs';
import { changeUsers, readUsers, hashPassword, USERNAME_RE, PASSWORD_MIN } from './admin-auth.mjs';

const INVITE_MS = 7 * 86400e3;
const INVITE_ROLES = ['phieu'];
// roles whose codes keep working (a manager can also use a code made before; anything else switches it off)
const CODE_ROLES = ['phieu', 'manager'];
const NAME_MAX = 60;
const OPEN_MAX = 20; // unused invites / live codes kept at once
export const CODE_PREFIX = '3qp_';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const sameHash = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const plain = (v) => Array.from(String(v ?? '').slice(0, 200).replace(/\p{Cf}/gu, ''), (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('').replace(/\s+/g, ' ').trim();

// One queue per file, like the account list: each change reads the file at its turn and writes it when asked.
function store(name) {
  const file = () => join(DATA_DIR, name);
  let queue = Promise.resolve();
  const read = async () => { const l = await readJson(file(), []); return Array.isArray(l) ? l : []; };
  const change = (fn) => {
    const run = queue.then(async () => {
      const list = await read();
      const r = await fn(list);
      if (r && r.save) { await mkdir(DATA_DIR, { recursive: true }); await writeJsonAtomic(file(), list); }
      return r;
    });
    queue = run.catch(() => {});
    return run;
  };
  return { read, change };
}
const invites = store('invites.json');
const codes = store('mcp-tokens.json');

const isManager = (u) => u && u.role === 'manager';

// ---------- invites ----------
const inviteView = (i) => ({ id: i.id, role: i.role, createdBy: i.createdBy, createdAt: i.createdAt, exp: i.exp });
const openInvite = (i, now) => !i.usedBy && !i.revoked && i.exp > now;

// Unused, unexpired invites for the managers' page.
export async function listInvites() {
  const now = Date.now();
  return (await invites.read()).filter((i) => openInvite(i, now)).map(inviteView);
}

// A new invite → { token, invite } (the token goes into the link once and is never stored) or { status, error }.
export async function createInvite(actor, role) {
  if (!isManager(actor)) return { status: 403, error: 'Chỉ Quản lý mới tạo được link mời.' };
  if (!INVITE_ROLES.includes(role)) return { status: 400, error: 'Vai trò không hợp lệ cho link mời.' };
  const token = randomBytes(32).toString('base64url');
  return invites.change((list) => {
    const now = Date.now();
    // used, cancelled and expired invites older than 30 days are dropped
    for (let k = list.length - 1; k >= 0; k--) if (!openInvite(list[k], now) && now - list[k].exp > 30 * 86400e3) list.splice(k, 1);
    if (list.filter((i) => openInvite(i, now)).length >= OPEN_MAX) return { status: 400, error: `Đang có ${OPEN_MAX} link mời chưa dùng. Hãy huỷ bớt trước.` };
    const invite = { id: randomBytes(6).toString('hex'), hash: sha256(token), role, createdBy: actor.username, createdAt: siteNow(), exp: now + INVITE_MS };
    list.push(invite);
    console.log(`[news-auth] ${siteNow()} ${actor.username} created invite ${invite.id} (${role})`);
    return { save: true, token, invite: inviteView(invite) };
  });
}

export async function revokeInvite(actor, id) {
  if (!isManager(actor)) return { status: 403, error: 'Chỉ Quản lý mới huỷ được link mời.' };
  return invites.change((list) => {
    const i = list.find((x) => x.id === id && openInvite(x, Date.now()));
    if (!i) return { status: 404, error: 'Không tìm thấy link mời (có thể đã được dùng hoặc hết hạn).' };
    i.revoked = true;
    console.log(`[news-auth] ${siteNow()} ${actor.username} cancelled invite ${id}`);
    return { save: true };
  });
}

// Someone opened an invite link and filled in the form. → { user } or { status, error }.
export async function acceptInvite(input) {
  const token = String(input.token ?? '');
  const username = String(input.username ?? '').trim().toLowerCase();
  const name = plain(input.name);
  const password = input.password;
  const bad = { status: 400, error: 'Link mời không hợp lệ, đã được dùng hoặc đã hết hạn. Hãy xin Quản lý link mới.' };
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return bad;
  if (!USERNAME_RE.test(username)) return { status: 400, error: 'Tên đăng nhập 3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới; bắt đầu bằng chữ hoặc số.' };
  if (!name || name.length > NAME_MAX) return { status: 400, error: `Tên hiển thị cần 1–${NAME_MAX} ký tự.` };
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return { status: 400, error: `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.` };
  if (password.length > 200) return { status: 400, error: 'Mật khẩu dài quá 200 ký tự.' };
  const want = sha256(token);
  // checked before the (slow) password hash, so a wrong link costs nothing
  if (!(await invites.read()).some((i) => openInvite(i, Date.now()) && sameHash(i.hash, want))) return bad;
  if ((await readUsers()).some((u) => u.username === username)) return { status: 409, error: 'Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.' };
  const secret = await hashPassword(password);
  // the invite is used up first; if the name was taken meanwhile it is given back
  const taken = await invites.change((list) => {
    const i = list.find((x) => openInvite(x, Date.now()) && sameHash(x.hash, want));
    if (!i) return bad;
    i.usedBy = username; i.usedAt = siteNow();
    return { save: true, invite: i };
  });
  if (taken.error) return taken;
  const r = await changeUsers((users) => {
    if (users.some((u) => u.username === username)) return { status: 409, error: 'Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.' };
    users.push({ username, name, role: taken.invite.role, ...secret, disabled: false, createdAt: siteNow(), invitedBy: taken.invite.createdBy, invite: taken.invite.id });
    console.log(`[news-auth] ${siteNow()} ${username} joined with invite ${taken.invite.id} (${taken.invite.role})`);
    return { save: true, user: { username, name, role: taken.invite.role } };
  });
  if (r.error) await invites.change((list) => { const i = list.find((x) => x.id === taken.invite.id); if (i) { delete i.usedBy; delete i.usedAt; } return { save: true }; });
  return r;
}

// ---------- Claude codes ----------
const codeView = (c) => ({ id: c.id, username: c.username, label: c.label, hint: c.hint, createdBy: c.createdBy, createdAt: c.createdAt, lastUsedAt: c.lastUsedAt || '' });

// Live codes for the managers' page (all accounts).
export async function listCodes() {
  return (await codes.read()).filter((c) => !c.revoked).map(codeView);
}

// A new code for one account → { code, item } (the code is shown once) or { status, error }.
export async function createCode(actor, username, label) {
  if (!isManager(actor)) return { status: 403, error: 'Chỉ Quản lý mới tạo được mã cho Claude.' };
  const u = (await readUsers()).find((x) => x.username === username);
  if (!u) return { status: 404, error: 'Không tìm thấy tài khoản.' };
  if (u.disabled || !CODE_ROLES.includes(u.role)) return { status: 400, error: 'Chỉ tạo mã cho tài khoản Duyệt phiếu (hoặc Quản lý) đang hoạt động.' };
  const code = CODE_PREFIX + randomBytes(32).toString('base64url');
  return codes.change((list) => {
    if (list.filter((c) => !c.revoked).length >= OPEN_MAX * 2) return { status: 400, error: 'Có quá nhiều mã đang dùng. Hãy thu hồi bớt trước.' };
    const item = { id: randomBytes(6).toString('hex'), username, label: plain(label).slice(0, 40) || 'Claude', hint: code.slice(-4), hash: sha256(code), createdBy: actor.username, createdAt: siteNow() };
    list.push(item);
    console.log(`[news-auth] ${siteNow()} ${actor.username} made Claude code ${item.id} for ${username}`);
    return { save: true, code, item: codeView(item) };
  });
}

export async function revokeCode(actor, id) {
  if (!isManager(actor)) return { status: 403, error: 'Chỉ Quản lý mới thu hồi được mã.' };
  return codes.change((list) => {
    const c = list.find((x) => x.id === id && !x.revoked);
    if (!c) return { status: 404, error: 'Không tìm thấy mã (có thể đã bị thu hồi).' };
    c.revoked = true; c.revokedBy = actor.username; c.revokedAt = siteNow();
    console.log(`[news-auth] ${siteNow()} ${actor.username} revoked Claude code ${id} of ${c.username}`);
    return { save: true };
  });
}

const lastNoted = new Map(); // code id → ms the last-used time was last written (at most once a minute per code)

// The account behind a code presented by Claude, or null. The account list is read every time, so locking an account
// or changing its role takes effect on the very next request.
export async function userOfCode(code) {
  if (typeof code !== 'string' || !code.startsWith(CODE_PREFIX) || code.length > 80) return null;
  const want = sha256(code);
  const c = (await codes.read()).find((x) => !x.revoked && sameHash(x.hash, want));
  if (!c) return null;
  const u = (await readUsers()).find((x) => x.username === c.username);
  if (!u || u.disabled || !u.hash || !CODE_ROLES.includes(u.role)) return null;
  const now = Date.now();
  if (!(now - (lastNoted.get(c.id) || 0) < 60e3)) {
    lastNoted.set(c.id, now);
    codes.change((list) => { const x = list.find((y) => y.id === c.id); if (x) { x.lastUsedAt = siteNow(); return { save: true }; } return null; }).catch(() => {});
  }
  return { username: u.username, name: u.name, role: u.role, codeId: c.id };
}
