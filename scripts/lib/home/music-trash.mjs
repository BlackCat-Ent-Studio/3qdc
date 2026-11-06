// music-trash.mjs — the trash of the background music. A deleted song leaves the player's folder (overrides/home/nhac) at once
// and waits in a folder of its own, data/games/<game>/nhac/thung-rac/<id>/: the song and its cover picture under their own
// names, plus meta.json (who deleted it, when, through what). Nothing in that tree is served to the public.
import { readdir, stat, mkdir, rm, rename, copyFile, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import { moduleDir } from '../admin/paths.mjs';
import { writeJsonAtomic, siteNow, siteNowSeconds } from '../news/news-files.mjs';
import { MUSIC_DIR, SONG_EXT, COVER_EXT, partsOf } from './music-store.mjs';

const TRASH_ID_RE = /^\d{14}-[a-f0-9]{6}$/;
const trashRoot = (gameId) => join(moduleDir(gameId, 'nhac'), 'thung-rac');

// rename, or copy + delete when the trash is on another disk
async function moveFile(from, to) {
  try {
    await rename(from, to);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    await copyFile(from, to, constants.COPYFILE_EXCL);
    await rm(from, { force: true });
  }
}

/**
 * Moves one song (and its cover picture, if it has one) to the trash. `via` is 'web' or 'claude'.
 * Returns { ok, id, name } or { status, error }. The player stops listing it at once (it reads the folder).
 */
export async function trashSong(gameId, rawName, actor, via = 'web') {
  const name = basename(String(rawName || ''));
  if (!name || !SONG_EXT.includes(extname(name).toLowerCase())) return { status: 400, error: 'Tên file không hợp lệ.' };
  const file = join(MUSIC_DIR, name);
  const s = await stat(file).catch(() => null);
  if (!s || !s.isFile()) return { status: 404, error: 'Không tìm thấy bài hát này (có thể đã xoá rồi).' };
  const id = siteNow().replace(/[^0-9]/g, '').slice(0, 14) + '-' + randomBytes(3).toString('hex');
  const dir = join(trashRoot(gameId), id);
  await mkdir(dir, { recursive: true });
  const stem = name.slice(0, -extname(name).length);
  const covers = [];
  for (const ext of COVER_EXT) {
    const c = await stat(join(MUSIC_DIR, stem + ext)).catch(() => null);
    if (c && c.isFile()) covers.push(stem + ext);
  }
  try {
    await moveFile(file, join(dir, name));
    for (const c of covers) await moveFile(join(MUSIC_DIR, c), join(dir, c));
    // meta.json last: a folder without it is never listed, so a failure leaves no half entry to restore
    await writeJsonAtomic(join(dir, 'meta.json'), { name, covers, bytes: s.size, deletedBy: actor, deletedAt: siteNowSeconds(), deletedVia: via });
  } catch (e) {
    // put back what was moved; the song must never vanish between the folder and the trash
    await moveFile(join(dir, name), file).catch(() => {});
    for (const c of covers) await moveFile(join(dir, c), join(MUSIC_DIR, c)).catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }
  return { ok: true, id, name };
}

async function readMeta(gameId, id) {
  if (!TRASH_ID_RE.test(String(id))) return null;
  try {
    const m = JSON.parse(await readFile(join(trashRoot(gameId), id, 'meta.json'), 'utf8'));
    return m && typeof m.name === 'string' && basename(m.name) === m.name ? m : null;
  } catch {
    return null;
  }
}

/** Trashed songs, newest deletion first: [{ id, name, title, artist, bytes, deletedBy, deletedAt, deletedVia }]. */
export async function listSongTrash(gameId) {
  const ids = (await readdir(trashRoot(gameId)).catch(() => [])).filter((n) => TRASH_ID_RE.test(n));
  const out = [];
  for (const id of ids) {
    const m = await readMeta(gameId, id);
    if (m) out.push({ id, name: m.name, ...partsOf(m.name), bytes: m.bytes || 0, deletedBy: m.deletedBy || '', deletedAt: m.deletedAt || '', deletedVia: m.deletedVia || 'web' });
  }
  return out.sort((a, b) => b.id.localeCompare(a.id));
}

/** Brings a trashed song back to the player. Refused when a song of that name is there again. Returns { ok, name } or { status, error }. */
export async function restoreSong(gameId, id) {
  const m = await readMeta(gameId, id);
  if (!m) return { status: 404, error: 'Không tìm thấy bài hát trong thùng rác.' };
  const dir = join(trashRoot(gameId), id);
  const here = await readdir(MUSIC_DIR).catch(() => []);
  if (here.some((n) => n.toLowerCase() === m.name.toLowerCase())) {
    return { status: 409, error: `Đã có bài “${m.name}” trong nhạc nền (có thể đã tải lên lại). Xoá hoặc đổi tên bài đó trước.` };
  }
  if (!(await stat(join(dir, m.name)).catch(() => null))) return { status: 404, error: 'File nhạc trong thùng rác không còn, không khôi phục được.' };
  await mkdir(MUSIC_DIR, { recursive: true });
  await moveFile(join(dir, m.name), join(MUSIC_DIR, m.name));
  for (const c of Array.isArray(m.covers) ? m.covers : []) {
    const clean = basename(String(c));
    // a cover that is there again is left alone: nothing is overwritten
    if (COVER_EXT.includes(extname(clean).toLowerCase()) && !here.includes(clean)) await moveFile(join(dir, clean), join(MUSIC_DIR, clean)).catch(() => {});
  }
  await rm(dir, { recursive: true, force: true });
  return { ok: true, name: m.name };
}

/** Deletes one trashed song for good. Returns { ok, name } or { status, error }. */
export async function purgeSong(gameId, id) {
  const m = await readMeta(gameId, id);
  if (!m) return { status: 404, error: 'Không tìm thấy bài hát trong thùng rác.' };
  await rm(join(trashRoot(gameId), id), { recursive: true, force: true });
  return { ok: true, name: m.name };
}

/** Deletes every trashed song for good. Returns how many. */
export async function emptySongTrash(gameId) {
  let n = 0;
  for (const t of await listSongTrash(gameId)) if ((await purgeSong(gameId, t.id)).ok) n++;
  return n;
}
