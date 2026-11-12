// nhac-api.mjs — background music of the home page (managers only): the songs are plain files in overrides/home/nhac,
// so the list is the folder itself and a change is live at once (the player reads the same folder).
import { currentUser } from '../../news/admin-auth.mjs';
import { can } from '../grants.mjs';
import { listSongs, saveSong, SONG_MAX, FOLDER_MAX } from '../../home/music-store.mjs';
import { siteNow } from '../../news/news-files.mjs';
import { send, oops, sendAndClose } from '../api-http.mjs';
import { moveToTrash } from '../trash.mjs';
import { trashRoutes, webActor } from '../trash-api.mjs';
import { serveSong } from '../../home/music-routes.mjs';
import { MAIN_GAME } from '../../home/music-store.mjs';

// 3qdc's songs are played for "Nghe thử" from their public address; another game's songs are not served on this host, so
// each carries the admin address that streams it (checked session and rights).
const listed = async (gameId) => (await listSongs(gameId)).map((s) => (gameId === MAIN_GAME ? s : { ...s, nghe: `/nhac/${encodeURIComponent(s.name)}/nghe` }));

// One song of the home page's player. The file name (with its Vietnamese text) travels in a header because the body is
// the sound itself; the store cleans it and keeps names unique.
async function uploadSong(req, res, game) {
  const user = await currentUser(req);
  if (!user) return sendAndClose(req, res, 401, { error: 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.' });
  if (!can(user, game.id, 'nhac', 'quan-ly')) return sendAndClose(req, res, 403, { error: 'Chỉ Quản lý mới thêm được nhạc nền.' });
  let raw = '';
  try { raw = decodeURIComponent(String(req.headers['x-ten-file'] || '')); } catch { raw = ''; }
  const r = await saveSong(req, raw, game.id);
  if (r.error) return sendAndClose(req, res, r.status, { error: r.error });
  console.log(`[news] ${siteNow()} ${user.username} uploaded song ${r.name} (${r.bytes} bytes)`);
  return send(res, 201, { name: r.name, bytes: r.bytes, items: await listed(game.id) });
}

// A POST whose body is raw audio: handled before any JSON reading. Returns true when it took the request.
export async function upload(req, res, path, game) {
  if (path !== '/nhac') return false;
  await uploadSong(req, res, game);
  return true;
}

// Returns true when it answered, false for an address it does not know.
export async function api(ctx, req, res, path) {
  const { user, method } = ctx;
  if (!ctx.can('quan-ly')) { oops(res, 403, 'Chỉ Quản lý mới quản lý nhạc nền.'); return true; }
  if (path === '/nhac/thung-rac' || path.startsWith('/nhac/thung-rac/')) return trashRoutes(ctx, res, 'nhac', path);
  if (method === 'GET' && path === '/nhac') {
    send(res, 200, { items: await listed(ctx.game.id), max: SONG_MAX, total: FOLDER_MAX });
    return true;
  }
  const ln = path.match(/^\/nhac\/([^/]+)\/nghe$/);
  if (ln && (method === 'GET' || method === 'HEAD')) {
    let name = '';
    try { name = decodeURIComponent(ln[1]); } catch { /* falls to the 404 below */ }
    if (!(await serveSong(req, res, ctx.game.id, name))) oops(res, 404, 'Không tìm thấy bài hát này.');
    return true;
  }
  const nm = path.match(/^\/nhac\/([^/]+)\/xoa$/);
  if (method === 'POST' && nm) {
    const r = await moveToTrash(ctx.game.id, 'nhac', decodeURIComponent(nm[1]), { actor: webActor('nhac', user), via: 'web' });
    if (r.error) { oops(res, r.status, r.error); return true; }
    console.log(`[news] ${siteNow()} ${user.username} moved song ${r.label} to the trash`);
    send(res, 200, { items: await listed(ctx.game.id) });
    return true;
  }
  return false;
}
