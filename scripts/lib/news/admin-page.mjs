// admin-page.mjs — everything under /quan-tri: the editor app page, the registration and one-time "set password" pages, the preview of
// an article (any state, signed-in accounts only) and the JSON API (admin-api.mjs).
// These pages are never indexed, never framed, and run only scripts carrying this response's nonce.
import { randomBytes } from 'node:crypto';
import { CATS, IMAGE_LIBRARY, LOGO, SITE_ORIGIN, SPLIT_SITES, SITES, onSite, siteOf } from './news-config.mjs';
import { NEWS_CSS, esc } from './news-theme.mjs';
import { SHELL_CSS } from './admin-shell-css.mjs';
import { UI_CSS } from './admin-ui-css.mjs';
import { NEWS_ADMIN_CSS } from './admin-news-css.mjs';
import { handleAdminApi } from './admin-api.mjs';
import { currentUser } from './admin-auth.mjs';
import { newsStore } from './news-store.mjs';
import { gameById } from '../admin/games.mjs';
import { can } from '../admin/grants.mjs';
import { renderDetailPage } from './news-pages.mjs';
import { adminApp } from './admin-app.mjs';
import { adminNews } from './admin-news-app.mjs';
import { adminParts } from './admin-parts-app.mjs';
import { PARTS_CSS } from './admin-parts-css.mjs';
import { adminAccess } from './admin-access-app.mjs';
import { adminAuth } from './admin-auth-app.mjs';
import { ACCESS_CSS, AUTH_CSS } from './admin-access-css.mjs';

const FONTS = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap';

const ADMIN_CSS = `
:root{--panel-2:#1b2140;--ok:#72c28f;--warn:#e9b949;--draft:#9aa3c9;--danger:#e36b5b;--review:#8fb8ff}
html[data-theme="light"]{--panel-2:#f2f2f2;--ok:#2a7046;--warn:#875a00;--draft:#56607f;--danger:#b3372a;--review:#2e5ca8}
textarea,select{font:inherit;color:inherit}
.small{font-size:13px}
.av{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:12.5px;color:var(--on-gold);background:var(--gold)}
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
.posts tr:hover td{background:var(--tint-row)}
.p-title{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center}
.p-title .cover{border-radius:5px}
.p-title b{font-weight:600;display:block;line-height:1.35}
.p-title small{color:var(--faint);font-size:12px}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:600;white-space:nowrap;border:1px solid currentColor}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.s-published{color:var(--ok)}.s-scheduled{color:var(--warn)}.s-draft{color:var(--draft)}.s-pending{color:var(--review)}
.acts{display:flex;gap:6px}
.btn:disabled{opacity:.55;cursor:default}
.btn-xs{padding:3px 9px;font-size:12.5px}
.btn-danger{background:transparent;border:1px solid rgba(227,107,91,.6);color:var(--danger)}
.btn-danger:hover{background:rgba(227,107,91,.12)}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
.field label,.lbl{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.lbl-note{text-transform:none;letter-spacing:0;font-weight:400}
.inp{background:var(--ink-2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;width:100%}
.inp:focus{border-color:var(--gold);outline:none}
.inp:disabled{opacity:.75}
.box{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:16px}
.box h3{margin:0 0 12px;font-size:14px;font-weight:600;color:var(--gold-hi)}
.err{color:var(--danger);font-size:13.5px;margin-top:10px}
.hint{font-size:12.5px;color:var(--faint)}
html[data-theme="light"] .btn-danger{border-color:rgba(179,55,42,.5)}
html[data-theme="light"] .btn-danger:hover{background:rgba(179,55,42,.08)}

/* ---------- phones and narrow tablets ----------
   Below 820px every table drops its columns to become one card per row: the identity cell on its own line, the short
   cells flowing after it, the buttons on a full-width line with 44px touch targets. (The frame's own phone layout is in
   admin-shell-css.mjs.) --adm-h is the top bar height the sticky editor toolbar sits below. */
@media (max-width:820px){

  .adm-top{padding-block:20px 12px}
  .adm-top h1{font-size:30px}
  .adm-top .btn{min-height:44px}
  .filters .tab{min-height:40px}
  .filters select{margin-left:0;flex:1 0 100%;min-height:44px}

  /* tables become cards */
  .tbl-wrap{overflow:visible;border:0;background:transparent;border-radius:0}
  table.posts{min-width:0;width:100%;display:block}
  .posts thead{display:none}
  .posts tbody{display:flex;flex-direction:column;gap:10px}
  .posts tr{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;
    border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:12px 14px}
  .posts tr:hover td{background:transparent}
  .posts td{display:block;flex:0 0 auto;padding:0;border:0;font-size:14px}
  .posts td:not(:first-child){white-space:normal}
  .posts tr:last-child td{border-bottom:0}
  .posts td:first-child,.posts td:last-child{flex:1 0 100%}
  .posts td[colspan]{text-align:center}
  .p-title{grid-template-columns:64px minmax(0,1fr);gap:10px;align-items:start}
  /* a grid child defaults to min-width:auto, so the one-line slug below would push the card wider than the screen */
  .p-title>div{min-width:0}
  /* a row without a cover (the songs) has one child, which would otherwise sit in the 64px cover column */
  .p-title>div:only-child{grid-column:1/-1}
  .p-title b{font-size:15px}
  .p-title small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .posts td>.person,.posts td.meta{min-width:0;overflow-wrap:anywhere}
  /* the author already reads "bởi …" in the last-edited line, so the separate author cell is dropped here */
  .posts-bai td:nth-child(4),.posts-rac td:nth-child(4){display:none}
  .posts-bai td:nth-child(5){font-size:12.5px;color:var(--faint)}
  .posts td:last-child .acts{flex-wrap:wrap;gap:8px}
  .posts td:last-child .acts .btn{flex:1 1 auto;min-height:44px;font-size:14px}

  /* a sideways swipe here changes section, so the browser must not read it as its own back/forward gesture
     (the phone's system edge gesture still works — that one is outside the page) */
  html,body{overscroll-behavior-x:contain}

  /* the section that a sideways swipe brought in slides from the side the finger came from */
  .adm-in-right{animation:adm-in-right .18s ease-out}
  .adm-in-left{animation:adm-in-left .18s ease-out}
  @keyframes adm-in-right{from{transform:translateX(18px);opacity:.4}to{transform:none;opacity:1}}
  @keyframes adm-in-left{from{transform:translateX(-18px);opacity:.4}to{transform:none;opacity:1}}
  @media (prefers-reduced-motion:reduce){.adm-in-right,.adm-in-left{animation:none}}

}
`;

