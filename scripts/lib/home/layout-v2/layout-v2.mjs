// layout-v2.mjs — omg3q-style scrolling layout for the build-B home route (#/index).
// Additive overlay: restyles the existing React DOM (logo, 10 image nav items), clones the
// download links into its own panel and sidebar, and appends sections below the key visual. The umi
// bundle and mirror/ are never edited; every image and link stays as-is.
//
// Build B serves /home and every /main-family path from one entry, and index <->
// main navigation is hash-based, so the layout is gated at runtime: it is active
// only while location.hash is empty or #/index, and fully torn down otherwise.
//
// Sections (news, heroes, features, treasure) register through window.__hv2 and
// stay hidden until they have rendered content, so no empty shell is ever shown.
// The treasure section is currently switched off (see SHOW_TREASURE).

import { NEWS_CSS, NEWS_JS } from './section-news.mjs';
import { HEROES_CSS, HEROES_JS } from './section-heroes.mjs';
import { FEATURES_CSS, FEATURES_JS } from './section-features.mjs';
import { TREASURE_CSS, TREASURE_JS } from './section-treasure.mjs';
import { HERO_SKILLS_CSS, HERO_SKILLS_JS } from './embed-hero-skills.mjs';

const HEADER_H = 88;

// Key-visual background: the Vietnamese artwork served from overrides/home (KV_IMAGE), replacing the original
// page_642a4eb04023f80ab7f3fb17/mqaggnekipux19ptb5s.jpg; cover-scaled, top-aligned. Natural size and the bottom
// edge of the event banner frame baked into the art, in image pixels (the frame's lower gold border is rows 782-783).
// The download panel starts just below that frame so no text of the art is covered. Update these if the home
// background artwork is replaced (the original art was 2560x1306 with eventFrameBottom 1140).
const KV_IMAGE = '/3qdc-vi/home/anh-nen-slogan-vi.webp';
const KV = { width: 1756, height: 896, eventFrameBottom: 785 };

// Vietnamese download buttons (omg3q-style artwork in overrides/home) in display order, filling a 2-column grid row by
// row. Entries with `match` reuse the original link whose href contains it; entries without one have no 3qdc link yet
// and are shown in place but not clickable (give the entry a `match` once 3qdc has that link). Original links without a
// Vietnamese button (TapTap China page, PC client zip) are left off the home page.
const DL_ART = [
  { match: 'cddp-track.aligames.com/9gtrack', src: '/3qdc-vi/home/nut-tai-appstore.png', label: 'Tải trên App Store' },
  { match: 'cddp-link.aligames.com/rlink/', src: '/3qdc-vi/home/nut-tai-file-apk.png', label: 'Tải file APK' },
  { src: '/3qdc-vi/home/nut-tai-google-play.png', label: 'Tải trên Google Play (sắp ra mắt)' },
  { src: '/3qdc-vi/home/nut-dang-ky-nhanh.png', label: 'Đăng ký nhanh (sắp ra mắt)' },
];
const DL_TOPUP = '/3qdc-vi/home/nut-nap-the.png';
// sidebar collapse arrow (omg3q floating-bar artwork, 86x58 strip): ">" (collapse) at 0 0, "<" (expand) at -44px 0
const SB_TOGGLE = '/3qdc-vi/home/sidebar-toggle.png';

// "Kho Báu" is hidden for now (2026-09-15): the feature will not be used for a long time. While false the home
// page builds no treasure block (so no CG / wallpaper requests), drops the footer link and hides the treasure item
// of the header image nav; server.mjs imports this flag and redirects /kho-bau to /home while it is false.
// section-treasure.mjs is kept unchanged. To bring the feature back: set this to true and restart the service.
export const SHOW_TREASURE = false;

