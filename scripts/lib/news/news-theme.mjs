// news-theme.mjs — look shared by the news pages: the home page's dark navy + gold world (tokens, header, footer),
// plus a light ivory theme the reader can switch to (html[data-theme="light"], remembered in this browser).
import { LOGO } from './news-config.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FONTS = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap';

export const NEWS_CSS = `
:root{color-scheme:dark;
  --ink:#0a0c17;--ink-2:#101324;--panel:#151a31;
  --line:rgba(214,176,106,.22);--line-soft:rgba(214,176,106,.12);
  --gold:#d6b06a;--gold-hi:#f3dfa6;--ember:#e8a23a;--ember-dk:#b9621c;
  --text:#ece6d6;--muted:#a39a82;--faint:#6f6a5c;
  --cat-tb:#f3dfa6;--cat-sk:#f08a5d;--cat-cn:#7fc4a4;
  --text-2:#cfc7b1;--nav:#d9d1bc;--prose:#e4ddca;--strong:#fff;
  --head-bg:rgba(8,10,22,.9);--tint:rgba(214,176,106,.08);--tint-row:rgba(214,176,106,.04);--tint-th:rgba(214,176,106,.14);
  --on-gold:#1a1405;--toast-bg:var(--gold-hi);--toast-text:#1a1405;
  --gift-bg:linear-gradient(135deg,rgba(214,176,106,.14),rgba(185,98,28,.12));--note-bg:rgba(127,196,164,.08);
  --display:"Cormorant Garamond","Noto Serif",Georgia,serif;
  --body:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif;--r:10px}
html[data-theme="light"]{color-scheme:light;
  --ink:#f3ead7;--ink-2:#ebdfc6;--panel:#fbf6ea;
  --line:rgba(120,82,30,.3);--line-soft:rgba(120,82,30,.15);
  --gold:#9a6b1f;--gold-hi:#7a4a10;--ember:#a84a0c;--ember-dk:#86390a;
  --text:#2a2014;--muted:#5e4f39;--faint:#6f6044;
  --cat-tb:#8a5a0e;--cat-sk:#b3441c;--cat-cn:#2a6e50;
  --text-2:#4a3a24;--nav:#4a3a24;--prose:#33281a;--strong:#1c140a;
  --head-bg:rgba(243,234,215,.92);--tint:rgba(154,107,31,.1);--tint-row:rgba(154,107,31,.06);--tint-th:rgba(154,107,31,.12);
  --on-gold:#fff;--toast-bg:#2a2014;--toast-text:#f3ead7;
  --gift-bg:linear-gradient(135deg,rgba(154,107,31,.12),rgba(168,74,12,.08));--note-bg:rgba(42,110,80,.08)}
*{box-sizing:border-box}
html,body{margin:0;background:var(--ink)}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
body{color:var(--text);font-family:var(--body);font-size:15px;line-height:1.6}
a{color:inherit}
button,input{font:inherit;color:inherit}
img{max-width:100%}
:focus-visible{outline:2px solid var(--gold-hi);outline-offset:2px}
.wrap{max-width:1180px;margin:0 auto;padding-inline:16px}
.site-h{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:var(--head-bg);backdrop-filter:blur(8px);border-bottom:1px solid var(--line-soft)}
.site-h .wrap{display:flex;align-items:center;gap:20px;min-height:68px}
.site-h .logo img{height:50px;width:auto;display:block}
.nav{display:flex;gap:4px;margin-left:auto}
.nav a{text-decoration:none;padding:8px 14px;border-radius:6px;color:var(--nav);font-weight:500}
.nav a:hover{color:var(--gold-hi)}
.nav a.on{color:var(--gold-hi);box-shadow:inset 0 -2px 0 var(--ember)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;cursor:pointer;border-radius:8px;padding:10px 18px;font-weight:600;text-decoration:none;white-space:nowrap}
.btn-fire{background:linear-gradient(180deg,var(--ember),var(--ember-dk));color:#fff}
.btn-fire:hover{filter:brightness(1.08)}
.btn-ghost{background:transparent;border:1px solid var(--line);color:var(--text)}
.btn-ghost:hover{border-color:var(--gold);background:var(--tint)}
.btn-sm{padding:6px 12px;font-size:13.5px}
@media (max-width:600px){.site-h .btn-fire{display:none}.nav a{padding:8px 10px}}
.band{position:relative;background-color:var(--ink-2);background-size:cover;background-position:center 30%;border-bottom:1px solid var(--line-soft)}
.band::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,22,.94) 0%,rgba(8,10,22,.78) 45%,rgba(8,10,22,.35) 100%)}
.band .wrap{position:relative;padding-block:44px 38px}
.crumb{display:flex;gap:8px;align-items:center;color:var(--muted);font-size:13px;flex-wrap:wrap}
.crumb a{text-decoration:none}.crumb a:hover{color:var(--gold-hi)}
.band h1{font-family:var(--display);font-weight:700;font-size:clamp(40px,6vw,64px);line-height:1;margin:10px 0 8px;color:var(--gold-hi)}
.band p{margin:0;color:var(--text-2);max-width:52ch}
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding-block:26px 18px}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.tab{border:1px solid var(--line);background:var(--ink-2);border-radius:999px;padding:8px 16px;cursor:pointer;color:var(--nav);font-weight:500;display:inline-flex;gap:8px;align-items:center}
.tab small{color:var(--faint);font-variant-numeric:tabular-nums}
.tab:hover{border-color:var(--gold)}
.tab.on{background:linear-gradient(180deg,var(--ember),var(--ember-dk));border-color:transparent;color:#fff}
.tab.on small{color:rgba(255,255,255,.75)}
.search{position:relative;flex:0 1 300px}
.search input{width:100%;background:var(--ink-2);border:1px solid var(--line);border-radius:999px;padding:9px 16px 9px 38px}
.search input::placeholder{color:var(--faint)}
.search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:15px;height:15px;stroke:var(--muted)}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--c,var(--gold-hi));white-space:nowrap}
.chip::before{content:"";width:7px;height:7px;transform:rotate(45deg);background:var(--c,var(--gold-hi))}
.c-thong-bao{--c:var(--cat-tb)}.c-su-kien{--c:var(--cat-sk)}.c-cam-nang{--c:var(--cat-cn)}
.meta{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
.pin{font-size:11.5px;font-weight:600;color:var(--on-gold);background:var(--gold);padding:2px 8px;border-radius:4px}
.cover{display:block;width:100%;max-width:100%;aspect-ratio:16/9;object-fit:cover;background:linear-gradient(135deg,#2a2350,#7a3b1d);border-radius:8px}
.feat{display:grid;grid-template-columns:7fr 5fr;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--panel);text-decoration:none;margin-bottom:26px}
.feat .cover{border-radius:0;height:100%}
.feat-body{padding:28px 30px;display:flex;flex-direction:column;gap:12px;justify-content:center}
.feat-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.feat h2{font-family:var(--display);font-size:clamp(28px,3vw,38px);line-height:1.1;margin:0;text-wrap:balance;color:var(--gold-hi)}
.feat p{margin:0;color:var(--text-2)}
.feat:hover h2{color:var(--strong)}
.read{color:var(--ember);font-weight:600}
@media (max-width:820px){.feat{grid-template-columns:1fr}.feat .cover{aspect-ratio:16/9}}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
@media (max-width:980px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.grid{grid-template-columns:1fr}}
.card{text-decoration:none;display:flex;flex-direction:column;gap:10px}
.card .row{display:flex;justify-content:space-between;gap:8px;align-items:center}
.card h3{margin:0;font-size:17px;line-height:1.4;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card p{margin:0;color:var(--muted);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .cover{transition:filter .2s}
.card:hover .cover{filter:brightness(1.12)}
.card:hover h3{color:var(--gold-hi)}
.empty{border:1px dashed var(--line);border-radius:var(--r);padding:40px 20px;text-align:center;color:var(--muted)}
.more{display:flex;justify-content:center;padding-block:30px 10px}
.d-head{padding-block:34px 22px;max-width:860px}
.d-head h1{font-family:var(--display);font-size:clamp(34px,4.6vw,54px);line-height:1.08;margin:12px 0 14px;color:var(--gold-hi);text-wrap:balance}
.d-meta{display:flex;gap:18px;flex-wrap:wrap;color:var(--muted);font-size:14px}
.d-cover{margin-bottom:34px}
.d-cover .cover{border-radius:var(--r)}
.d-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:48px;align-items:start}
@media (max-width:940px){.d-grid{grid-template-columns:minmax(0,1fr)}}
.prose{max-width:700px;font-size:17px;line-height:1.8;color:var(--prose);overflow-wrap:anywhere}
.prose>p:first-child{font-size:19px;color:var(--text)}
.prose h2{font-family:var(--display);font-size:32px;line-height:1.15;color:var(--gold-hi);margin:44px 0 12px;scroll-margin-top:90px}
.prose h3{font-size:19px;margin:28px 0 8px;color:var(--text)}
.prose ul,.prose ol{padding-left:22px}
.prose li{margin:4px 0}
.prose strong,.prose b{color:var(--strong)}
.prose a{color:var(--ember)}
.prose figure{margin:26px 0}
.prose figure img{border-radius:8px;display:block;width:100%}
.prose figcaption{color:var(--muted);font-size:13.5px;margin-top:8px}
.prose .tbl{overflow-x:auto;margin:20px 0;border:1px solid var(--line);border-radius:8px}
.prose table{border-collapse:collapse;width:100%;font-size:15px;min-width:420px}
.prose th{background:var(--tint-th);color:var(--gold-hi);text-align:left;font-weight:600;padding:10px 14px;border-bottom:1px solid var(--line)}
.prose td{padding:10px 14px;border-bottom:1px solid var(--line-soft);font-variant-numeric:tabular-nums}
.prose td img,.prose th img{display:inline-block;width:auto;max-height:56px;vertical-align:middle;border-radius:4px;margin:2px 6px 2px 0}
.prose tr:last-child td{border-bottom:0}
.prose .gift{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;border:1px solid var(--gold);background:var(--gift-bg);border-radius:10px;padding:16px 18px;margin:22px 0}
.prose .gift small{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.prose .gift code{font-family:ui-monospace,Consolas,monospace;font-size:22px;color:var(--gold-hi);letter-spacing:.08em}
.prose .note{border-left:3px solid var(--cat-cn);background:var(--note-bg);padding:12px 16px;border-radius:0 8px 8px 0;margin:22px 0;font-size:15.5px}
.share{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--line-soft);margin-top:40px;padding-top:22px;max-width:700px}
.share span{color:var(--muted);font-size:14px;margin-right:4px}
.pn{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:700px;margin-top:26px}
.pn a{border:1px solid var(--line);border-radius:8px;padding:14px 16px;text-decoration:none;display:flex;flex-direction:column;gap:4px}
.pn a:hover{border-color:var(--gold)}
.pn small{color:var(--muted)}
.pn .nx{text-align:right;grid-column:2}
@media (max-width:600px){.pn{grid-template-columns:1fr}.pn .nx{text-align:left;grid-column:auto}}
.aside{position:sticky;top:90px;display:flex;flex-direction:column;gap:26px}
@media (max-width:940px){.aside{position:static}}
.aside h2{margin:0 0 10px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600}
.toc{list-style:none;margin:0;padding:0;border-left:1px solid var(--line)}
.toc a{display:block;padding:6px 0 6px 14px;margin-left:-1px;border-left:2px solid transparent;text-decoration:none;color:var(--text-2);font-size:14.5px}
.toc a:hover{color:var(--gold-hi);border-left-color:var(--ember)}
.mini{display:grid;grid-template-columns:96px 1fr;gap:12px;text-decoration:none;align-items:center;padding:8px 0}
.mini .cover{border-radius:6px}
.mini b{font-weight:500;font-size:14px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mini:hover b{color:var(--gold-hi)}
.sec-title{font-family:var(--display);font-size:34px;color:var(--gold-hi);margin:60px 0 18px}
.band h1,.feat h2,.d-head h1,.prose h2,.sec-title{font-variant-numeric:lining-nums}
.site-f{border-top:1px solid var(--line-soft);margin-top:70px;padding-block:28px;color:var(--faint);font-size:13px}
.site-f .wrap{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;background:var(--toast-bg);color:var(--toast-text);font-weight:600;padding:10px 18px;border-radius:8px;transition:.25s;z-index:60;pointer-events:none;max-width:calc(100% - 32px)}
.toast.show{opacity:1;transform:translate(-50%,0)}
html[data-theme="light"] .band{--gold:#d6b06a;--gold-hi:#f3dfa6;--text:#ece6d6;--text-2:#cfc7b1;--muted:#a39a82;color:var(--text)}
.theme-btn{width:38px;height:38px;flex:none;padding:0;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--gold-hi);display:inline-grid;place-items:center;cursor:pointer}
.theme-btn:hover{border-color:var(--gold);background:var(--tint)}
.theme-btn svg{width:18px;height:18px;display:block}
.theme-btn .i-moon,html[data-theme="light"] .theme-btn .i-sun{display:none}
html[data-theme="light"] .theme-btn .i-moon{display:block}
`;

