// news-config.mjs — shared settings for the news pages (/tin-tuc) and, later, the editor pages.
import { gameById } from '../admin/games.mjs';

// Absolute site address used in share tags (og:url, og:image); the draft server on port 3398 overrides it.
export const SITE_ORIGIN = (process.env.NEWS_SITE_ORIGIN || 'https://3qdc.wanmeivn.com').replace(/\/+$/, '');

// The news of this server are the news of the game 3qdc (the book of games: scripts/lib/admin/games.mjs).
const GAME = gameById('3qdc');

// The three tabs, in display order; the first one is the default.
export const CATS = [
  { id: 'thong-bao', name: 'Thông báo' },
  { id: 'su-kien', name: 'Sự kiện' },
  { id: 'cam-nang', name: 'Cẩm nang' },
];

// Article addresses: lowercase ASCII words joined by single dashes, at most 80 characters.
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 80;

// Artwork shown when an article has no usable cover.
export const DEFAULT_COVER = '/3qdc-vi/home/anh-nen-slogan-vi.webp';
export const LOGO = '/3qdc-vi/home/logo-3qdc.webp';

export const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || '';
export const isCat = (id) => CATS.some((c) => c.id === id);
// the sections one game's articles use: its 'tin-tuc' setting `cats` (games.mjs), else all of CATS
export function catsOf(gameId) {
  const g = gameById(gameId);
  const ids = g && g.modules['tin-tuc'] && g.modules['tin-tuc'].cats;
  return Array.isArray(ids) ? CATS.filter((c) => ids.includes(c.id)) : CATS;
}

// An article of the section "Sự kiện" may carry its dates and two short labels, shown on a game's event board:
// { start, end } days (YYYY-MM-DD, site time; either may be empty), kind (e.g. "Bang chiến"), time (e.g. "20:00 thứ Bảy").
export const EVENT_CAT = 'su-kien';
export const EVENT_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const EVENT_KIND_MAX = 30;
export const EVENT_TIME_MAX = 60;

// Which site an article appears on, for the game-test period: the main site (3qdc: home page block, /tin-tuc, article
// pages) or the one-page site 3qdaichien.wanmeivn.com (its Caddy block passes /api/tin-tuc and /tin-tuc/* here with its
// own Host). Every article belongs to exactly one; articles saved before this existed belong to the main site.
// SPLIT_SITES = false removes the choice from the editor and shows every article on both addresses again.
export const SPLIT_SITES = true;
export const SITES = GAME.sites.filter((x) => x.module === 'tin-tuc').map(({ id, name, hint }) => ({ id, name, hint }));
const SIDE_HOSTS = GAME.sites.filter((x) => x.id === 'phu').flatMap((x) => x.hosts);
export const isSite = (id) => SITES.some((s) => s.id === id);
export const siteName = (id) => (SITES.find((s) => s.id === id) || SITES[0]).name;
// the site an article shows on
export const siteOf = (p) => (SPLIT_SITES && p.site === 'phu' ? 'phu' : 'chinh');
// the site a request is for, from its Host header
export function siteOfHost(host) {
  const h = String(host || '').toLowerCase().replace(/:\d+$/, '');
  return SPLIT_SITES && SIDE_HOSTS.includes(h) ? 'phu' : 'chinh';
}
// articles of one site; with the split switched off every site gets every article
export const onSite = (posts, site) => (SPLIT_SITES ? posts.filter((p) => siteOf(p) === site) : posts);

// --- editor pages (/quan-tri) ---
// Pages allowed to send changes (the Origin header of every POST); the draft server lists its own address here.
export const ALLOWED_ORIGINS = (process.env.NEWS_ALLOWED_ORIGINS || SITE_ORIGIN).split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
// The session cookie is Secure (the site runs on HTTPS); only the plain-http draft server switches that off.
export const SECURE_COOKIE = process.env.NEWS_INSECURE_COOKIE !== '1';

// Artwork the editor offers for covers and pictures inside an article.
export const IMAGE_LIBRARY = GAME.modules['tin-tuc'].imageLibrary;
// Pictures an article may show: the site's own artwork folders only (uploads arrive under /tin-tuc-anh/ later).
// Every path part starts with a letter, digit, _ or -, so "..", "." and empty parts ("//") cannot appear.
export const IMAGE_PATH_RE = /^\/(?:3qdc-vi|tin-tuc-anh)(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/;

export const TITLE_MAX = 150;
export const SUMMARY_MAX = 220;
export const CONTENT_MAX = 500_000;