// internal footer links only (the pages this site already serves)
const FOOTER_LINKS = [['Tin tức', '/tin-tuc'], ['Kế hoạch', '/ke-hoach'], ['Tướng', '/tuong'], ['Đặc sắc', '/dac-sac'],
  ...(SHOW_TREASURE ? [['Kho báu', '/kho-bau']] : []), ['Cộng đồng', '/cong-dong'], ['Hướng dẫn', '/huong-dan']];

// header nav on the home page: only these items stay, drawn with the Vietnamese menu art from overrides/home
// (normal 41px / hover 79px high, transparent right margin trimmed). Clicking scrolls to the section on this page
// instead of leaving it; a null section means the top of the page. [app href, section id, image base name, label]
const NAV_VI = [
  ['#/index', null, 'menu-01-trang-chu', 'Trang chủ'],
  ['#/main/news', 'hv2-news', 'menu-02-tin-tuc', 'Tin tức'],
  ['#/main/person', 'hv2-heroes', 'menu-04-tuong', 'Tướng'],
  ['#/main/feature', 'hv2-features', 'menu-05-dac-sac', 'Đặc sắc'],
];
const NAV_KEEP = NAV_VI.map(([href]) => `:has(> a[href="${href}"])`).join(',');
// image heights: the hover art is 1.626x the normal art so both titles render at the same size; its title starts
// at x=64/79 against x=18/41 in the normal art, hence the left shift of 0.8815 normal heights
const NAV_H = 'clamp(38px,2.8vw,54px)';
const NAV_HOVER_H = 'clamp(62px,4.58vw,88px)';

// treasure hidden: drop its item from the header image nav; the remaining items stay centred in the row
const TREASURE_OFF_CSS = `
html.hv2 .star-site-index-navs__item:has(> a[href="#/main/treasure"]){display:none!important}
`;