// --- light / dark switch ---
// The choice lives in this browser only; no choice = dark. One key for /tin-tuc and /quan-tri.
export const THEME_KEY = '3qdc-theme';
// Runs in <head> before the page paints, so a light-theme reader never sees a dark flash.
export const THEME_HEAD_JS = `try{if(localStorage.getItem('${THEME_KEY}')==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}`;
// One button markup for every page: the sun shows in the dark theme, the moon in the light one (CSS above).
export const THEME_BUTTON = '<button type="button" class="theme-btn" data-theme-toggle aria-pressed="false" aria-label="Giao diện sáng" title="Đổi giao diện sáng / tối">'
  + '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  + '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg></button>';

// Browser helper: any [data-theme-toggle] button flips the theme, saves it and keeps aria-pressed true while light
// (the editor app redraws its header, so new buttons are synced as they appear). Serialised into the page.
function themeHelper(key) {
  var root = document.documentElement;
  function sync() {
    var on = root.getAttribute('data-theme') === 'light' ? 'true' : 'false';
    var bs = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < bs.length; i++) if (bs[i].getAttribute('aria-pressed') !== on) bs[i].setAttribute('aria-pressed', on);
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
    if (!b) return;
    var light = root.getAttribute('data-theme') !== 'light';
    if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    try { if (light) localStorage.setItem(key, 'light'); else localStorage.removeItem(key); } catch (_) { /* private mode: this page only */ }
    sync();
  });
  // a page restored by Back/Forward, or open in another tab, follows the latest saved choice
  function reapply() {
    var saved = null;
    try { saved = localStorage.getItem(key); } catch (_) { return; }
    if (saved === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    sync();
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) reapply(); });
  window.addEventListener('storage', function (e) { if (e.key === key || e.key === null) reapply(); });
  sync();
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
}
export const THEME_JS = '(' + themeHelper.toString() + ')(' + JSON.stringify(THEME_KEY) + ');';

