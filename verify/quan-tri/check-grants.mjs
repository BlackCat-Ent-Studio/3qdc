// check-grants.mjs — who may do what, per game and part (scripts/lib/admin/grants.mjs), and the move of old accounts to
// grants (scripts/migrate-users-grants.mjs). Needs no running server:   node verify/quan-tri/check-grants.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { can, hasAnyAccess, cleanGrants, newsRoleOf, gamesOf, isOwner } from '../../scripts/lib/admin/grants.mjs';
import { MODULES } from '../../scripts/lib/admin/modules.mjs';
import { GAMES } from '../../scripts/lib/admin/games.mjs';
import { layoutProblems } from '../../scripts/lib/admin/data-layout.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`ok   ${name}`); };

// two games with every part switched on, so each account × game × part × permission can be listed
const ALL = { 'tin-tuc': {}, 'phieu-be-ngoan': {}, 'dang-ky-som': {}, nhac: {} };
const REG = {
  games: [{ ...GAMES.find((g) => g.id === '3qdc'), modules: ALL }, { id: 'skystory', name: 'Thiên Không Kỳ Truyện', logo: '', sites: [], modules: ALL }],
  modules: MODULES,
};
const PERMS = ['tin-tuc:viet', 'tin-tuc:duyet', 'phieu-be-ngoan:duyet', 'phieu-be-ngoan:quan-ly', 'dang-ky-som:quan-ly', 'nhac:quan-ly'];
const KEYS = ['3qdc', 'skystory'].flatMap((g) => PERMS.map((p) => `${g}:${p}`));
const held = (user) => KEYS.filter((k) => { const [g, m, p] = k.split(':'); return can(user, g, m, p, REG); });
const six = (g) => PERMS.map((p) => `${g}:${p}`);
const member = (grants) => ({ role: 'member', grants });

const TABLE = [
  ['owner', { role: 'owner' }, KEYS],
  ['game manager 3qdc', member({ '3qdc': '*' }), six('3qdc')],
  ['game manager skystory', member({ skystory: '*' }), six('skystory')],
  ['writer 3qdc', member({ '3qdc': { 'tin-tuc': ['viet'] } }), ['3qdc:tin-tuc:viet']],
  ['reviewer 3qdc news (duyet includes viet)', member({ '3qdc': { 'tin-tuc': ['duyet'] } }), ['3qdc:tin-tuc:viet', '3qdc:tin-tuc:duyet']],
  ['tickets duyet 3qdc', member({ '3qdc': { 'phieu-be-ngoan': ['duyet'] } }), ['3qdc:phieu-be-ngoan:duyet']],
  ['tickets quan-ly 3qdc (includes duyet)', member({ '3qdc': { 'phieu-be-ngoan': ['quan-ly'] } }), ['3qdc:phieu-be-ngoan:duyet', '3qdc:phieu-be-ngoan:quan-ly']],
  ['writer in both games', member({ '3qdc': { 'tin-tuc': ['viet'] }, skystory: { 'tin-tuc': ['viet'] } }), ['3qdc:tin-tuc:viet', 'skystory:tin-tuc:viet']],
  ['music + sign-ups 3qdc', member({ '3qdc': { nhac: ['quan-ly'], 'dang-ky-som': ['quan-ly'] } }), ['3qdc:dang-ky-som:quan-ly', '3qdc:nhac:quan-ly']],
  ['member without grants', member({}), []],
  ['pending that asks for everything', { role: 'pending', grants: { '3qdc': '*' }, wantGrants: { '3qdc': '*' } }, []],
  ['no account', null, []],
];
for (const [name, user, want] of TABLE) ok(`rights: ${name}`, () => assert.deepEqual(held(user).sort(), [...want].sort()));

