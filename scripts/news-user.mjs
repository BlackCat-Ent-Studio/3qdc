// news-user.mjs — accounts for the editor pages (/quan-tri). Run on the server from the project folder:
//   node scripts/news-user.mjs add <username> "<Tên hiển thị>" manager|editor   → prints a one-time "set password" link
//   node scripts/news-user.mjs reset <username>                                  → new link (old password stops working)
//   node scripts/news-user.mjs disable <username> | enable <username> | remove <username>
//   node scripts/news-user.mjs role <username> manager|editor
//   node scripts/news-user.mjs list
// Links last 30 minutes and work once. Add --origin <https://address> to print a link for another address.
// A disabled or reset account is signed out on its next request, and its older sessions stay invalid after re-enabling
// (the server reads the account list on every request).
import { readUsers, writeUsers, newResetToken, USERNAME_RE, usersFile } from './lib/news/admin-auth.mjs';
import { SITE_ORIGIN } from './lib/news/news-config.mjs';
import { siteNow } from './lib/news/news-files.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('--origin');
const origin = (oi >= 0 ? args.splice(oi, 2)[1] : SITE_ORIGIN || '').replace(/\/+$/, '');
const [cmd, username, a3, a4] = args;
const ROLE_NAMES = { manager: 'Quản lý', editor: 'Biên tập' };

function die(msg) {
  console.error('news-user: ' + msg);
  process.exit(1);
}
const link = (token) => `${origin}/quan-tri/dat-mat-khau#${token}`;

const users = await readUsers();
const find = () => users.find((u) => u.username === username) || die(`no account "${username}"`);

switch (cmd) {
  case 'add': {
    if (!USERNAME_RE.test(username || '')) die('username: 3–32 characters, lowercase letters, digits, dot, dash, underscore');
    const name = String(a3 || '').trim();
    if (!name || name.length > 60) die('display name: 1–60 characters, in quotes');
    if (!ROLE_NAMES[a4]) die('role: manager or editor');
    if (users.some((u) => u.username === username)) die(`account "${username}" already exists (use reset)`);
    const user = { username, name, role: a4, salt: null, hash: null, disabled: false, createdAt: siteNow() };
    const token = newResetToken(user);
    users.push(user);
    await writeUsers(users);
    console.log(`added ${username} (${name}, ${ROLE_NAMES[a4]}) in ${usersFile()}`);
    console.log(`set-password link (30 minutes, one use):\n${link(token)}`);
    break;
  }
  case 'reset': {
    const user = find();
    user.salt = null;
    user.hash = null;
    user.sessionsValidAfter = Date.now();
    const token = newResetToken(user);
    await writeUsers(users);
    console.log(`password cleared for ${username}; set-password link (30 minutes, one use):\n${link(token)}`);
    break;
  }
  case 'disable':
  case 'enable': {
    const user = find();
    user.disabled = cmd === 'disable';
    if (user.disabled) user.sessionsValidAfter = Date.now(); // re-enabling does not bring old sessions back
    await writeUsers(users);
    console.log(`${username} ${user.disabled ? 'disabled' : 'enabled'}`);
    break;
  }
  case 'remove': {
    find();
    users.splice(users.findIndex((u) => u.username === username), 1);
    await writeUsers(users);
    console.log(`${username} removed (articles keep the name they were written under)`);
    break;
  }
  case 'role': {
    const user = find();
    if (!ROLE_NAMES[a3]) die('role: manager or editor');
    user.role = a3;
    await writeUsers(users);
    console.log(`${username} is now ${ROLE_NAMES[a3]}`);
    break;
  }
  case 'list':
    if (!users.length) console.log('no accounts');
    for (const u of users) {
      const state = u.disabled ? 'disabled' : u.hash ? 'active' : u.resetExp > Date.now() ? 'waiting for password' : 'no password (link expired)';
      console.log(`${u.username.padEnd(20)} ${ROLE_NAMES[u.role] || u.role}\t${u.name}\t${state}`);
    }
    break;
  default:
    die('usage: add <username> "<name>" manager|editor | reset <username> | disable|enable|remove <username> | role <username> manager|editor | list  [--origin URL]');
}
