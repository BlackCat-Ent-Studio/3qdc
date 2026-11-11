// bxh-store.mjs — the leaderboards of a game (Hoàn Mỹ Thế Giới): what a member's Claude sends, how it is checked and cleaned,
// where it is kept and how an older set is brought back.
//
//   data/games/<game>/bang-xep-hang/hien-tai.json          the set the home page shows: { capNhat, boi, qua, mayChu, bang }
//   data/games/<game>/bang-xep-hang/lich-su/<key>.json     the sets it replaced (key = YYYYMMDDHHmmssSSS of the swap), newest 50 kept
//
// The set is { may_chu?, bang: [{ ten, cot: [1..3 headings], dong: [{ ten, lop?, gt: [one value per heading] }] }] } — the rows
// come already ordered. Whatever arrives is checked against fixed limits and cleaned (no invisible or markup characters, no
// unknown fields, no e-mail address); only names, class codes and values ever leave through the public address.
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { moduleDir } from '../admin/paths.mjs';
import { readJson, writeJsonAtomic, siteNow, siteNowSeconds } from '../news/news-files.mjs';

export const PART = 'bang-xep-hang';

// the ten classes of the game: the code the home page knows, and the name players read
export const LOP = [
  ['blademaster', 'Kiếm Khách'], ['wizard', 'Pháp Sư'], ['psychic', 'Vu Sư'], ['venomancer', 'Tiên Thú'], ['barbarian', 'Thần Thú'],
  ['assassin', 'Thích Khách'], ['archer', 'Vũ Mang'], ['cleric', 'Vũ Linh'], ['seeker', 'Kiếm Linh'], ['mystic', 'Mị Linh'],
];
export const LOP_CODES = LOP.map((l) => l[0]);

export const LIMITS = {
  bang: 10, dong: 200, cot: 3, tenBang: 32, tenCot: 16, tenDong: 32, gtChuoi: 24, mayChu: 32, gtSo: 1e15, lichSu: 50, canhBao: 8,
};

const norm = (s) => String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const LOP_BY_TEXT = new Map();
LOP.forEach(([code, name], i) => { LOP_BY_TEXT.set(code, code); LOP_BY_TEXT.set(norm(name), code); LOP_BY_TEXT.set(String(i), code); });

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const show = (s) => JSON.stringify(String(s).slice(0, 30));

// One piece of text: NFC, control characters become spaces, invisible format characters, private-use / unassigned / lone
// surrogate characters and the angle brackets are dropped, spaces merged. Too long, empty after cleaning, or an "@" → error.
function cleanText(v, max, where) {
  if (typeof v !== 'string') return { error: `${where}: phải là chữ.` };
  if (v.length > max * 4 + 40) return { error: `${where}: dài quá ${max} ký tự.` };
  const s = v.normalize('NFC').replace(/\p{Cc}/gu, ' ').replace(/[\p{Cf}\p{Co}\p{Cn}\p{Cs}<>]/gu, '').replace(/\s+/g, ' ').trim();
  if (!s) return { error: `${where}: trống (hoặc chỉ có ký tự ẩn).` };
  if (Array.from(s).length > max) return { error: `${where}: dài quá ${max} ký tự (“${s.slice(0, 20)}…”).` };
  if (s.includes('@')) return { error: `${where}: có dấu @ (nghi địa chỉ email). Không gửi email hay tài khoản.` };
  return { v: s };
}

// the class of a row: a number 0..9 (or its digit), a class name (any case, with its accents) or a class code → code | null
function lopOf(v) {
  if (v === undefined || v === null || v === '') return { v: null };
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 && v <= 9 ? { v: LOP[v][0] } : { v: null, bad: String(v) };
  if (typeof v !== 'string') return { v: null, bad: typeof v };
  const hit = LOP_BY_TEXT.get(norm(v));
  return hit ? { v: hit } : { v: null, bad: v.slice(0, 24) };
}

function unknownKey(obj, allowed, where) {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) return `${where}: không nhận trường ${show(k)} (chỉ có ${allowed.join(', ')}).`;
  return '';
}