ok('rights: "*" also covers a part that is switched on later', () => {
  const later = { games: [{ ...REG.games[0], modules: { 'tin-tuc': {} } }], modules: MODULES };
  const u = member({ '3qdc': '*' });
  assert.equal(can(u, '3qdc', 'phieu-be-ngoan', 'duyet', later), false);
  later.games[0].modules['phieu-be-ngoan'] = {};
  assert.equal(can(u, '3qdc', 'phieu-be-ngoan', 'duyet', later), true);
});
ok('rights: a part the game has not switched on, an unknown game / part / permission are all refused (even for the owner)', () => {
  const o = { role: 'owner' };
  assert.equal(can(o, 'skystory', 'tin-tuc', 'viet'), false); // real book: skystory has nothing on
  assert.equal(can(o, 'khong-co', 'tin-tuc', 'viet', REG), false);
  assert.equal(can(o, '3qdc', 'khong-co', 'viet', REG), false);
  assert.equal(can(o, '3qdc', 'tin-tuc', 'bay', REG), false);
  assert.equal(can(o, '3qdc', 'tin-tuc', 'constructor', REG), false);
});
ok('rights: odd stored data never throws and gives nothing', () => {
  for (const g of [null, [], 'x', { '3qdc': 'x' }, { '3qdc': ['viet'] }, { '3qdc': { 'tin-tuc': 'viet' } }, { '3qdc': { 'tin-tuc': [1, null, {}] } }, { __proto__: { '3qdc': '*' } }, { constructor: '*' }]) {
    assert.deepEqual(held(member(g)), [], JSON.stringify(g));
  }
  assert.equal(can(member({ '3qdc': '*' }), '__proto__', 'tin-tuc', 'viet', REG), false);
  assert.equal(can({ role: 'manager' }, '3qdc', 'tin-tuc', 'viet', REG), false); // the old roles grant nothing
});

ok('403 vs 404 input: hasAnyAccess', () => {
  assert.equal(hasAnyAccess({ role: 'owner' }, 'skystory'), true);
  assert.equal(hasAnyAccess({ role: 'owner' }, 'khong-co'), false);
  assert.equal(hasAnyAccess(member({ '3qdc': { nhac: ['quan-ly'] } }), '3qdc'), true);
  assert.equal(hasAnyAccess(member({ '3qdc': { nhac: ['quan-ly'] } }), 'skystory'), false);
  assert.equal(hasAnyAccess(member({ skystory: '*' }), 'skystory'), true);
  assert.equal(hasAnyAccess(member({ skystory: {} }), 'skystory'), false);
  assert.equal(hasAnyAccess({ role: 'pending', grants: { '3qdc': '*' } }, '3qdc'), false);
});

ok('news role for the article rules', () => {
  assert.equal(newsRoleOf({ role: 'owner' }, '3qdc', REG), 'manager');
  assert.equal(newsRoleOf(member({ '3qdc': '*' }), '3qdc', REG), 'manager');
  assert.equal(newsRoleOf(member({ '3qdc': { 'tin-tuc': ['duyet'] } }), '3qdc', REG), 'manager');
  assert.equal(newsRoleOf(member({ '3qdc': { 'tin-tuc': ['viet'] } }), '3qdc', REG), 'editor');
  assert.equal(newsRoleOf(member({ '3qdc': { 'tin-tuc': ['viet'] } }), 'skystory', REG), null);
  assert.equal(newsRoleOf(member({ '3qdc': { 'phieu-be-ngoan': ['duyet'] } }), '3qdc', REG), null);
});

