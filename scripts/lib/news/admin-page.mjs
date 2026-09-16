// admin-page.mjs — everything under /quan-tri: the editor app page, the registration and one-time "set password" pages, the preview of
// an article (any state, signed-in accounts only) and the JSON API (admin-api.mjs).
// These pages are never indexed, never framed, and run only scripts carrying this response's nonce.
import { randomBytes } from 'node:crypto';
import { CATS, IMAGE_LIBRARY, LOGO, SITE_ORIGIN } from './news-config.mjs';
import { NEWS_CSS, esc } from './news-theme.mjs';
import { handleAdminApi } from './admin-api.mjs';
import { currentUser } from './admin-auth.mjs';
import { allPosts, visiblePosts } from './news-store.mjs';
import { renderDetailPage } from './news-pages.mjs';
import { ROLES } from './news-workflow.mjs';
import { adminApp } from './admin-app.mjs';

const FONTS = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap';

const ADMIN_CSS = `
:root{--panel-2:#1b2140;--ok:#72c28f;--warn:#e9b949;--draft:#9aa3c9;--danger:#e36b5b;--review:#8fb8ff}
textarea,select{font:inherit;color:inherit}
.small{font-size:13px}
.adm-h{background:var(--ink-2);border-bottom:1px solid var(--line-soft);position:sticky;top:env(safe-area-inset-top,0px);z-index:20}
.adm-h .wrap{display:flex;align-items:center;gap:16px;min-height:60px;flex-wrap:wrap}
.adm-logo img{height:38px;width:auto;display:block}
.adm-h .ttl{font-weight:600;color:var(--gold-hi)}
.who{margin-left:auto;display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--muted);flex-wrap:wrap}
.who b{color:var(--text);font-weight:600}
.av{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:12.5px;color:#1a1405;background:var(--gold)}
.person{display:flex;gap:8px;align-items:center}
.adm-top{display:flex;justify-content:space-between;align-items:end;gap:14px;flex-wrap:wrap;padding-block:30px 16px}
.adm-top h1{font-family:var(--display);font-size:40px;margin:0;color:var(--gold-hi);line-height:1}
.adm-top p{margin:6px 0 0;color:var(--muted)}
.filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
.filters select{background:var(--ink-2);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin-left:auto}
.filters .tab{padding:6px 13px;font-size:13.5px}
.tbl-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r);background:var(--panel)}
table.posts{border-collapse:collapse;width:100%;min-width:860px}
.posts th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-align:left;font-weight:600;padding:12px 16px;border-bottom:1px solid var(--line)}
.posts td{padding:12px 16px;border-bottom:1px solid var(--line-soft);vertical-align:middle;font-size:14px}
.posts td:not(:first-child){white-space:nowrap}
.posts tr:last-child td{border-bottom:0}
.posts tr:hover td{background:rgba(214,176,106,.04)}
.p-title{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center}
.p-title .cover{border-radius:5px}
.p-title b{font-weight:600;display:block;line-height:1.35}
.p-title small{color:var(--faint);font-size:12px}
.lock{display:flex;gap:5px;align-items:center;color:var(--warn);font-size:12px;margin-top:3px;white-space:normal}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:600;white-space:nowrap;border:1px solid currentColor}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.s-published{color:var(--ok)}.s-scheduled{color:var(--warn)}.s-draft{color:var(--draft)}.s-pending{color:var(--review)}
.acts{display:flex;gap:6px}
.btn:disabled{opacity:.55;cursor:default}
.btn-xs{padding:3px 9px;font-size:12.5px}
.btn-danger{background:transparent;border:1px solid rgba(227,107,91,.6);color:var(--danger)}
.btn-danger:hover{background:rgba(227,107,91,.12)}
.ed{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:26px;padding-block:24px 40px;align-items:start}
@media (max-width:980px){.ed{grid-template-columns:minmax(0,1fr)}}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
.field label,.lbl{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.lbl-note{text-transform:none;letter-spacing:0;font-weight:400}
.inp{background:var(--ink-2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;width:100%}
.inp:focus{border-color:var(--gold);outline:none}
.inp:disabled{opacity:.75}
.t-inp{font-family:var(--display);font-size:34px;font-weight:700;color:var(--gold-hi);padding:10px 14px;line-height:1.15;resize:none;font-variant-numeric:lining-nums}
.slug{font-size:13px;color:var(--muted);display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.slug input{background:transparent;border:0;border-bottom:1px dashed var(--line);color:var(--gold-hi);padding:2px;min-width:0;flex:1 1 220px}
.count{align-self:flex-end;font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums}
.count.over{color:var(--danger)}
.editor{border:1px solid var(--line);border-radius:var(--r);background:var(--ink-2)}
.tb{display:flex;flex-wrap:wrap;gap:2px;padding:6px;border-bottom:1px solid var(--line);position:sticky;top:60px;background:var(--ink-2);z-index:5;border-radius:var(--r) var(--r) 0 0}
.tb[hidden]{display:none}
.tb button{background:transparent;border:1px solid transparent;border-radius:6px;padding:5px 9px;cursor:pointer;color:#d9d1bc;font-size:13.5px}
.tb button:hover{border-color:var(--line);background:rgba(214,176,106,.08)}
.tb .sep{width:1px;background:var(--line);margin:4px}
.pop{padding:10px;border-bottom:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--panel)}
.pop img{width:92px;aspect-ratio:16/9;object-fit:cover;border-radius:5px;cursor:pointer;border:2px solid transparent}
.pop img:hover{border-color:var(--gold)}
.pop input{flex:1 1 220px}
.ce{min-height:420px;padding:20px 24px;outline:none;max-width:none}
.ce:empty::before{content:attr(data-ph);color:var(--faint)}
.ce .gift code{outline:1px dashed var(--line)}
.side{display:flex;flex-direction:column;gap:14px;position:sticky;top:76px}
@media (max-width:980px){.side{position:static}}
.box{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:16px}
.box h3{margin:0 0 12px;font-size:14px;font-weight:600;color:var(--gold-hi)}
.radios{display:flex;flex-direction:column;gap:8px}
.radios label{display:flex;gap:8px;align-items:center;cursor:pointer;font-size:14px}
.radios input,.chk input{accent-color:var(--ember)}
.cats{display:flex;gap:6px;flex-wrap:wrap}
.cats label{cursor:pointer;position:relative}
.cats input{position:absolute;opacity:0;pointer-events:none}
.cats span{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13.5px}
.cats input:checked+span{border-color:var(--c);color:var(--c);background:rgba(255,255,255,.04)}
.cats input:focus-visible+span{outline:2px solid var(--gold-hi);outline-offset:2px}
.chk{display:flex;gap:8px;align-items:center;font-size:14px;margin-top:12px;cursor:pointer}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.btns .btn-fire{flex:1}
.err{color:var(--danger);font-size:13.5px;margin-top:10px}
.lib{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.lib img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid transparent}
.lib img.on{border-color:var(--ember)}
#e-cover{margin-bottom:4px}
.fb{border:1px solid #3a3f52;border-radius:8px;overflow:hidden;background:#f0f2f5;color:#1c1e21}
.fb .cover{border-radius:0;aspect-ratio:1.91/1}
.fb div{padding:8px 10px}
.fb small{display:block;color:#65676b;font-size:11.5px;text-transform:uppercase}
.fb b{display:block;font-size:14px;line-height:1.3}
.fb p{margin:2px 0 0;font-size:12.5px;color:#65676b;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;font-size:13.5px}
.hist li{display:grid;grid-template-columns:26px 1fr auto;gap:10px;align-items:start}
.hist .av{width:26px;height:26px;font-size:11px}
.hist small{display:block;color:var(--faint)}
.warnbar{background:rgba(233,185,73,.1);border:1px solid rgba(233,185,73,.45);color:var(--warn);border-radius:8px;padding:9px 14px;font-size:13.5px;margin-top:18px}
.auth{min-height:100vh;display:grid;place-items:center;padding:24px 16px}
.auth-box{width:100%;max-width:400px;border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:30px 28px}
.auth-logo{height:64px;width:auto;display:block;margin-bottom:14px}
.auth h1{font-family:var(--display);font-size:36px;margin:0 0 4px;color:var(--gold-hi);line-height:1.1}
.auth .field{margin-top:16px;margin-bottom:0}
.auth-btn{width:100%;margin-top:20px}
.auth-alt{margin:16px 0 6px;text-align:center;font-size:14px;color:var(--muted)}
.auth-alt a,.warnbar a{color:var(--gold-hi);font-weight:600}
.hint{font-size:12.5px;color:var(--faint)}
.auth-box{margin-block:24px}
.adm-nav{display:flex;gap:4px;margin-left:12px}
.adm-nav a{text-decoration:none;padding:6px 12px;border-radius:6px;color:#d9d1bc;font-weight:500;font-size:14px}
.adm-nav a:hover{color:var(--gold-hi)}
.adm-nav a.on{color:var(--gold-hi);box-shadow:inset 0 -2px 0 var(--ember)}
.sel{background:var(--ink-2);border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:13.5px}
.s-locked{color:var(--danger)}
table.users{min-width:760px}
.users .acts{align-items:center;flex-wrap:nowrap}
.pop-pics{flex-direction:column;align-items:stretch}
.pop-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.pop-row .lbl{margin-top:4px}
.upl{display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-top:12px}
.upl-btn{position:relative;overflow:hidden;margin-left:auto;text-transform:none;letter-spacing:0;font-size:13.5px;font-weight:600;color:var(--text)}
.upl .upl-btn{margin-left:0}
.upl-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}
.ce td img,.ce th img{display:inline-block;width:auto;max-height:56px;vertical-align:middle;border-radius:4px;margin:2px 6px 2px 0}
`;

