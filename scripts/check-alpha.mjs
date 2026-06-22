// check-alpha.mjs — for each batch2 backup PNG, detect if the ORIGINAL had real
// transparency (alpha < 250 anywhere). Those broke when replaced by opaque JPG.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import zlib from 'node:zlib';

const DIR = 'image-backup\\batch2-pre-vi';

// Minimal PNG alpha check: parse IHDR color type; if type 6 (RGBA) or 4 (gray+A),
// inflate IDAT and scan alpha bytes. If palette (3), check tRNS chunk presence.
function hasTransparency(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null; // not PNG
  let pos = 8, width = 0, height = 0, colorType = -1, bitDepth = 8, hasTRNS = false;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'tRNS') hasTRNS = true;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (colorType === 3) return hasTRNS;        // palette w/ tRNS = has transparency
  if (colorType !== 6 && colorType !== 4) return false; // no alpha channel
  if (bitDepth !== 8) return true;            // assume yes for non-8bit alpha types
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : 2;         // bytes/pixel
  const stride = width * ch + 1;              // +1 filter byte per row
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride + 1;
    for (let x = 0; x < width; x++) {
      const a = raw[rowStart + x * ch + (ch - 1)];
      if (a !== undefined && a < 250) return true;
    }
  }
  return false;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith('.png'));
const needPng = [], opaque = [];
for (const f of files) {
  try { (hasTransparency(await readFile(join(DIR, f))) ? needPng : opaque).push(f); }
  catch { needPng.push(f + ' (parse-err→treat as alpha)'); }
}
console.log('=== NEED TRANSPARENCY (re-export as PNG) ===');
needPng.forEach((f) => console.log('  ', f));
console.log('\n=== OPAQUE (JPG fine) ===');
opaque.forEach((f) => console.log('  ', f));
