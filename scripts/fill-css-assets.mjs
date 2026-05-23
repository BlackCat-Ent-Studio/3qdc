// fill-css-assets.mjs — Phase 3 completion: download CSS-referenced assets that
// capture missed (hover/modal/lazy backgrounds never requested during the visit).
// For each relative url(...) in every mirrored CSS, resolve to a local path; if
// absent, derive the original CDN URL from the mirror tree and download it.
import { readFile, writeFile, mkdir, readdir, stat, access } from 'node:fs/promises';
import { join, dirname, posix } from 'node:path';

const MIRROR = 'mirror';

async function walk(dir, out = []) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const exists = (p) => access(p).then(() => true).catch(() => false);

// mirror/<host>/<rest>  ->  https://<host>/<rest>
function localToRemote(localPosix) {
  const rest = localPosix.replace(/^mirror\//, '');
  const i = rest.indexOf('/');
  return `https://${rest.slice(0, i)}/${rest.slice(i + 1)}`;
}

async function main() {
  const cssFiles = (await walk(MIRROR)).filter((f) => f.endsWith('.css'));
  const wanted = new Map(); // localPath -> remoteUrl

  for (const css of cssFiles) {
    const txt = await readFile(css, 'utf8');
    const dirPosix = dirname(css).replace(/\\/g, '/');
    for (const m of txt.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) {
      const ref = m[1].trim();
      if (/^(data:|https?:|\/\/|#)/.test(ref)) continue; // skip data/abs/protocol-rel/anchor
      const clean = ref.split('?')[0].split('#')[0];
      if (!clean) continue;
      const localPosix = clean.startsWith('/')
        ? posix.join(MIRROR, clean.replace(/^\//, ''))
        : posix.join(dirPosix, clean);
      wanted.set(localPosix, localToRemote(localPosix));
    }
  }

  let have = 0, fetched = 0, failed = [];
  for (const [localPosix, remote] of wanted) {
    const local = localPosix.replace(/\//g, '\\');
    if (await exists(local)) { have++; continue; }
    try {
      const res = await fetch(remote, { headers: { Referer: 'https://sgzhx.lingxigames.com/' } });
      if (!res.ok) throw new Error('status ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(dirname(local), { recursive: true });
      await writeFile(local, buf);
      fetched++;
      console.log(`  + ${clean(localPosix)} (${buf.length} B)`);
    } catch (e) {
      failed.push(`${clean(localPosix)} :: ${e.message}`);
    }
  }
  function clean(p) { return p.replace(/^mirror\//, ''); }

  console.log(`\nCSS-referenced assets: ${wanted.size} total | already had ${have} | downloaded ${fetched} | failed ${failed.length}`);
  if (failed.length) { console.log('Failed:'); for (const f of failed) console.log('  -', f); }
}

main().catch((e) => { console.error('fill failed:', e); process.exit(1); });
