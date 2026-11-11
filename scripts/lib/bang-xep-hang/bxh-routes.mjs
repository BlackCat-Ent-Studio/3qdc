// bxh-routes.mjs — the public address of the leaderboards: GET/HEAD /api/bang-xep-hang. It answers only on the web address of
// a game that has switched the part on (Hoàn Mỹ Thế Giới); on any other address it returns false and the request goes on exactly
// as before.
import { gameOfHost } from '../admin/games.mjs';
import { PART, jsonCongKhai } from './bxh-store.mjs';

function sendJson(req, res, status, body, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(req.method === 'HEAD' ? undefined : body);
}

// cleanPath = decoded path without a trailing slash (as server.mjs computes it)
export async function handleBxhPublic(req, res, cleanPath) {
  if (cleanPath !== '/api/bang-xep-hang') return false;
  const game = gameOfHost(req.headers.host);
  if (!Object.hasOwn(game.modules, PART)) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(req, res, 405, JSON.stringify({ error: 'Chỉ đọc.' }), { Allow: 'GET, HEAD' });
    return true;
  }
  try {
    sendJson(req, res, 200, await jsonCongKhai(game.id));
  } catch (e) {
    console.error('[bxh] public answer failed:', e && e.message ? e.message : e);
    sendJson(req, res, 500, JSON.stringify({ error: 'Chưa đọc được bảng xếp hạng.' }));
  }
  return true;
}