/** Checks and cleans what was sent → { data: { mayChu, bang }, canhBao: [words] } | { error: words } */
export function kiemBxh(input) {
  if (!isObj(input)) return { error: 'Dữ liệu phải là một đối tượng { may_chu?, bang: [...] }.' };
  const bad = unknownKey(input, ['may_chu', 'bang'], 'Dữ liệu');
  if (bad) return { error: bad };
  let mayChu = '';
  if (input.may_chu !== undefined && input.may_chu !== null && input.may_chu !== '') {
    const r = cleanText(input.may_chu, LIMITS.mayChu, 'may_chu');
    if (r.error) return { error: r.error };
    mayChu = r.v;
  }
  if (!Array.isArray(input.bang)) return { error: 'bang phải là một danh sách các bảng (có thể rỗng).' };
  if (input.bang.length > LIMITS.bang) return { error: `Tối đa ${LIMITS.bang} bảng, đã gửi ${input.bang.length}.` };

  const warn = [];
  let warnMore = 0;
  const note = (s) => { if (warn.length < LIMITS.canhBao) warn.push(s); else warnMore++; };
  const names = new Set();
  const bang = [];
  for (let bi = 0; bi < input.bang.length; bi++) {
    const b = input.bang[bi];
    const at = `Bảng ${bi + 1}`;
    if (!isObj(b)) return { error: `${at}: phải là một đối tượng { ten, cot, dong }.` };
    const k = unknownKey(b, ['ten', 'cot', 'dong'], at);
    if (k) return { error: k };
    const ten = cleanText(b.ten, LIMITS.tenBang, `${at}, ten`);
    if (ten.error) return { error: ten.error };
    if (names.has(norm(ten.v))) return { error: `${at}: trùng tên với một bảng khác (“${ten.v}”).` };
    names.add(norm(ten.v));
    const where = `Bảng ${bi + 1} “${ten.v}”`;
    if (!Array.isArray(b.cot) || b.cot.length < 1 || b.cot.length > LIMITS.cot) return { error: `${where}: cot phải có từ 1 đến ${LIMITS.cot} tên cột.` };
    const cot = [];
    for (let ci = 0; ci < b.cot.length; ci++) {
      const c = cleanText(b.cot[ci], LIMITS.tenCot, `${where}, cột ${ci + 1}`);
      if (c.error) return { error: c.error };
      cot.push(c.v);
    }
    if (!Array.isArray(b.dong) || b.dong.length < 1) return { error: `${where}: dong phải có ít nhất 1 dòng (không muốn bảng này thì bỏ cả bảng).` };
    if (b.dong.length > LIMITS.dong) return { error: `${where}: tối đa ${LIMITS.dong} dòng, đã gửi ${b.dong.length}.` };
    const dong = [];
    for (let di = 0; di < b.dong.length; di++) {
      const r = b.dong[di];
      const rw = `${where}, dòng ${di + 1}`;
      if (!isObj(r)) return { error: `${rw}: phải là một đối tượng { ten, lop?, gt }.` };
      const rk = unknownKey(r, ['ten', 'lop', 'gt'], rw);
      if (rk) return { error: rk };
      const rn = cleanText(r.ten, LIMITS.tenDong, `${rw}, ten`);
      if (rn.error) return { error: rn.error };
      const lop = lopOf(r.lop);
      if (lop.bad !== undefined) note(`${where}, dòng ${di + 1}: lớp “${lop.bad}” không nhận ra, bỏ biểu tượng lớp (dùng số 0-9 hoặc tên: ${LOP.map((l) => l[1]).join(', ')}).`);
      if (!Array.isArray(r.gt) || r.gt.length !== cot.length) return { error: `${rw}: gt phải có đúng ${cot.length} giá trị (một giá trị mỗi cột), đã gửi ${Array.isArray(r.gt) ? r.gt.length : 'không phải danh sách'}.` };
      const gt = [];
      for (let gi = 0; gi < r.gt.length; gi++) {
        const g = r.gt[gi];
        if (typeof g === 'number') {
          if (!Number.isFinite(g) || Math.abs(g) > LIMITS.gtSo) return { error: `${rw}, giá trị ${gi + 1}: số phải hữu hạn và không quá ${LIMITS.gtSo}.` };
          gt.push(g);
        } else {
          const t = cleanText(g, LIMITS.gtChuoi, `${rw}, giá trị ${gi + 1}`);
          if (t.error) return { error: t.error };
          gt.push(t.v);
        }
      }
      dong.push({ ten: rn.v, lop: lop.v, gt });
    }
    bang.push({ ten: ten.v, cot, dong });
  }
  if (warnMore) warn.push(`… và ${warnMore} cảnh báo lớp tương tự nữa.`);
  return { data: { mayChu, bang }, canhBao: warn };
}

export const demBxh = (bang) => ({ soBang: bang.length, soDong: bang.reduce((n, b) => n + b.dong.length, 0) });

// ---------- storage ----------
const dirOf = (game) => moduleDir(game, PART);
const nowFile = (game) => join(dirOf(game), 'hien-tai.json');
const histDir = (game) => join(dirOf(game), 'lich-su');
const KEY_RE = /^\d{17}$/;
export const isKey = (k) => typeof k === 'string' && KEY_RE.test(k);

// writes one after another inside this process, so two swaps at once never lose a set
let queue = Promise.resolve();
const inLine = (fn) => {
  const run = queue.then(fn);
  queue = run.catch(() => {});
  return run;
};

