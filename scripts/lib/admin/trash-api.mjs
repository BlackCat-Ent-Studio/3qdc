// trash-api.mjs — the web addresses of a part's trash, shared by every part (the work itself is in trash.mjs):
//   GET  <base>                       what is in the trash
//   POST <base>/<key>/khoi-phuc       bring one back
//   POST <base>/<key>/xoa-han         delete one for good   (owners only)
//   POST <base>/don-sach              delete everything for good (owners only)
// <base> is /thung-rac for the news (older address) and /<part>/thung-rac for the other parts, below /g/<game>.
// Seeing and bringing back needs the part's trash permission (TRASH_PERMS); deleting for good needs an owner account.
import { isOwner } from './grants.mjs';
import { TRASH_PERMS, listTrash, restoreFromTrash, purgeFromTrash, emptyTrash } from './trash.mjs';
import { siteNow } from '../news/news-files.mjs';
import { send, oops } from './api-http.mjs';

export const trashBase = (part) => (part === 'tin-tuc' ? '/thung-rac' : `/${part}/thung-rac`);

// The name written beside a deletion made on a web page: the account name (Claude's tools write "<account>" with via 'claude').
export const webActor = (part, user) => user.username;

/** Answers the trash addresses of `part` when `path` is one of them. Returns true when it answered, false otherwise. */
export async function trashRoutes(ctx, res, part, path) {
  const base = trashBase(part);
  if (path !== base && !path.startsWith(base + '/')) return false;
  const { user, method, game } = ctx;
  const gid = game.id;
  const fail = (r) => { oops(res, r.status, r.error); return true; };
  const itemsNow = async () => (await listTrash(gid, part)).items;

  if (!ctx.can(TRASH_PERMS[part])) return fail({ status: 403, error: 'Tài khoản này không có quyền xem thùng rác của phần này.' });
  if (method === 'GET' && path === base) {
    const r = await listTrash(gid, part);
    if (r.error) return fail(r);
    send(res, 200, { items: r.items });
    return true;
  }
  if (method !== 'POST') return false;
  const onlyOwner = () => fail({ status: 403, error: 'Chỉ chủ mới xoá vĩnh viễn được.' });

  if (path === base + '/don-sach') {
    if (!isOwner(user)) return onlyOwner();
    const r = await emptyTrash(gid, part, { actor: user.username });
    if (r.error) return fail(r);
    console.log(`[news] ${siteNow()} ${user.username} emptied the ${part} trash (${r.deleted} deleted for good)`);
    send(res, 200, { deleted: r.deleted, items: await itemsNow() });
    return true;
  }
  const m = path.slice(base.length).match(/^\/([^/]+)\/(khoi-phuc|xoa-han)$/);
  if (!m) return false;
  let key;
  try { key = decodeURIComponent(m[1]); } catch { return fail({ status: 400, error: 'Địa chỉ không hợp lệ.' }); }

  if (m[2] === 'khoi-phuc') {
    const r = await restoreFromTrash(gid, part, key, { actor: webActor(part, user), actorName: user.name, via: 'web' });
    if (r.error) return fail(r);
    console.log(`[news] ${siteNow()} ${user.username} restored from the ${part} trash: ${r.label}`);
    send(res, 200, { label: r.label, ...(r.post ? { post: r.post } : {}), items: await itemsNow() });
    return true;
  }
  if (!isOwner(user)) return onlyOwner();
  const r = await purgeFromTrash(gid, part, key, { actor: user.username });
  if (r.error) return fail(r);
  console.log(`[news] ${siteNow()} ${user.username} deleted from the ${part} trash for good: ${r.label}`);
  send(res, 200, { label: r.label, title: r.label, items: await itemsNow() });
  return true;
}
