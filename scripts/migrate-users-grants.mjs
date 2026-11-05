#!/usr/bin/env node
// migrate-users-grants.mjs — turns the old account roles (manager / editor / phieu) into owner / member + grants.
// Runs on the per-game data layout (he-thong/users.json, he-thong/invites.json): run scripts/migrate-games-data.mjs first.
//
//   node scripts/migrate-users-grants.mjs --owner <username> [--root <data folder>] [--dry-run]   table of who becomes what (writes nothing)
//   node scripts/migrate-users-grants.mjs --owner <username> [--root <data folder>] --apply [--nhap]
//   node scripts/migrate-users-grants.mjs [--root <data folder>] --undo [--dry-run] [--force] [--nhap]   back to the old files
//   --owner   the one manager who becomes "owner" (required); the other managers become "Quản lý game 3qdc"
//   --nhap    skip the "service is stopped" check (a draft copy, nothing listens on the live port 3399 nor on $PORT)
//   --force   (undo) restore the old files although accounts or invites changed after the move; those changes are lost
//
// Table (3qdc is the only game today):
//   manager --owner <name>  owner          manager (others)  member { 3qdc: "*" }
//   editor                  member { 3qdc: { tin-tuc: [viet] } }
//   phieu                   member { 3qdc: { phieu-be-ngoan: [duyet] } }
//   pending (wantRole)      pending, wantGrants by the same table      disabled stays disabled
// The old role is kept as `legacyRole`. Passwords (salt, hash), reset links, session marks and every other field are not
// touched, so every password keeps working. Open invites (invites.json) get the grants they offer.
// --apply keeps the two files exactly as they were (users.truoc-chuyen-quyen.json, invites.truoc-chuyen-quyen.json) and a
// record of the move (chuyen-quyen.json). --undo copies those two files back, byte for byte: nobody is promoted by a guess.
// When accounts or invites changed after the move (new, removed, other rights) the undo stops, names them (account and field
// names only) and goes on only with --force; --undo --dry-run only prints that.
import { readFile, writeFile, rename, copyFile, stat, chown, chmod, lstat } from 'node:fs/promises';
import { connect } from 'node:net';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : ''; };
const ROOT = resolve(value('--root') || process.env.DATA_ROOT || join(process.cwd(), 'data'));
const USERS = join(ROOT, 'he-thong', 'users.json');
const INVITES = join(ROOT, 'he-thong', 'invites.json');
const BACKUP = join(ROOT, 'he-thong', 'users.truoc-chuyen-quyen.json');
const INVITES_BACKUP = join(ROOT, 'he-thong', 'invites.truoc-chuyen-quyen.json');
const MARKER = join(ROOT, 'he-thong', 'chuyen-quyen.json');
const LIVE_PORT = 3399;
const GAME = '3qdc';

const PRESETS = {
  editor: { [GAME]: { 'tin-tuc': ['viet'] } },
  phieu: { [GAME]: { 'phieu-be-ngoan': ['duyet'] } },
  manager: { [GAME]: '*' },
};
const OLD_ROLES = Object.keys(PRESETS);
// fields this script changes; everything else must come out identical
const TOUCHED = new Set(['role', 'grants', 'wantGrants', 'wantRole', 'legacyRole']);

function die(msg) { console.error('migrate-users-grants: ' + msg); process.exit(1); }
const mode = flag('--undo') ? 'undo' : flag('--apply') ? 'apply' : 'dry-run';
if (flag('--apply') && flag('--undo')) die('choose one of --apply and --undo');
let OWNER = value('--owner');
if (mode !== 'undo' && !OWNER) die('--owner <username> is required: the one manager who becomes the owner');

