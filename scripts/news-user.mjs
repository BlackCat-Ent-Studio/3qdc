// news-user.mjs — accounts for the editor pages (/quan-tri). Run on the server from the project folder:
//   node scripts/news-user.mjs add <username> "<Tên hiển thị>" <kind>   → prints a one-time "set password" link
//   node scripts/news-user.mjs reset <username>                          → new link (old password stops working)
//   node scripts/news-user.mjs disable <username> | enable <username> | remove <username>
//   node scripts/news-user.mjs approve <username> <kind>   → a registration from /quan-tri/dang-ky may sign in
//   node scripts/news-user.mjs reject <username>            → removes a registration still waiting
//   node scripts/news-user.mjs role <username> <kind>       → changes what an active account may do
//   node scripts/news-user.mjs list
// <kind> is one of
//   owner     every game and part, and the accounts / invites / Claude codes pages (only this script makes owners)
//   manager   "Quản lý game 3qdc": every part of 3qdc, no accounts page
//   editor    3qdc news: write, send for review          phieu   3qdc gift tickets: review (no email, no CSV, no delete)
//   '{"skystory":{"tin-tuc":["viet"]}}'   a grants object for any game / part / permission in the books
// Links last 30 minutes and work once. Add --origin <https://address> to print a link for another address.
// A disabled or reset account is signed out on its next request, and its older sessions stay invalid after re-enabling
// (the server reads the account list on every request). The last active owner cannot be locked, removed or demoted.
import { readUsers, writeUsers, newResetToken, USERNAME_RE, usersFile } from './lib/news/admin-auth.mjs';
import { cleanGrants } from './lib/admin/grants.mjs';
import { SITE_ORIGIN } from './lib/news/news-config.mjs';
import { siteNow } from './lib/news/news-files.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('--origin');
const origin = (oi >= 0 ? args.splice(oi, 2)[1] : SITE_ORIGIN || '').replace(/\/+$/, '');
const [cmd, username, a3, a4] = args;

const PRESETS = {
  manager: { '3qdc': '*' },
  editor: { '3qdc': { 'tin-tuc': ['viet'] } },
  phieu: { '3qdc': { 'phieu-be-ngoan': ['duyet'] } },
};

function die(msg) {
  console.error('news-user: ' + msg);
  process.exit(1);
}
const link = (token) => `${origin}/quan-tri/dat-mat-khau#${token}`;

// "owner", a preset name or a grants object as JSON → { role, grants } for the account
function parseKind(text) {
  const s = String(text || '').trim();
  if (s === 'owner') return { role: 'owner' };
  if (Object.hasOwn(PRESETS, s)) return { role: 'member', grants: structuredClone(PRESETS[s]) };
  if (s.startsWith('{')) {
    let input;
    try { input = JSON.parse(s); } catch { die('the grants are not valid JSON'); }
    const r = cleanGrants(input);
    if (r.error) die('grants: ' + r.error);
    if (!Object.keys(r.grants).length) die('grants: name at least one right');
    return { role: 'member', grants: r.grants };
  }
  return die('kind: owner, manager, editor, phieu or a grants object in JSON');
}
const describe = (u) => (u.role === 'owner' ? 'owner' : u.role === 'member' ? `member ${JSON.stringify(u.grants || {})}` : u.role);
function setKind(user, kind) {
  user.role = kind.role;
  if (kind.grants) user.grants = kind.grants; else delete user.grants;
  delete user.legacyRole;
}

const users = await readUsers();
const find = () => users.find((u) => u.username === username) || die(`no account "${username}"`);
const activeOwners = () => users.filter((u) => u.role === 'owner' && !u.disabled && u.hash).length;
// refuses a change that would leave no active owner
function keepAnOwner(change) {
  const before = users.map((u) => ({ ...u }));
  change();
  if (activeOwners() < 1 && before.some((u) => u.role === 'owner' && !u.disabled && u.hash)) {
    users.splice(0, users.length, ...before);
    die('there must be at least one active owner left');
  }
}

switch (cmd) {
  case 'add': {
    if (!USERNAME_RE.test(username || '')) die('username: 3–32 characters, lowercase letters, digits, dot, dash, underscore');
    const name = String(a3 || '').trim();
    if (!name || name.length > 60) die('display name: 1–60 characters, in quotes');
    const kind = parseKind(a4);
    if (users.some((u) => u.username === username)) die(`account "${username}" already exists (use reset)`);
    const user = { username, name, role: kind.role, salt: null, hash: null, disabled: false, createdAt: siteNow() };
    if (kind.grants) user.grants = kind.grants;
    const token = newResetToken(user);
    users.push(user);
    await writeUsers(users);
    console.log(`added ${username} (${name}, ${describe(user)}) in ${usersFile()}`);
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
    keepAnOwner(() => { user.disabled = cmd === 'disable'; });
    if (user.disabled) user.sessionsValidAfter = Date.now(); // re-enabling does not bring old sessions back
    await writeUsers(users);
    console.log(`${username} ${user.disabled ? 'disabled' : 'enabled'}`);
    break;
  }
  case 'remove': {
    find();
    keepAnOwner(() => users.splice(users.findIndex((u) => u.username === username), 1));
    await writeUsers(users);
    console.log(`${username} removed (articles keep the name they were written under)`);
    break;
  }
  case 'approve': {
    const user = find();
    if (user.role !== 'pending') die(`${username} is not waiting for approval (role ${user.role})`);
    setKind(user, parseKind(a3));
    delete user.wantGrants;
    delete user.wantRole;
    user.approvedBy = 'news-user.mjs';
    user.approvedAt = siteNow();
    await writeUsers(users);
    console.log(`${username} (${user.name}) approved as ${describe(user)} — they can sign in now`);
    break;
  }
  case 'reject': {
    const user = find();
    if (user.role !== 'pending') die(`${username} is not waiting for approval (use disable)`);
    users.splice(users.indexOf(user), 1);
    await writeUsers(users);
    console.log(`${username} registration removed`);
    break;
  }
  case 'role': {
    const user = find();
    if (user.role === 'pending') die(`${username} is waiting for approval (use approve)`);
    const kind = parseKind(a3);
    keepAnOwner(() => setKind(user, kind));
    await writeUsers(users);
    console.log(`${username} is now ${describe(user)}`);
    break;
  }
  case 'list':
    if (!users.length) console.log('no accounts');
    for (const u of users) {
      const state = u.role === 'pending' ? 'registered, waiting for approval' : u.disabled ? 'disabled' : u.hash ? 'active' : u.resetExp > Date.now() ? 'waiting for password' : 'no password (link expired)';
      console.log(`${u.username.padEnd(20)} ${describe(u)}\t${u.name}\t${state}`);
    }
    break;
  default:
    die('usage: add <username> "<name>" <kind> | reset <username> | approve <username> <kind> | reject <username> | disable|enable|remove <username> | role <username> <kind> | list  [--origin URL]   (kind: owner, manager, editor, phieu or a grants object in JSON)');
}
