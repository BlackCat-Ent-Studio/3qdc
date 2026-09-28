// news-routes.mjs — answers /tin-tuc, /tin-tuc/<slug>, /api/tin-tuc and the editor pages under /quan-tri;
// returns false for every other request.
import { CATS, SLUG_RE, SLUG_MAX, isCat, siteOfHost, onSite } from './news-config.mjs';
import { visiblePosts } from './news-store.mjs';
import { renderListPage, renderDetailPage, renderNotFound } from './news-pages.mjs';
import { handleAdmin } from './admin-page.mjs';
import { serveUpload } from './news-uploads.mjs';

function sendPage(req, res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : html);
}

function sendJson(req, res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data));
}

// cleanPath = decoded path without a trailing slash (as server.mjs computes it); u = the parsed request URL
export async function handleNews(req, res, cleanPath, u) {
  // editor pages and their API (sign-in, articles) — every method, checked there
  if (await handleAdmin(req, res, cleanPath)) return true;
  // pictures uploaded for articles (/tin-tuc-anh/YYYY/MM/<name>)
  if (await serveUpload(req, res, cleanPath)) return true;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  // only the articles of the site this address belongs to (main site or 3qdaichien, see SITES)
  const sitePosts = async () => onSite(await visiblePosts(), siteOfHost(req.headers.host));

  if (cleanPath === '/tin-tuc') {
    const want = u.searchParams.get('muc');
    sendPage(req, res, 200, renderListPage(await sitePosts(), isCat(want) ? want : CATS[0].id));
    return true;
  }

  // every address below /tin-tuc/ belongs to the news pages: an unknown, unpublished, other-site or malformed one is a
  // 404 page
  if (cleanPath.startsWith('/tin-tuc/')) {
    const slug = cleanPath.slice('/tin-tuc/'.length);
    const visible = await sitePosts();
    const post = slug.length <= SLUG_MAX && SLUG_RE.test(slug) ? visible.find((p) => p.slug === slug) : null;
    if (post) sendPage(req, res, 200, renderDetailPage(post, visible));
    else sendPage(req, res, 404, renderNotFound());
    return true;
  }

  // newest visible articles for the home page block: ?muc=<tab>&limit=<1..50, default 4>
  if (cleanPath === '/api/tin-tuc') {
    const muc = u.searchParams.get('muc');
    const n = parseInt(u.searchParams.get('limit') || '4', 10);
    const limit = Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : 4;
    const items = (await sitePosts())
      .filter((p) => !isCat(muc) || p.category === muc)
      .slice(0, limit)
      .map((p) => ({ slug: p.slug, title: p.title, category: p.category, summary: p.summary || '', cover: p.cover || '', publishAt: p.publishAt, pinned: !!p.pinned }));
    sendJson(req, res, 200, items);
    return true;
  }

  return false;
}