const PREVIEW_CSS = `.preview-flag{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:20px;padding:12px 16px;border-radius:6px;background:#fbf1d9;border:1px solid #e7e6e3;color:#1c1c1a;font:500 13px/1.5 "Be Vietnam Pro","Segoe UI",system-ui,sans-serif}
.preview-flag svg{width:16px;height:16px;flex:none;stroke:#8a5a00;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.preview-flag b{font-weight:600}
.preview-flag a{margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:6px;border:1px solid #d6d4cf;background:#fff;color:#1c1c1a;font-size:12px;font-weight:500;text-decoration:none;white-space:nowrap}
.preview-flag a:hover{background:#f0f0ed}
.preview-flag a svg{stroke:currentColor}
html[data-theme="dark"] .preview-flag{background:#2e2513;border-color:#2e2e2b;color:#ecebe7}
html[data-theme="dark"] .preview-flag svg{stroke:#e3b55c}
html[data-theme="dark"] .preview-flag a{background:#1a1a19;border-color:#3c3b37;color:#ecebe7}
html[data-theme="dark"] .preview-flag a:hover{background:#262624}`;

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

// Marks shown in the game tiles: a few letters on the game's colour, or a picture. A game not listed gets its first letters.
const GAME_MARKS = {
  '3qdc': { mono: '3Q', color: 'var(--game-3qdc)' },
  skystory: { img: 'data:image/webp;base64,UklGRoYEAABXRUJQVlA4IHoEAABwFwCdASpAAEAAPj0WiUMiISEY+q5IIAPEtgBOmaE7f8k/HH9t/hPqX9O/EO7tzB5z3NnOT/LvsAeNB6qf2V9QH2zcIB/ef8z1nfoAeW37JH7l/tv7XlYv58feOWpjztD6e++2YCwV0oM1LyW6g7FGGSiFqw1NRS7QbscTOblPaUVIrzN6l75mAHcMz9rkmghuyeAcro35PGKff7MUJOhqpu+Zv1nGWOB4BNZj+ijRR40VvhdOM45Hk5tDGK0vOYup7uIAAP7ssix+agrH//PN0fIZfMs0f/9YtoV3/em3r7tBhzqnL5OI7b6S0o1VxxUoTTHiSfK5I/rewCEaeq66QWcFVS0OppNPLUEb6BVwfSmPF41qGV8gz3Qyu451jjvibZSa8Uq7xzywu4gJOidYL/33F3VLUSvYLVd6k0BiRjj8v9N71LyWY1Nc8lC06ZYTbYAJJrCCpLCSSbd1o/1jap8+hWRFZVechIpG6rvh30rv3F8Duu18zds/ZlTlLNmmr8lxZpXaw3S0Ji1Abl5htqq7z3QWwIKJMIGVOFjjCOKTFt3NQv5/lOBdCfGfmAPI0grptOcYCzQZPgDAPg7gz1LmbPSvDy3S740m71W4t+E+Vjxo2LJlFwW9zjITmFWiC93HEuVP/InBhj6xThrCOPYePNbtRhRjaSKWSGTn/YI+BxOFaKLx+nczy9Zv7T+xBKM2/2Lk9NZb53VOweut+eC3AS+DJ2SRRODpJjAC8C/BOH/mYEx0pg/CnFY0bGUAZtUqAEECk3Ye/4PRqjR1fLZ0sKpWNAa7r+8UTXlXfnc2R55KlycgDXn0VG60/GN9XRdu3MaAPLV849MFdV/DRqHMznwAKCIZFWV8XTreEiYj/a7zZunUegd2EI0g4e59Hc0JB3oamk4DIYAJfM/9y+a6Y/Eve19EUXBkyghoeO5DCmz0XKBECQe6jHkcW3zyAT9oFzJ+h03HIVobGPZPeN+1yIdqe5e+rKGc2R67PSt7evVg4/GGZJfZGghDzYgNlxEaxH3+eg8eL577olrNiuPGTKKGypZ0OgUNB6kKv/Eb996eH+HbH3dcJJWCVv//6BPVNrnkEW/J5BwFuWDiWVDnpiBOqxKmOi3CKM4l4zCtZPkUsgE4x0Z/wsBoGTHjPnwaYcO17k1SUy5GL9siivPIIfc+XhC4qGIOdgW2xjWxtaPN6K/1CfudWYCt1Xxxc0xfRUZmAmZyW7OJ3+3F5tmQ/3kAQ9ReY/rl2eElJFm2+eeIivP0pKghk2D2gNVUTa3rNEJ/xRSX3BcczP+0BaVmb8xaQ7q68b1DDq8u+b/PyJcwNkel97QA9b+1KXAHVZjBXl3bc+FZeDfkvlvUWsBMzaz8yp3QPATT0Xtx1MxIrqH+ruMncfzbNtTSwhtLIVY3Qp6n0ACIhZGcPxH0pDwDYyYX0yBv6sLePeuOiJtPjm+MpOtY/y2v0D76khtJ99albtUuBooix3VaYLidvtLYoxVZzLqE2hUzIWoAS1i8RudasHgAAAA=' },
};
// the light / dark choice of the editor pages lives in this browser (default light); one key, read before the first paint
const ADMIN_THEME_KEY = '3qdc-admin-theme';
const THEME_HEAD = `try{document.documentElement.setAttribute('data-theme',localStorage.getItem('${ADMIN_THEME_KEY}')==='dark'?'dark':'light')}catch(e){document.documentElement.setAttribute('data-theme','light')}`;

