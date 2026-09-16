// news-uploads.mjs — pictures staff upload for articles (covers, pictures in the text, pictures in table cells).
//   upload  raw request body, JPEG / PNG / WEBP only, at most 5 MB; the first bytes must really be that format (an SVG or
//           an HTML page renamed .png is refused); saved as data/news/uploads/YYYY/MM/<16 hex>.<ext> — the name never
//           comes from the user
//   serve   GET /tin-tuc-anh/YYYY/MM/<16 hex>.<ext> only (anything else 404), right type, nosniff, cached for good
//           (a name is never reused for other content)
import { mkdir, readdir, stat, rename, rm, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { DATA_DIR } from './news-config.mjs';
import { siteNow } from './news-files.mjs';

export const UPLOAD_MAX = 5 * 1024 * 1024;
const TYPES = {
  'image/jpeg': { ext: 'jpg', ok: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', ok: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', ok: (b) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
};
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const UPLOAD_URL_RE = /^\/tin-tuc-anh\/(\d{4})\/(\d{2})\/([a-f0-9]{16})\.(jpg|png|webp)$/;
const PARALLEL_MAX = 4;
let running = 0;

const uploadsDir = () => join(DATA_DIR, 'uploads');

/**
 * Stores the request body as a picture. The caller has already checked the session and the Origin.
 * Returns { url, bytes } or { status, error }. On a refusal the caller must close the connection (the body may be unread).
 */
export async function saveUpload(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const kind = TYPES[type];
  if (!kind) return { status: 415, error: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.' };
  const declared = Number(req.headers['content-length']);
  if (declared > UPLOAD_MAX) return { status: 413, error: 'Ảnh lớn hơn 5 MB. Hãy giảm kích thước (khuyên dùng 1200×675) rồi tải lại.' };
  if (running >= PARALLEL_MAX) return { status: 503, error: 'Đang có nhiều ảnh tải lên cùng lúc. Thử lại sau vài giây.' };
  running++;
  const month = siteNow().slice(0, 7).replace('-', '/'); // YYYY/MM in the site's time
  const dir = join(uploadsDir(), ...month.split('/'));
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
    return { url: `/tin-tuc-anh/${month}/${name}`, bytes: size };
  } catch (e) {
    if (fh) await fh.close().catch(() => {});
    await rm(tmp, { force: true }).catch(() => {});
    throw e;
  } finally {
    running--;
  }
}

// The newest uploaded pictures: [{ url, bytes, at }]
export async function recentUploads(limit = 40) {
  const out = [];
  const years = (await readdir(uploadsDir()).catch(() => [])).filter((y) => /^\d{4}$/.test(y)).sort().reverse();
  for (const y of years) {
    const months = (await readdir(join(uploadsDir(), y)).catch(() => [])).filter((m) => /^\d{2}$/.test(m)).sort().reverse();
    for (const m of months) {
      const files = (await readdir(join(uploadsDir(), y, m)).catch(() => [])).filter((f) => /^[a-f0-9]{16}\.(jpg|png|webp)$/.test(f));
      const withTime = [];
      for (const f of files) {
        const s = await stat(join(uploadsDir(), y, m, f)).catch(() => null);
        if (s) withTime.push({ url: `/tin-tuc-anh/${y}/${m}/${f}`, bytes: s.size, at: s.mtimeMs });
      }
      withTime.sort((a, b) => b.at - a.at);
      out.push(...withTime);
      if (out.length >= limit) return out.slice(0, limit);
    }
  }
  return out;
}

// Answers GET/HEAD /tin-tuc-anh/…; returns false for any other address.
export async function serveUpload(req, res, cleanPath) {
  if (!cleanPath.startsWith('/tin-tuc-anh/')) return false;
  const m = cleanPath.match(UPLOAD_URL_RE);
  const s = m && (req.method === 'GET' || req.method === 'HEAD') ? await stat(join(uploadsDir(), m[1], m[2], `${m[3]}.${m[4]}`)).catch(() => null) : null;
  if (!s || !s.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end('404');
    return true;
  }
  res.writeHead(200, {
    'Content-Type': MIME[m[4]], 'Content-Length': s.size, 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  if (req.method === 'HEAD') { res.end(); return true; }
  createReadStream(join(uploadsDir(), m[1], m[2], `${m[3]}.${m[4]}`)).on('error', () => res.destroy()).pipe(res);
  return true;
}
