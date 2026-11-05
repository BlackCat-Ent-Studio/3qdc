// news-uploads.mjs — pictures staff upload for articles (covers, pictures in the text, pictures in table cells).
//   upload  raw request body, JPEG / PNG / WEBP only, at most 5 MB; the first bytes must really be that format (an SVG or
//           an HTML page renamed .png is refused); saved as data/games/<game>/tin-tuc/uploads/YYYY/MM/<16 hex>.<ext> —
//           the name never comes from the user
//   serve   GET /tin-tuc-anh/YYYY/MM/<16 hex>.<ext> (the game 3qdc, addresses printed in the old articles) or
//           /tin-tuc-anh/<game>/YYYY/MM/<16 hex>.<ext> (every other game); anything else 404, right type, nosniff,
//           cached for good (a name is never reused for other content)
import { mkdir, readdir, stat, rename, rm, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { gameById, GAME_ID_RE } from '../admin/games.mjs';
import { moduleDir } from '../admin/paths.mjs';
import { siteNow } from './news-files.mjs';

export const UPLOAD_MAX = 5 * 1024 * 1024;
const TYPES = {
  'image/jpeg': { ext: 'jpg', ok: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', ok: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', ok: (b) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
};
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
// group 1 = the game id when the address names one (a game id is never four digits, so it cannot be mistaken for the year)
export const UPLOAD_URL_RE = /^\/tin-tuc-anh\/(?:([a-z0-9-]+)\/)?(\d{4})\/(\d{2})\/([a-f0-9]{16})\.(jpg|png|webp)$/;
const PARALLEL_MAX = 4;
let running = 0;

// The game 3qdc keeps the addresses it always had; every other game has its id in the address.
const urlBase = (gameId) => (gameId === '3qdc' ? '/tin-tuc-anh' : `/tin-tuc-anh/${gameId}`);
const hasNews = (gameId) => { const g = gameById(gameId); return !!g && Object.hasOwn(g.modules, 'tin-tuc'); };
const uploadsDir = (gameId) => join(moduleDir(gameId, 'tin-tuc'), 'uploads');

/**
 * Pictures of one game: { saveUpload(req), recentUploads(limit) }. Throws for a game without a news part.
 */
export function uploadsOf(gameId) {
  if (!hasNews(gameId)) throw new Error(`uploads: game "${gameId}" has no news part`);
  const base = urlBase(gameId);
  const root = () => uploadsDir(gameId);

  /**
   * Stores the request body as a picture. The caller has already checked the session and the Origin.
   * Returns { url, bytes } or { status, error }. On a refusal the caller must close the connection (the body may be unread).
   */
  async function saveUpload(req) {
    const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const kind = TYPES[type];
    if (!kind) return { status: 415, error: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.' };
    const declared = Number(req.headers['content-length']);
    if (declared > UPLOAD_MAX) return { status: 413, error: 'Ảnh lớn hơn 5 MB. Hãy giảm kích thước (khuyên dùng 1200×675) rồi tải lại.' };
    if (running >= PARALLEL_MAX) return { status: 503, error: 'Đang có nhiều ảnh tải lên cùng lúc. Thử lại sau vài giây.' };
    running++;
    const month = siteNow().slice(0, 7).replace('-', '/'); // YYYY/MM in the site's time
    const dir = join(root(), ...month.split('/'));
    const name = randomBytes(8).toString('hex') + '.' + kind.ext;
    const tmp = join(dir, name + '.part');
    let fh = null;
    try {
      await mkdir(dir, { recursive: true });
      fh = await open(tmp, 'wx');
      let size = 0;
      let head = Buffer.alloc(0);
      for await (const chunk of req) {
        size += chunk.length;
        if (size > UPLOAD_MAX) {
          await fh.close(); fh = null;
          await rm(tmp, { force: true });
          return { status: 413, error: 'Ảnh lớn hơn 5 MB. Hãy giảm kích thước (khuyên dùng 1200×675) rồi tải lại.' };
        }
        if (head.length < 12) head = Buffer.concat([head, chunk.subarray(0, 12 - head.length)]);
        await fh.write(chunk);
      }
      await fh.close(); fh = null;
      if (size === 0) { await rm(tmp, { force: true }); return { status: 400, error: 'File ảnh rỗng.' }; }
      if (!kind.ok(head)) {
        await rm(tmp, { force: true });
        return { status: 415, error: 'File không phải ảnh ' + kind.ext.toUpperCase() + ' thật (có thể chỉ đổi đuôi). Hãy xuất lại ảnh rồi tải lên.' };
      }
      await rename(tmp, join(dir, name));
      return { url: `${base}/${month}/${name}`, bytes: size };
    } catch (e) {
      if (fh) await fh.close().catch(() => {});
      await rm(tmp, { force: true }).catch(() => {});
      throw e;
    } finally {
      running--;
    }
  }

  // The newest uploaded pictures: [{ url, bytes, at }]
  async function recentUploads(limit = 40) {
    const out = [];
    const years = (await readdir(root()).catch(() => [])).filter((y) => /^\d{4}$/.test(y)).sort().reverse();
    for (const y of years) {
      const months = (await readdir(join(root(), y)).catch(() => [])).filter((m) => /^\d{2}$/.test(m)).sort().reverse();
      for (const m of months) {
        const files = (await readdir(join(root(), y, m)).catch(() => [])).filter((f) => /^[a-f0-9]{16}\.(jpg|png|webp)$/.test(f));
        const withTime = [];
        for (const f of files) {
          const s = await stat(join(root(), y, m, f)).catch(() => null);
          if (s) withTime.push({ url: `${base}/${y}/${m}/${f}`, bytes: s.size, at: s.mtimeMs });
        }
        withTime.sort((a, b) => b.at - a.at);
        out.push(...withTime);
        if (out.length >= limit) return out.slice(0, limit);
      }
    }
    return out;
  }

  return { saveUpload, recentUploads };
}

// Answers GET/HEAD /tin-tuc-anh/…; returns false for any other address.
export async function serveUpload(req, res, cleanPath) {
  if (!cleanPath.startsWith('/tin-tuc-anh/')) return false;
  const m = cleanPath.match(UPLOAD_URL_RE);
  // the game 3qdc has no id in its addresses; "/tin-tuc-anh/3qdc/…" is not another name for the same file
  const gameId = m ? (m[1] || '3qdc') : null;
  const known = gameId && (!m[1] || (GAME_ID_RE.test(m[1]) && m[1] !== '3qdc')) && hasNews(gameId);
  const file = known && (req.method === 'GET' || req.method === 'HEAD') ? join(uploadsDir(gameId), m[2], m[3], `${m[4]}.${m[5]}`) : null;
  const s = file ? await stat(file).catch(() => null) : null;
  if (!s || !s.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end('404');
    return true;
  }
  res.writeHead(200, {
    'Content-Type': MIME[m[5]], 'Content-Length': s.size, 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  if (req.method === 'HEAD') { res.end(); return true; }
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
  return true;
}