async function readList(file) {
  let text;
  try { text = await readFile(file, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const list = JSON.parse(text);
  if (!Array.isArray(list)) die(`${file} is not a list`);
  return list;
}

// the live port is always tried, whatever $PORT says (a shell left over from the draft must not hide the live service)
async function portAnswers(port) {
  return new Promise((ok) => {
    const s = connect({ port, host: '127.0.0.1' });
    s.once('connect', () => { s.destroy(); ok(true); });
    s.once('error', () => ok(false));
    s.setTimeout(1500, () => { s.destroy(); ok(false); });
  });
}
async function stopIfUp() {
  if (flag('--nhap')) return;
  for (const port of new Set([Number(process.env.PORT) || 0, LIVE_PORT])) {
    if (port && await portAnswers(port)) die(`the service answers on port ${port}: stop it first (or add --nhap for a draft copy)`);
  }
}

// ---- forward ----
// → the new account fields for an old account, or null when it is already in the new form
function forward(u) {
  if (u.role === 'owner' || u.role === 'member') return null;
  if (u.role === 'pending') {
    if (!u.wantRole) return { role: 'pending' };
    if (!PRESETS[u.wantRole]) die(`${u.username}: wantRole "${u.wantRole}" is not a role of the old table`);
    return { role: 'pending', wantGrants: structuredClone(PRESETS[u.wantRole]), drop: ['wantRole'] };
  }
  if (!OLD_ROLES.includes(u.role)) die(`${u.username}: role "${u.role}" is not in the table (manager, editor, phieu, pending)`);
  if (u.role === 'manager' && u.username === OWNER) return { role: 'owner', legacyRole: 'manager' };
  return { role: 'member', grants: structuredClone(PRESETS[u.role]), legacyRole: u.role };
}

const summary = (u) => (u.role === 'owner' ? 'everything' : u.role === 'member' ? JSON.stringify(u.grants) : u.role === 'pending' && u.wantGrants ? `asks for ${JSON.stringify(u.wantGrants)}` : '-');

function convert(users) {
  const out = [];
  const rows = [];
  for (const u of users) {
    const f = forward(u);
    if (!f) { out.push(u); rows.push([u.username, u.name, 'already new', u.role, summary(u)]); continue; }
    const n = { ...u };
    for (const k of f.drop || []) delete n[k];
    const { drop, ...set } = f;
    Object.assign(n, set);
    out.push(n);
    rows.push([u.username, u.name, u.role + (u.wantRole ? ` (wants ${u.wantRole})` : '') + (u.disabled ? ' [disabled]' : ''), n.role + (u.disabled ? ' [disabled]' : ''), summary(n)]);
  }
  return { out, rows };
}

function convertInvites(list) {
  return list.map((i) => (i.grants || !PRESETS[i.role] ? i : { ...i, grants: structuredClone(PRESETS[i.role]) }));
}

// ---- backward ----
// what changed in a list of records (accounts by username, invites by id) since the move: names only, never values
function describeDiff(current, expected, key, what) {
  const cur = new Map(current.map((x) => [x[key], x]));
  const exp = new Map(expected.map((x) => [x[key], x]));
  const lines = [];
  for (const k of cur.keys()) if (!exp.has(k)) lines.push(`${what} "${k}" was added after the move: it is lost`);
  for (const k of exp.keys()) if (!cur.has(k)) lines.push(`${what} "${k}" was removed after the move: it comes back`);
  for (const [k, c] of cur) {
    const e = exp.get(k);
    if (!e) continue;
    const fields = [...new Set([...Object.keys(c), ...Object.keys(e)])].filter((f) => JSON.stringify(c[f]) !== JSON.stringify(e[f]));
    if (fields.length) lines.push(`${what} "${k}" changed after the move (${fields.join(', ')}): the old value comes back`);
  }
  return lines;
}

// the file copied byte for byte (private, owned like the data folder)
async function restoreFile(from, to, owner) {
  const tmp = `${to}.tmp-${process.pid}`;
  await copyFile(from, tmp);
  await chmod(tmp, 0o600);
  if (owner) await chown(tmp, owner.uid, owner.gid);
  await rename(tmp, to);
}

const markerDone = () => MARKER.replace(/\.json$/, '.da-hoan-tac.json');

// every field the script does not own is identical, and nobody was added or dropped
function sameUntouched(before, after) {
  if (before.length !== after.length) return 'the number of accounts changed';
  for (let i = 0; i < before.length; i++) {
    const a = before[i], b = after[i];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!TOUCHED.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])) return `${a.username}: field ${k} changed`;
    }
  }
  return null;
}

async function writeAtomic(file, list, owner) {
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(list, null, 2) + '\n', { mode: 0o600 });
  if (owner) await chown(tmp, owner.uid, owner.gid);
  await rename(tmp, file);
}

function printRows(rows) {
  const head = ['account', 'name', 'now', 'after', 'grants'];
  const all = [head, ...rows];
  const w = head.map((_, c) => Math.min(70, Math.max(...all.map((r) => String(r[c]).length))));
  for (const r of all) console.log('  ' + r.map((v, c) => String(v).slice(0, w[c]).padEnd(w[c])).join('  '));
}

