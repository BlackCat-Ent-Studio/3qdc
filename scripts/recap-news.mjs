// recap-news.mjs — capture news LIST pages (all tabs, paginated) + each article's
// getInfoDetail, body-keyed into the unified mirror. Direct-API (no browser); body
// bytes must match what the app sends so sha1 keys line up. Idempotent.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const ENDPOINT = 'https://galaxias-api.lingxigames.com/ds/ajax/endpoint.json';
const SNAP_DIR = join('C:\\web\\web1\\3qdc-unified\\mirror', 'galaxias-api.lingxigames.com', 'ds', 'ajax');
const HEADERS = { 'Content-Type': 'application/json', Referer: 'https://sgzhx.lingxigames.com/', Origin: 'https://sgzhx.lingxigames.com' };
const bodyKeyOf = (post) => '__b' + createHash('sha1').update(post).digest('hex').slice(0, 16);
const COLLECTIONS = ['322,323,324', '322', '323', '324'];

async function snap(body) {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: HEADERS, body });
  const buf = Buffer.from(await res.arrayBuffer());
  const p = join(SNAP_DIR, 'endpoint.json' + bodyKeyOf(body));
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, buf);
  return buf;
}

const ids = new Set();
let listFiles = 0;
for (const ids_ of COLLECTIONS) {
  for (let page = 0; page < 12; page++) {
    const body = JSON.stringify({ api: '/api/l/owresource/getListRecommend', params: { gameId: '10000147', collectionIds: ids_, size: 4, page } });
    const buf = await snap(body); listFiles++;
    let list = [];
    try { list = JSON.parse(buf.toString('utf8')).result?.list || []; } catch {}
    list.forEach(it => { if (it && it.id != null) ids.add(String(it.id)); });
    if (list.length < 4) break; // last page
  }
}
console.log(`lists captured: ${listFiles}, unique article ids: ${ids.size}`);

let detailFiles = 0;
for (const id of ids) {
  const body = JSON.stringify({ api: '/api/l/owresource/getInfoDetail', params: { gameId: '10000147', id } });
  await snap(body); detailFiles++;
}
console.log(`article details captured: ${detailFiles}`);
