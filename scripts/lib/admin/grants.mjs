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

/**
 * What /toi tells the page: the games the account can open. Each has its menu (filtered) and the permissions held per part,
 * plus what the overview shows: the parts the game has switched on (with their permission labels) and its web addresses.
 * A game with nothing switched on is still listed for an account that has rights in it (an owner, or "Quản lý game").
 */
export function gamesOf(user, reg = defaultReg()) {
  const out = [];
  for (const g of reg.games) {
    const menu = [];
    const perms = {};
    const parts = [];
    const trash = []; // the parts whose trash this account may open (the game's "Thùng rác" screen)
    for (const mid of Object.keys(g.modules || {})) {
      const m = reg.modules[mid];
      if (!m) continue;
      parts.push({ id: mid, name: m.name, perms: m.perms });
      const held = Object.keys(m.perms).filter((p) => can(user, g.id, mid, p, reg));
      if (held.length) perms[mid] = held;
      for (const [tab, hash, label, perm] of m.menu) if (can(user, g.id, mid, perm, reg)) menu.push([tab, hash, label]);
      if (m.trash && can(user, g.id, mid, m.trash, reg)) trash.push(mid);
    }
    if (trash.length) menu.push(['trash', '#/thung-rac', 'Thùng rác']);
    if (menu.length || hasAnyAccess(user, g.id, reg)) {
      const sites = (g.sites || []).map((s) => ({ id: s.id, name: s.name, host: (s.hosts || [])[0] || s.path || '', path: s.path || '', module: s.module || null }));
      out.push({ id: g.id, name: g.name, logo: g.logo, menu, perms, parts, trash, sites });
    }
  }
  return out;
}

/**
 * Rights written for people: [{ id, name, all, parts: [{ id, name, perms: [short words] }] }]. What is not in the books is
 * left out. Used where a person who is not signed in reads what an invite link carries.
 */
export function describeGrants(grants, reg = defaultReg()) {
  const out = [];
  for (const [gid, value] of Object.entries(isObj(grants) ? grants : {})) {
    const game = gameIn(reg, gid);
    if (!game) continue;
    if (value === '*') { out.push({ id: gid, name: game.name, all: true, parts: [] }); continue; }
    if (!isObj(value)) continue;
    const parts = [];
    for (const [mid, list] of Object.entries(value)) {
      const mod = Object.hasOwn(reg.modules, mid) ? reg.modules[mid] : null;
      if (!mod || !Array.isArray(list)) continue;
      const perms = list.filter((p) => Object.hasOwn(mod.perms, p)).map((p) => (mod.short && mod.short[p]) || mod.perms[p]);
      if (perms.length) parts.push({ id: mid, name: mod.name, perms });
    }
    if (parts.length) out.push({ id: gid, name: game.name, all: false, parts });
  }
  return out;
}

/** The books as the accounts page needs them: every game with the parts it has switched on, their permissions, short words and `implies`. */
export function rightsCatalog(reg = defaultReg()) {
  return reg.games.map((g) => ({
    id: g.id,
    name: g.name,
    parts: Object.keys(g.modules || {}).filter((mid) => Object.hasOwn(reg.modules, mid)).map((mid) => {
      const m = reg.modules[mid];
      return { id: mid, name: m.name, perms: m.perms, short: m.short || {}, implies: m.implies || {} };
    }),
  }));
}
