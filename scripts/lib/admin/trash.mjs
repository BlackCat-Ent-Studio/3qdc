// trash.mjs — the trash of every part, behind one set of functions. Deleting from a part's page or through Claude only ever
// MOVES the item here (nothing is lost, and it records who deleted it, when and through what); bringing it back and
// deleting it for good are separate steps. The web handlers (trash-api.mjs) and Claude's tools call these same functions, so
// both do exactly the same thing.
//
// A trashed item is on no public page, in no count and in no CSV (the stores keep it outside their lists).
//
// Who may do what is decided by the caller, not here:
//   see / bring back   the permission in TRASH_PERMS for the part (held in the game)
//   delete for good    owners only, from the web page only (purgeFromTrash / emptyTrash have no Claude tool)
//
// Every function resolves { ok: true, ... } or { status, error } (status = the HTTP status a web page answers with).
//   gameId  the game the part belongs to (tickets, sign-ups and music keep their data for 3qdc only)
//   part    'tin-tuc' | 'phieu-be-ngoan' | 'dang-ky-som' | 'nhac'
//   via     'web' | 'claude' — written on the item; actor is the name written beside it
//   key     the item's id inside the trash (listTrash gives it as `key`)
import { gameById } from './games.mjs';
import { newsStore, stampAfter, TRASH_NAME_RE } from '../news/news-store.mjs';
import { trashPhieu, listPhieuTrash, restorePhieu, purgePhieu, emptyPhieuTrash } from '../phieu/phieu-store.mjs';
import { trashSignup, listSignupTrash, restoreSignup, purgeSignup, emptySignupTrash, normalizePhone } from '../signup/signup-store.mjs';
import { trashSong, listSongTrash, restoreSong, purgeSong, emptySongTrash } from '../home/music-trash.mjs';

// the permission that opens a part's trash (and brings items back); deleting for good is for owners whatever the part
export const TRASH_PERMS = { 'tin-tuc': 'duyet', 'phieu-be-ngoan': 'quan-ly', 'dang-ky-som': 'quan-ly', nhac: 'quan-ly' };
export const TRASH_PARTS = Object.keys(TRASH_PERMS);

const NOT_FOUND = (what) => ({ status: 404, error: `Không tìm thấy ${what} trong thùng rác.` });

function check(gameId, part) {
  if (!Object.hasOwn(TRASH_PERMS, part)) return { status: 404, error: 'Phần này không có thùng rác.' };
  const game = gameById(gameId);
  if (!game || !Object.hasOwn(game.modules, part)) return { status: 404, error: 'Game này chưa bật phần này.' };
  return null;
}

