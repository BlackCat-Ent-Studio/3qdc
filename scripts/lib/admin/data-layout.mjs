// data-layout.mjs — stops a server that would otherwise come up with the wrong (empty) data: the old data folders are
// still there because scripts/migrate-games-data.mjs was not run, or an old per-part environment variable still points
// somewhere. Checked when the server starts, before it listens.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_ROOT } from './paths.mjs';

// the variables that used to place one part's folder (replaced by DATA_ROOT)
export const OLD_ENV = ['NEWS_DATA_DIR', 'PHIEU_DATA_DIR', 'SIGNUP_DATA_DIR'];
// folders of the old layout, below DATA_ROOT
export const OLD_DIRS = ['news', 'phieu-be-ngoan', 'dang-ky-som'];

function hasFiles(dir) {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true }).some((e) => !e.isDirectory());
  } catch {
    return false; // missing folder
  }
}

// → list of sentences, empty when the layout is fine
export function layoutProblems(root = DATA_ROOT, env = process.env) {
  const out = [];
  for (const name of OLD_ENV) {
    if (env[name]) out.push(`the variable ${name} is no longer used: remove it and set DATA_ROOT (the folder that holds he-thong/ and games/) instead`);
  }
  const old = OLD_DIRS.filter((d) => hasFiles(join(root, d)));
  if (old.length) {
    out.push(`data in the old layout is still in ${root} (${old.map((d) => d + '/').join(', ')}): stop the service, then run  node scripts/migrate-games-data.mjs --dry-run  and  --apply`);
  }
  return out;
}

export function checkDataLayout() {
  const problems = layoutProblems();
  if (!problems.length) return;
  console.error('[data] the server will not start:');
  for (const p of problems) console.error('[data]  - ' + p);
  process.exit(1);
}