export const docHienTai = (game) => readJson(nowFile(game), null);

async function keysOfHistory(game) {
  let names;
  try { names = await readdir(histDir(game)); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  return names.filter((n) => n.endsWith('.json') && KEY_RE.test(n.slice(0, -5))).map((n) => n.slice(0, -5)).sort().reverse();
}

// a key from the clock (site time, to the millisecond), moved forward when taken
async function freshKey(game) {
  let ms = Date.now();
  const used = new Set(await keysOfHistory(game));
  for (;;) {
    const key = siteNow(ms).slice(0, 23).replace(/\D/g, '');
    if (!used.has(key)) return key;
    ms++;
  }
}

/** Puts a checked set on show; the one it replaces goes to the history. → { capNhat, keyCu, soBang, soDong } */
export function thayBxh(game, data, { ai, qua }) {
  return inLine(async () => {
    await mkdir(histDir(game), { recursive: true });
    const cu = await docHienTai(game);
    let keyCu = null;
    if (cu) {
      keyCu = await freshKey(game);
      await writeJsonAtomic(join(histDir(game), `${keyCu}.json`), { ...cu, thayLuc: siteNowSeconds(), thayBoi: ai });
    }
    const capNhat = siteNowSeconds();
    await writeJsonAtomic(nowFile(game), { capNhat, boi: ai, qua, mayChu: data.mayChu, bang: data.bang });
    for (const key of (await keysOfHistory(game)).slice(LIMITS.lichSu)) await rm(join(histDir(game), `${key}.json`), { force: true });
    return { capNhat, keyCu, ...demBxh(data.bang) };
  });
}

const summary = (key, d) => ({ key, thayLuc: d.thayLuc || null, thayBoi: d.thayBoi || '', capNhat: d.capNhat || null, boi: d.boi || '', qua: d.qua || '', ...demBxh(Array.isArray(d.bang) ? d.bang : []) });

/** The history, newest first: [{ key, thayLuc, thayBoi, capNhat, boi, qua, soBang, soDong }] (n = how many, at most 50) */
export async function dsLichSu(game, n = LIMITS.lichSu) {
  const out = [];
  for (const key of (await keysOfHistory(game)).slice(0, n)) {
    try {
      const d = await readJson(join(histDir(game), `${key}.json`), null);
      if (d && typeof d === 'object') out.push(summary(key, d));
    } catch (e) {
      console.error('[bxh] unreadable history file', key, e && e.message ? e.message : e);
    }
  }
  return out;
}

/** One set of the history in full → the stored object | null */
export async function docLichSu(game, key) {
  if (!isKey(key)) return null;
  return readJson(join(histDir(game), `${key}.json`), null);
}

/** Brings a set of the history back on show (checked again as if it had just been sent) → { capNhat, keyCu, soBang, soDong } | { status, error } */
export async function khoiPhuc(game, key, { ai, qua }) {
  if (!isKey(key)) return { status: 404, error: 'Không có bản này trong lịch sử.' };
  const d = await docLichSu(game, key);
  if (!d) return { status: 404, error: 'Không có bản này trong lịch sử.' };
  const r = kiemBxh({ may_chu: d.mayChu || undefined, bang: d.bang });
  if (r.error) return { status: 422, error: `Bản này không còn hợp lệ nên không khôi phục được: ${r.error}` };
  return { ...(await thayBxh(game, r.data, { ai, qua })), tuKey: key };
}

// ---------- public shape ----------
const EMPTY = { capNhat: null, mayChu: '', bang: [] };
export const congKhaiTrong = () => ({ ...EMPTY, bang: [] });

// only names, class codes and values — nothing about who sent it
export function congKhai(doc) {
  if (!doc || !Array.isArray(doc.bang)) return congKhaiTrong();
  return {
    capNhat: typeof doc.capNhat === 'string' ? doc.capNhat : null,
    mayChu: typeof doc.mayChu === 'string' ? doc.mayChu : '',
    bang: doc.bang.map((b) => ({
      ten: b.ten, cot: b.cot,
      dong: b.dong.map((r) => ({ ten: r.ten, lop: LOP_CODES.includes(r.lop) ? r.lop : null, gt: r.gt })),
    })),
  };
}

// the public answer is kept as text until the file changes (same size and time), so a busy home page does not parse 150 KB each visit
const cache = new Map(); // game → { sig, body }
export async function jsonCongKhai(game) {
  let sig = 'none';
  try { const st = await stat(nowFile(game)); sig = `${st.mtimeMs}:${st.size}`; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const hit = cache.get(game);
  if (hit && hit.sig === sig) return hit.body;
  const body = JSON.stringify(sig === 'none' ? congKhaiTrong() : congKhai(await docHienTai(game)));
  cache.set(game, { sig, body });
  return body;
}