const PREVIEW_CSS = `.preview-flag{background:rgba(233,185,73,.14);border:1px solid rgba(233,185,73,.5);color:#e9b949;border-radius:8px;padding:10px 14px;margin-top:20px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center}`;

const STATE_WORDS = { draft: 'Nháp', pending: 'Chờ duyệt', published: 'Đã đăng' };

function securityHeaders(nonce) {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self'",
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
    'Cache-Control': 'no-store',
  };
}

function sendHtml(req, res, status, html, nonce) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders(nonce) });
  res.end(req.method === 'HEAD' ? undefined : html);
}

function appPage(nonce) {
  const data = { cats: CATS, library: IMAGE_LIBRARY, host: SITE_ORIGIN.replace(/^https?:\/\//, ''), logo: LOGO, roles: ROLES };
  return `<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Quản trị tin tức | 3Q Đại Chiến</title>
<link rel="icon" href="${LOGO}">
<link rel="stylesheet" href="${FONTS}">
<style>${NEWS_CSS}${ADMIN_CSS}</style>
</head><body>
<div id="app"><main class="auth"><p class="meta">Đang tải…</p></main></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<noscript><p style="padding:20px">Trang quản trị cần bật JavaScript.</p></noscript>
<script type="application/json" id="adm-data" nonce="${nonce}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script nonce="${nonce}">(${adminApp.toString()})();</script>
</body></html>`;
}

// The real article page for any saved article, with a banner saying it is a preview. The article body was cleaned when
// it was saved, so every <script> in the page is the page's own; they all get the nonce.
async function previewPage(id, nonce) {
  const post = (await allPosts()).find((p) => p.id === id);
  if (!post) return null;
  const visible = await visiblePosts();
  const others = visible.filter((p) => p.id !== post.id);
  const html = renderDetailPage(post, [post, ...others]);
  const state = post.status === 'published' && Date.parse(post.publishAt) > Date.now() ? 'Hẹn giờ' : STATE_WORDS[post.status];
  const flag = `<div class="preview-flag"><span>Bản xem trước · trạng thái: <b>${esc(state)}</b> · người chơi ${post.status === 'published' && state !== 'Hẹn giờ' ? 'đang thấy bài này' : 'chưa thấy bài này'}</span><a class="btn btn-ghost btn-sm" href="/quan-tri#/sua/${post.id}">← Về trang sửa bài</a></div>`;
  return html
    .replace('<main class="wrap">', `<main class="wrap">${flag}`)
    .replace('</head>', `<meta name="robots" content="noindex, nofollow"><style>${PREVIEW_CSS}</style></head>`)
    .replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`);
}

// cleanPath = decoded path without a trailing slash. Returns false when the address is not under /quan-tri.
export async function handleAdmin(req, res, cleanPath) {
  if (cleanPath !== '/quan-tri' && !cleanPath.startsWith('/quan-tri/')) return false;
  if (cleanPath === '/quan-tri/api' || cleanPath.startsWith('/quan-tri/api/')) {
    await handleAdminApi(req, res, cleanPath.slice('/quan-tri/api'.length));
    return true;
  }
  const nonce = randomBytes(16).toString('base64');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD', ...securityHeaders(nonce) });
    res.end('405');
    return true;
  }
  if (cleanPath === '/quan-tri' || cleanPath === '/quan-tri/dat-mat-khau' || cleanPath === '/quan-tri/dang-ky') {
    sendHtml(req, res, 200, appPage(nonce), nonce);
    return true;
  }
  const m = cleanPath.match(/^\/quan-tri\/xem-truoc\/(\d{1,9})$/);
  if (m) {
    if (!(await currentUser(req))) {
      res.writeHead(302, { Location: '/quan-tri', ...securityHeaders(nonce) });
      res.end();
      return true;
    }
    const html = await previewPage(+m[1], nonce);
    if (html) sendHtml(req, res, 200, html, nonce);
    else sendHtml(req, res, 404, `<!doctype html><meta charset="utf-8"><title>Không tìm thấy</title><p>Không tìm thấy bài. <a href="/quan-tri">Về trang quản trị</a></p>`, nonce);
    return true;
  }
  sendHtml(req, res, 404, `<!doctype html><meta charset="utf-8"><title>Không tìm thấy</title><p>Không có trang này. <a href="/quan-tri">Về trang quản trị</a></p>`, nonce);
  return true;
}
