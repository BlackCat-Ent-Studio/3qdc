// phieu-store.mjs — the gift tickets players send from Phiếu Bé Ngoan, kept in data/phieu-be-ngoan/phieu.json.
// Tickets change after they are sent (the admin marks them given or refused), so the whole list is rewritten
// atomically on every change instead of appended to. The list is read once into memory on first use; all writes go
// through one queue, so two requests at the same moment can never give one player two tickets on the same day.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readJson, writeJsonAtomic, siteNow, siteNowSeconds } from '../news/news-files.mjs';
import { DATA_DIR, STATES, serverName } from './phieu-config.mjs';

const listFile = () => join(DATA_DIR, 'phieu.json');
// Deleted tickets wait here (the ticket as it was, plus who deleted it, when and through what): a ticket in this file is
// in no list, no count and no CSV, and the player's history does not show it.
const trashFile = () => join(DATA_DIR, 'thung-rac.json');

// the site's calendar day (+07:00) of a moment, YYYY-MM-DD
export const dayOf = (ms = Date.now()) => siteNow(ms).slice(0, 10);

let loading = null; // Promise of the ticket array (oldest first)

function load() {
  if (!loading) {
    loading = (async () => {
      const saved = await readJson(listFile(), { items: [] });
      return Array.isArray(saved && saved.items) ? saved.items : [];
    })();
    loading.catch(() => { loading = null; }); // a failed read is tried again on the next request
  }
  return loading;
}

let queue = Promise.resolve();
// Runs fn(items) alone; when it returns { save: true } the list is written before the next job starts.
function exclusive(fn) {
  const job = queue.then(async () => {
    const items = await load();
    const r = await fn(items);
    if (r && r.save) {
      try {
        await mkdir(DATA_DIR, { recursive: true });
        await writeJsonAtomic(listFile(), { items });
      } catch (e) {
        // the change was not saved: forget the in-memory copy so the next request reads the file again
        loading = null;
        throw e;
      }
      if (r.afterSave) await r.afterSave();
    }
    return r && 'value' in r ? r.value : r;
  });
  queue = job.catch(() => {});
  return job;
}

const newId = () => Date.now().toString(36) + randomBytes(3).toString('hex');

// What the player sees of their own ticket (no internal fields).
export const playerView = (t) => ({ id: t.id, luc: t.luc, ngay: t.ngay, acc: t.acc, server: t.server, qua: t.qua, ghiChu: t.ghiChu, st: t.st, phanHoi: t.phanHoi });

// Adds a ticket unless this email already has one today. Fields must already be checked. → { ok, item } | { already, item }
export function addPhieu({ email, ten, acc, server, qua, ghiChu }, now = Date.now()) {
  return exclusive(async (items) => {
    const ngay = dayOf(now);
    const mine = items.find((t) => t.email === email && t.ngay === ngay);
    if (mine) return { value: { already: true, item: mine } };
    const item = { id: newId(), email, ten: ten || '', acc, server, qua, ghiChu: ghiChu || '', luc: siteNowSeconds(now), ngay, st: 'cho', phanHoi: '', xuLyBoi: '', xuLyLuc: '' };
    items.push(item);
    return { save: true, value: { ok: true, item } };
  });
}

// One player's tickets, newest first, and today's ticket (or null).
export async function myPhieu(email, now = Date.now()) {
  const items = await load();
  const list = items.filter((t) => t.email === email).reverse();
  const ngay = dayOf(now);
  return { homNay: list.find((t) => t.ngay === ngay) || null, lichSu: list };
}

// A ticket without the player's email address, for "Duyệt phiếu" accounts and Claude: they give gifts by in-game
// character and server, and have no need for the address.
export const withoutEmail = (t) => { const { email, ...rest } = t; return rest; };

// Admin list: ngay = 'hom-nay' | 'hom-qua' | 'tat-ca', st = 'all' | a state. Counts are per state within the day filter.
export async function listPhieu({ ngay = 'hom-nay', st = 'all' } = {}, now = Date.now()) {
  const items = await load();
  const want = ngay === 'hom-qua' ? dayOf(now - 86400e3) : ngay === 'tat-ca' ? '' : dayOf(now);
  const inDay = want ? items.filter((t) => t.ngay === want) : items.slice();
  const counts = { all: inDay.length, cho: 0, tra: 0, tu: 0 };
  for (const t of inDay) counts[t.st] = (counts[t.st] || 0) + 1;
  const shown = (Object.hasOwn(STATES, st) ? inDay.filter((t) => t.st === st) : inDay).reverse();
  // copies, so the stored tickets never pick up the display-only server name
  return { items: shown.map((t) => ({ ...t, serverTen: serverName(t.server) })), counts, cho: items.filter((t) => t.st === 'cho').length };
}

// Marks a ticket given / refused / back to waiting. → the ticket, or null when the id is unknown.
export function setStatus(id, st, phanHoi, username) {
  return exclusive(async (items) => {
    const t = items.find((x) => x.id === id);
    if (!t) return { value: null };
    t.st = st;
    t.phanHoi = st === 'cho' ? '' : phanHoi;
    t.xuLyBoi = st === 'cho' ? '' : username;
    t.xuLyLuc = st === 'cho' ? '' : siteNowSeconds();
    return { save: true, value: t };
  });
}

