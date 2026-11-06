// tin-tuc-api.mjs — articles, pictures and the trash of one game's news. Writers (`viet`) work on articles and pictures;
// reviewers (`duyet`) also see the trash and bring articles back; only an owner deletes from it for good. The rules of each article change live in news-workflow.mjs.
import { newsStore, isVisible } from '../../news/news-store.mjs';
import { uploadsOf } from '../../news/news-uploads.mjs';
import { mayDelete, summaryOf } from '../../news/news-workflow.mjs';
import { currentUser } from '../../news/admin-auth.mjs';
import { can, newsRoleOf } from '../grants.mjs';
import { siteNow } from '../../news/news-files.mjs';
import { send, oops, sendAndClose } from '../api-http.mjs';
import { moveToTrash } from '../trash.mjs';
import { saveArticle } from '../news-actions.mjs';
import { trashRoutes, webActor } from '../trash-api.mjs';

const LOCK_MS = 90e3;
const locks = new Map(); // "<game>:<article id>" → { username, name, until }
const lockKey = (ctx, id) => `${ctx.game.id}:${id}`;

async function uploadPicture(req, res, game) {
  const user = await currentUser(req);
  if (!user) return sendAndClose(req, res, 401, { error: 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.' });
  if (!can(user, game.id, 'tin-tuc', 'viet')) return sendAndClose(req, res, 403, { error: 'Tài khoản này không có quyền viết bài.' });
  const r = await uploadsOf(game.id).saveUpload(req);
  if (r.error) return sendAndClose(req, res, r.status, { error: r.error });
  console.log(`[news] ${siteNow()} ${user.username} uploaded ${r.url} (${r.bytes} bytes)`);
  return send(res, 201, { url: r.url, bytes: r.bytes });
}

// A POST whose body is the picture itself: handled before any JSON reading (the session is checked before a single
// byte is read). Returns true when it took the request.
export async function upload(req, res, path, game) {
  if (path !== '/anh') return false;
  await uploadPicture(req, res, game);
  return true;
}

// Someone else's current hold on an article, or null.
function otherLock(ctx, id) {
  const key = lockKey(ctx, id);
  const l = locks.get(key);
  if (!l || l.until < Date.now()) { if (l) locks.delete(key); return null; }
  return l.username === ctx.user.username ? null : { name: l.name };
}

// Returns true when it answered, false for an address it does not know.
export async function api(ctx, req, res, path, body) {
  const { user, method } = ctx;
  // the article rules (news-workflow.mjs) speak of "manager" and "editor": this account's role for this game's news
  const writer = { ...user, role: newsRoleOf(user, ctx.game.id) };
  const { allPosts, listRevisions, readRevision } = newsStore(ctx.game.id);
  const done = (status, data) => { send(res, status, data); return true; };
  const fail = (status, error) => { oops(res, status, error); return true; };

  // trash: seeing and bringing back needs `duyet`, deleting for good an owner (trash-api.mjs)
  if (path === '/thung-rac' || path.startsWith('/thung-rac/')) return trashRoutes(ctx, res, 'tin-tuc', path);

  // pictures and articles: everyone who writes
  if (!ctx.can('viet')) return fail(403, 'Tài khoản này không có quyền viết bài.');

  // pictures uploaded recently
  if (method === 'GET' && path === '/anh') return done(200, { items: await uploadsOf(ctx.game.id).recentUploads(40) });

  if (method === 'GET' && path === '/bai') {
    const posts = await allPosts();
    const items = posts.map((p) => ({ ...summaryOf(p), visible: isVisible(p), lockedBy: (otherLock(ctx, p.id) || {}).name || '' }));
    return done(200, { items });
  }

  let m;
  if ((m = path.match(/^\/bai\/(\d{1,9})$/)) && method === 'GET') {
    const id = +m[1];
    const post = (await allPosts()).find((p) => p.id === id);
    if (!post) return fail(404, 'Không tìm thấy bài (có thể đã bị xoá).');
    return done(200, { post: { ...post, visible: isVisible(post) }, lockedBy: (otherLock(ctx, id) || {}).name || '', history: await listRevisions(id) });
  }

  if ((m = path.match(/^\/bai\/(\d{1,9})\/lich-su\/(\d{1,17})$/)) && method === 'GET') {
    const r = await readRevision(+m[1], m[2]);
    if (!r || !r.post) return fail(404, 'Không tìm thấy bản lưu này.');
    return done(200, { revision: r });
  }

  // save: create (POST /bai) or change (POST /bai/<id>), with one action from news-workflow.mjs
  if (method === 'POST' && (path === '/bai' || (m = path.match(/^\/bai\/(\d{1,9})$/)))) {
    const id = m ? +m[1] : null;
    const r = await saveArticle(ctx.game.id, user, id, body);
    if (r.error) return fail(r.status, r.error);
    locks.set(lockKey(ctx, r.post.id), { username: user.username, name: user.name, until: Date.now() + LOCK_MS });
    console.log(`[news] ${siteNow()} ${user.username} ${body.action} article ${r.post.id} → ${r.post.status}`);
    return done(200, { post: { ...r.post, visible: isVisible(r.post) }, history: await listRevisions(r.post.id) });
  }

  // "I am editing this": refreshed every 30 s by the open editor; answers who else holds it
  if ((m = path.match(/^\/bai\/(\d{1,9})\/khoa$/)) && method === 'POST') {
    const id = +m[1];
    if (!(await allPosts()).some((p) => p.id === id)) return fail(404, 'Không tìm thấy bài (có thể đã bị xoá).');
    const other = otherLock(ctx, id);
    if (body.release === true) {
      if (!other) locks.delete(lockKey(ctx, id));
    } else if (!other) {
      locks.set(lockKey(ctx, id), { username: user.username, name: user.name, until: Date.now() + LOCK_MS });
    }
    return done(200, { lockedBy: other ? other.name : '' });
  }

  if ((m = path.match(/^\/bai\/(\d{1,9})\/xoa$/)) && method === 'POST') {
    if (!mayDelete(writer)) return fail(403, 'Chỉ Quản lý mới xoá bài.');
    const id = +m[1];
    const r = await moveToTrash(ctx.game.id, 'tin-tuc', id, { actor: webActor('tin-tuc', user), via: 'web', baseUpdatedAt: body.baseUpdatedAt });
    if (r.error) return fail(r.status, r.error);
    locks.delete(lockKey(ctx, id));
    console.log(`[news] ${siteNow()} ${user.username} deleted article ${id} (moved to trash)`);
    return done(200, { ok: true });
  }

  return false;
}