// ---------- the parts ----------
const PARTS = {
  'tin-tuc': {
    what: 'bài',
    async list(gameId) {
      return (await newsStore(gameId).listTrash()).map((t) => ({ key: t.file, label: t.title, ...t }));
    },
    // ref = article id; opts.baseUpdatedAt (when given) must still be the article's last change, else 409
    async move(gameId, ref, actor, via, opts) {
      const id = Number(ref);
      if (!Number.isInteger(id) || id < 1) return { status: 404, error: 'Không tìm thấy bài (có thể đã bị xoá).' };
      return newsStore(gameId).change(async ({ posts, remove }) => {
        const cur = posts.find((p) => p.id === id);
        if (!cur) return { status: 404, error: 'Không tìm thấy bài (có thể đã bị xoá).' };
        if (Object.hasOwn(opts, 'baseUpdatedAt') && opts.baseUpdatedAt !== cur.updatedAt) return { status: 409, error: 'Bài vừa được sửa. Tải lại trước khi xoá.' };
        await remove(cur, actor, via);
        return { ok: true, label: cur.title, id };
      });
    },
    async restore(gameId, key, actor) {
      if (!TRASH_NAME_RE.test(String(key))) return NOT_FOUND('bài');
      const r = await newsStore(gameId).change(({ restore }) => restore(key, actor, stampAfter(null)));
      return r.error ? r : { ok: true, label: r.post.title, post: r.post };
    },
    async purge(gameId, key) {
      if (!TRASH_NAME_RE.test(String(key))) return NOT_FOUND('bài');
      const r = await newsStore(gameId).change(({ purge }) => purge(key));
      return r.error ? r : { ok: true, label: r.title, id: r.id };
    },
    async empty(gameId) {
      const store = newsStore(gameId);
      const deleted = await store.change(async ({ purge }) => {
        let n = 0;
        for (const t of await store.listTrash()) if (!(await purge(t.file)).error) n++;
        return n;
      });
      return { ok: true, deleted };
    },
  },

  'phieu-be-ngoan': {
    what: 'phiếu',
    async list() {
      return (await listPhieuTrash()).map((t) => ({ key: t.id, label: `${t.acc} (${t.serverTen})`, ...t }));
    },
    async move(gameId, ref, actor, via) {
      const t = await trashPhieu(String(ref), actor, via);
      return t ? { ok: true, label: `${t.acc} (${t.ngay})`, id: t.id, email: t.email } : { status: 404, error: 'Không tìm thấy phiếu này (có thể vừa bị xoá).' };
    },
    async restore(gameId, key) {
      const r = await restorePhieu(String(key));
      if (r.notFound) return NOT_FOUND('phiếu');
      return r.conflict ? { status: 409, error: r.conflict } : { ok: true, label: `${r.item.acc} (${r.item.ngay})` };
    },
    async purge(gameId, key) {
      const t = await purgePhieu(String(key));
      return t ? { ok: true, label: `${t.acc} (${t.ngay})` } : NOT_FOUND('phiếu');
    },
    async empty() { return { ok: true, deleted: await emptyPhieuTrash() }; },
  },

  'dang-ky-som': {
    what: 'số',
    async list() {
      return (await listSignupTrash()).map((r) => ({ key: r.sdt, label: r.sdt, ...r }));
    },
    async move(gameId, ref, actor, via) {
      const sdt = normalizePhone(ref);
      if (!sdt) return { status: 400, error: 'Số điện thoại không hợp lệ.' };
      const r = await trashSignup(sdt, actor, via);
      return r ? { ok: true, label: sdt, count: r.count } : { status: 404, error: 'Không tìm thấy số này trong danh sách.' };
    },
    async restore(gameId, key) {
      const sdt = normalizePhone(key);
      const r = sdt ? await restoreSignup(sdt) : { notFound: true };
      if (r.notFound) return NOT_FOUND('số');
      return r.conflict ? { status: 409, error: r.conflict } : { ok: true, label: sdt, count: r.count };
    },
    async purge(gameId, key) {
      const sdt = normalizePhone(key);
      const r = sdt ? await purgeSignup(sdt) : null;
      return r ? { ok: true, label: sdt } : NOT_FOUND('số');
    },
    async empty() { return { ok: true, deleted: await emptySignupTrash() }; },
  },

  nhac: {
    what: 'bài hát',
    async list(gameId) {
      return (await listSongTrash(gameId)).map((s) => ({ key: s.id, label: s.name, ...s }));
    },
    async move(gameId, ref, actor, via) {
      const r = await trashSong(gameId, ref, actor, via);
      return r.error ? r : { ok: true, label: r.name, id: r.id };
    },
    async restore(gameId, key) {
      const r = await restoreSong(gameId, String(key));
      return r.error ? r : { ok: true, label: r.name };
    },
    async purge(gameId, key) {
      const r = await purgeSong(gameId, String(key));
      return r.error ? r : { ok: true, label: r.name };
    },
    async empty(gameId) { return { ok: true, deleted: await emptySongTrash(gameId) }; },
  },
};

// ---------- the functions the web handlers and Claude's tools call ----------

/** What is in a part's trash, newest deletion first: [{ key, label, deletedBy, deletedAt, deletedVia, ...the item }]. */
export async function listTrash(gameId, part) {
  const bad = check(gameId, part);
  return bad || { ok: true, items: await PARTS[part].list(gameId) };
}

/**
 * Moves one item to the trash. `ref` names the live item: article id, ticket id, phone number or song file name.
 * opts.baseUpdatedAt (news only, when given) makes the move fail with 409 if the article changed since it was read.
 */
export async function moveToTrash(gameId, part, ref, { actor, via = 'web', ...opts } = {}) {
  const bad = check(gameId, part);
  if (bad) return bad;
  if (!actor) throw new Error('moveToTrash needs the actor');
  return PARTS[part].move(gameId, ref, actor, via === 'claude' ? 'claude' : 'web', opts);
}

/** Brings one item back (an article comes back as a draft; actorName = display name for the stamp on it, default actor). 404 when it is not in the trash, 409 when something took its place. */
export async function restoreFromTrash(gameId, part, key, { actor, actorName, via = 'web' } = {}) {
  const bad = check(gameId, part);
  if (bad) return bad;
  // an article brought back as a draft is stamped with the person's display name, as every edit of it is
  return PARTS[part].restore(gameId, key, actorName || actor || '');
}

/** Deletes one trashed item for good. Owners only, from the web page only — the caller checks. */
export async function purgeFromTrash(gameId, part, key) {
  const bad = check(gameId, part);
  return bad || PARTS[part].purge(gameId, key);
}

/** Deletes everything in a part's trash for good. Owners only, from the web page only — the caller checks. */
export async function emptyTrash(gameId, part) {
  const bad = check(gameId, part);
  return bad || PARTS[part].empty(gameId);
}