async function main() {
  const users = await readList(USERS);
  if (!users) die(`${USERS} not found${await exists(join(ROOT, 'news', 'users.json')) ? ' (the old layout is still there: run scripts/migrate-games-data.mjs first)' : ''}`);
  console.log(`data folder: ${ROOT}`);

  if (mode === 'undo') {
    const dry = flag('--dry-run');
    const backup = await readList(BACKUP);
    if (!backup) die(`${BACKUP} not found: the copy of the old accounts made by --apply is needed, nothing to undo`);
    let marker = null;
    try { marker = JSON.parse(await readFile(MARKER, 'utf8')); } catch { /* an older move left no record */ }
    const invBackup = await readList(INVITES_BACKUP);
    const inv = await readList(INVITES);
    const changes = [];
    if (marker && typeof marker.owner === 'string') {
      OWNER = marker.owner;
      changes.push(...describeDiff(users, convert(backup).out, 'username', 'account'));
      if (invBackup) changes.push(...describeDiff(inv || [], convertInvites(invBackup), 'id', 'invite'));
    } else {
      changes.push('there is no record of the move (chuyen-quyen.json): what changed since cannot be told');
    }
    if (!invBackup && inv) changes.push('there is no copy of the old invites: invites.json stays as it is (the old server cannot use invites without a role)');
    printRows(users.map((u) => { const o = backup.find((b) => b.username === u.username); return [u.username, u.name, u.role, o ? o.role : '(new: lost)', '-']; }));
    if (changes.length) {
      console.log(`${changes.length} difference(s) since the move:`);
      for (const c of changes) console.log('  - ' + c);
    } else console.log('nothing changed since the move: only the roles go back');
    console.log('order: undo the accounts (this script) first, the data (migrate-games-data.mjs --undo) afterwards');
    if (dry) { console.log('dry run: nothing was changed'); return; }
    if (changes.length && !flag('--force')) die('stopped, nothing changed: add --force to restore the old files anyway (the differences above are lost)');
    await stopIfUp();
    const owner = await ownerOf();
    await restoreFile(BACKUP, USERS, owner);
    if (invBackup) await restoreFile(INVITES_BACKUP, INVITES, owner);
    if (marker) await rename(MARKER, markerDone());
    console.log(`undone: accounts${invBackup ? ' and invites' : ''} back as they were before the move (copied from ${BACKUP})`);
    return;
  }

  const me = users.find((u) => u.username === OWNER);
  if (!me) die(`--owner ${OWNER}: no such account`);
  if (me.role !== 'manager' && me.role !== 'owner') die(`--owner ${OWNER} is not a manager (role ${me.role})`);
  if (me.disabled || !me.hash) die(`--owner ${OWNER} is locked or has no password`);

  const { out, rows } = convert(users);
  const bad = sameUntouched(users, out);
  if (bad) die('stopped, nothing changed: ' + bad);
  if (!out.some((u) => u.role === 'owner' && !u.disabled && u.hash)) die('no active owner would be left');
  console.log('who becomes what:');
  printRows(rows);
  const count = (role) => out.filter((u) => u.role === role).length;
  console.log(`totals: ${out.length} account(s) -> ${count('owner')} owner, ${count('member')} member, ${count('pending')} pending, ${out.filter((u) => u.disabled).length} disabled`);
  const inv = await readList(INVITES);
  const openInvites = inv ? convertInvites(inv) : null;
  if (inv) console.log(`invites: ${inv.length} (${inv.filter((i) => !i.grants && PRESETS[i.role]).length} get grants)`);

  if (mode === 'dry-run') { console.log('dry run: nothing was changed'); return; }

  const nothingToDo = JSON.stringify(out) === JSON.stringify(users) && (!inv || JSON.stringify(openInvites) === JSON.stringify(inv));
  if (nothingToDo) { console.log('nothing to move: the accounts are already in the new form (the copy of the old files is kept as it is)'); return; }
  if (await exists(MARKER)) die(`${MARKER} exists: an earlier move was not undone, its copy of the old files must not be overwritten (run --undo first)`);
  await stopIfUp();
  const owner = await ownerOf();
  const keep = async (from, to) => { await copyFile(from, to); await chmod(to, 0o600); if (owner) await chown(to, owner.uid, owner.gid); }; // they hold password hashes
  await keep(USERS, BACKUP);
  if (inv) await keep(INVITES, INVITES_BACKUP);
  await writeFile(MARKER, JSON.stringify({ at: new Date().toISOString(), owner: OWNER }, null, 2) + '\n', { mode: 0o600 });
  if (owner) await chown(MARKER, owner.uid, owner.gid);
  await writeAtomic(USERS, out, owner);
  if (openInvites) await writeAtomic(INVITES, openInvites, owner);
  // read it back: same people, same secrets
  const again = await readList(USERS);
  const problem = sameUntouched(users, again);
  if (problem) {
    await copyFile(BACKUP, USERS);
    if (inv) await copyFile(INVITES_BACKUP, INVITES);
    await rename(MARKER, markerDone());
    die('the file read back differently (' + problem + '); the old file was put back');
  }
  console.log(`done: ${again.length} account(s) moved. Copy of the old files:${BACKUP}. Undo: node scripts/migrate-users-grants.mjs --root ${ROOT} --undo`);
}

async function exists(p) { try { await lstat(p); return true; } catch { return false; } }
// the script may run as root, the server does not: new files get the owner of the data folder
async function ownerOf() {
  if (!(process.getuid && process.getuid() === 0)) return null;
  const s = await stat(ROOT);
  return { uid: s.uid, gid: s.gid };
}

main().catch((e) => { console.error('migrate-users-grants: ' + (e && e.message ? e.message : e)); process.exit(1); });
