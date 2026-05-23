// rewrite-urls.mjs — Phase 3: make mirror/ self-contained.
//   - Rewrite ONLY the 3 asset/API host prefixes to local root-relative paths.
//     (All other hosts are outbound links / SVG namespaces / lib strings — leave alone.)
//   - Stub the two tracker scripts (grey.js, bl.js) so they 200 as no-ops.
//   - Ensure the <head> favicon exists locally.
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';

const MIRROR = 'mirror';

// Exact-prefix replacements. Order matters (longest/host-specific first).
const REPLACEMENTS = [
  ['https://cdn-cn.lingxigames.com/', '/cdn-cn.lingxigames.com/'],
  ['http://cdn-cn.lingxigames.com/', '/cdn-cn.lingxigames.com/'],
  ['https://cdn.aligames.com/', '/cdn.aligames.com/'],
  ['http://cdn.aligames.com/', '/cdn.aligames.com/'],
  // API → same-origin so the local server serves the snapshot (no trailing slash)
  ['https://game-ages-fx.lingxigames.com', ''],
  ['http://game-ages-fx.lingxigames.com', ''],
  // Analytics beacons → same-origin so the server can 204 them instantly.
  // These (ARMS r.png + 9game beacon) hang against live hosts and keep the
  // browser load spinner spinning forever even though content renders <1s.
  ['https://arms-retcode.aliyuncs.com', ''],
  ['http://arms-retcode.aliyuncs.com', ''],
  ['https://cn-zb-log-collector.9game.cn', ''],
  ['http://cn-zb-log-collector.9game.cn', ''],
];

const TEXT_EXT = new Set(['.html', '.css', '.js', '.json']);

async function walk(dir, out = []) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

function isTextTarget(path) {
  if (TEXT_EXT.has(extname(path))) return true;
  // dynamic API snapshot has no extension but lives under the api host dir
  return path.replace(/\\/g, '/').includes('game-ages-fx.lingxigames.com/api/');
}

async function rewriteFiles() {
  const files = (await walk(MIRROR)).filter(isTextTarget);
  let totalReplacements = 0;
  const touched = [];
  for (const f of files) {
    let txt = await readFile(f, 'utf8');
    let count = 0;
    for (const [from, to] of REPLACEMENTS) {
      const parts = txt.split(from);
      if (parts.length > 1) {
        count += parts.length - 1;
        txt = parts.join(to);
      }
    }
    if (count > 0) {
      await writeFile(f, txt);
      totalReplacements += count;
      touched.push(`${count}\t${f.replace(/\\/g, '/')}`);
    }
  }
  return { totalReplacements, touched };
}

async function writeStub(localPath, comment) {
  const full = join(MIRROR, localPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, `/* ${comment} — stubbed for self-hosted clone (no-op) */\n`);
  return full;
}

async function ensureFavicon() {
  // <head> favicon, not fetched during capture → download so it 200s locally.
  const url = 'https://cdn.aligames.com/wukong5b86229e386e6418539bfbad/star/220426/logo.png';
  const local = join(MIRROR, 'cdn.aligames.com', 'wukong5b86229e386e6418539bfbad', 'star', '220426', 'logo.png');
  try {
    const res = await fetch(url, { headers: { Referer: 'https://sgzhx.lingxigames.com/' } });
    if (!res.ok) throw new Error('status ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(local), { recursive: true });
    await writeFile(local, buf);
    return `favicon saved (${buf.length} B)`;
  } catch (e) {
    return `favicon fetch failed (${e.message}) — minor, head-only asset`;
  }
}

async function main() {
  const stubs = await Promise.all([
    writeStub('cdn-cn.lingxigames.com/xfu/lingxi/common/js/grey.js', 'grey.js tracker'),
    writeStub('cdn-cn.lingxigames.com/rdc/common/utils/boxer/bl.js', 'ARMS bl.js tracker'),
  ]);
  const favicon = await ensureFavicon();
  const { totalReplacements, touched } = await rewriteFiles();

  console.log('=== URL rewrite ===');
  for (const t of touched) console.log('  ', t);
  console.log(`Total replacements: ${totalReplacements} across ${touched.length} files`);
  console.log('Stubs:', stubs.map((s) => s.replace(/\\/g, '/')).join(', '));
  console.log('Favicon:', favicon);
}

main().catch((e) => { console.error('rewrite failed:', e); process.exit(1); });
