import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
// read PNG/JPEG dimensions from header
function dim(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; // PNG
  // JPEG: scan for SOF0/2
  let i = 2;
  while (i < buf.length) { if (buf[i] !== 0xFF) { i++; continue; } const m = buf[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]; i += 2 + buf.readUInt16BE(i + 2); }
  return [0, 0];
}
const MIRROR = 'mirror/cdn.aligames.com/raven/prod/upload/market-game-galaxy/page_642a4eb04023f80ab7f3fb17';
const NEW = 'new site-image';
const map = [
  ['ml4u02vq7etoopthqsr', 'ml4u6hn9fuoa05t0ynf', 'hero'],
  ['ml4u0c6a2gflw8fck1a', 'ml4u5iibkowwq93gm', '127 vo tuong'],
  ['ml4u0jde945se1zodw7', 'ml4u5qmjxnf3l3i9ksl', 'trang phuc Tet'],
  ['ml4u0pu3azks1yvzu5', 'ml4u5xur13e9voyl0ks', '5 hoa'],
  ['ml4u0y52bapgmxbfytg', 'ml4u65di0clez2pf4oia', 'suoi nuoc nong'],
];
for (const [pc, mob, label] of map) {
  const s = dim(await readFile(join(NEW, pc + '.jpg')));
  const t = dim(await readFile(join(MIRROR, mob + '.png')));
  const ar = (a) => (a[0] / a[1]).toFixed(2);
  const warn = Math.abs(s[0] / s[1] - t[0] / t[1]) > 0.25 ? '  ⚠ LỆCH KHUNG' : '';
  console.log(`${label.padEnd(16)} src ${s[0]}x${s[1]} (${ar(s)}) → target ${t[0]}x${t[1]} (${ar(t)})${warn}`);
}