function appPage(nonce) {
  const data = { cats: CATS, sites: SPLIT_SITES ? SITES : [], library: IMAGE_LIBRARY, host: SITE_ORIGIN.replace(/^https?:\/\//, ''), logo: LOGO, marks: GAME_MARKS, themeKey: ADMIN_THEME_KEY };
  return `<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<script nonce="${nonce}">${THEME_HEAD}</script>
<title>Quản trị | wanmeivn.com</title>
<link rel="icon" href="${LOGO}">
<link rel="stylesheet" href="${FONTS}">
<style>${NEWS_CSS}${ADMIN_CSS}${SHELL_CSS}${UI_CSS}${NEWS_ADMIN_CSS}${PARTS_CSS}${ACCESS_CSS}${AUTH_CSS}</style>
</head><body>
<div id="app"><div class="au"><p class="au-foot" style="margin:auto">Đang tải…</p></div></div>
<div id="overlay"></div>
<div class="sh-toasts" id="toasts" role="region" aria-label="Thông báo" aria-live="polite"></div>
<noscript><p style="padding:20px">Trang quản trị cần bật JavaScript.</p></noscript>
<script type="application/json" id="adm-data" nonce="${nonce}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script nonce="${nonce}">(${adminApp.toString()})(${adminNews.toString()}, ${adminParts.toString()}, ${adminAccess.toString()}, ${adminAuth.toString()});</script>
</body></html>`;
}

// The real article page for any saved article, with a banner saying it is a preview. The article body was cleaned when
// it was saved, so every <script> in the page is the page's own; they all get the nonce.
async function previewPage(id, nonce, gameId) {
  const game = gameById(gameId);
  if (!game || !Object.hasOwn(game.modules, 'tin-tuc')) return null;
  const store = newsStore(game.id);
  const post = (await store.allPosts()).find((p) => p.id === id);
  if (!post) return null;
  // "more articles" in the preview come from the article's own site
  const visible = onSite(await store.visiblePosts(), siteOf(post));
  const others = visible.filter((p) => p.id !== post.id);
  const html = renderDetailPage(post, [post, ...others]);
  const state = post.status === 'published' && Date.parse(post.publishAt) > Date.now() ? 'Hẹn giờ' : STATE_WORDS[post.status];
  const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
  const flag = `<div class="preview-flag" role="status">${EYE}<span>Bản xem trước. Trạng thái: <b>${esc(state)}</b>. Người chơi ${post.status === 'published' && state !== 'Hẹn giờ' ? 'đang thấy bài này' : 'chưa thấy bài này'}.</span><a href="/quan-tri#/g/${game.id}/sua/${post.id}">${BACK} Về trang sửa bài</a></div>`;
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
  // /quan-tri/moi = a manager's invite link (its token is in the # part, read by the page)
  if (cleanPath === '/quan-tri' || cleanPath === '/quan-tri/dat-mat-khau' || cleanPath === '/quan-tri/dang-ky' || cleanPath === '/quan-tri/moi') {
    sendHtml(req, res, 200, appPage(nonce), nonce);
    return true;
  }
  const m = cleanPath.match(/^\/quan-tri\/xem-truoc\/(\d{1,9})$/);
  if (m) {
    const who = await currentUser(req);
    if (!who) {
      res.writeHead(302, { Location: '/quan-tri', ...securityHeaders(nonce) });
      res.end();
      return true;
    }
    // ?game=<id> picks the game; without it the preview is of 3qdc, so the old links keep working
    const gameId = new URL(req.url, 'http://x').searchParams.get('game') || '3qdc';
    // a draft is the writers' business: whoever may write (or review) the news of that game, nobody else
    const game = gameById(gameId);
    if (game && Object.hasOwn(game.modules, 'tin-tuc') && !can(who, gameId, 'tin-tuc', 'viet')) {
      sendHtml(req, res, 403, `<!doctype html><meta charset="utf-8"><title>Không có quyền</title><p>Tài khoản này không có quyền xem bài của game này. <a href="/quan-tri">Về trang quản trị</a></p>`, nonce);
      return true;
    }
    const html = await previewPage(+m[1], nonce, gameId);
    if (html) sendHtml(req, res, 200, html, nonce);
    else sendHtml(req, res, 404, `<!doctype html><meta charset="utf-8"><title>Không tìm thấy</title><p>Không tìm thấy bài. <a href="/quan-tri">Về trang quản trị</a></p>`, nonce);
    return true;
  }
  sendHtml(req, res, 404, `<!doctype html><meta charset="utf-8"><title>Không tìm thấy</title><p>Không có trang này. <a href="/quan-tri">Về trang quản trị</a></p>`, nonce);
  return true;
}
