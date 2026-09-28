// news-config.mjs — shared settings for the news pages (/tin-tuc) and, later, the editor pages.
import { join } from 'node:path';

// Absolute site address used in share tags (og:url, og:image); the draft server on port 3398 overrides it.
export const SITE_ORIGIN = (process.env.NEWS_SITE_ORIGIN || 'https://3qdc.wanmeivn.com').replace(/\/+$/, '');

// Articles live outside git (data/news/posts/<id>.json); the draft server points this at a test folder.
export const DATA_DIR = process.env.NEWS_DATA_DIR || join(process.cwd(), 'data', 'news');

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

// Which site an article appears on, for the game-test period: the main site (3qdc: home page block, /tin-tuc, article
// pages) or the one-page site 3qdaichien.wanmeivn.com (its Caddy block passes /api/tin-tuc and /tin-tuc/* here with its
// own Host). Every article belongs to exactly one; articles saved before this existed belong to the main site.
// SPLIT_SITES = false removes the choice from the editor and shows every article on both addresses again.
export const SPLIT_SITES = true;
export const SITES = [
  { id: 'chinh', name: 'Trang chính', hint: '3qdc.wanmeivn.com — trang chủ, /tin-tuc' },
  { id: 'phu', name: 'Trang phụ', hint: '3qdaichien.wanmeivn.com' },
];
const SIDE_HOSTS = ['3qdaichien.wanmeivn.com'];
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
export const IMAGE_LIBRARY = [
  '/3qdc-vi/home/anh-nen-slogan-vi.webp',
  '/3qdc-vi/home/tin-tuc-banner-1-vi.webp',
  '/3qdc-vi/home/tinh-nang-1-vi.webp',
  '/3qdc-vi/home/tinh-nang-2-vi.png',
  '/3qdc-vi/home/tinh-nang-3-vi.webp',
  '/3qdc-vi/home/tinh-nang-4-vi.png',
  '/3qdc-vi/home/tinh-nang-5-vi.png',
];
// Pictures an article may show: the site's own artwork folders only (uploads arrive under /tin-tuc-anh/ later).
// Every path part starts with a letter, digit, _ or -, so "..", "." and empty parts ("//") cannot appear.
export const IMAGE_PATH_RE = /^\/(?:3qdc-vi|tin-tuc-anh)(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/;

export const TITLE_MAX = 150;
export const SUMMARY_MAX = 220;
export const CONTENT_MAX = 500_000;
