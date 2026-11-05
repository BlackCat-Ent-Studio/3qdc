// signup-store.mjs — early sign-ups left on /dang-ky-som: one phone number per line in data/dang-ky-som/dang-ky.jsonl.
// The list is only ever appended to, so a crash or power cut can spoil at most the line being written (the reader skips
// it). It is read once into memory on first use; the count, the duplicate check and the admin list all come from there.
// The milestones the page shows live in cai-dat.json next to it (written whole, atomically).
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { moduleDir } from '../admin/paths.mjs';
import { readJson, writeJsonAtomic, writeTextAtomic, siteNowSeconds } from '../news/news-files.mjs';

export const DATA_DIR = moduleDir('3qdc', 'dang-ky-som');
const listFile = () => join(DATA_DIR, 'dang-ky.jsonl');
const settingsFile = () => join(DATA_DIR, 'cai-dat.json');

export const DEFAULT_MILESTONES = [1000, 3000, 5000, 10000];
const MILESTONES_MAX = 8;
const MILESTONE_TOP = 10_000_000;
const PAGE_SIZE = 50;

// A Vietnamese mobile number in its 10-digit 0xxxxxxxxx form (+84 / 84 written as 0; spaces, dots, dashes and
// brackets dropped), or '' when it is not one.
export function normalizePhone(raw) {
  let s = String(raw ?? '').replace(/[\s.\-()]/g, '');
  if (s.length > 20) return '';
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (/^84\d{9}$/.test(s)) s = '0' + s.slice(2);
  return /^0[35789]\d{8}$/.test(s) ? s : '';
}

// ---------- the list ----------
let loading = null; // Promise of { rows, phones, needNewline }

function load() {
  if (!loading) {
    loading = (async () => {
      let text = '';
      try {
        text = await readFile(listFile(), 'utf8');
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      const rows = [];
      const phones = new Set();
      let bad = 0;
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let r;
        try { r = JSON.parse(line); } catch { bad++; continue; }
        const sdt = normalizePhone(r && r.sdt);
        if (!sdt || phones.has(sdt)) { bad++; continue; }
        phones.add(sdt);
        rows.push({ sdt, luc: String(r.luc || ''), ip: String(r.ip || ''), nguon: String(r.nguon || '') });
      }
      if (bad) console.warn(`[signup] skipped ${bad} unreadable line(s) in ${listFile()}`);
      // a line cut off by a crash has no newline: the next one must not be glued onto it
      return { rows, phones, needNewline: text !== '' && !text.endsWith('\n') };
    })();
    loading.catch(() => { loading = null; }); // a failed read is tried again on the next request
  }
  return loading;
}

// Writes are queued, so two requests with the same number at the same moment still give a single line.
let queue = Promise.resolve();

// Resolves { ok, count } for a new number or { already, count } for one already on the list. sdt must be normalised.
export function addSignup({ sdt, ip, nguon }) {
  const job = queue.then(async () => {
    const db = await load();
    if (db.phones.has(sdt)) return { already: true, count: db.rows.length };
    const row = { sdt, luc: siteNowSeconds(), ip: String(ip || ''), nguon: String(nguon || '') };
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(listFile(), (db.needNewline ? '\n' : '') + JSON.stringify(row) + '\n', 'utf8');
    db.needNewline = false;
    db.phones.add(sdt);
    db.rows.push(row);
    return { ok: true, count: db.rows.length };
  });
  queue = job.catch(() => {});
  return job;
}

// Deletes one number for good: the list is written again without it (atomically, through the same queue as new
// sign-ups). The count on /dang-ky-som drops by one and the number may sign up again. → { count } or null when unknown.
export function deleteSignup(sdt) {
  const job = queue.then(async () => {
    const db = await load();
    if (!db.phones.has(sdt)) return null;
    const rows = db.rows.filter((r) => r.sdt !== sdt);
    await mkdir(DATA_DIR, { recursive: true });
    await writeTextAtomic(listFile(), rows.map((r) => JSON.stringify(r) + '\n').join(''));
    db.rows = rows;
    db.phones.delete(sdt);
    db.needNewline = false;
    return { count: rows.length };
  });
  queue = job.catch(() => {});
  return job;
}

export async function signupCount() {
  return (await load()).rows.length;
}

// One page of the list for the admin, newest first. q = digits the number must contain; stt = order of signing up.
export async function listSignups({ q = '', page = 1 } = {}) {
  const { rows } = await load();
  const digits = String(q).replace(/\D/g, '').slice(0, 10);
  const numbered = rows.map((r, i) => ({ stt: i + 1, ...r }));
  const hits = digits ? numbered.filter((r) => r.sdt.includes(digits)) : numbered;
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  const p = Math.min(pages, Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1));
  const end = hits.length - (p - 1) * PAGE_SIZE;
  const items = hits.slice(Math.max(0, end - PAGE_SIZE), end).reverse();
  return { total: rows.length, count: hits.length, page: p, pages, items };
}

// The whole list as a CSV Excel opens correctly: UTF-8 with a byte-order mark, the number written as ="0912…" so the
// leading zero stays, and any other cell that starts like a formula prefixed with ' so it is shown, never run.
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
const csvTime = (iso) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 19)}` : iso);

export async function signupsCsv() {
  const { rows } = await load();
  const lines = ['STT,Số điện thoại,Thời gian,IP,Nguồn'];
  rows.forEach((r, i) => lines.push([i + 1, `"=""${r.sdt}"""`, csvCell(csvTime(r.luc)), csvCell(r.ip), csvCell(r.nguon)].join(',')));
  return { text: String.fromCharCode(0xfeff) + lines.join('\r\n') + '\r\n', rows: rows.length };
}

// ---------- milestones ----------
// 1–8 whole numbers, each 1…10,000,000, strictly increasing; anything else → null.
export function cleanMilestones(list) {
  if (!Array.isArray(list) || list.length < 1 || list.length > MILESTONES_MAX) return null;
  const out = [];
  for (const v of list) {
    if (!Number.isInteger(v) || v < 1 || v > MILESTONE_TOP) return null;
    if (out.length && v <= out[out.length - 1]) return null;
    out.push(v);
  }
  return out;
}

let milestones = null;

export async function readMilestones() {
  if (milestones) return milestones;
  let saved = {};
  try {
    saved = (await readJson(settingsFile(), {})) || {};
  } catch (e) {
    console.warn(`[signup] cannot read ${settingsFile()}, using the default milestones: ${e.message}`);
  }
  milestones = cleanMilestones(saved.milestones) || DEFAULT_MILESTONES;
  return milestones;
}

export async function writeMilestones(list) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeJsonAtomic(settingsFile(), { milestones: list });
  milestones = list;
}
