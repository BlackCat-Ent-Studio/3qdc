// server.mjs — UNIFIED 3qdc server (v2, path-based multi-build entries).
//
// Why path-based: the 3 source mirrors were captured from 2 different deploys
// (fab = build ca75703e; home+main = build 62525e29) → no single umi.js knows
// every route-chunk. But all chunks coexist in one merged tree (content-hashed),
// so we serve each section's NATIVE build by selecting the right entry HTML per
// real PATH; absolute asset URLs resolve against the shared root regardless.
//
//   /              → home, the main site (build B, index.html, ROUTE_FORCE #/index, layout-v2), every device
//   /home, /kho-bau → 302 /  (old home address; treasure is switched off)
//   /tin-tuc, /tin-tuc/<slug>, /api/tin-tuc → the site's own news pages (scripts/lib/news, articles in data/news)
//   /__internal/tin-tuc → old news section (build B #/main/news; kept for reference)
//   /__internal/pc → old fab PC entry (build A; no longer linked, kept for reference)
//   /__internal/m  → old fab mobile entry (+ UA-spoof shim)
//   /main, /main/  → main (build B, index.html, ROUTE_FORCE #/main)
//   (/wiki         → deferred)
// API: same-origin snapshots (galaxias one-door body-keyed + game-ages + bbs).
import { createServer as createHttp } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
// fab (build A) overlays
import { SHIM_HTML } from './scripts/lib/ua-spoof-shim.mjs';
import { I18N_HTML as FAB_I18N } from './scripts/lib/i18n-overlay.mjs';
import { HIDE_HTML as FAB_HIDE } from './scripts/lib/hide-overlay.mjs';
import { NEUTER_HTML as FAB_NEUTER } from './scripts/lib/neuter-links.mjs';
import { NAVFX_HTML } from './scripts/lib/nav-hover-fx.mjs';
// home (build B / index route) overlays
import { I18N_HTML as HOME_I18N } from './scripts/lib/home/i18n-overlay.mjs';
import { HIDE_HTML as HOME_HIDE } from './scripts/lib/home/hide-overlay.mjs';
import { LAYOUT_V2_HTML, SHOW_TREASURE } from './scripts/lib/home/layout-v2/layout-v2.mjs';
// main (build B / main routes) overlays
import { I18N_HTML as MAIN_I18N } from './scripts/lib/main/i18n-overlay.mjs';
import { BBS_SHIM_HTML } from './scripts/lib/main/bbs-shim.mjs';
import { NEUTER_HTML as MAIN_NEUTER } from './scripts/lib/main/neuter-links.mjs';
// wiki (build C umi.cd0e3129, served at /huong-dan/) overlays
import { I18N_HTML as WIKI_I18N } from './scripts/lib/wiki/i18n-overlay.mjs';
import { NEUTER_HTML as WIKI_NEUTER } from './scripts/lib/wiki/neuter-links.mjs';
// shared nav-sync (tab title per page + menu → clean path wiring)
import { NAV_SYNC_HTML } from './scripts/lib/nav-sync.mjs';
// the site's own news pages
import { handleNews } from './scripts/lib/news/news-routes.mjs';

const ROOT = join(process.cwd(), 'mirror');
const ENTRY_B = join(ROOT, 'index.html');          // build B entry (umi.62525e29)
const ENTRY_FAB = join(ROOT, '_fab-index.html');   // build A entry (umi.ca75703e)
const ENTRY_WIKI = join(ROOT, '_wiki-index.html'); // build C entry (umi.cd0e3129, /wukongbuild/ss/)
// Localised artwork that replaces mirrored images (e.g. the Vietnamese home key visual); tracked in git, unlike mirror/.
const OVERRIDES = join(process.cwd(), 'overrides');
const OVERRIDES_URL = '/3qdc-vi/';

const BREAKPOINT = 768;
// fab dual-view shell: one URL, swaps PC/mobile internal entry by viewport width.
const SHELL_HTML = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>3Q Đại Chiến - Huyền Thoại Tam Quốc</title>
<link rel="shortcut icon" href="/cdn.aligames.com/wukong5b86229e386e6418539bfbad/star/220426/logo.png">
<style>html,body{margin:0;height:100%;width:100%;overflow:hidden;background:#000}
#frame{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}</style>
</head><body>
<iframe id="frame" title="3Q Đại Chiến"></iframe>
<script>
  var BP=${BREAKPOINT};
  var frame=document.getElementById('frame'),cur=null;
  function pick(){return window.innerWidth<BP?'/__internal/m/':'/__internal/pc/';}
  function sync(){var w=pick();if(w!==cur){cur=w;frame.src=w;}}
  sync();
  var t=null;
  window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(sync,150);});
