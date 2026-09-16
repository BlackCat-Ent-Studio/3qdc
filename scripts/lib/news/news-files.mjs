// news-files.mjs — small file helpers shared by the article store, the accounts and the account command.
import { writeFile, rename, rm, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Writes JSON to a temporary file next to the target, then renames it over the target, so a crash or power cut leaves
// either the old file or the new one, never half of one. Windows can refuse the rename for a moment while another
// program (antivirus, backup) holds the file open, so it is retried briefly.
export async function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(tmp, file);
      return;
    } catch (e) {
      if (attempt < 5 && (e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'EACCES')) { await sleep(40 * (attempt + 1)); continue; }
      await rm(tmp, { force: true });
      throw e;
    }
  }
}

// Parsed JSON, or `fallback` when the file does not exist (any other problem is thrown).
export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
}

// Current time in the site's zone (+07:00): full = with milliseconds (edit stamps), minute precision for publish times.
export function siteNow(ms = Date.now()) {
  return new Date(ms + 7 * 3600e3).toISOString().replace('Z', '+07:00');
}
export const siteNowSeconds = (ms = Date.now()) => siteNow(ms).slice(0, 19) + '+07:00';
