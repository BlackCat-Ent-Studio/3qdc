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