</script>
</body></html>`;

// Force build-B app off its default (#/fab, unmirrored here) onto its real route.
const RF = (route) => `<script>(function(){var h=location.hash;if(!h||h==='#'||h==='#/'||h.indexOf('#/fab')===0){location.hash='${route}';}})();</script>`;

// Clean sitemap: each path → one section (build B), so /tuong → Tướng, /huong-dan → wiki, etc.
// /tin-tuc is the site's own news page now; the old news section stays reachable at /__internal/tin-tuc.
const BUILDB_PATHS = {
  '/main': '#/main',
  '/__internal/tin-tuc': '#/main/news',
  '/ke-hoach': '#/main/planning',
  '/tuong': '#/main/person',
  '/dac-sac': '#/main/feature',
  '/kho-bau': '#/main/treasure',
  '/cong-dong': '#/main/fans',
};
// nav-sync maps (build B): hash → tab title, and menu hash → clean path.
// The old section menus' "Tin tức" item leads to the new news page.
const BRAND = '3Q Đại Chiến';
const BUILDB_TITLES = {
  '#/index': 'Trang chủ', '#/main/news': 'Tin tức', '#/main/planning': 'Kế hoạch',
  '#/main/person': 'Tướng', '#/main/feature': 'Đặc sắc', '#/main/treasure': 'Kho báu',
  '#/main/fans': 'Cộng đồng', '#/main': 'Tin tức',
};
const BUILDB_LINKS = {
  '#/index': '/', '#/main/news': '/tin-tuc', '#/main/planning': '/ke-hoach',
  '#/main/person': '/tuong', '#/main/feature': '/dac-sac', '#/main/treasure': '/kho-bau',
  '#/main/fans': '/cong-dong',
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg',
};
const TRACKER_PATHS = ['/r.png', '/beacon'];
const API_HOST_DIRS = ['galaxias-api.lingxigames.com', 'game-ages-fx.lingxigames.com', 'p10488-bbs.ejoy.com'];

// Stream file; honor HTTP Range (206) so <video>/<audio> (main bg + galleries) play.
async function send(res, file, type, req) {
  const st = await stat(file);
  const h = { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
  const range = req && req.headers && req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= st.size) end = st.size - 1;
    if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    h['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
    h['Content-Length'] = end - start + 1;
    res.writeHead(206, h);
    return createReadStream(file, { start, end }).pipe(res);
  }
  h['Content-Length'] = st.size;
  res.writeHead(200, h);
  createReadStream(file).pipe(res);
}
function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
  res.end(html);
}

// --- entry builders (read source HTML + inject the right overlay stack) ---
const FAB_NAV = NAV_SYNC_HTML({ brand: BRAND, def: 'Trang ngoài', titles: { '#/fab': 'Trang ngoài', '#/m/fab': 'Trang ngoài' }, paths: {} });
const BUILDB_NAV = NAV_SYNC_HTML({ brand: BRAND, def: 'Trang chủ', titles: BUILDB_TITLES, paths: BUILDB_LINKS });
const WIKI_NAV = NAV_SYNC_HTML({ brand: BRAND, def: 'Hướng dẫn', titles: {}, paths: {} });

async function fabEntry(withUaSpoof) {
  const html = await readFile(ENTRY_FAB, 'utf8');
  const inject = (withUaSpoof ? SHIM_HTML : '') + FAB_I18N + FAB_HIDE + FAB_NEUTER + NAVFX_HTML + FAB_NAV;
  return html.replace('<head>', '<head>' + inject);
}
async function buildBEntry(route) {
  const html = await readFile(ENTRY_B, 'utf8');
  // index + main share build B → native hash nav handles #/index ↔ #/main/* in-app.
  // nav-sync wires the top menu to clean paths + sets the tab title per section.
  // layout-v2 is injected on every build-B entry but only activates while the hash is #/index.
  const inject = RF(route) + BBS_SHIM_HTML + HOME_I18N + MAIN_I18N + HOME_HIDE + MAIN_NEUTER + BUILDB_NAV + LAYOUT_V2_HTML;
  return html.replace('<head>', '<head>' + inject);
}
async function wikiEntry() {
  // build C (2.0.4) — its own umi under /wukongbuild/ss/; assets resolve from shared root.
  const html = await readFile(ENTRY_WIKI, 'utf8');
  const inject = RF('#/main') + WIKI_I18N + WIKI_NEUTER + WIKI_NAV;
  return html.replace('<head>', '<head>' + inject);
}

function qSuffix(search) {
  return search ? '__' + search.slice(1).replace(/[^a-z0-9=&._-]/gi, '_') : '';
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d)); req.on('error', () => resolve(''));
  });
}
async function findApiSnapshot(pathname, rawPathname, search, body) {
  const bk = body ? '__b' + createHash('sha1').update(body).digest('hex').slice(0, 16) : '';
  const cands = [];
  const paths = rawPathname && rawPathname !== pathname ? [pathname, rawPathname] : [pathname];
  for (const dir of API_HOST_DIRS) {
    for (const p of paths) {
      const base = join(ROOT, dir, p);
      if (bk) cands.push(base + bk);
      cands.push(base + qSuffix(search));
      cands.push(base);
    }
  }
  for (const cand of cands) {
    const s = await stat(cand).catch(() => null);
    if (s && s.isFile()) return cand;
  }
  return null;
}

export function startServer(port = 8080) {
  const server = createHttp(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      const pathname = decodeURIComponent(u.pathname);

      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-store' });
        return res.end();
      }
      if (TRACKER_PATHS.includes(pathname)) {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
        return res.end();
      }

      // --- section entries (real-path → native build entry) ---
      // The home page (layout-v2) is the main site at /, for every device (it replaced the old fab landing).
      if (pathname === '/' || pathname === '') return sendHtml(res, await buildBEntry('#/index'));
      if (pathname === '/__internal/pc' || pathname === '/__internal/pc/') return sendHtml(res, await fabEntry(false));
      if (pathname === '/__internal/m' || pathname === '/__internal/m/') return sendHtml(res, await fabEntry(true));
      const cleanPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
      // the old home address, and /kho-bau while "Kho Báu" is switched off (SHOW_TREASURE in layout-v2.mjs), including
      // the treasure item of the section menus, go to the main site
      if (cleanPath === '/home' || (!SHOW_TREASURE && cleanPath === '/kho-bau')) {
        res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store' });
        return res.end();
      }
      // the site's own news pages (/tin-tuc, /tin-tuc/<slug>, /api/tin-tuc)
      if (await handleNews(req, res, cleanPath, u)) return;
      if (BUILDB_PATHS[cleanPath]) return sendHtml(res, await buildBEntry(BUILDB_PATHS[cleanPath]));
      if (cleanPath === '/huong-dan' || cleanPath === '/wiki') return sendHtml(res, await wikiEntry());

      // --- localised artwork from overrides/ (never resolves outside that folder) ---
      if (pathname.startsWith(OVERRIDES_URL)) {
        const file = join(OVERRIDES, normalize(pathname.slice(OVERRIDES_URL.length)).replace(/^(\.\.[/\\])+/, ''));
        const s = file.startsWith(OVERRIDES + sep) ? await stat(file).catch(() => null) : null;
        if (s && s.isFile()) return await send(res, file, MIME[extname(file).toLowerCase()] || 'application/octet-stream', req);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 ' + pathname);
      }

      // --- static asset from merged mirror/ ---
      const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
      const file = join(ROOT, safe);
      const s = await stat(file).catch(() => null);
      if (s && s.isFile()) return await send(res, file, MIME[extname(file).toLowerCase()] || 'application/octet-stream', req);

      // --- API snapshot (same-origin; POST keyed by sha1(body)) ---
      const body = req.method === 'POST' ? await readBody(req) : '';
      const api = await findApiSnapshot(pathname, u.pathname, u.search, body);
      if (api) return await send(res, api, MIME['.json']);

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 ' + pathname);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 ' + e.message);
    }
  });
  return new Promise((resolve) => server.listen(port, () => {
    console.log(`unified 3qdc serving at http://localhost:${port}/  (/ = home, /main)`);
    resolve(server);
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(Number(process.env.PORT) || 3399);
}
