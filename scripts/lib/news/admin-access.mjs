// admin-access.mjs — two ways an owner lets someone in without the register-and-wait flow:
//   invites       a one-time link (/quan-tri/moi#<token>, 7 days) carrying any grants the owner chose (grants.mjs; it can
//                 never carry "owner"). Whoever opens it picks a username, display name and password; the account then
//                 waits for an owner's approval (the owner approves every account himself), with the invite's grants
//                 preselected. data/he-thong/invites.json; only a SHA-256 of the token is stored.
//   Claude codes  a bearer code for one account, used by that person's Claude to reach /mcp (phieu-mcp.mjs) over HTTPS
//                 without a browser. Shown once when made; only its SHA-256 is stored (data/he-thong/mcp-tokens.json).
//                 A code works only while its account is active and holds at least one right in a part that is switched on
//                 (every part has tools; an owner always), so locking the account or taking the last right away switches its
//                 codes off as well. A code made with scope 'owner' (an owner for himself only) also gets the owner's
//                 tools (owner-mcp.mjs); a code without scope never does, whoever holds it.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { systemDir } from '../admin/paths.mjs';
import { readJson, writeJsonAtomic, siteNow } from './news-files.mjs';
import { changeUsers, readUsers, hashPassword, USERNAME_RE, PASSWORD_MIN } from './admin-auth.mjs';
import { isOwner, cleanGrants, describeGrants, gamesOf } from '../admin/grants.mjs';
import { appendAudit, whoIs } from '../admin/audit-log.mjs';