ok('cleanGrants: accepts, orders, de-duplicates', () => {
  const r = cleanGrants({ '3qdc': { 'tin-tuc': ['duyet', 'viet', 'viet'], nhac: [] }, skystory: '*' }, { reg: REG });
  assert.deepEqual(r.grants, { '3qdc': { 'tin-tuc': ['viet', 'duyet'] }, skystory: '*' });
  assert.deepEqual(cleanGrants(undefined, { reg: REG }).grants, {});
});
ok('cleanGrants: refuses what is not in the books, with a clear message', () => {
  const err = (input, re) => assert.match(cleanGrants(input, { reg: REG }).error, re);
  err({ 'khong-co': '*' }, /game "khong-co"/);
  err({ '3qdc': { 'khong-co': ['viet'] } }, /phần "khong-co"/);
  err({ '3qdc': { 'tin-tuc': ['bay'] } }, /quyền "bay"/);
  err({ '3qdc': 'x' }, /"\*" hoặc danh sách phần/);
  err({ '3qdc': { 'tin-tuc': 'viet' } }, /danh sách/);
  err('x', /đối tượng/);
  err([], /đối tượng/);
  // a part the game has not switched on (real book: skystory has none)
  assert.match(cleanGrants({ skystory: { 'tin-tuc': ['viet'] } }).error, /chưa bật phần "tin-tuc"/);
});
ok('cleanGrants lenient: drops the unknown, keeps the rest, lists what it dropped', () => {
  const r = cleanGrants({ 'khong-co': '*', '3qdc': { 'tin-tuc': ['viet', 'bay'], 'khong-co': ['x'] } }, { lenient: true, reg: REG });
  assert.deepEqual(r.grants, { '3qdc': { 'tin-tuc': ['viet'] } });
  assert.equal(r.dropped.length, 3);
});

ok('/toi: games with menu and permissions, only what the account may open', () => {
  const v = gamesOf(member({ '3qdc': { 'tin-tuc': ['duyet'], 'phieu-be-ngoan': ['duyet'] } }), REG);
  assert.deepEqual(v.map((g) => g.id), ['3qdc']);
  assert.deepEqual(v[0].menu.map((m) => m[0]), ['posts', 'trash', 'phieu']);
  assert.deepEqual(v[0].perms, { 'tin-tuc': ['viet', 'duyet'], 'phieu-be-ngoan': ['duyet'] });
  assert.deepEqual(gamesOf({ role: 'owner' }, REG).map((g) => g.id), ['3qdc', 'skystory']);
  assert.deepEqual(gamesOf(member({}), REG), []);
  assert.equal(isOwner({ role: 'owner' }), true);
  assert.equal(isOwner(member({ '3qdc': '*' })), false);
});

// ---------- the move of old accounts ----------
const SCRIPT = join(ROOT, 'scripts', 'migrate-users-grants.mjs');
const run = (root, ...a) => spawnSync(process.execPath, [SCRIPT, '--root', root, '--nhap', ...a], { encoding: 'utf8', cwd: ROOT });
const mk = () => {
  const root = mkdtempSync(join(tmpdir(), 'grants-'));
  mkdirSync(join(root, 'he-thong'), { recursive: true });
  const acct = (username, role, extra = {}) => ({ username, name: username, role, salt: 's-' + username, hash: 'h-' + username, disabled: false, createdAt: '2026-01-01', sessionsValidAfter: 5, ...extra });
  writeFileSync(join(root, 'he-thong', 'users.json'), JSON.stringify([
    acct('chu', 'manager'), acct('quanly2', 'manager'), acct('bientap', 'editor'), acct('phieu1', 'phieu'),
    acct('cho', 'pending', { wantRole: 'phieu' }), acct('cho2', 'pending'), acct('khoa', 'editor', { disabled: true }),
  ]));
  writeFileSync(join(root, 'he-thong', 'invites.json'), JSON.stringify([{ id: 'a', hash: 'x', role: 'phieu', createdBy: 'chu', exp: 1 }]));
  return root;
};
const users = (root) => JSON.parse(readFileSync(join(root, 'he-thong', 'users.json'), 'utf8'));

