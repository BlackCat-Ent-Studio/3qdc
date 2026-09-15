// news-seed.mjs — writes the three sample articles as drafts when data/news/posts has no article yet.
// Run on the server from the project folder: node scripts/news-seed.mjs   (safe to run again: it never overwrites)
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from './lib/news/news-config.mjs';
import { SAMPLE_POSTS } from './lib/news/news-samples.mjs';

const dir = join(DATA_DIR, 'posts');
await mkdir(dir, { recursive: true });
const existing = (await readdir(dir)).filter((n) => n.endsWith('.json'));
if (existing.length) {
  console.log(`news-seed: ${existing.length} article file(s) already in ${dir} — nothing written`);
} else {
  // +07:00 is the site's time zone
  const now = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19) + '+07:00';
  for (const p of SAMPLE_POSTS) {
    const post = { ...p, status: 'draft', publishAt: null, pinned: false, author: 'Quản trị', updatedBy: 'Quản trị', createdAt: now, updatedAt: now };
    await writeFile(join(dir, `${p.id}.json`), JSON.stringify(post, null, 2) + '\n', { flag: 'wx' });
    console.log('news-seed: wrote draft', `${p.id}.json`, p.slug);
  }
}