const INVITE_MS = 7 * 86400e3;
// invites made before invites carried grants have only a role; the one role they had was the tickets reviewer
const LEGACY_INVITE_GRANTS = { phieu: { '3qdc': { 'phieu-be-ngoan': ['duyet'] } } };
const grantsOfInvite = (i) => i.grants || LEGACY_INVITE_GRANTS[i.role] || {};
// the rights that have tools on /mcp: any right in a part a game has switched on (the tools of each part are in admin/mcp/);
// the owner's own tools only with scope 'owner'
export const hasMcpTools = (u) => !!u && !u.disabled && (isOwner(u) || gamesOf(u).some((g) => Object.keys(g.perms).length > 0));
const mayUseCode = (u, scope) => (scope === 'owner' ? !!u && !u.disabled && isOwner(u) : hasMcpTools(u));
export const CODE_SCOPES = ['owner'];
const OWNER_CODE_MAX = 3;
const NAME_MAX = 60;
const OPEN_MAX = 20; // unused invites / live codes kept at once
export const CODE_PREFIX = '3qp_';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const sameHash = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const plain = (v) => Array.from(String(v ?? '').slice(0, 200).replace(/\p{Cf}/gu, ''), (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('').replace(/\s+/g, ' ').trim();

// One queue per file, like the account list: each change reads the file at its turn and writes it when asked.
function store(name) {
  const file = () => join(systemDir(), name);
  let queue = Promise.resolve();
  const read = async () => { const l = await readJson(file(), []); return Array.isArray(l) ? l : []; };
  const change = (fn) => {
    const run = queue.then(async () => {
      const list = await read();
      const r = await fn(list);
      if (r && r.save) { await mkdir(systemDir(), { recursive: true }); await writeJsonAtomic(file(), list); }
      return r;
    });
    queue = run.catch(() => {});
    return run;
  };
  return { read, change };
}
const invites = store('invites.json');
const codes = store('mcp-tokens.json');

// invites and Claude codes belong to owners (isOwner, grants.mjs)

// ---------- invites ----------
const inviteView = (i) => ({ id: i.id, grants: grantsOfInvite(i), createdBy: i.createdBy, createdAt: i.createdAt, exp: i.exp });
const openInvite = (i, now) => !i.usedBy && !i.revoked && i.exp > now;

// Unused, unexpired invites for the managers' page.
export async function listInvites() {
  const now = Date.now();
  return (await invites.read()).filter((i) => openInvite(i, now)).map(inviteView);
}

// A new invite offering `grants` → { token, invite } (the token goes into the link once and is never stored) or
// { status, error }. `via` is 'claude' when an owner's Claude asks (written down as "<owner> (Claude)").
export async function createInvite(actor, grants, via = 'web') {
  if (!isOwner(actor)) return { status: 403, error: 'Chỉ chủ mới tạo được link mời.' };
  const g = cleanGrants(grants);
  if (g.error) return { status: 400, error: `Quyền không hợp lệ: ${g.error}.` };
  if (!Object.keys(g.grants).length) return { status: 400, error: 'Chọn ít nhất một quyền cho link mời.' };
  const token = randomBytes(32).toString('base64url');
  let audit = null;
  const r = await invites.change((list) => {
    const now = Date.now();
    // used, cancelled and expired invites older than 30 days are dropped
    for (let k = list.length - 1; k >= 0; k--) if (!openInvite(list[k], now) && now - list[k].exp > 30 * 86400e3) list.splice(k, 1);
    if (list.filter((i) => openInvite(i, now)).length >= OPEN_MAX) return { status: 400, error: `Đang có ${OPEN_MAX} link mời chưa dùng. Hãy huỷ bớt trước.` };
    const invite = { id: randomBytes(6).toString('hex'), hash: sha256(token), grants: g.grants, createdBy: actor.username, createdAt: siteNow(), exp: now + INVITE_MS };
    list.push(invite);
    console.log(`[news-auth] ${siteNow()} ${whoIs(actor, via)} created invite ${invite.id}`);
    audit = { ai: whoIs(actor, via), qua: via, viec: 'tao-link-moi', doiTuong: invite.id, sau: g.grants };
    return { save: true, token, invite: inviteView(invite) };
  });
  if (audit && !r.error) await appendAudit(audit);
  return r;
}

export async function revokeInvite(actor, id) {
  if (!isOwner(actor)) return { status: 403, error: 'Chỉ chủ mới huỷ được link mời.' };
  const r = await invites.change((list) => {
    const i = list.find((x) => x.id === id && openInvite(x, Date.now()));
    if (!i) return { status: 404, error: 'Không tìm thấy link mời (có thể đã được dùng hoặc hết hạn).' };
    i.revoked = true;
    console.log(`[news-auth] ${siteNow()} ${actor.username} cancelled invite ${id}`);
    return { save: true };
  });
  if (!r.error) await appendAudit({ ai: actor.username, qua: 'web', viec: 'huy-link-moi', doiTuong: id });
  return r;
}

// What an invite link carries, for the person who opened it (before any account exists): the games and rights in words and
// the time it runs out -> { games, exp } or { status, error }. Reveals nothing to someone without the token.
export async function previewInvite(token) {
  token = String(token ?? '');
  const bad = { status: 400, error: 'Link mời không hợp lệ, đã được dùng hoặc đã hết hạn. Hãy xin chủ link mới.' };
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return bad;
  const want = sha256(token);
  const now = Date.now();
  const i = (await invites.read()).find((x) => openInvite(x, now) && sameHash(x.hash, want));
  if (!i) return bad;
  return { games: describeGrants(cleanGrants(grantsOfInvite(i), { lenient: true }).grants), exp: i.exp };
}

// Someone opened an invite link and filled in the form. → { user } or { status, error }.
export async function acceptInvite(input) {
  const token = String(input.token ?? '');
  const username = String(input.username ?? '').trim().toLowerCase();
  const name = plain(input.name);
  const password = input.password;
  const bad = { status: 400, error: 'Link mời không hợp lệ, đã được dùng hoặc đã hết hạn. Hãy xin chủ link mới.' };
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
  // the account waits for an owner like a registration does ("pending"); wantGrants preselects the invite's grants on the
  // accounts page, the owner confirms them with Duyệt
  const r = await changeUsers((users) => {
    if (users.some((u) => u.username === username)) return { status: 409, error: 'Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.' };
    // what is stored is read leniently: a right dropped from the books since the link was made is simply left out
    const wantGrants = cleanGrants(grantsOfInvite(taken.invite), { lenient: true }).grants;
    users.push({ username, name, role: 'pending', wantGrants, ...secret, disabled: false, createdAt: siteNow(), invitedBy: taken.invite.createdBy, invite: taken.invite.id });
    console.log(`[news-auth] ${siteNow()} ${username} joined with invite ${taken.invite.id} (waiting for approval)`);
    return { save: true, user: { username, name, role: 'pending', wantGrants } };
  });
  if (r.error) await invites.change((list) => { const i = list.find((x) => x.id === taken.invite.id); if (i) { delete i.usedBy; delete i.usedAt; } return { save: true }; });
  return r;
}

// ---------- Claude codes ----------
const codeView = (c) => ({ id: c.id, username: c.username, label: c.label, hint: c.hint, ...(c.scope ? { scope: c.scope } : {}), createdBy: c.createdBy, createdAt: c.createdAt, lastUsedAt: c.lastUsedAt || '' });

// Live codes for the managers' page (all accounts).
export async function listCodes() {
  return (await codes.read()).filter((c) => !c.revoked).map(codeView);
}

// A new code for one account → { code, item } (the code is shown once) or { status, error }.
// scope 'owner' (the owner's own tools too) can only be made by an owner for his own account.
export async function createCode(actor, username, label, scope) {
  if (!isOwner(actor)) return { status: 403, error: 'Chỉ chủ mới tạo được mã cho Claude.' };
  if (scope !== undefined && scope !== null && !CODE_SCOPES.includes(scope)) return { status: 400, error: 'Loại mã không hợp lệ.' };
  scope = scope || undefined;
  if (scope === 'owner' && username !== actor.username) return { status: 400, error: 'Mã chủ chỉ tạo cho chính tài khoản chủ của bạn.' };
  const u = (await readUsers()).find((x) => x.username === username);
  if (!u) return { status: 404, error: 'Không tìm thấy tài khoản.' };
  if (!mayUseCode(u, scope)) return { status: 400, error: scope ? 'Mã chủ chỉ tạo cho tài khoản chủ đang hoạt động.' : 'Chỉ tạo mã cho tài khoản Duyệt phiếu (hoặc chủ) đang hoạt động.' };
  const code = CODE_PREFIX + randomBytes(32).toString('base64url');
  const r = await codes.change((list) => {
    if (list.filter((c) => !c.revoked).length >= OPEN_MAX * 2) return { status: 400, error: 'Có quá nhiều mã đang dùng. Hãy thu hồi bớt trước.' };
    if (scope === 'owner' && list.filter((c) => !c.revoked && c.scope === 'owner').length >= OWNER_CODE_MAX) return { status: 400, error: `Đang có ${OWNER_CODE_MAX} mã chủ. Hãy thu hồi bớt trước.` };
    const item = { id: randomBytes(6).toString('hex'), username, label: plain(label).slice(0, 40) || 'Claude', hint: code.slice(-4), ...(scope ? { scope } : {}), hash: sha256(code), createdBy: actor.username, createdAt: siteNow() };
    list.push(item);
    console.log(`[news-auth] ${siteNow()} ${actor.username} made Claude code ${item.id} for ${username}${scope ? ` (${scope})` : ''}`);
    return { save: true, code, item: codeView(item) };
  });
  if (!r.error) await appendAudit({ ai: actor.username, qua: 'web', viec: 'tao-ma', doiTuong: `${r.item.id} (${username})`, sau: { scope: scope || null } });
  return r;
}

export async function revokeCode(actor, id) {
  if (!isOwner(actor)) return { status: 403, error: 'Chỉ chủ mới thu hồi được mã.' };
  let who = '';
  const r = await codes.change((list) => {
    const c = list.find((x) => x.id === id && !x.revoked);
    if (!c) return { status: 404, error: 'Không tìm thấy mã (có thể đã bị thu hồi).' };
    c.revoked = true; c.revokedBy = actor.username; c.revokedAt = siteNow();
    who = c.username;
    console.log(`[news-auth] ${siteNow()} ${actor.username} revoked Claude code ${id} of ${c.username}`);
    return { save: true };
  });
  if (!r.error) await appendAudit({ ai: actor.username, qua: 'web', viec: 'thu-hoi-ma', doiTuong: `${id} (${who})` });
  return r;
}

const lastNoted = new Map(); // code id → ms the last-used time was last written (at most once a minute per code)

// The account behind a code presented by Claude (with its rights and the code's scope), or null. The account list is
// read every time, so locking an account or taking its rights away takes effect on the very next request.
export async function userOfCode(code) {
  if (typeof code !== 'string' || !code.startsWith(CODE_PREFIX) || code.length > 80) return null;
  const want = sha256(code);
  const c = (await codes.read()).find((x) => !x.revoked && sameHash(x.hash, want));
  if (!c) return null;
  const u = (await readUsers()).find((x) => x.username === c.username);
  if (!u || !u.hash || !mayUseCode(u, c.scope)) return null;
  const now = Date.now();
  if (!(now - (lastNoted.get(c.id) || 0) < 60e3)) {
    lastNoted.set(c.id, now);
    codes.change((list) => { const x = list.find((y) => y.id === c.id); if (x) { x.lastUsedAt = siteNow(); return { save: true }; } return null; }).catch(() => {});
  }
  return { username: u.username, name: u.name, role: u.role, grants: u.grants, scope: c.scope || null, codeId: c.id };
}
