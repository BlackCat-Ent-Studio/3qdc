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

import { NEWS_CSS, NEWS_JS } from './section-news.mjs';
import { HEROES_CSS, HEROES_JS } from './section-heroes.mjs';
import { FEATURES_CSS, FEATURES_JS } from './section-features.mjs';
import { TREASURE_CSS, TREASURE_JS } from './section-treasure.mjs';

const HEADER_H = 88;

const CSS = `
html.hv2 body{overflow-x:hidden}
html.hv2{--hv2-dl-btn:clamp(34px,2.5vw,46px)}
html.hv2 .star-site-index-left-mask{display:none!important}

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

/* 10 image nav items: vertical list -> centered horizontal row inside the header */
html.hv2 .star-site-index-navs{position:fixed!important;top:0!important;left:clamp(170px,13.5vw,260px)!important;
  right:clamp(200px,15.6vw,300px)!important;height:${HEADER_H}px!important;display:flex!important;
  flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:clamp(2px,.8vw,22px);
  transform:none!important;animation:none!important;filter:none!important;opacity:1!important;z-index:11!important;
  margin:0!important;padding:0!important}
html.hv2 .star-site-index-navs__item{width:auto!important;height:${HEADER_H}px!important;margin:0!important;
  padding:0 clamp(2px,.3vw,8px)!important;justify-content:center}
html.hv2 .star-site-index-navs__item:before{display:none!important}
html.hv2 .star-site-index-navs__item > a{position:relative;display:flex;align-items:center;height:100%}
/* keep the normal image in flow (stable width), swap to the hover art on top of it */
html.hv2 .star-site-index-navs__item-img{display:block!important;height:clamp(16px,1.25vw,24px)!important;width:auto!important}
html.hv2 .star-site-index-navs__item-img_hover{display:none!important;position:absolute;left:50%;top:50%;
  height:clamp(28px,2.25vw,43px)!important;width:auto!important;margin:0!important;transform:translate(-50%,-50%)}
html.hv2 .star-site-index-navs__item-active .star-site-index-navs__item-img,
html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img{visibility:hidden}
html.hv2 .star-site-index-navs__item-active .star-site-index-navs__item-img_hover,
html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img_hover{display:block!important}

/* the original download bar is the source cloned into the panel and sidebar; it is hidden only once
   the panel is placed, so a bar React renders too late for the retry timer still offers downloads */
html.hv2.hv2-dl-ready .star-site-index-download{display:none!important}

/* download panel (omg3q style): QR | 2x2 platform buttons | top-up button, pinned to the bottom of the
   first screen (top comes from --hv2-dl-top computed in JS), kept below the header layers */
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
#hv2-dlpanel a.star-site-index-store{display:block;margin:0!important;height:calc(var(--hv2-dl-btn) * 1.4)!important;
  width:calc(var(--hv2-dl-btn) * 1.4 * 3.61)!important}

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
#hv2-sidebar a.star-site-index-store{width:128px!important;height:36px!important;margin:0!important}
#hv2-sidebar .hv2-top{margin-top:2px;width:128px;height:30px;border:1px solid rgba(214,176,106,.7);border-radius:6px;
  background:transparent;color:#e9d9b0;font-size:13px;cursor:pointer}
#hv2-sidebar .hv2-top:hover{background:rgba(214,176,106,.18)}

/* content area below the key visual */
#home-v2{display:none}
html.hv2 #home-v2{display:block;position:relative;z-index:1;background:#0b0d18;color:#e8e2d0;
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
  var SECTIONS = [
    ['hv2-news', 'Tin Tức Sự Kiện'],
    ['hv2-heroes', 'Hệ Thống Tướng'],
    ['hv2-features', 'Tính Năng Đặc Sắc'],
    ['hv2-treasure', 'Kho Báu']
  ];
  var renderers = [];
  var mounted = false;
  var sidebarTimer = null;
  var active = false;

  function isHome(){
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
    // internal links only (the pages this site already serves)
    var nav = el('nav', { 'class': 'hv2-footer-nav', 'aria-label': 'Liên kết' });
    [['Tin tức', '/tin-tuc'], ['Kế hoạch', '/ke-hoach'], ['Tướng', '/tuong'], ['Đặc sắc', '/dac-sac'],
      ['Kho báu', '/kho-bau'], ['Cộng đồng', '/cong-dong'], ['Hướng dẫn', '/huong-dan']].forEach(function(l){
      nav.appendChild(el('a', { href: l[1], text: l[0] }));
    });
    wrap.appendChild(el('footer', { 'class': 'hv2-footer' }, [el('div', { 'class': 'hv2-footer-brand', text: '3Q Đại Chiến' }), nav]));
    document.body.appendChild(wrap);
    document.body.appendChild(el('div', { id: 'hv2-header-bg' }));
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
    var links = dl.querySelectorAll('.star-site-index-download-ul a, a.star-site-index-store');
    for (var i = 0; i < links.length; i++) bar.appendChild(links[i].cloneNode(true));
    var top = el('button', { type: 'button', 'class': 'hv2-top', text: 'Lên đầu trang' });
    top.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });
    bar.appendChild(top);
    document.body.appendChild(bar);
    return true;
  }

  // omg3q-style download panel: the QR, the platform buttons and the top-up link of the
  // original (hidden) download bar, cloned so React's own nodes are never moved
  function buildPanel(){
    if (document.getElementById('hv2-dlpanel')) return true;
    var dl = document.querySelector('.star-site-index-download');
    var qrImg = document.querySelector('.star-site-index-download-qrcode_box img');
    var platforms = dl ? dl.querySelectorAll('.star-site-index-download-ul a') : [];
    if (!dl || !qrImg || !platforms.length) return false;
    var qr = el('div', { 'class': 'hv2-dl-qr' }, [el('div', { 'class': 'hv2-dl-qr-img' }, [qrImg.cloneNode(true)])]);
    var desc = document.querySelector('.star-site-index-download-qrcode_box p');
    if (desc && desc.textContent) qr.appendChild(el('div', { 'class': 'hv2-dl-qr-text', text: desc.textContent }));
    var grid = el('div', { 'class': 'hv2-dl-grid' });
    for (var i = 0; i < platforms.length; i++) grid.appendChild(platforms[i].cloneNode(true));
    var panel = el('div', { id: 'hv2-dlpanel', 'data-home-v2': '' }, [qr, grid]);
    var store = dl.querySelector('a.star-site-index-store');
    if (store) panel.appendChild(store.cloneNode(true));
    document.body.appendChild(panel);
    return true;
  }

  // Pin the panel to the bottom of the key visual (the 100vh first screen) at every window size,
  // over the event line of the background art, never above the header. The free band below the
  // event banner is too thin for the panel at every common desktop height, so it is not used.
  function placePanel(){
    var html = document.documentElement;
    var panel = document.getElementById('hv2-dlpanel');
    var ph = panel ? panel.offsetHeight : 0;
    if (!ph) return false;
    var top = Math.max(${HEADER_H} + 8, window.innerHeight - ph - 16);
    html.style.setProperty('--hv2-dl-top', Math.round(top) + 'px');
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
    var past = window.scrollY > window.innerHeight * 0.75;
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

  var api = {
    el: el, local: local, snap: snap, section: section, ready: ready,
    onMount: function(fn){ renderers.push(fn); if (mounted) { try { fn(api); } catch (e) { console.error('[hv2]', e); } } }
  };
  window.__hv2 = api;

  window.addEventListener('hashchange', sync);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();`;

// Section scripts come after the layout script so window.__hv2 exists when they register.
export const LAYOUT_V2_HTML =
  `<style data-home-v2>${CSS}${NEWS_CSS}${HEROES_CSS}${FEATURES_CSS}${TREASURE_CSS}</style>` +
  `<script data-home-v2>${JS}</script>` +
  `<script data-home-v2>${NEWS_JS}</script>` +
  `<script data-home-v2>${HEROES_JS}</script>` +
  `<script data-home-v2>${FEATURES_JS}</script>` +
  `<script data-home-v2>${TREASURE_JS}</script>`;
