// common.mjs — what every group of Claude's tools shares: answers, the record of work done through Claude, the choice of
// game, and the write allowance.
//
// A tool is { name, games(user) → ids of the games where this account may use it, takesGame, write, def, run(ctx, args) }:
//   def   { title, description, properties, required, annotations } — the game parameter is added by the server when takesGame;
//         a tool made before games existed has `schema` instead (its whole inputSchema, kept exactly as it was)
//   run   ctx = { user, gameId, who: "<username> (Claude)", limit() → '' or the reason a write is refused }
import { GAMES } from '../games.mjs';
import { can } from '../grants.mjs';
import { appendAudit } from '../audit-log.mjs';
import { makeWriteLimiter } from './write-limit.mjs';

export const text = (s, extra = {}) => ({ content: [{ type: 'text', text: s }], ...extra });
export const fail = (s) => text(s, { isError: true });
export const str = (v) => (typeof v === 'string' ? v.trim() : '');
export const fmt = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)} ${String(iso).slice(11, 16)}` : '');
export const shorten = (s, n) => { const t = String(s ?? ''); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

// The everyday work tools: generous (tickets are answered by the dozen), but still a cap so a runaway loop cannot rewrite the site.
export const WORK_WRITE_MAX = 300;
export const workLimiter = makeWriteLimiter({ max: WORK_WRITE_MAX, what: 'ghi' });

// Reading personal data (players' emails, sign-up phone numbers, CSV exports): 60 reads an hour per person, all codes together.
// One request can carry up to 20 calls, so without this cap a loop could read the whole list in minutes. Reads that show no
// personal data are not counted.
export const PERSONAL_READ_MAX = 60;
export const personalReadLimiter = makeWriteLimiter({ max: PERSONAL_READ_MAX, what: 'xem hoặc xuất dữ liệu cá nhân' });

/** The ids of the games where the account holds `perm` of `part` (the part switched on in that game). */
export const gamesWith = (user, part, perm) => GAMES.filter((g) => can(user, g.id, part, perm)).map((g) => g.id);
/** A tool that needs one permission of one part. */
export const needs = (part, perm) => (user) => gamesWith(user, part, perm);

/** Picks the game a call is about. → { gameId } | { error } */
export function pickGame(ids, wanted) {
  const w = str(wanted);
  if (w) {
    if (ids.includes(w)) return { gameId: w };
    return { error: GAMES.some((g) => g.id === w) ? `Tài khoản này không có quyền dùng công cụ này ở game ${w}. Game dùng được: ${ids.join(', ')}.` : `Không có game ${w}. Game dùng được: ${ids.join(', ')}.` };
  }
  if (ids.length === 1) return { gameId: ids[0] };
  return { error: `Tài khoản có quyền ở nhiều game (${ids.join(', ')}): ghi rõ tham số game.` };
}

/** Writes one line of the record of work done through Claude: who ("<username> (Claude)"), what, about what. Never throws. */
export function audit(ctx, viec, doiTuong, { phan, chiTiet } = {}) {
  return appendAudit({ ai: ctx.who, qua: 'claude', viec, doiTuong: shorten(doiTuong, 120), game: ctx.gameId, phan, chiTiet });
}

/** Counts one read of personal data against the allowance: the reason it is refused, else null. */
export function refuseRead(ctx) {
  const why = ctx.limitRead();
  return why ? fail(why) : null;
}

/** Runs one write behind the allowance: the reason it is refused, else null. */
export function refuseWrite(ctx) {
  const why = ctx.limit();
  return why ? fail(why) : null;
}
