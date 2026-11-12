// music-routes.mjs — the public side of a game's background music on its own web address (a static home page, not the 3Q
// site): GET/HEAD /api/nhac (the song list the player reads) and /nhac/<file> (a song or its cover, with Range so the
// browser can seek). It answers only on the host of a game other than 3qdc that has switched the part on; on every other
// host it returns false and the request goes on exactly as before (3qdc keeps /3qdc-vi/api/nhac and /3qdc-vi/home/nhac/).
// serveSong() is also what the admin pages use for "Nghe thử" of a game's song.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { gameOfHost } from '../admin/games.mjs';
import { listSongs, publicList, musicDirOf, MAIN_GAME, SONG_EXT, COVER_EXT } from './music-store.mjs';

export const PART = 'nhac';
const TYPES = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
};

function sendJson(req, res, status, body, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** Streams one file of the game's music folder (honours Range and If-None-Match). Returns false when there is no such file. */
export async function serveSong(req, res, gameId, rawName) {
  const name = String(rawName || '');
  const ext = extname(name).toLowerCase();
  if (!name || basename(name) !== name || name.includes('\0') || !(SONG_EXT.includes(ext) || COVER_EXT.includes(ext))) return false;
  const file = join(musicDirOf(gameId), name);
  const st = await stat(file).catch(() => null);
  if (!st || !st.isFile()) return false;
  const tag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const h = {
    'Content-Type': TYPES[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache',
    ETag: tag, 'Last-Modified': st.mtime.toUTCString(), 'X-Content-Type-Options': 'nosniff',
  };
  const inm = req.headers['if-none-match'];
  if (inm && inm.split(',').some((t) => t.trim() === tag)) { delete h['Content-Type']; res.writeHead(304, h); res.end(); return true; }
  let start = 0;
  let end = st.size - 1;
  let status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || '').trim());
  if (m && (m[1] || m[2])) {
    if (m[1]) { start = parseInt(m[1], 10); if (m[2]) end = Math.min(parseInt(m[2], 10), end); }
    else { start = Math.max(0, st.size - parseInt(m[2], 10)); } // "-N" = the last N bytes
    if (!(start <= end) || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); res.end(); return true; }
    status = 206;
    h['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
  }
  h['Content-Length'] = end - start + 1;
  res.writeHead(status, h);
  if (req.method === 'HEAD') { res.end(); return true; }
  const stream = createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
  return true;
}

// cleanPath = decoded path without a trailing slash (as server.mjs computes it)
export async function handleMusicPublic(req, res, cleanPath) {
  const isList = cleanPath === '/api/nhac';
  if (!isList && !cleanPath.startsWith('/nhac/')) return false;
  const game = gameOfHost(req.headers.host);
  if (game.id === MAIN_GAME || !Object.hasOwn(game.modules, PART)) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(req, res, 405, JSON.stringify({ error: 'Chỉ đọc.' }), { Allow: 'GET, HEAD' });
    return true;
  }
  try {
    if (isList) {
      sendJson(req, res, 200, JSON.stringify(publicList(await listSongs(game.id))));
      return true;
    }
    if (await serveSong(req, res, game.id, cleanPath.slice('/nhac/'.length))) return true;
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('404 ' + cleanPath);
  } catch (e) {
    console.error('[nhac] public answer failed:', e && e.message ? e.message : e);
    if (!res.headersSent) sendJson(req, res, 500, JSON.stringify({ error: 'Chưa đọc được nhạc nền.' }));
    else res.destroy();
  }
  return true;
}
