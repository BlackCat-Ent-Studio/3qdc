// news-store.mjs — reads the articles from data/news/posts/*.json once and answers which ones visitors may see.
// A visitor sees an article only when it is published and its publish time has passed, so a scheduled article
// appears by itself at its time without any timer.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR, SLUG_RE, SLUG_MAX, isCat } from './news-config.mjs';

const STATUSES = new Set(['draft', 'pending', 'published']);
// publish times are stored in the site's zone only, e.g. 2026-09-20T20:00:00+07:00 (or null while unpublished)
const PUBLISH_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\+07:00$/;

function isValid(p) {
  return p && Number.isInteger(p.id) && p.id > 0
    && typeof p.slug === 'string' && p.slug.length <= SLUG_MAX && SLUG_RE.test(p.slug)
    && typeof p.title === 'string' && p.title.trim() !== ''
    && isCat(p.category) && STATUSES.has(p.status)
    && typeof p.content === 'string'
    && (p.publishAt == null || (typeof p.publishAt === 'string' && PUBLISH_AT_RE.test(p.publishAt)));
}

// which of two articles sharing one address keeps it: a published one first, then the older (smaller id)
const keepsAddress = (a, b) => ((a.status === 'published') !== (b.status === 'published') ? a.status === 'published' : a.id < b.id);

async function readAll() {
  const dir = join(DATA_DIR, 'posts');
  let names;
  try {
    names = await readdir(dir);
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn('[news] cannot read', dir, e.message);
    return [];
  }
  const posts = [];
  const bySlug = new Map();
  for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
    let p;
    try {
      p = JSON.parse(await readFile(join(dir, name), 'utf8'));
    } catch (e) {
      console.warn('[news] skipped unreadable article file', name, e.message);
      continue;
    }
    if (!isValid(p)) { console.warn('[news] skipped invalid article file', name); continue; }
    // two files with one address: the published one keeps it, else the older article (smaller id)
    const other = bySlug.get(p.slug);
    if (other) {
      console.warn('[news] duplicate address', p.slug, 'ids', other.id, p.id);
      if (keepsAddress(other, p)) continue;
      posts.splice(posts.indexOf(other), 1);
    }
    bySlug.set(p.slug, p);
    posts.push(p);
  }
  return posts;
}

let loading = null;
// All articles, read on first use and kept in memory until the service restarts.
export function allPosts() {
  if (!loading) loading = readAll();
  return loading;
}

export function isVisible(p, now = Date.now()) {
  if (p.status !== 'published' || !p.publishAt) return false;
  const t = Date.parse(p.publishAt);
  return Number.isFinite(t) && t <= now;
}

const newestFirst = (a, b) => (Date.parse(b.publishAt) - Date.parse(a.publishAt)) || (b.id - a.id);

// Articles a visitor may see right now, newest first.
export async function visiblePosts(now = Date.now()) {
  return (await allPosts()).filter((p) => isVisible(p, now)).sort(newestFirst);
}
