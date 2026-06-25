// Revert non-mirrored CDN hosts back to absolute (live) — my earlier rewrite made
// them same-origin but their files aren't in the mirror (skill icons 404). Keep
// cloud.lingxigames.com same-origin (that one IS fully mirrored).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const DS = 'C:\\web\\web1\\3qdc-unified\\mirror\\galaxias-api.lingxigames.com\\ds\\ajax';
const HOSTS = ['image.aligames.com', 'resource.lingxigames.com', 's3oss-pc.oss-cn-shenzhen.aliyuncs.com', 'sh.image.uc.cn', 'cdn.aligames.com'];
const files = (await readdir(DS)).filter(f => f.startsWith('endpoint.json'));
let changed = 0;
for (const f of files) {
  const p = join(DS, f); let t; try { t = await readFile(p, 'utf8'); } catch { continue; }
  let o = t;
  for (const h of HOSTS) {
    const esc = h.replace(/[.]/g, '\\.');
    o = o.replace(new RegExp('(?<!:)/' + esc, 'g'), 'https://' + h); // /host (not already https:/host) → https://host
  }
  if (o !== t) { await writeFile(p, o, 'utf8'); changed++; }
}
console.log(`reverted ${changed} files (image/resource/s3oss/uc/cdn.aligames → absolute live)`);
