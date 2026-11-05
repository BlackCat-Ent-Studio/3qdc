#!/usr/bin/env node
// migrate-games-data.mjs — moves the data folders of the old layout into the per-game layout (see scripts/lib/admin/paths.mjs).
//
//   node scripts/migrate-games-data.mjs [--root <data folder>] [--dry-run]            list what would move (default; writes nothing)
//   node scripts/migrate-games-data.mjs [--root <data folder>] --apply [--nhap]       move the files, count before and after
//   node scripts/migrate-games-data.mjs [--root <data folder>] --undo [--dry-run] [--force]   put every moved file back
//   --cho-phep <name>   an unknown entry in the old news folder (as listed) to move into he-thong/chua-phan-loai/<name> too
//   --nhap              skip the "service is stopped" check (a draft copy, nothing listens on the live port 3399 nor on $PORT)
//   --force             (undo) also move back the files made after the move (new articles, pictures, sign-ups); without it the
//                       undo lists them and stops, so nothing is silently left behind
// Undo order: the accounts first (migrate-users-grants.mjs --undo), the data afterwards. The undo refuses while
// he-thong/users.json still has owner / member accounts: the old server would read them and lock everybody out.
//
// --root defaults to $DATA_ROOT, else ./data. Files are renamed (same disk: instant, never copied). Counts (files, bytes,
// sha256 of the sorted file names) are taken per destination folder before and after; a difference puts everything back
// and exits with an error. Files already at their new place (git moved the tracked ones when the code was merged) are
// counted and left alone; a file present in both places stops the run. Git is never touched.
import { readdir, stat, rename, mkdir, rmdir, readFile, writeFile, chown, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { connect } from 'node:net';
import { join, dirname, resolve } from 'node:path';

const TARGET_GAME = '3qdc';
const G = `games/${TARGET_GAME}`;
// [old path, new path, group name]; a folder rule moves every file below it
const RULES = [
  ['news/users.json', 'he-thong/users.json', 'he-thong'],
  ['news/invites.json', 'he-thong/invites.json', 'he-thong'],
  ['news/mcp-tokens.json', 'he-thong/mcp-tokens.json', 'he-thong'],
  ['news/posts', `${G}/tin-tuc/posts`, 'tin-tuc/posts'],
  ['news/revisions', `${G}/tin-tuc/revisions`, 'tin-tuc/revisions'],
  ['news/trash', `${G}/tin-tuc/trash`, 'tin-tuc/trash'],
  ['news/uploads', `${G}/tin-tuc/uploads`, 'tin-tuc/uploads'],
  ['phieu-be-ngoan', `${G}/phieu-be-ngoan`, 'phieu-be-ngoan'],
  ['dang-ky-som', `${G}/dang-ky-som`, 'dang-ky-som'],
];
const OLD_TOP = ['news', 'phieu-be-ngoan', 'dang-ky-som'];
const LOG_REL = 'he-thong/chuyen-du-lieu.json';
const UNDONE_REL = 'he-thong/chuyen-du-lieu.da-hoan-tac.json';
const STRAY_DIR = 'he-thong/chua-phan-loai';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const values = (n) => args.flatMap((a, i) => (a === n && args[i + 1] ? [args[i + 1]] : []));
const ROOT = resolve(values('--root')[0] || process.env.DATA_ROOT || join(process.cwd(), 'data'));
const mode = flag('--undo') ? 'undo' : flag('--apply') ? 'apply' : 'dry-run';
if (flag('--apply') && flag('--undo')) die('choose one of --apply and --undo');

function die(msg) { console.error('migrate-games-data: ' + msg); process.exit(1); }
const abs = (rel) => join(ROOT, ...rel.split('/'));

async function exists(p) { try { await lstat(p); return true; } catch { return false; } }

// every file below dir as paths relative to ROOT (slash separated); a missing folder has none
async function filesBelow(relDir) {
  const out = [];
  async function walk(rel) {
    let ents;
    try { ents = await readdir(abs(rel), { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return; throw e; }
    for (const e of ents) {
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) await walk(r); else out.push(r);
    }
  }
  const st = await lstat(abs(relDir)).catch(() => null);
  if (!st) return out;
  if (st.isDirectory()) await walk(relDir); else out.push(relDir);
  return out;
}

function destOf(rel) {
  for (const [from, to, group] of RULES) {
    if (rel === from) return { to, group };
    if (rel.startsWith(from + '/')) return { to: to + rel.slice(from.length), group };
  }
  return null;
}

// the first path segment below the old top folder, as the person running the script sees it ("news/README.txt" → "README.txt")
const strayName = (rel) => (rel.startsWith('news/') ? rel.slice(5).split('/')[0] : rel.split('/')[0]);

// the plan: moves [{from, to, group, bytes}], strays that need --cho-phep, conflicts, and what is already in place
async function plan() {
  const allowed = new Set(values('--cho-phep'));
  const moves = [];
  const unknown = new Set();
  const conflicts = [];
  for (const top of OLD_TOP) {
    for (const rel of await filesBelow(top)) {
      let d = destOf(rel);
      if (!d) {
        const name = strayName(rel);
        if (!allowed.has(name)) { unknown.add(name); continue; }
        d = { to: `${STRAY_DIR}/${rel.startsWith('news/') ? rel.slice(5) : rel}`, group: 'chua-phan-loai' };
      }
      const st = await stat(abs(rel));
      if (await exists(abs(d.to))) { conflicts.push(`${rel} and ${d.to} both exist`); continue; }
      moves.push({ from: rel, to: d.to, group: d.group, bytes: st.size });
    }
  }
  return { moves, unknown: [...unknown].sort(), conflicts };
}

// counts of one destination group: files that will be there (moved or already there), their bytes, sha256 of sorted names
async function countGroups(moves) {
  const groups = new Map();
  const add = (g, rel, bytes) => { if (!groups.has(g)) groups.set(g, new Map()); groups.get(g).set(rel, bytes); };
  for (const [, to, group] of [...RULES, [null, STRAY_DIR, 'chua-phan-loai']]) {
    for (const rel of await filesBelow(to)) add(group, rel, (await stat(abs(rel))).size);
  }
  for (const m of moves) add(m.group, m.to, m.bytes);
  const out = {};
  for (const [g, files] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
    const names = [...files.keys()].sort();
    out[g] = { files: names.length, bytes: [...files.values()].reduce((a, b) => a + b, 0), names: createHash('sha256').update(names.join('\n')).digest('hex') };
  }
  return out;
}

function printTable(moves, before) {
  const by = new Map();
  for (const m of moves) {
    const rule = RULES.find(([from]) => m.from === from || m.from.startsWith(from + '/'));
    const k = rule ? `${rule[0]} -> ${rule[1]}` : `${m.from} -> ${m.to}`;
    const r = by.get(k) || { files: 0, bytes: 0 };
    r.files++; r.bytes += m.bytes; by.set(k, r);
  }
  console.log(`data folder: ${ROOT}`);
  console.log('to move:');
  if (!by.size) console.log('  (nothing)');
  for (const [k, r] of [...by].sort()) console.log(`  ${k}   ${r.files} file(s), ${r.bytes} bytes`);
  console.log('counts per destination (including files already in place):');
  for (const [g, c] of Object.entries(before)) console.log(`  ${g.padEnd(18)} ${String(c.files).padStart(5)} file(s) ${String(c.bytes).padStart(10)} bytes  names sha256 ${c.names.slice(0, 16)}`);
}

// the live port is always tried, whatever $PORT says (a shell left over from the draft must not hide the live service)
const LIVE_PORT = 3399;
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

// folders made by the script get the owner of the data folder (the script may run as root, the server does not)
let owner = null;
async function mkdirs(rel, created) {
  const parts = rel.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const r = parts.slice(0, i).join('/');
    if (await exists(abs(r))) continue;
    await mkdir(abs(r));
    created.push(r);
    if (owner) await chown(abs(r), owner.uid, owner.gid);
  }
}

async function removeEmptyDirs(rels) {
  for (const r of rels) { try { await rmdir(abs(r)); } catch { /* not empty or already gone */ } }
}

// every folder at or below the old top folders, deepest first, to clear the empty ones left after the moves
async function oldFolders() {
  const out = [];
  async function walk(rel) {
    let ents;
    try { ents = await readdir(abs(rel), { withFileTypes: true }); } catch { return; }
    for (const e of ents) if (e.isDirectory()) await walk(`${rel}/${e.name}`);
    out.push(rel);
  }
  for (const top of OLD_TOP) await walk(top);
  return out;
}

async function rollback(done, created) {
  for (const m of [...done].reverse()) {
    await mkdirs(dirname(m.from), []);
    await rename(abs(m.to), abs(m.from));
  }
  await removeEmptyDirs([...created].reverse());
}

async function apply() {
  await stopIfUp();
  const { moves, unknown, conflicts } = await plan();
  if (unknown.length) die(`unknown entries in the old data folders (name each with --cho-phep): ${unknown.join(', ')}`);
  if (conflicts.length) die(`not moving anything: ${conflicts.join('; ')}`);
  if (await exists(abs(LOG_REL))) die(`${LOG_REL} exists: an earlier run was not undone`);
  if (process.getuid && process.getuid() === 0) { const s = await stat(ROOT); owner = { uid: s.uid, gid: s.gid }; }
  const before = await countGroups(moves);
  printTable(moves, before);
  // files already at their new place before the move (git put them there): the undo must not mistake them for new ones
  const kept = [];
  for (const [, to] of RULES) kept.push(...await filesBelow(to));
  const done = [];
  const created = [];
  try {
    for (const m of moves) {
      await mkdirs(dirname(m.to), created);
      await rename(abs(m.from), abs(m.to));
      done.push(m);
    }
    const after = await countGroups([]);
    const bad = Object.keys({ ...before, ...after }).filter((g) => JSON.stringify(before[g]) !== JSON.stringify(after[g]));
    if (bad.length) throw new Error(`counts differ after the move in: ${bad.join(', ')}`);
    await removeEmptyDirs(await oldFolders());
    await mkdirs(dirname(LOG_REL), created);
    await writeFile(abs(LOG_REL), JSON.stringify({ at: new Date().toISOString(), root: ROOT, before, after, moves: done.map(({ from, to }) => ({ from, to })), kept, created }, null, 2) + '\n');
    if (owner) await chown(abs(LOG_REL), owner.uid, owner.gid);
    console.log(`done: ${done.length} file(s) moved, counts before = after. Undo: node scripts/migrate-games-data.mjs --root ${ROOT} --undo`);
  } catch (e) {
    console.error('migrate-games-data: ' + e.message + ' -- putting everything back');
    await rollback(done, created);
    die('stopped, nothing changed');
  }
}

async function undo() {
  const dry = flag('--dry-run');
  let log;
  try { log = JSON.parse(await readFile(abs(LOG_REL), 'utf8')); } catch { die(`${LOG_REL} not found: nothing to undo`); }
  // order: accounts first. The old server does not know owner / member and would lock everybody out
  try {
    const users = JSON.parse(await readFile(abs('he-thong/users.json'), 'utf8'));
    const newForm = Array.isArray(users) ? users.filter((u) => u && (u.role === 'owner' || u.role === 'member')).length : 0;
    if (newForm) die(`he-thong/users.json still has ${newForm} owner / member account(s): undo the accounts first (node scripts/migrate-users-grants.mjs --root ${ROOT} --undo), then run this again`);
  } catch (e) { if (e.code !== 'ENOENT' && !(e instanceof SyntaxError)) throw e; }
  for (const m of log.moves) {
    if (!(await exists(abs(m.to)))) die(`cannot undo: ${m.to} is missing`);
    if (await exists(abs(m.from))) die(`cannot undo: ${m.from} exists again`);
  }
  // files made after the move below the new folders (the move log does not know them): they go back too, or the run stops
  const known = new Set([...log.moves.map((m) => m.to), ...(log.kept || [])]);
  const later = [];
  for (const [from, to] of RULES) {
    if (to.startsWith('he-thong/')) continue;
    for (const rel of await filesBelow(to)) if (!known.has(rel)) later.push({ from: from + rel.slice(to.length), to: rel });
  }
  const laterNames = later.map((m) => m.to);
  const hereOnly = (await filesBelow('he-thong')).filter((r) => r !== LOG_REL && !known.has(r));
  if (later.length) {
    console.log(`${later.length} file(s) made after the move (the old server reads them from the old place):`);
    for (const m of later.slice(0, 50)) console.log(`  ${m.to} -> ${m.from}`);
    if (later.length > 50) console.log(`  ... and ${later.length - 50} more`);
  }
  if (hereOnly.length) console.log(`stay in he-thong (the old server ignores them): ${hereOnly.join(', ')}`);
  console.log('order: the accounts first (migrate-users-grants.mjs --undo), the data afterwards (this script)');
  if (dry) { console.log(`dry run: nothing was changed (${log.moves.length + later.length} file(s) would go back)`); return; }
  if (later.length && !flag('--force')) die(`stopped, nothing changed: ${later.length} file(s) were made after the move; add --force to move them back too`);
  for (const m of later) if (await exists(abs(m.from))) die(`cannot undo: ${m.from} exists (needed for ${m.to})`);
  await stopIfUp();
  if (process.getuid && process.getuid() === 0) { const s = await stat(ROOT); owner = { uid: s.uid, gid: s.gid }; }
  for (const m of [...log.moves, ...later]) {
    await mkdirs(dirname(m.from), []);
    await rename(abs(m.to), abs(m.from));
  }
  // the folders the move created, deepest first, when they are empty now
  const dirs = new Set(log.created.filter((r) => r !== 'he-thong'));
  await removeEmptyDirs([...dirs].reverse());
  await rename(abs(LOG_REL), abs(UNDONE_REL));
  await removeEmptyDirs(['he-thong', 'games/3qdc', 'games']); // only when empty
  console.log(`undone: ${log.moves.length + laterNames.length} file(s) back in the old layout (log kept as ${UNDONE_REL})`);
}

if (mode === 'undo') await undo();
else if (mode === 'apply') await apply();
else {
  const { moves, unknown, conflicts } = await plan();
  printTable(moves, await countGroups(moves));
  for (const n of unknown) console.log(`UNKNOWN in the old data folders: ${n}  (--apply refuses unless --cho-phep ${n})`);
  for (const c of conflicts) console.log(`CONFLICT: ${c}`);
  console.log('dry run: nothing was changed');
}
