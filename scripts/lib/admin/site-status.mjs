// site-status.mjs — does each web address of a game open? The overview shows it as a coloured dot.
// Each address is asked the way a visitor would (its public https:// address, from this machine), so a part served by another
// program behind the proxy (Q&A, card approval) counts too. Answers are kept 30 seconds, so the overview cannot be used to
// make the server busy, and every address is fixed by games.mjs (nothing comes from a request).
import { gameById } from './games.mjs';

const TTL_MS = 30000;
const TIMEOUT_MS = 4000;
const cache = new Map(); // "game/site" -> { at, value }

// opens = any answer below 400, or a refusal that proves the page exists behind a sign-in (401, 403)
const opens = (code) => code < 400 || code === 401 || code === 403;

async function ask(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'quan-tri-site-check' } });
    if (res.body) res.body.cancel().catch(() => {}); // the status line is enough; do not download the page
    return { ok: opens(res.status), code: res.status };
  } catch {
    return { ok: false, code: 0 };
  }
}

/** { "<game>/<site>": { ok, code } } for the sites of the given games; a site with neither a host nor a path is left out. */
export async function siteStatus(gameIds) {
  const out = {};
  const jobs = [];
  for (const gid of gameIds) {
    const game = gameById(gid);
    if (!game) continue;
    const mainHost = ((game.sites || []).find((s) => (s.hosts || []).length) || { hosts: [] }).hosts[0] || '';
    for (const s of game.sites || []) {
      const host = (s.hosts || [])[0] || mainHost;
      if (!host) continue;
      const key = `${gid}/${s.id}`;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < TTL_MS) { out[key] = hit.value; continue; }
      jobs.push(ask(`https://${host}${s.path || '/'}`).then((value) => { cache.set(key, { at: Date.now(), value }); out[key] = value; }));
    }
  }
  await Promise.all(jobs);
  return out;
}
