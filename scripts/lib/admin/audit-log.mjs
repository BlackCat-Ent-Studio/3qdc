// audit-log.mjs — the permanent record of who changed who may do what: data/he-thong/nhat-ky-quyen.jsonl, one JSON line
// per change, appended and never rewritten. Holds names, rights and ids only — never a password, token or Claude code.
//   ai        who did it: "<username>" from the web page, "<username> (Claude)" through an owner's Claude code
//   qua       'web' | 'claude'
//   viec      what: cap-quyen, thu-quyen, duyet, tu-choi, khoa, mo-khoa, quyen, tao-link-moi, huy-link-moi, tao-ma, thu-hoi-ma;
//             and the work done through Claude or the trash (thung-rac-xoa / -khoi-phuc / -xoa-han / -don-sach, tin-*, phieu-*,
//             dang-ky-*, nhac-*) and every time Claude looked at players' email addresses or phone numbers or exported a
//             CSV (xem-email-phieu, xem-sdt-dang-ky, xuat-csv-phieu, xuat-csv-dang-ky, xem-sdt-thung-rac)
//   doiTuong  the account / invite / code / item it was about (a phone number is written masked, never an email);
//   truoc / sau  the rights before and after (when they changed)
//   game / phan  the game and part the work was in;   chiTiet  a few words more (how many rows, which state)
import { join } from 'node:path';
import { appendFile, mkdir, open } from 'node:fs/promises';
import { systemDir } from './paths.mjs';
import { siteNow } from '../news/news-files.mjs';

export const auditFile = () => join(systemDir(), 'nhat-ky-quyen.jsonl');
export const PAGE_SIZE = 50;

/** A phone number with its middle hidden (0912***678), for the record: it says which line without keeping the number. */
export const maskPhone = (sdt) => { const d = String(sdt || ''); return d.length >= 7 ? `${d.slice(0, 3)}***${d.slice(-3)}` : '***'; };

/** The name written down for an actor: "<username>" or "<username> (Claude)". */
export const whoIs = (actor, via = 'web') => (via === 'claude' ? `${actor.username} (Claude)` : actor.username);

let queue = Promise.resolve();
/**
 * Writes one line (and to the service log). Resolves when written; a failed write is logged loudly but never throws, so a
 * full disk cannot turn an already-saved change into an error page.
 */
export function appendAudit({ ai, qua = 'web', viec, doiTuong, truoc, sau, game, phan, chiTiet }) {
  const line = {
    luc: siteNow(), ai, qua, viec, doiTuong, ...(game ? { game } : {}), ...(phan ? { phan } : {}), ...(chiTiet ? { chiTiet: String(chiTiet).slice(0, 200) } : {}),
    ...(truoc !== undefined ? { truoc } : {}), ...(sau !== undefined ? { sau } : {}),
  };
  console.log(`[quyen] ${JSON.stringify(line)}`);
  const run = queue.then(async () => {
    await mkdir(systemDir(), { recursive: true });
    await appendFile(auditFile(), JSON.stringify(line) + '\n', { mode: 0o600 });
  });
  queue = run.catch((e) => console.error('[quyen] could not write the audit log:', e && e.message ? e.message : e));
  return queue;
}

/** Page `page` (1 = newest) of the record, newest first: { items, page, more }. Reads from the end of the file. */
export async function readAudit(page = 1) {
  const p = Number.isInteger(page) && page >= 1 ? page : 1;
  await queue;
  const need = p * PAGE_SIZE + 1; // one more than the page ends with, to know whether another page exists
  let fh;
  try { fh = await open(auditFile(), 'r'); } catch (e) { if (e.code === 'ENOENT') return { items: [], page: p, more: false }; throw e; }
  try {
    const { size } = await fh.stat();
    const BLOCK = 64 * 1024;
    let pos = size, tail = Buffer.alloc(0), lines = [];
    while (pos > 0) {
      const len = Math.min(BLOCK, pos);
      pos -= len;
      const buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, pos);
      tail = Buffer.concat([buf, tail]);
      const parts = tail.toString('utf8').split('\n');
      // the first piece may be cut by the block edge; keep it for the next round unless the file starts here
      lines = pos > 0 ? parts.slice(1) : parts;
      if (lines.filter(Boolean).length >= need) break;
    }
    const items = [];
    for (const l of lines.filter(Boolean).reverse()) {
      try { items.push(JSON.parse(l)); } catch { /* a torn line is skipped */ }
    }
    return { items: items.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), page: p, more: items.length > p * PAGE_SIZE };
  } finally {
    await fh.close();
  }
}
