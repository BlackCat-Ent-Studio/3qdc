// grants.mjs — who may do what, per game and per part. Pure functions over the book of games and the book of parts, so
// every account type × game × part can be tested directly (verify/quan-tri/check-grants.mjs).
//
//   account   { role: 'owner' | 'member' | 'pending', grants }
//   owner     every game, every part, plus the accounts / invites / Claude codes pages (set only by the account scripts)
//   member    only what `grants` lists:  { "<game>": "*" }                          the whole game ("Quản lý game": every
//                                                                                    permission of every part switched on,
//                                                                                    also parts switched on later)
//                                         { "<game>": { "<part>": ["<perm>", ...] } } single permissions
//   pending   nothing (cannot sign in)
// A permission can include others (modules.mjs `implies`): "duyet" of tin-tuc includes "viet".
import { GAMES } from './games.mjs';
import { MODULES } from './modules.mjs';

// read when called, not when loaded: the parts import this file and modules.mjs imports the parts
const defaultReg = () => ({ games: GAMES, modules: MODULES });
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const gameIn = (reg, id) => reg.games.find((g) => g.id === id) || null;
const enabled = (game, mid) => Object.hasOwn(game.modules || {}, mid);

export const isOwner = (user) => !!user && user.role === 'owner';

// does the list of permissions held in a part include `perm` (directly or through `implies`)?
function holds(list, mod, perm) {
  return Array.isArray(list) && list.some((h) => h === perm || (mod.implies && mod.implies[h] || []).includes(perm));
}

/** May this account use permission `perm` of part `moduleId` in game `gameId`? Unknown game / part / permission → false. */
export function can(user, gameId, moduleId, perm, reg = defaultReg()) {
  if (!user || (user.role !== 'owner' && user.role !== 'member')) return false;
  const game = gameIn(reg, gameId);
  if (!game || !enabled(game, moduleId)) return false;
  const mod = Object.hasOwn(reg.modules, moduleId) ? reg.modules[moduleId] : null;
  if (!mod || !Object.hasOwn(mod.perms, perm)) return false;
  if (user.role === 'owner') return true;
  if (!isObj(user.grants) || !Object.hasOwn(user.grants, gameId)) return false;
  const g = user.grants[gameId];
  if (g === '*') return true;
  return isObj(g) && Object.hasOwn(g, moduleId) && holds(g[moduleId], mod, perm);
}

/** Does this account have any right at all in the game (even one the game has not switched on yet)? Decides 403 vs 404. */
export function hasAnyAccess(user, gameId, reg = defaultReg()) {
  if (!user || (user.role !== 'owner' && user.role !== 'member')) return false;
  if (!gameIn(reg, gameId)) return false;
  if (user.role === 'owner') return true;
  const { grants } = cleanGrants(user.grants, { lenient: true, reg });
  return Object.hasOwn(grants, gameId);
}

/**
 * Checks a grants object. Strict (default): used for what a person sends; returns { grants } or { error } naming the
 * first thing wrong (unknown game, unknown part, part not switched on for the game, unknown permission).
 * Lenient: used on what is already stored; drops what is not in the books and lists it in `dropped`.
 * The result is normalised: "*" or { part: [perms in the part's own order] }, nothing empty, no duplicates.
 */
export function cleanGrants(input, { lenient = false, reg = defaultReg() } = {}) {
  const out = {};
  const dropped = [];
  const bad = (msg) => { if (!lenient) throw new Error(msg); dropped.push(msg); };
  try {
    if (input === undefined || input === null) return { grants: out, dropped };
    if (!isObj(input)) { bad('quyền phải là một đối tượng { game: ... }'); return { grants: out, dropped }; }
    for (const [gameId, value] of Object.entries(input)) {
      const game = gameIn(reg, gameId);
      if (!game) { bad(`game "${gameId}" không có trong sổ`); continue; }
      if (value === '*') { out[gameId] = '*'; continue; }
      if (!isObj(value)) { bad(`quyền của game "${gameId}" phải là "*" hoặc danh sách phần`); continue; }
      const parts = {};
      for (const [mid, list] of Object.entries(value)) {
        if (!Object.hasOwn(reg.modules, mid)) { bad(`phần "${mid}" không có trong sổ (game "${gameId}")`); continue; }
        if (!enabled(game, mid) && !lenient) { bad(`game "${gameId}" chưa bật phần "${mid}"`); continue; }
        if (!Array.isArray(list)) { bad(`quyền của phần "${mid}" phải là một danh sách`); continue; }
        const mod = reg.modules[mid];
        const keep = new Set();
        for (const p of list) {
          if (typeof p === 'string' && Object.hasOwn(mod.perms, p)) keep.add(p);
          else bad(`quyền "${String(p).slice(0, 40)}" không có trong phần "${mid}"`);
        }
        const ordered = Object.keys(mod.perms).filter((p) => keep.has(p));
        if (ordered.length) parts[mid] = ordered;
      }
      if (Object.keys(parts).length) out[gameId] = parts;
    }
  } catch (e) {
    return { error: e.message };
  }
  return { grants: out, dropped };
}

/** The news role the article rules (news-workflow.mjs decide / mayDelete) know: 'manager' with duyet, 'editor' with only viet. */
export function newsRoleOf(user, gameId, reg = defaultReg()) {
  if (can(user, gameId, 'tin-tuc', 'duyet', reg)) return 'manager';
  if (can(user, gameId, 'tin-tuc', 'viet', reg)) return 'editor';
  return null;
}

/** What /toi tells the page: the games the account can open, each with its menu (filtered) and permissions per part. */
export function gamesOf(user, reg = defaultReg()) {
  const out = [];
  for (const g of reg.games) {
    const menu = [];
    const perms = {};
    for (const mid of Object.keys(g.modules || {})) {
      const m = reg.modules[mid];
      if (!m) continue;
      const held = Object.keys(m.perms).filter((p) => can(user, g.id, mid, p, reg));
      if (held.length) perms[mid] = held;
      for (const [tab, hash, label, perm] of m.menu) if (can(user, g.id, mid, perm, reg)) menu.push([tab, hash, label]);
    }
    if (menu.length) out.push({ id: g.id, name: g.name, logo: g.logo, menu, perms });
  }
  return out;
}
