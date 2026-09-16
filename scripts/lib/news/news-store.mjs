// news-store.mjs — the articles in data/news/posts/*.json, kept in memory, and every change written back to disk.
// A visitor sees an article only when it is published and its publish time has passed, so a scheduled article
// appears by itself at its time without any timer.
// Changes go through change(): one at a time, so checking an article and writing it can never interleave with another
// save. Each saved version is also kept in revisions/<id>/ (newest 20); a deleted article moves to trash/.
import { readdir, readFile, mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR, SLUG_RE, SLUG_MAX, isCat } from './news-config.mjs';
import { writeJsonAtomic, siteNow } from './news-files.mjs';

const STATUSES = new Set(['draft', 'pending', 'published']);
// publish times are stored in the site's zone only, e.g. 2026-09-20T20:00:00+07:00 (or null while unpublished)
export const PUBLISH_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\+07:00$/;
const REVISIONS_KEPT = 20;

const postsDir = () => join(DATA_DIR, 'posts');
const revisionsDir = (id) => join(DATA_DIR, 'revisions', String(id));
const trashDir = () => join(DATA_DIR, 'trash');

export function isValid(p) {
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
  const dir = postsDir();
  let names;
  try {
    names = await readdir(dir);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
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
    if (!isValid(p) || name !== `${p.id}.json`) { console.warn('[news] skipped invalid article file', name); continue; }
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
// All articles, read on first use and kept in memory; a failed read is not remembered, the next request tries again.
export function allPosts() {
  if (!loading) {
    loading = readAll().catch((e) => {
      console.warn('[news] cannot read', postsDir(), e.message);
      loading = null;
      return [];
    });
  }
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

// ---------- changes ----------
let queue = Promise.resolve();
// Runs fn(tools) after every earlier change has finished; its result (or error) is returned to the caller.
export function change(fn) {
  const run = queue.then(async () => fn({ posts: await allPosts(), save, remove, nextId }));
  queue = run.catch(() => {});
  return run;
}

// A new edit stamp for an article: the site's time with milliseconds, always later than the previous one.
export function stampAfter(previous) {
  let s = siteNow();
  if (previous && s <= previous) s = siteNow(Date.parse(previous) + 1);
  return s;
}

async function nextId(posts) {
  let max = posts.reduce((m, p) => Math.max(m, p.id), 0);
  for (const dir of [postsDir(), trashDir(), join(DATA_DIR, 'revisions')]) {
    const names = await readdir(dir).catch(() => []);
    for (const n of names) max = Math.max(max, parseInt(n, 10) || 0);
  }
  return max + 1;
}

// Writes an article (only inside change()), keeps a copy of this version, and updates the in-memory list.
async function save(post, meta) {
  if (!isValid(post)) throw new Error('refusing to store an invalid article ' + post.id);
  await mkdir(postsDir(), { recursive: true });
  await writeJsonAtomic(join(postsDir(), `${post.id}.json`), post);
  const posts = await allPosts();
  const i = posts.findIndex((p) => p.id === post.id);
  if (i >= 0) posts[i] = post; else posts.push(post);
  await keepRevision(post, meta).catch((e) => console.warn('[news] revision not kept for', post.id, e.message));
}

async function keepRevision(post, { action, actor }) {
  const dir = revisionsDir(post.id);
  await mkdir(dir, { recursive: true });
  const name = post.updatedAt.replace(/[^0-9]/g, '').slice(0, 17) + '.json';
  await writeJsonAtomic(join(dir, name), { savedAt: post.updatedAt, action, actor, post });
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  for (const old of names.slice(0, Math.max(0, names.length - REVISIONS_KEPT))) await rm(join(dir, old), { force: true });
}

// Moves an article file to trash/ (only inside change()) and drops it from the list. Its revisions stay.
async function remove(post) {
  await mkdir(trashDir(), { recursive: true });
  await rename(join(postsDir(), `${post.id}.json`), join(trashDir(), `${post.id}-${siteNow().replace(/[^0-9]/g, '').slice(0, 14)}.json`));
  const posts = await allPosts();
  const i = posts.findIndex((p) => p.id === post.id);
  if (i >= 0) posts.splice(i, 1);
}

// Saved versions of an article, newest first: [{ rev, savedAt, action, actor }]
export async function listRevisions(id) {
  const dir = revisionsDir(id);
  const names = (await readdir(dir).catch(() => [])).filter((n) => /^\d+\.json$/.test(n)).sort().reverse();
  const out = [];
  for (const n of names) {
    try {
      const r = JSON.parse(await readFile(join(dir, n), 'utf8'));
      out.push({ rev: n.slice(0, -5), savedAt: r.savedAt, action: r.action, actor: r.actor });
    } catch { /* a broken copy is skipped */ }
  }
  return out;
}

export async function readRevision(id, rev) {
  if (!/^\d{1,17}$/.test(rev)) return null;
  try {
    return JSON.parse(await readFile(join(revisionsDir(id), rev + '.json'), 'utf8'));
  } catch {
    return null;
  }
}