// Gives or refuses a ticket only while it is still waiting (Claude's tools use this: a ticket somebody already handled
// is never overwritten). → { item } | { notFound: true } | { already: ticket }
export function answerPhieu(id, st, phanHoi, username) {
  return exclusive(async (items) => {
    const t = items.find((x) => x.id === id);
    if (!t) return { value: { notFound: true } };
    if (t.st !== 'cho') return { value: { already: t } };
    t.st = st;
    t.phanHoi = phanHoi;
    t.xuLyBoi = username;
    t.xuLyLuc = siteNowSeconds();
    return { save: true, value: { item: t } };
  });
}

// ---------- trash ----------
async function readTrash() {
  const saved = await readJson(trashFile(), { items: [] });
  return Array.isArray(saved && saved.items) ? saved.items : [];
}
async function writeTrash(list) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeJsonAtomic(trashFile(), { items: list });
}
const withoutTrashMarks = ({ deletedBy, deletedAt, deletedVia, ...ticket }) => ticket;

// Moves a ticket to the trash. A ticket of today no longer counts, so that player may send another one today.
// `via` is 'web' or 'claude'. → the ticket, or null when the id is unknown.
// The trash is written before the list: a failure in between leaves the ticket in both (nothing is lost).
export function trashPhieu(id, actor, via = 'web') {
  return exclusive(async (items) => {
    const i = items.findIndex((x) => x.id === id);
    if (i < 0) return { value: null };
    const t = items[i];
    const list = await readTrash();
    list.push({ ...t, deletedBy: actor, deletedAt: siteNowSeconds(), deletedVia: via });
    await writeTrash(list);
    items.splice(i, 1);
    return { save: true, value: t };
  });
}

// Trashed tickets, newest deletion first (copies, with the server's name added for display).
export async function listPhieuTrash() {
  const list = await readTrash();
  return list.slice().reverse().map((t) => ({ ...t, serverTen: serverName(t.server) }));
}

// Puts a trashed ticket back among the tickets in the order they were sent. It is refused when the same id is back
// already, or when the player has sent another ticket on that day meanwhile (a player gets one ticket a day).
// → { item } | { notFound: true } | { conflict: sentence }
export function restorePhieu(id) {
  return exclusive(async (items) => {
    const list = await readTrash();
    const k = list.findIndex((x) => x.id === id);
    if (k < 0) return { value: { notFound: true } };
    const t = withoutTrashMarks(list[k]);
    if (items.some((x) => x.id === t.id)) return { value: { conflict: 'Phiếu này đã có trong danh sách (có thể đã khôi phục rồi).' } };
    if (items.some((x) => x.email === t.email && x.ngay === t.ngay)) {
      return { value: { conflict: 'Người chơi này đã gửi phiếu khác trong ngày đó, không khôi phục thêm được (mỗi người một phiếu một ngày).' } };
    }
    let at = items.length;
    while (at > 0 && items[at - 1].luc > t.luc) at--;
    items.splice(at, 0, t);
    list.splice(k, 1);
    // the list is saved first, the trash after: a failure in between leaves the ticket in both (nothing is lost)
    return { save: true, afterSave: () => writeTrash(list), value: { item: t } };
  });
}

// Deletes one trashed ticket for good. → the ticket, or null when the id is not in the trash.
export function purgePhieu(id) {
  return exclusive(async () => {
    const list = await readTrash();
    const k = list.findIndex((x) => x.id === id);
    if (k < 0) return { value: null };
    const [t] = list.splice(k, 1);
    await writeTrash(list);
    return { value: withoutTrashMarks(t) };
  });
}

// Deletes every trashed ticket for good. → how many.
export function emptyPhieuTrash() {
  return exclusive(async () => {
    const list = await readTrash();
    if (list.length) await writeTrash([]);
    return { value: list.length };
  });
}

// CSV Excel opens correctly: UTF-8 with a byte-order mark; any cell that starts like a formula gets a leading ' so it is
// shown, never run (same rule as the early sign-up list).
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
const csvTime = (iso) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}` : iso);

export async function phieuCsv(filter, now = Date.now()) {
  const { items } = await listPhieu(filter, now);
  const lines = ['Thời gian,Gmail,Nhân vật trong game,Server,Quà muốn nhận,Ghi chú,Trạng thái,Phản hồi,Người xử lý'];
  for (const t of items.slice().reverse()) {
    lines.push([csvTime(t.luc), t.email, t.acc, t.serverTen, t.qua.join('\n'), t.ghiChu, STATES[t.st] || t.st, t.phanHoi, t.xuLyBoi].map(csvCell).join(','));
  }
  return { text: String.fromCharCode(0xfeff) + lines.join('\r\n') + '\r\n', rows: items.length };
}

// for tests: forget the in-memory copy so the next call reads the file again
export function _reset() { loading = null; queue = Promise.resolve(); }
