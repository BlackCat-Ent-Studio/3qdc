// news-actions.mjs — saving one article with one action (save, send for review, take back, publish, schedule, send back,
// unpublish). The editor pages (modules/tin-tuc-api.mjs) and Claude's tools (mcp/news.mjs) both call saveArticle, so the
// rules of news-workflow.mjs (who may do what to an article in which state, the checks on its text, the HTML filter) are one.
import { newsStore, stampAfter } from '../news/news-store.mjs';
import { catsOf } from '../news/news-config.mjs';
import { decide } from '../news/news-workflow.mjs';
import { siteNowSeconds } from '../news/news-files.mjs';
import { newsRoleOf } from './grants.mjs';

/**
 * Saves one article of `gameId`.
 *   user  the account (username, name, role, grants)     id  the article's id, or null to create one
 *   body  { action, baseUpdatedAt (when changing), title, slug, summary, category, site, cover, content, pinned, publishAt, note }
 * → { post } or { status, error } (404 unknown article, 409 changed since baseUpdatedAt, or the workflow's refusal)
 */
export async function saveArticle(gameId, user, id, body) {
  // the article rules (news-workflow.mjs) speak of "manager" and "editor": this account's role for this game's news
  const writer = { ...user, role: newsRoleOf(user, gameId) };
  const { change } = newsStore(gameId);
  return change(async ({ posts, save, nextId }) => {
    const cur = id ? posts.find((p) => p.id === id) : null;
    if (id && !cur) return { status: 404, error: 'Không tìm thấy bài (có thể đã bị xoá).' };
    if (cur && body.baseUpdatedAt !== cur.updatedAt) {
      return { status: 409, error: `Bài đã được ${cur.updatedBy || 'người khác'} sửa lúc ${String(cur.updatedAt).slice(11, 16)} ngày ${String(cur.updatedAt).slice(8, 10)}/${String(cur.updatedAt).slice(5, 7)}. Tải lại để xem bản mới rồi sửa tiếp.` };
    }
    const now = Date.now();
    const dctx = { posts, now, nowText: stampAfter(cur && cur.updatedAt), nowPublish: siteNowSeconds(now), newId: cur ? cur.id : await nextId(posts), cats: catsOf(gameId).map((c) => c.id) };
    const d = decide(writer, cur, body, dctx);
    if (d.error) return d;
    // unpin the others first: if that fails, nothing of this save is stored and a retry starts clean
    for (const otherId of d.unpin) {
      const o = posts.find((p) => p.id === otherId);
      if (o) await save({ ...o, pinned: false, updatedBy: user.name, updatedAt: stampAfter(o.updatedAt) }, { action: 'bo-ghim', actor: user.name });
    }
    await save(d.post, { action: body.action, actor: user.name });
    return { post: d.post };
  });
}
