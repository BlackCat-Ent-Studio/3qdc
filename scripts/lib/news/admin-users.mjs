// admin-users.mjs — registration on the site and the owners' "Người dùng" page.
//   register  anyone: username + display name + password → account with role "pending" (cannot sign in);
//             at most 5 registrations per address per hour, and none while 20 accounts are already waiting
//   manage    owners only: approve a waiting account with grants (what it may do in which game), refuse it (removed),
//             lock / unlock, change its grants. Nobody changes their own account here, no call makes an owner, and the
//             last active owner cannot be locked.
import { changeUsers, readUsers, hashPassword, clientIp, USERNAME_RE, PASSWORD_MIN } from './admin-auth.mjs';
import { cleanGrants } from '../admin/grants.mjs';
import { siteNow } from './news-files.mjs';

const NAME_MAX = 60;
const PER_IP_PER_HOUR = 5;
const PENDING_MAX = 20;
const HOUR = 3600e3;
const byIp = new Map(); // address → { count, first }
const HASHING_MAX = 4;
let hashing = 0; // registrations hashing a password right now (a burst from many addresses cannot pile up)

// display names: at most 200 characters looked at, control and invisible format characters (zero-width, bidi overrides) removed
const plain = (v) => Array.from(String(v ?? '').slice(0, 200).replace(/\p{Cf}/gu, ''), (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('').replace(/\s+/g, ' ').trim();

// Counts a registration attempt for an address before anything is awaited; false = over the hourly limit.
function allowAttempt(ip) {
  const now = Date.now();
  let e = byIp.get(ip);
  if (!e || now - e.first > HOUR) e = { count: 0, first: now };
  if (e.count >= PER_IP_PER_HOUR) return false;
  e.count++;
  byIp.set(ip, e);
  if (byIp.size > 5000) for (const [k, v] of byIp) if (now - v.first > HOUR) byIp.delete(k);
  return true;
}

// Returns { user } (the waiting account) or { status, error }.
export async function register(req, input) {
  const ip = clientIp(req);
  if (!allowAttempt(ip)) return { status: 429, error: 'Đăng ký quá nhiều lần từ mạng này. Hãy thử lại sau 1 giờ.' };
  const username = String(input.username ?? '').trim().toLowerCase();
  const name = plain(input.name);
  const password = input.password;
  if (!USERNAME_RE.test(username)) return { status: 400, error: 'Tên đăng nhập 3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới; bắt đầu bằng chữ hoặc số.' };
  if (!name || name.length > NAME_MAX) return { status: 400, error: `Tên hiển thị cần 1–${NAME_MAX} ký tự.` };
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return { status: 400, error: `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.` };
  if (password.length > 200) return { status: 400, error: 'Mật khẩu dài quá 200 ký tự.' };

  // cheap checks first, so refused registrations cost no password hashing
  const before = await readUsers();
  if (before.some((u) => u.username === username)) return { status: 409, error: 'Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.' };
  if (before.filter((u) => u.role === 'pending').length >= PENDING_MAX) return { status: 503, error: 'Đang có nhiều tài khoản chờ duyệt. Tạm ngừng nhận đăng ký, hãy thử lại sau.' };
  if (hashing >= HASHING_MAX) return { status: 503, error: 'Máy chủ đang bận. Hãy thử lại sau vài giây.' };
  hashing++;
  let secret;
  try {
    secret = await hashPassword(password);
  } finally {
    hashing--;
  }

  return changeUsers((users) => {
    // checked again at its turn: two registrations of one name at the same moment cannot both pass
    if (users.some((u) => u.username === username)) return { status: 409, error: 'Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.' };
    if (users.filter((u) => u.role === 'pending').length >= PENDING_MAX) return { status: 503, error: 'Đang có nhiều tài khoản chờ duyệt. Tạm ngừng nhận đăng ký, hãy thử lại sau.' };
    const user = { username, name, role: 'pending', ...secret, disabled: false, createdAt: siteNow(), registered: true };
    users.push(user);
    console.log(`[news-auth] ${siteNow()} registered ${username} (waiting for approval) ip=${ip}`);
    return { save: true, user: { username, name, role: 'pending' } };
  });
}

// grants sent by an owner (or asked for by a person): checked against the books, and at least one right is needed
function readGrants(input) {
  const r = cleanGrants(input);
  if (r.error) return { error: `Quyền không hợp lệ: ${r.error}.` };
  if (!Object.keys(r.grants).length) return { error: 'Chọn ít nhất một quyền.' };
  return { grants: r.grants };
}

const activeOwners = (users) => users.filter((u) => u.role === 'owner' && !u.disabled && u.hash).length;

// Every change of what an account may do is written down. For now this goes to the service log; the permanent record
// (data/he-thong/nhat-ky-quyen.jsonl) takes over from here.
export function recordGrantChange(actor, username, action, before, after) {
  console.log(`[news-auth] ${siteNow()} grants ${action} ${username} by ${actor} ${JSON.stringify({ before: before || null, after: after || null })}`);
}

// What the "Người dùng" page shows (no hashes, no tokens).
export async function listUsers() {
  return (await readUsers()).map((u) => ({
    username: u.username, name: u.name, role: u.role, disabled: !!u.disabled, createdAt: u.createdAt || '',
    grants: u.role === 'member' && u.grants && typeof u.grants === 'object' ? u.grants : {}, wantGrants: u.role === 'pending' && u.wantGrants && typeof u.wantGrants === 'object' ? u.wantGrants : {},
    passwordSet: !!u.hash, registered: !!u.registered, invitedBy: u.invitedBy || '',
  }));
}

/**
 * An owner's decision about one account.
 *   action  duyet (grants; without them the grants the person asked for are used) · tu-choi · khoa · mo-khoa · quyen (grants)
 * Returns { users } (the new list) or { status, error }.
 */
export async function manageUser(actor, username, { action, grants } = {}) {
  if (actor.role !== 'owner') return { status: 403, error: 'Chỉ chủ mới quản lý người dùng.' };
  if (username === actor.username) return { status: 400, error: 'Không tự thay đổi tài khoản của chính mình ở đây.' };
  const r = await changeUsers((users) => {
    // the actor is checked again at its turn in the queue: an owner locked meanwhile decides nothing
    const a = users.find((x) => x.username === actor.username);
    if (!a || a.role !== 'owner' || a.disabled || !a.hash || (actor.sessionCreated || 0) < (a.sessionsValidAfter || 0)) {
      return { status: 403, error: 'Chỉ chủ mới quản lý người dùng.' };
    }
    const u = users.find((x) => x.username === username);
    if (!u) return { status: 404, error: 'Không tìm thấy tài khoản.' };
    const pending = u.role === 'pending';
    let change = null; // [before, after] when the grants of the account change
    switch (action) {
      case 'duyet': {
        if (!pending) return { status: 400, error: 'Tài khoản này không ở trạng thái chờ duyệt.' };
        const g = readGrants(grants === undefined ? u.wantGrants : grants);
        if (g.error) return { status: 400, error: g.error };
        u.role = 'member';
        u.grants = g.grants;
        delete u.wantGrants;
        u.approvedBy = actor.username; u.approvedAt = siteNow();
        change = [null, g.grants];
        break;
      }
      case 'tu-choi':
        if (!pending) return { status: 400, error: 'Chỉ từ chối được tài khoản đang chờ duyệt. Tài khoản đã duyệt thì dùng Khoá.' };
        users.splice(users.indexOf(u), 1);
        break;
      case 'khoa':
        if (pending) return { status: 400, error: 'Tài khoản đang chờ duyệt: hãy duyệt hoặc từ chối.' };
        u.disabled = true;
        break;
      case 'mo-khoa':
        if (pending) return { status: 400, error: 'Tài khoản đang chờ duyệt: hãy duyệt hoặc từ chối.' };
        u.disabled = false;
        break;
      case 'quyen': {
        if (pending) return { status: 400, error: 'Tài khoản đang chờ duyệt: hãy duyệt kèm quyền.' };
        if (u.role !== 'member') return { status: 400, error: 'Tài khoản chủ không đổi quyền ở đây.' };
        const g = readGrants(grants);
        if (g.error) return { status: 400, error: g.error };
        change = [u.grants || {}, g.grants];
        u.grants = g.grants;
        break; // takes effect on the account's next request (the account list is read every time)
      }
      default:
        return { status: 400, error: 'Thao tác không hợp lệ.' };
    }
    if (activeOwners(users) < 1) return { status: 400, error: 'Phải còn ít nhất một chủ đang hoạt động.' };
    // locking an account ends its current sessions
    if (action === 'khoa') u.sessionsValidAfter = Date.now();
    console.log(`[news-auth] ${siteNow()} ${actor.username} ${action} ${username}`);
    if (change) recordGrantChange(actor.username, username, action, change[0], change[1]);
    return { save: true };
  });
  if (r.error) return r;
  return { users: await listUsers() };
}