const CSS = `
html.hv2 body{overflow-x:hidden}

/* hero page embedded in the home "Hệ Thống Tướng" block: hide its left navigation so the hero layout spans the frame */
html.hv2-embed .star-site-main-left{display:none!important}
html.hv2-embed .star-site-main-right{margin-left:0!important;width:100%!important}
html.hv2{--hv2-dl-btn:clamp(34px,2.5vw,46px)}
html.hv2 .star-site-index-left-mask{display:none!important}

/* Vietnamese key visual. The app sets the original art as an inline background on the index route's element;
   keyed on .star-site-index (present only on #/index) rather than html.hv2, which is added at DOMContentLoaded,
   so the original art is never fetched or flashed first */
.star-site-index .star-site-imgBg{background-image:url("${KV_IMAGE}")!important}

/* header bar behind the fixed logo / nav / store badges */
#hv2-header-bg{display:none}
html.hv2 #hv2-header-bg{display:block;position:fixed;top:0;left:0;right:0;height:${HEADER_H}px;z-index:9;
  background:linear-gradient(180deg,rgba(6,8,18,.92),rgba(6,8,18,.72));border-bottom:1px solid rgba(214,176,106,.45);
  box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none}

/* logo, badge and nav scale with viewport width so the row fits 1366px laptops */
html.hv2 .star-site-index-logo{position:fixed!important;top:${HEADER_H / 2}px!important;left:24px!important;
  width:auto!important;height:clamp(48px,3.75vw,72px)!important;transform:translateY(-50%);z-index:11!important}
html.hv2 .star-site-index-beishu{position:fixed!important;top:${HEADER_H / 2}px!important;right:24px!important;
  width:auto!important;height:clamp(28px,2.1vw,40px)!important;transform:translateY(-50%);z-index:11!important}

/* image nav: vertical list -> centered horizontal row inside the header, reduced to the NAV_VI items */
html.hv2 .star-site-index-navs{position:fixed!important;top:0!important;left:clamp(170px,13.5vw,260px)!important;
  right:clamp(200px,15.6vw,300px)!important;height:${HEADER_H}px!important;display:flex!important;
  flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:clamp(18px,2.4vw,46px);
  transform:none!important;animation:none!important;filter:none!important;opacity:1!important;z-index:11!important;
  margin:0!important;padding:0!important}
html.hv2 .star-site-index-navs__item{width:auto!important;height:${HEADER_H}px!important;margin:0!important;
  padding:0 clamp(2px,.3vw,8px)!important;justify-content:center}
html.hv2 .star-site-index-navs__item:before{display:none!important}
/* items outside NAV_VI: hidden by CSS before the script runs, and by the class it sets. Two separate rules: a
   browser without :has drops the whole :has rule, and the class rule must survive that */
html.hv2 .star-site-index-navs__item.hv2-nav-off{display:none!important}
html.hv2 .star-site-index-navs__item:not(${NAV_KEEP}){display:none!important}
html.hv2 .star-site-index-navs__item > a{position:relative;display:flex;align-items:center;height:100%}
/* keep the normal image in flow (stable width), swap to the hover art on top of it */
html.hv2 .star-site-index-navs__item-img{display:block!important;height:${NAV_H}!important;width:auto!important}
html.hv2 .star-site-index-navs__item-img_hover{display:none!important;position:absolute;left:0;top:50%;
  height:${NAV_HOVER_H}!important;width:auto!important;margin:0!important;transform:translate(calc(${NAV_H} * -0.8815),-50%)}
html.hv2 .star-site-index-navs__item-active .star-site-index-navs__item-img,
html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img{visibility:hidden}
html.hv2 .star-site-index-navs__item-active .star-site-index-navs__item-img_hover,
html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img_hover{display:block!important}

/* the original download bar is the source cloned into the panel and sidebar; it is hidden only once
   the panel is placed, so a bar React renders too late for the retry timer still offers downloads */
html.hv2.hv2-dl-ready .star-site-index-download{display:none!important}

/* download panel (omg3q style): QR | 2x2 Vietnamese buttons | top-up box, starting just below the event banner
   frame of the background art (top comes from --hv2-dl-top computed in JS), below the header layers */
#hv2-dlpanel{display:none}
html.hv2 #hv2-dlpanel{display:flex;align-items:center;gap:clamp(14px,1.3vw,24px);position:absolute;left:50%;
  top:var(--hv2-dl-top,auto);z-index:8;transform:translateX(-50%);box-sizing:border-box;
  padding:clamp(10px,.8vw,14px) clamp(16px,1.5vw,28px);border:2px solid rgba(214,176,106,.8);border-radius:16px;
  background:linear-gradient(180deg,rgba(30,37,84,.95),rgba(13,17,42,.95));
  box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.06)}
#hv2-dlpanel .hv2-dl-qr{display:flex;flex-direction:column;align-items:center;gap:4px}
#hv2-dlpanel .hv2-dl-qr-img{width:calc(var(--hv2-dl-btn) * 2 + 8px);aspect-ratio:1;padding:4px;box-sizing:border-box;
  background:#fff;border-radius:8px}
#hv2-dlpanel .hv2-dl-qr-img img{display:block;width:100%!important;height:100%!important}
#hv2-dlpanel .hv2-dl-qr-text{color:#e9d9b0;font-size:12px;line-height:1.2;white-space:nowrap}
#hv2-dlpanel .hv2-dl-grid{display:grid;grid-template-columns:repeat(2,auto);gap:8px}
#hv2-dlpanel .hv2-dl-grid a{display:block;line-height:0}
#hv2-dlpanel .hv2-dl-grid img{display:block;width:auto!important;height:var(--hv2-dl-btn)!important}
/* top-up link as the Vietnamese "NẠP THẺ" box (131x150 art): two button rows tall plus the 18px it rises above them */
#hv2-dlpanel a.star-site-index-store{display:block;margin:-18px 0 0!important;
  background-image:url("${DL_TOPUP}")!important;background-size:100% 100%!important;
  height:calc(var(--hv2-dl-btn) * 2 + 26px)!important;width:calc((var(--hv2-dl-btn) * 2 + 26px) * 0.8733)!important}
#hv2-dlpanel a:hover,#hv2-sidebar a:hover{filter:brightness(1.1)}
/* buttons with no 3qdc link yet: shown, not clickable */
#hv2-dlpanel a.hv2-dl-soon,#hv2-sidebar a.hv2-dl-soon{cursor:default}
#hv2-dlpanel a.hv2-dl-soon:hover,#hv2-sidebar a.hv2-dl-soon:hover{filter:none}

/* right sidebar (cloned QR + download buttons): slides in once the key visual (and its download panel) is scrolled past */
#hv2-sidebar{display:none}
html.hv2 #hv2-sidebar{display:flex;flex-direction:column;align-items:center;gap:8px;position:fixed;right:14px;top:50%;
  transform:translate(calc(100% + 24px),-50%);opacity:0;pointer-events:none;transition:transform .3s ease,opacity .3s ease;
  z-index:12;width:148px;padding:12px 10px;border-radius:12px;
  background:rgba(8,10,22,.82);border:1px solid rgba(214,176,106,.55);box-shadow:0 8px 28px rgba(0,0,0,.45)}
html.hv2.hv2-scrolled #hv2-sidebar{transform:translate(0,-50%);opacity:1;pointer-events:auto}
#hv2-sidebar .hv2-qr{width:112px;height:112px;background:#fff;border-radius:6px;padding:4px;box-sizing:border-box}
#hv2-sidebar .hv2-qr img{width:100%!important;height:100%!important;display:block}
#hv2-sidebar .hv2-qr-text{color:#e9d9b0;font-size:12px;line-height:1.3;text-align:center}
#hv2-sidebar a{display:block;line-height:0}
#hv2-sidebar a img{width:128px!important;height:auto!important}
#hv2-sidebar a.star-site-index-store{width:112px!important;height:128px!important;margin:2px auto 0!important;
  background-image:url("${DL_TOPUP}")!important;background-size:100% 100%!important}
#hv2-sidebar .hv2-top{margin-top:2px;width:128px;height:30px;border:1px solid rgba(214,176,106,.7);border-radius:6px;
  background:transparent;color:#e9d9b0;font-size:13px;cursor:pointer}
#hv2-sidebar .hv2-top:hover{background:rgba(214,176,106,.18)}
/* short windows (e.g. a 1366x768 laptop once browser bars are taken off): the centred full-size sidebar (~528px) would
   run over the fixed header, so use a compact sidebar (~421px) anchored just below the header instead */
@media (max-height:720px){
  html.hv2 #hv2-sidebar{top:96px;gap:6px;padding:8px 10px;transform:translate(calc(100% + 24px),0)}
  html.hv2.hv2-scrolled #hv2-sidebar{transform:translate(0,0)}
  #hv2-sidebar .hv2-qr{width:88px;height:88px}
  #hv2-sidebar a img{width:104px!important}
  #hv2-sidebar a.star-site-index-store{width:88px!important;height:101px!important}
  #hv2-sidebar .hv2-top{width:104px;height:26px}
}

/* collapse/expand arrow on the sidebar's left edge; collapsed, the sidebar slides off screen and only the arrow stays */
#hv2-sidebar .hv2-sb-toggle{position:absolute;left:-43px;top:50%;width:42px;height:58px;margin-top:-29px;padding:0;border:0;
  background:url("${SB_TOGGLE}") 0 0 no-repeat;cursor:pointer}
#hv2-sidebar .hv2-sb-toggle:hover{filter:brightness(1.1)}
html.hv2-sb-collapsed #hv2-sidebar .hv2-sb-toggle{background-position:-44px 0}
html.hv2.hv2-scrolled.hv2-sb-collapsed #hv2-sidebar{transform:translate(calc(100% + 14px),-50%)}
@media (max-height:720px){
  html.hv2.hv2-scrolled.hv2-sb-collapsed #hv2-sidebar{transform:translate(calc(100% + 14px),0)}
}

/* content area below the key visual */
#home-v2{display:none}
html.hv2 #home-v2{display:block;position:relative;z-index:1;background:#0b0d18;color:#e8e2d0;padding-top:var(--hv2-dl-push,0px);
  font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
#home-v2 .hv2-section{display:none;padding:72px 180px 64px 24px;max-width:1280px;margin:0 auto;box-sizing:content-box}
#home-v2 .hv2-section[data-ready]{display:block}
#home-v2 .hv2-title{margin:0 0 36px;text-align:center;font-size:40px;font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;color:#f3dfa6;text-shadow:0 2px 0 #6b3a14,0 0 22px rgba(243,197,106,.35)}
#home-v2 .hv2-footer{padding:32px 24px 40px;border-top:1px solid rgba(214,176,106,.3);text-align:center;
  color:#9b927c;font-size:13px;background:#07080f}
#home-v2 .hv2-footer-brand{margin-bottom:14px;color:#f3dfa6;font-size:20px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
#home-v2 .hv2-footer-nav{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 26px}
#home-v2 .hv2-footer-nav a{color:#bfb59a;font-size:14px;text-decoration:none}
#home-v2 .hv2-footer-nav a:hover{color:#f3c56a}
`;

