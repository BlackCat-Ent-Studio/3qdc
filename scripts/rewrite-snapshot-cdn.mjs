// Rewrite absolute CDN image/video URLs → same-origin in galaxias-api snapshots,
// so avatars/portraits load from the mirror (my recap re-introduced absolute URLs).
// Only hosts that are fully mirrored. Display URLs only — never touches priKey logic.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const DS = 'C:\\web\\web1\\3qdc-unified\\mirror\\galaxias-api.lingxigames.com\\ds\\ajax';
const HOSTS = ['cloud.lingxigames.com', 'image.aligames.com', 'resource.lingxigames.com', 'cdn-cn.lingxigames.com', 'cdn.aligames.com', 's3oss-pc.oss-cn-shenzhen.aliyuncs.com', 'sh.image.uc.cn'];
const files = (await readdir(DS)).filter(f => f.startsWith('endpoint.json'));
let changed = 0, repl = 0;
for (const f of files) {
  const p = join(DS, f);
  let t; try { t = await readFile(p, 'utf8'); } catch { continue; }
  let o = t;
  for (const h of HOSTS) {
    const re = new RegExp('https?://' + h.replace(/[.]/g, '\\.'), 'g');
    o = o.replace(re, '/' + h);
  }
  if (o !== t) { repl += (t.length - o.length) > 0 ? 1 : 1; await writeFile(p, o, 'utf8'); changed++; }
}
console.log(`rewrote ${changed} snapshot files (absolute CDN → same-origin)`);
