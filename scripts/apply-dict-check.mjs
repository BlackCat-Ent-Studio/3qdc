// Definitive residual check: apply the i18n dicts (codex+bios+bios2, longest-first
// substring like the overlay) to ALL hero prose strings from snapshots, report any
// with leftover Chinese. No browser → no interaction blind spots.
import { readFile } from 'node:fs/promises';
const C = (await import('file:///C:/web/web1/3qdc-unified/scripts/lib/main/i18n-codex-dict.mjs')).CODEX_DICT;
const B1 = (await import('file:///C:/web/web1/3qdc-unified/scripts/lib/main/i18n-person-bios.mjs')).BIOS_DICT;
const B2 = (await import('file:///C:/web/web1/3qdc-unified/scripts/lib/main/i18n-person-bios2.mjs')).BIOS2_DICT;
const D = Object.assign({}, C, B1, B2);
const K = Object.keys(D).sort((a, b) => b.length - a.length);
const HAN = /[一-鿿]/;
function tr(s) { let o = s; for (const k of K) if (o.indexOf(k) > -1) o = o.split(k).join(D[k]); return o; }
const prose = JSON.parse(await readFile('C:\\web\\web1\\3qdc-unified\\verify-out\\hero-prose.json', 'utf8'));
const ph1 = JSON.parse(await readFile('C:\\web\\web1\\3qdc-unified\\verify-out\\hero-phase1.json', 'utf8'));
const all = [...new Set([...prose, ...ph1])];
const leftover = new Map();
let bad = 0;
for (const s of all) {
  const o = tr(s);
  if (HAN.test(o)) { bad++; for (const ch of o.match(/[一-鿿]+/g) || []) leftover.set(ch, (leftover.get(ch) || 0) + 1); }
}
console.log(`strings checked: ${all.length}  with residual Han: ${bad}`);
console.log('distinct leftover Han tokens:', leftover.size);
[...leftover.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log(`  ${c}\t${s}`));
