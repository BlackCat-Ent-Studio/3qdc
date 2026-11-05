// make-test-accounts.mjs — test fixtures for the behaviour checks, written ONLY into a draft copy of the data.
//   3 sign-in accounts (one per role), 1 Claude code for the ticket role, and 2 articles of the side site
//   (one published, one in the trash) so the site split and the trash list have something to show.
// Refuses to run unless the draft switches are on (NEWS_INSECURE_COOKIE=1, the plain-http draft server's switch, which the
// live service never has) and DATA_ROOT points at a folder that is not the live data.
//   NEWS_INSECURE_COOKIE=1 DATA_ROOT=/srv/_nhap-x-data node verify/quan-tri/make-test-accounts.mjs
// Run it from the project folder. Safe to run again (it replaces its own entries). Restart the draft server afterwards:
// the article list is cached in memory.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TEST_PASSWORD = 'Thu-nghiem-khong-dung-that-0123';
export const TEST_ACCOUNTS = [
  { username: 'thu-quanly', name: 'Thử Quản lý', role: 'manager' },
  { username: 'thu-bientap', name: 'Thử Biên tập', role: 'editor' },
  { username: 'thu-duyetphieu', name: 'Thử Duyệt phiếu', role: 'phieu' },
];
// a Claude code with the real shape (3qp_ + 43 url-safe characters); it only exists in the draft copy
export const TEST_MCP_CODE = '3qp_ThuNghiemChiCoTrongBanChepNhap0123456789a';
export const TEST_MCP_LABEL = 'thu-nghiem';
export const SIDE_POST = { id: 9001, slug: 'bai-thu-trang-phu' };
export const TRASH_FILE = '9002-20261106000000.json';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

async function main() {
  const dir = process.env.DATA_ROOT;
  if (process.env.NEWS_INSECURE_COOKIE !== '1') throw new Error('NEWS_INSECURE_COOKIE=1 is required (draft server only)');
  if (!dir) throw new Error('DATA_ROOT must point at the draft copy of the data folder');
  const abs = resolve(dir);
  if (abs === resolve('data') || abs.startsWith('/srv/3qdc-unified/')) throw new Error('refusing to write into the live data folder');

  // load the project's own password hashing so the accounts are exactly what the server makes
  const { hashPassword } = await import(pathToFileURL(resolve('scripts/lib/news/admin-auth.mjs')).href);
  const now = new Date().toISOString();

  const usersFile = join(abs, 'he-thong', 'users.json');
  const users = JSON.parse(await readFile(usersFile, 'utf8'));
  for (const a of TEST_ACCOUNTS) {
    const i = users.findIndex((u) => u.username === a.username);
    if (i >= 0) users.splice(i, 1);
    users.push({ ...a, ...(await hashPassword(TEST_PASSWORD)), disabled: false, createdAt: now, passwordSetAt: now, testFixture: true });
  }
  await writeFile(usersFile, JSON.stringify(users, null, 2));

  const tokensFile = join(abs, 'he-thong', 'mcp-tokens.json');
  let tokens = [];
  try { tokens = JSON.parse(await readFile(tokensFile, 'utf8')); } catch { /* none yet */ }
  tokens = tokens.filter((t) => t.label !== TEST_MCP_LABEL);
  tokens.push({
    id: 'a1b2c3d4e5f6', username: 'thu-duyetphieu', label: TEST_MCP_LABEL, hint: TEST_MCP_CODE.slice(-4), hash: sha256(TEST_MCP_CODE),
    createdBy: 'thu-quanly', createdAt: now.slice(0, 19),
  });
  await writeFile(tokensFile, JSON.stringify(tokens, null, 2));

  // side-site article (published) and a trashed one, both cloned from the first published article
  const news = join(abs, 'games', '3qdc', 'tin-tuc');
  const posts = join(news, 'posts');
  const src = JSON.parse(await readFile(join(posts, '4.json'), 'utf8'));
  const side = { ...src, id: SIDE_POST.id, slug: SIDE_POST.slug, title: 'Bài thử của trang phụ', site: 'phu', pinned: false, status: 'published', publishAt: '2026-01-01T08:00:00+07:00' };
  await writeFile(join(posts, `${SIDE_POST.id}.json`), JSON.stringify(side, null, 2));
  await mkdir(join(news, 'trash'), { recursive: true });
  const trashed = { ...src, id: 9002, slug: 'bai-thu-thung-rac', title: 'Bài thử trong thùng rác', status: 'draft', pinned: false, deletedBy: 'thu-quanly', deletedAt: '2026-11-06T00:00:00.000+07:00' };
  await writeFile(join(news, 'trash', TRASH_FILE), JSON.stringify(trashed, null, 2));

  console.log(`test fixtures written: ${TEST_ACCOUNTS.length} accounts, 1 Claude code, 2 articles (data folder: ${abs})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('make-test-accounts: ' + e.message); process.exitCode = 1; });
}
