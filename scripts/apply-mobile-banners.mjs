// Apply the 5 VN PC accordion banners onto the 5 mobile accordion expansion
// images (bar1-5, all landscape). Convert jpg→png, overwrite, back up first.
import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const MAP = [
  ['ml4u02vq7etoopthqsr', 'ml4u5aflx1yltcg2n'],
  ['ml4u0c6a2gflw8fck1a', 'ml4u5iibkowwq93gm'],
  ['ml4u0jde945se1zodw7', 'ml4u5qmjxnf3l3i9ksl'],
  ['ml4u0pu3azks1yvzu5', 'ml4u5xur13e9voyl0ks'],
  ['ml4u0y52bapgmxbfytg', 'ml4u65di0clez2pf4oia'],
];
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
// locate a mirror png by basename
import { stat } from 'node:fs/promises';
async function walk(dir, out = []) { for (const e of await readdir(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) await walk(p, out); else out.push(p); } return out; }
const files = await walk('mirror');
const find = (name) => files.find(f => f.endsWith('\\' + name) || f.endsWith('/' + name));

// use sharp? not available. Use System.Drawing via a tiny PowerShell call per file.
import { writeFileSync } from 'node:fs';
const BAK = 'image-backup/mobile-banners-pre-vi';
await mkdir(BAK, { recursive: true });
const ps = [];
for (const [pc, mob] of MAP) {
  const src = join('new site-image', pc + '.jpg');
  const tgt = find(mob + '.png');
  if (!tgt) { console.log('NO TARGET:', mob); continue; }
  await copyFile(tgt, join(BAK, mob + '.png'));
  ps.push(`$i=[System.Drawing.Image]::FromFile((Resolve-Path '${src}'));$b=New-Object System.Drawing.Bitmap $i;$i.Dispose();$b.Save('${tgt.replace(/\\/g, '\\\\')}',[System.Drawing.Imaging.ImageFormat]::Png);$b.Dispose();`);
  console.log('queued:', pc, '→', tgt.replace(/\\/g, '/').replace('mirror/', ''));
}
writeFileSync('scripts/_convert.ps1', 'Add-Type -AssemblyName System.Drawing\n' + ps.join('\n'));
console.log('\nwrote scripts/_convert.ps1 (' + ps.length + ' conversions); backup:', BAK);