// active: 'home' | 'news' — which menu item is underlined
export function siteHeader(active = 'news') {
  return `<header class="site-h"><div class="wrap">
<a class="logo" href="/" aria-label="3Q Đại Chiến — Trang chủ"><img src="${LOGO}" alt="3Q Đại Chiến" width="203" height="152"></a>
<nav class="nav" aria-label="Menu chính"><a href="/"${active === 'home' ? ' class="on" aria-current="page"' : ''}>Trang chủ</a><a href="/tin-tuc"${active === 'news' ? ' class="on" aria-current="page"' : ''}>Tin tức</a></nav>
${THEME_BUTTON}<span class="btn btn-fire" role="button" tabindex="0">Tải game</span>
</div></header>`;
}

export const siteFooter = () => `<footer class="site-f"><div class="wrap"><span>© 2026 3Q Đại Chiến</span><span>Trang tin chính thức</span></div></footer>`;

// Small shared browser helper: toast + copy buttons ([data-copy]). Serialised into the page, never run on the server.
function copyHelper() {
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!b) return;
    var text = b.getAttribute('data-copy');
    var ok = function () { toast(/^https?:/.test(text) ? 'Đã sao chép link bài viết' : 'Đã sao chép mã ' + text); };
    var fail = function () { toast('Không sao chép được — hãy bôi đen rồi sao chép'); };
    try { navigator.clipboard.writeText(text).then(ok, fail); } catch (_) { fail(); }
  });
}
export const COPY_JS = '(' + copyHelper.toString() + ')();';

// Full HTML document for a news page. head = extra meta tags (already escaped).
export function pageShell({ title, description, head = '', active = 'news', main, scripts = '' }) {
  return `<!doctype html><html lang="vi" data-news-page><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>${THEME_HEAD_JS}</script>
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
${head}
<link rel="icon" href="${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${NEWS_CSS}</style>
</head><body>
${siteHeader(active)}
${main}
${siteFooter()}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>${COPY_JS}</script><script>${THEME_JS}</script>${scripts}
</body></html>`;
}