const JS = `(function(){
  if (window.__hv2) return;
  // inside the home page's hero block (iframe named 'hv2-embed') this page shows only its hero layout:
  // flag it before the app renders so the left navigation never flashes, and never build the home layout
  var EMBED = window.name === 'hv2-embed' && window.top !== window;
  if (EMBED) document.documentElement.classList.add('hv2-embed');
  var SECTIONS = [
    ['hv2-news', 'Tin Tức Sự Kiện'],
    ['hv2-heroes', 'Hệ Thống Tướng'],
    ['hv2-features', 'Tính Năng Đặc Sắc']${SHOW_TREASURE ? `,
    ['hv2-treasure', 'Kho Báu']` : ''}
  ];
  var KV = ${JSON.stringify(KV)};
  var DL_ART = ${JSON.stringify(DL_ART)};
  var renderers = [];
  var mounted = false;
  var sidebarTimer = null;
  var active = false;
  var panelBottom = 0; // document y of the download panel's bottom edge; the sidebar waits until it is scrolled past

  function isHome(){
    if (EMBED) return false;
    var h = location.hash;
    return !h || h === '#' || h === '#/' || h.indexOf('#/index') === 0;
  }
  function el(tag, attrs, kids){
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs){ if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function(c){ if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  // absolute / protocol-relative / root-relative asset URL -> same-origin mirror path
  function local(u){
    if (!u) return '';
    return String(u).replace(/^https?:\\/\\//, '/').replace(/^\\/\\//, '/');
  }
  function snap(file){
    return fetch('/galaxias-api.lingxigames.com/ds/ajax/' + file).then(function(r){
      if (!r.ok) throw new Error('snapshot ' + r.status);
      return r.json();
    });
  }
  function section(id){ return document.getElementById(id); }
  // a section becomes visible only once its renderer has filled it
  function ready(id){ var s = section(id); if (s) s.setAttribute('data-ready', ''); }

  function buildContainer(){
    if (document.getElementById('home-v2')) return;
    var wrap = el('div', { id: 'home-v2', 'data-home-v2': '' });
    SECTIONS.forEach(function(s){
      wrap.appendChild(el('section', { id: s[0], 'class': 'hv2-section' }, [el('h2', { 'class': 'hv2-title', text: s[1] })]));
    });
    var nav = el('nav', { 'class': 'hv2-footer-nav', 'aria-label': 'Liên kết' });
    ${JSON.stringify(FOOTER_LINKS)}.forEach(function(l){
      nav.appendChild(el('a', { href: l[1], text: l[0] }));
    });
    wrap.appendChild(el('footer', { 'class': 'hv2-footer' }, [el('div', { 'class': 'hv2-footer-brand', text: '3Q Đại Chiến' }), nav]));
    document.body.appendChild(wrap);
    document.body.appendChild(el('div', { id: 'hv2-header-bg' }));
  }

  // Vietnamese download buttons in DL_ART order: clone the original link an entry matches and swap in its artwork, or,
  // for an entry with no 3qdc link yet, a link-less placeholder that shows the artwork but cannot be clicked. If no
  // original link matches (the bundle changed its links), clone every original link so the panel is never empty.
  function dlLinks(dl){
    var src = [].slice.call(dl.querySelectorAll('.star-site-index-download-ul a'));
    var out = [], matched = 0;
    DL_ART.forEach(function(art){
      var c;
      if (art.match){
        var a = src.filter(function(l){ return (l.getAttribute('href') || '').indexOf(art.match) !== -1; })[0];
        if (!a) return;
        c = a.cloneNode(true); matched++;
      } else {
        c = el('a', { 'class': 'hv2-dl-soon', title: 'Sắp ra mắt' }, [el('img', {})]);
      }
      var img = c.querySelector('img');
      if (img){ img.src = art.src; img.alt = art.label; }
      out.push(c);
    });
    return matched ? out : src.map(function(l){ return l.cloneNode(true); });
  }

  // Sidebar collapse state: a class on <html> drives the slide and the arrow direction; the viewer's choice is kept in
  // this browser (localStorage can be unavailable, e.g. blocked storage, so every access is guarded)
  var SB_KEY = 'hv2-sidebar-collapsed';
  function sidebarCollapsedSaved(){ try { return localStorage.getItem(SB_KEY) === '1'; } catch (e) { return false; } }
  function setSidebarCollapsed(on, save){
    document.documentElement.classList.toggle('hv2-sb-collapsed', on);
    var t = document.querySelector('#hv2-sidebar .hv2-sb-toggle');
    if (t){ t.setAttribute('aria-label', on ? 'Mở thanh tải game' : 'Thu gọn thanh tải game'); t.setAttribute('aria-expanded', on ? 'false' : 'true'); }
    if (save){ try { localStorage.setItem(SB_KEY, on ? '1' : '0'); } catch (e) {} }
  }

  function buildSidebar(){
    if (document.getElementById('hv2-sidebar')) return true;
    var dl = document.querySelector('.star-site-index-download');
    var qrImg = document.querySelector('.star-site-index-download-qrcode_box img');
    if (!dl || !qrImg) return false;
    var bar = el('div', { id: 'hv2-sidebar', 'data-home-v2': '' });
    var qr = el('div', { 'class': 'hv2-qr' }); qr.appendChild(qrImg.cloneNode(true));
    bar.appendChild(qr);
    var desc = document.querySelector('.star-site-index-download-qrcode_box p');
    bar.appendChild(el('div', { 'class': 'hv2-qr-text', text: desc ? desc.textContent : '' }));
    dlLinks(dl).forEach(function(a){ bar.appendChild(a); });
    var store = dl.querySelector('a.star-site-index-store');
    if (store) { var box = store.cloneNode(true); box.setAttribute('aria-label', 'Nạp thẻ'); bar.appendChild(box); }
    var top = el('button', { type: 'button', 'class': 'hv2-top', text: 'Lên đầu trang' });
    top.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });
    bar.appendChild(top);
    var toggle = el('button', { type: 'button', 'class': 'hv2-sb-toggle' });
    toggle.addEventListener('click', function(){
      setSidebarCollapsed(!document.documentElement.classList.contains('hv2-sb-collapsed'), true);
    });
    bar.appendChild(toggle);
    document.body.appendChild(bar);
    setSidebarCollapsed(sidebarCollapsedSaved(), false);
    return true;
  }

  // omg3q-style download panel: the QR, the platform buttons and the top-up link of the
  // original (hidden) download bar, cloned so React's own nodes are never moved
  function buildPanel(){
    if (document.getElementById('hv2-dlpanel')) return true;
    var dl = document.querySelector('.star-site-index-download');
    var qrImg = document.querySelector('.star-site-index-download-qrcode_box img');
    var platforms = dl ? dlLinks(dl) : [];
    if (!dl || !qrImg || !platforms.length) return false;
    var qr = el('div', { 'class': 'hv2-dl-qr' }, [el('div', { 'class': 'hv2-dl-qr-img' }, [qrImg.cloneNode(true)])]);
    var desc = document.querySelector('.star-site-index-download-qrcode_box p');
    if (desc && desc.textContent) qr.appendChild(el('div', { 'class': 'hv2-dl-qr-text', text: desc.textContent }));
    var grid = el('div', { 'class': 'hv2-dl-grid' });
    platforms.forEach(function(a){ grid.appendChild(a); });
    var panel = el('div', { id: 'hv2-dlpanel', 'data-home-v2': '' }, [qr, grid]);
    var store = dl.querySelector('a.star-site-index-store');
    if (store) { var box = store.cloneNode(true); box.setAttribute('aria-label', 'Nạp thẻ'); panel.appendChild(box); }
    document.body.appendChild(panel);
    return true;
  }

  // Put the panel's top edge just below the event banner frame of the background art, so neither the
  // slogan nor the event line is covered (never above the header). The part of the panel that runs past
  // the 100vh key visual pushes the sections below down (--hv2-dl-push), so nothing is hidden under it.
  function placePanel(){
    var html = document.documentElement;
    var panel = document.getElementById('hv2-dlpanel');
    var ph = panel ? panel.offsetHeight : 0;
    if (!ph) return false;
    var vh = window.innerHeight;
    var scale = Math.max(window.innerWidth / KV.width, vh / KV.height);
    var top = Math.max(${HEADER_H} + 8, Math.round(KV.eventFrameBottom * scale) + 6);
    html.style.setProperty('--hv2-dl-top', top + 'px');
    html.style.setProperty('--hv2-dl-push', Math.max(0, top + ph + 24 - vh) + 'px');
    panelBottom = top + ph;
    onScroll();
    html.classList.add('hv2-dl-ready');
    return true;
  }
  var resizeTimer = null;
  function onResize(){
    if (!active) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(placePanel, 120);
  }
  function onScroll(){
    if (!active) return;
    // show the sidebar only once the download panel has gone under the fixed header
    var past = window.scrollY > Math.max(window.innerHeight * 0.75, panelBottom - ${HEADER_H});
    document.documentElement.classList.toggle('hv2-scrolled', past);
  }

  function runRenderers(){
    if (mounted) return;
    mounted = true;
    renderers.forEach(function(fn){ try { fn(api); } catch (e) { console.error('[hv2]', e); } });
  }

  function apply(){
    active = true;
    document.documentElement.classList.add('hv2');
    buildContainer();
    runRenderers();
    onScroll();
    // React renders the download bar late; one shared retry timer (~30s) clones it into the
    // panel and the sidebar, then places the panel (placement needs its rendered height)
    if (!(buildPanel() && buildSidebar() && placePanel()) && !sidebarTimer){
      var n = 0;
      sidebarTimer = setInterval(function(){
        var done = buildPanel() && buildSidebar() && placePanel();
        if (done || ++n > 120){ clearInterval(sidebarTimer); sidebarTimer = null; }
      }, 250);
    }
  }
  function teardown(){
    active = false;
    document.documentElement.classList.remove('hv2', 'hv2-scrolled');
  }
  // RF sets the hash while <head> is still parsing, so an early hashchange can fire
  // before <body> exists; the DOMContentLoaded listener performs the first apply.
  function sync(){ if (!document.body) return; if (isHome()) apply(); else teardown(); }

  // header nav: keep the NAV_VI items with their Vietnamese art (React may re-render the list at any time)
  var NAV_VI = ${JSON.stringify(NAV_VI)};
  function navEntry(href){
    for (var i = 0; i < NAV_VI.length; i++) if (NAV_VI[i][0] === href) return NAV_VI[i];
    return null;
  }
  function navVi(){
    var items = document.querySelectorAll('.star-site-index-navs__item');
    for (var i = 0; i < items.length; i++){
      var a = items[i].querySelector('a');
      var entry = a && navEntry(a.getAttribute('href'));
      items[i].classList.toggle('hv2-nav-off', !entry);
      if (!entry) continue;
      var pairs = [['.star-site-index-navs__item-img', '.png'], ['.star-site-index-navs__item-img_hover', '-hover.png']];
      for (var k = 0; k < pairs.length; k++){
        var img = items[i].querySelector(pairs[k][0]), src = '/3qdc-vi/home/' + entry[2] + pairs[k][1];
        if (img && img.getAttribute('src') !== src) img.setAttribute('src', src);
      }
      if (a.getAttribute('aria-label') !== entry[3]) a.setAttribute('aria-label', entry[3]);
    }
  }
  // on the home layout a nav click scrolls to its section (below the fixed header) instead of changing the route.
  // Registered in the capture phase on window, so it runs before nav-sync (capture on document), which would
  // otherwise reload to the section page for these exact menu hrefs. Propagation is stopped for that reason.
  var navFix = null;
  function navTarget(entry){
    if (!entry[1]) return 0;
    var s = section(entry[1]);
    // a section still waiting for its data is display:none and has no position yet
    if (!s || !s.hasAttribute('data-ready')) return null;
    return Math.max(0, Math.round(s.getBoundingClientRect().top + window.scrollY - ${HEADER_H}));
  }
  function onNavClick(e){
    if (!active || !e.target.closest) return;
    var a = e.target.closest('.star-site-index-navs__item > a');
    var entry = a && navEntry(a.getAttribute('href'));
    if (!entry) return;
    e.stopPropagation();
    // ctrl / cmd / shift click: the browser opens the link as usual, this page stays where it is
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var top = navTarget(entry);
    if (top === null) return;
    window.scrollTo({ top: top, behavior: 'smooth' });
    // blocks above may still change height during the smooth scroll: correct the landing once it ends
    var fixed = false;
    var fix = function(){
      if (fixed) return;
      fixed = true;
      window.removeEventListener('scrollend', fix);
      var t = navTarget(entry);
      if (t !== null && Math.abs(t - window.scrollY) > 2) window.scrollTo({ top: t, behavior: 'auto' });
    };
    clearTimeout(navFix);
    window.addEventListener('scrollend', fix);
    navFix = setTimeout(fix, 900);
  }

  var api = {
    el: el, local: local, snap: snap, section: section, ready: ready,
    onMount: function(fn){ renderers.push(fn); if (mounted) { try { fn(api); } catch (e) { console.error('[hv2]', e); } } }
  };
  window.__hv2 = api;

  window.addEventListener('hashchange', sync);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });
  if (!EMBED){
    // capture phase on window: runs before nav-sync (document capture) and the app's handlers on its root element
    window.addEventListener('click', onNavClick, true);
    new MutationObserver(navVi).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    navVi();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();`;

// Section scripts come after the layout script so window.__hv2 exists when they register; the hero skill icons
// script needs the html.hv2-embed flag the layout script sets inside the home hero iframe.
export const LAYOUT_V2_HTML =
  `<style data-home-v2>${CSS}${NEWS_CSS}${HEROES_CSS}${FEATURES_CSS}${HERO_SKILLS_CSS}${SHOW_TREASURE ? TREASURE_CSS : TREASURE_OFF_CSS}</style>` +
  `<script data-home-v2>${JS}</script>` +
  `<script data-home-v2>${HERO_SKILLS_JS}</script>` +
  `<script data-home-v2>${NEWS_JS}</script>` +
  `<script data-home-v2>${HEROES_JS}</script>` +
  `<script data-home-v2>${FEATURES_JS}</script>` +
  (SHOW_TREASURE ? `<script data-home-v2>${TREASURE_JS}</script>` : '');
