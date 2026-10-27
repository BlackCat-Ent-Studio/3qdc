// admin-users.mjs — registration on the site and the managers' "Người dùng" page.
//   register  anyone: username + display name + password → account with role "pending" (cannot sign in);
//             at most 5 registrations per address per hour, and none while 20 accounts are already waiting
//   manage    managers only: approve a waiting account as editor or manager, refuse it (removed), lock / unlock,
//             change role. Nobody changes their own account here, and the last active manager cannot be removed.
import { changeUsers, readUsers, hashPassword, clientIp, USERNAME_RE, PASSWORD_MIN, ACTIVE_ROLES } from './admin-auth.mjs';
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

const activeManagers = (users) => users.filter((u) => u.role === 'manager' && !u.disabled && u.hash).length;

// What the "Người dùng" page shows (no hashes, no tokens).
export async function listUsers() {
  return (await readUsers()).map((u) => ({
    username: u.username, name: u.name, role: u.role, disabled: !!u.disabled, createdAt: u.createdAt || '',
    passwordSet: !!u.hash, registered: !!u.registered,
  }));
}

/**
 * A manager's decision about one account.
 *   action  duyet (role) · tu-choi · khoa · mo-khoa · vai-tro (role)
 * Returns { users } (the new list) or { status, error }.
 */
export async function manageUser(actor, username, { action, role } = {}) {
  if (actor.role !== 'manager') return { status: 403, error: 'Chỉ Quản lý mới quản lý người dùng.' };
  if (username === actor.username) return { status: 400, error: 'Không tự thay đổi tài khoản của chính mình ở đây.' };
  const r = await changeUsers((users) => {
    // the actor is checked again at its turn in the queue: a manager locked or demoted meanwhile decides nothing
    const a = users.find((x) => x.username === actor.username);
    if (!a || a.role !== 'manager' || a.disabled || !a.hash || (actor.sessionCreated || 0) < (a.sessionsValidAfter || 0)) {
      return { status: 403, error: 'Chỉ Quản lý mới quản lý người dùng.' };
    }
    const u = users.find((x) => x.username === username);
    if (!u) return { status: 404, error: 'Không tìm thấy tài khoản.' };
    const pending = u.role === 'pending';
    switch (action) {
      case 'duyet':
        if (!pending) return { status: 400, error: 'Tài khoản này không ở trạng thái chờ duyệt.' };
        if (!ACTIVE_ROLES.includes(role)) return { status: 400, error: 'Chọn vai trò Biên tập, Duyệt phiếu hoặc Quản lý.' };
        u.role = role;
        u.approvedBy = actor.username; u.approvedAt = siteNow();
        break;
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
      case 'vai-tro':
        if (pending) return { status: 400, error: 'Tài khoản đang chờ duyệt: hãy duyệt kèm vai trò.' };
        if (!ACTIVE_ROLES.includes(role)) return { status: 400, error: 'Chọn vai trò Biên tập, Duyệt phiếu hoặc Quản lý.' };
        u.role = role;
        break;
      default:
        return { status: 400, error: 'Thao tác không hợp lệ.' };
    }
    if (activeManagers(users) < 1) return { status: 400, error: 'Phải còn ít nhất một Quản lý đang hoạt động.' };
    // anything that takes rights away ends the account's current sessions
    if (action === 'khoa' || action === 'vai-tro') u.sessionsValidAfter = Date.now();
    console.log(`[news-auth] ${siteNow()} ${actor.username} ${action}${ACTIVE_ROLES.includes(role) ? ' ' + role : ''} ${username}`);
    return { save: true };
  });
  if (r.error) return r;
  return { users: await listUsers() };
}
