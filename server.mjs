// server.mjs — minimal static server for the mirror/ clone.
//   - serves files from mirror/, stripping query strings (e.g. grey.js?a=1)
//   - special route: /api/ages/fetch* -> the snapshotted age-rating JSON
//   - no SPA history fallback (hash router): unknown paths -> 404 (surfaces gaps)
import { createServer as createHttp } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SHIM_HTML } from './scripts/lib/ua-spoof-shim.mjs';

const ROOT = join(process.cwd(), 'mirror');
const INDEX = join(ROOT, 'index.html');
const AGES_SNAPSHOT = join(ROOT, 'game-ages-fx.lingxigames.com', 'api', 'ages', 'fetch__area=CN&gameid=10000147');

// Dual-view shell: one URL, swaps PC/mobile internal entry by viewport width.
const BREAKPOINT = 768;
const SHELL_HTML = `<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>三国志幻想大陆</title>
<style>html,body{margin:0;height:100%;width:100%;overflow:hidden;background:#000}
#frame{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}</style>
</head><body>
<iframe id="frame" title="sgzhx"></iframe>
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

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

// Tracker beacon paths (rewritten to same-origin in Phase 3) — absorb instantly.
const TRACKER_PATHS = ['/r.png', '/beacon'];

async function send(res, file, type) {
  const body = await readFile(file);
  // Hashed asset filenames make long caching safe; index.html stays revalidated.
  const cache = file.endsWith('index.html') ? 'no-cache' : 'public, max-age=86400';
  res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': cache });
  res.end(body);
}

function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
  res.end(html);
}

// Mobile internal entry = index.html + UA-spoof shim as the FIRST <head> child
// (runs before the rem script + umi.js, forcing the app onto #/m/fab).
async function mobileEntryHtml() {
  const html = await readFile(INDEX, 'utf8'); // utf-8 string ops — CJK safe, no BOM
  return html.replace('<head>', '<head>' + SHIM_HTML);
}

export function startServer(port = 8080) {
  const server = createHttp(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);

      // Analytics beacons → instant 204 (no body, no hang).
      if (TRACKER_PATHS.includes(pathname)) {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
        return res.end();
      }

      // Snapshotted dynamic API (rewritten to same-origin in Phase 3)
      if (pathname.startsWith('/api/ages/fetch')) {
        return await send(res, AGES_SNAPSHOT, MIME['.json']);
      }

      // Dual-view shell + internal entries
      if (pathname === '/' || pathname === '') return sendHtml(res, SHELL_HTML);
      if (pathname === '/__internal/pc' || pathname === '/__internal/pc/') return await send(res, INDEX, MIME['.html']);
      if (pathname === '/__internal/m' || pathname === '/__internal/m/') return sendHtml(res, await mobileEntryHtml());
      // prevent path traversal
      const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
      const file = join(ROOT, safe);
      const s = await stat(file).catch(() => null);
      if (!s || !s.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 ' + pathname);
      }
      await send(res, file, MIME[extname(file).toLowerCase()] || 'application/octet-stream');
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 ' + e.message);
    }
  });
  return new Promise((resolve) => server.listen(port, () => {
    console.log(`mirror serving at http://localhost:${port}/#/fab`);
    resolve(server);
  }));
}

// Run directly: serve until killed. (pathToFileURL handles Windows file:/// correctly)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(Number(process.env.PORT) || 8080);
}