ok('move: --owner is required; a dry run writes nothing', () => {
  const root = mk();
  const before = readFileSync(join(root, 'he-thong', 'users.json'), 'utf8');
  assert.notEqual(run(root, '--dry-run').status, 0);
  const r = run(root, '--owner', 'chu', '--dry-run');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /dry run: nothing was changed/);
  assert.equal(readFileSync(join(root, 'he-thong', 'users.json'), 'utf8'), before);
  assert.equal(existsSync(join(root, 'he-thong', 'users.truoc-chuyen-quyen.json')), false);
  assert.notEqual(run(root, '--owner', 'khong-co', '--apply').status, 0);
  assert.notEqual(run(root, '--owner', 'bientap', '--apply').status, 0); // not a manager
  assert.notEqual(run(root, '--owner', 'khoa', '--apply').status, 0);
  rmSync(root, { recursive: true });
});
ok('move: the table, secrets untouched, invites get grants, a copy is kept', () => {
  const root = mk();
  const old = users(root);
  const r = run(root, '--owner', 'chu', '--apply');
  assert.equal(r.status, 0, r.stderr);
  const u = Object.fromEntries(users(root).map((x) => [x.username, x]));
  assert.equal(u.chu.role, 'owner'); assert.equal(u.chu.legacyRole, 'manager'); assert.equal(u.chu.grants, undefined);
  assert.deepEqual([u.quanly2.role, u.quanly2.grants], ['member', { '3qdc': '*' }]);
  assert.deepEqual(u.bientap.grants, { '3qdc': { 'tin-tuc': ['viet'] } });
  assert.deepEqual(u.phieu1.grants, { '3qdc': { 'phieu-be-ngoan': ['duyet'] } });
  assert.deepEqual([u.cho.role, u.cho.wantGrants, u.cho.wantRole], ['pending', { '3qdc': { 'phieu-be-ngoan': ['duyet'] } }, undefined]);
  assert.deepEqual([u.cho2.role, u.cho2.wantGrants], ['pending', undefined]);
  assert.deepEqual([u.khoa.role, u.khoa.disabled, u.khoa.legacyRole], ['member', true, 'editor']);
  for (const o of old) for (const k of ['salt', 'hash', 'sessionsValidAfter', 'createdAt', 'name', 'disabled']) assert.deepEqual(u[o.username][k], o[k], `${o.username}.${k}`);
  assert.equal(users(root).length, old.length);
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'he-thong', 'invites.json'), 'utf8'))[0].grants, { '3qdc': { 'phieu-be-ngoan': ['duyet'] } });
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'he-thong', 'users.truoc-chuyen-quyen.json'), 'utf8')), old);
  // a second run changes nothing
  const again = readFileSync(join(root, 'he-thong', 'users.json'), 'utf8');
  assert.equal(run(root, '--owner', 'chu', '--apply').status, 0);
  assert.equal(readFileSync(join(root, 'he-thong', 'users.json'), 'utf8'), again);
  // only the named manager is owner; nobody can ever be made owner by the table otherwise
  assert.deepEqual(users(root).filter((x) => x.role === 'owner').map((x) => x.username), ['chu']);
  rmSync(root, { recursive: true });
});
ok('move: --undo puts the old roles back (a new account gets the nearest old role)', () => {
  const root = mk();
  const old = users(root);
  assert.equal(run(root, '--owner', 'chu', '--apply').status, 0);
  const list = users(root);
  list.push({ username: 'neu', name: 'neu', role: 'member', grants: { '3qdc': { 'tin-tuc': ['duyet'] } }, salt: 's', hash: 'h' });
  list.push({ username: 'neu2', name: 'neu2', role: 'member', grants: { '3qdc': { 'phieu-be-ngoan': ['duyet'] } }, salt: 's', hash: 'h' });
  writeFileSync(join(root, 'he-thong', 'users.json'), JSON.stringify(list));
  assert.equal(run(root, '--undo').status, 0);
  const back = users(root);
  assert.deepEqual(back.slice(0, old.length), old);
  assert.deepEqual(back.slice(old.length).map((x) => [x.username, x.role, x.grants, x.legacyRole]), [['neu', 'manager', undefined, undefined], ['neu2', 'phieu', undefined, undefined]]);
  assert.equal(JSON.parse(readFileSync(join(root, 'he-thong', 'invites.json'), 'utf8'))[0].grants, undefined);
  rmSync(root, { recursive: true });
});
ok('move: a server with old roles in users.json refuses to start (data-layout)', () => {
  const root = mk();
  assert.match(layoutProblems(root, {}).join('\n'), /still have the old roles[^]*migrate-users-grants/);
  assert.equal(run(root, '--owner', 'chu', '--apply').status, 0);
  assert.deepEqual(layoutProblems(root, {}), []);
  rmSync(root, { recursive: true });
});

console.log(`${n} checks passed`);
