// section-features.mjs — "Tính Năng Đặc Sắc" block for the home layout-v2 overlay.
// A light coverflow carousel of the five feature banners: the centre slide is not a link for now (the site's
// own pages come later), the neighbours are dimmed and smaller and come to the centre when clicked, autoplay
// pauses on mouse hover.
//
// The banners are Vietnamese versions of the ones the /dac-sac accordion shows (the umi bundle
// hardcodes those in pcConfig.versionImg[].banner, mqaf*.png), served from overrides/home at
// 1211x680 in the same order. Only the home page uses these; /dac-sac keeps the originals.
// All five are WEBP; 2, 4 and 5 are encoded at quality 0.95 from the artist's PNG files (1.4–1.6MB each ->
// 250–310KB), which stay next to them in overrides/home.

// Compact layout (COMPACT_MQ): one banner across the whole width at a time, sliding in from the side; a sideways swipe,
// the arrows (on the banner's edges) or a dot change it.

import { COMPACT_MQ } from './compact.mjs';

const BANNER_DIR = '/3qdc-vi/home/';
const BANNERS = [
  'tinh-nang-1-vi.webp',
  'tinh-nang-2-vi.webp',
  'tinh-nang-3-vi.webp',
  'tinh-nang-4-vi.webp',
  'tinh-nang-5-vi.webp',
].map((f) => BANNER_DIR + f);

// Every slide sits in the gold frame with flame corners the owner picked from another game site (overrides/home/
// tinh-nang-khung.webp, 1069x577, transparent middle; the flames reach outside the gold line at the top-left and
// bottom-right). The banner fills the frame's window (979x537 at 45,20 of the frame, a little wider than the banners'
// 1211:680, so ~2% of their height is cropped), its corners cut by that site's window mask (tinh-nang-mat-na.png),
// and the frame is drawn over it.
const FRAME = { src: BANNER_DIR + 'tinh-nang-khung.webp', mask: BANNER_DIR + 'tinh-nang-mat-na.png', w: 1069, h: 577 };
const WINDOW = { x: 45, y: 20, w: 979, h: 537 };
const pct = (v, of) => `${((v / of) * 100).toFixed(3)}%`;

// centre slide width as a fraction of the track; the track height follows the frame ratio
const SLIDE_W = 0.66;
const EDGE = ((1 - SLIDE_W) * 50).toFixed(1); // % from the track edge to the centre slide

export const FEATURES_CSS = `
#hv2-features .hv2-feat{position:relative;max-width:1280px;margin:0 auto}
#hv2-features .hv2-feat-track{position:relative;overflow:hidden;aspect-ratio:${FRAME.w}/${(FRAME.h * SLIDE_W).toFixed(1)}}
#hv2-features .hv2-feat-slide{position:absolute;top:0;left:50%;width:${SLIDE_W * 100}%;height:100%;box-sizing:border-box;
  transform:translateX(-50%);transition:transform .5s ease,opacity .5s ease,filter .5s ease}
#hv2-features .hv2-feat-slide:after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
  background:url("${FRAME.src}") no-repeat 0 0/100% 100%}
#hv2-features .hv2-feat-link{position:absolute;left:${pct(WINDOW.x, FRAME.w)};top:${pct(WINDOW.y, FRAME.h)};
  width:${pct(WINDOW.w, FRAME.w)};height:${pct(WINDOW.h, FRAME.h)};display:block;cursor:pointer;background:#12152a;
  -webkit-mask:url("${FRAME.mask}") no-repeat 0 0/100% 100%;mask:url("${FRAME.mask}") no-repeat 0 0/100% 100%}
#hv2-features .hv2-feat-link img{display:block;width:100%;height:100%;object-fit:cover}
#hv2-features .hv2-feat-slide.is-active{z-index:3}
#hv2-features .hv2-feat-slide.is-prev,#hv2-features .hv2-feat-slide.is-next{z-index:2;filter:brightness(.5);cursor:pointer}
#hv2-features .hv2-feat-slide.is-prev{transform:translateX(-50%) translateX(-46%) scale(.76)}
#hv2-features .hv2-feat-slide.is-next{transform:translateX(-50%) translateX(46%) scale(.76)}
#hv2-features .hv2-feat-slide.is-prev:hover,#hv2-features .hv2-feat-slide.is-next:hover{filter:brightness(.75)}
#hv2-features .hv2-feat-slide.is-far-prev,#hv2-features .hv2-feat-slide.is-far-next{z-index:1;opacity:0;pointer-events:none}
#hv2-features .hv2-feat-slide.is-far-prev{transform:translateX(-50%) translateX(-80%) scale(.56)}
#hv2-features .hv2-feat-slide.is-far-next{transform:translateX(-50%) translateX(80%) scale(.56)}
/* arrows sit on the edges of the centre slide, vertically centred on the track (dots row is 40px) */
#hv2-features .hv2-feat-nav{position:absolute;top:calc(50% - 20px);z-index:4;display:flex;align-items:center;justify-content:center;
  width:48px;height:48px;padding:0 0 4px;transform:translateY(-50%);border-radius:50%;border:1px solid #f3dfa6;
  background:rgba(8,10,22,.72);color:#f3dfa6;font-size:32px;line-height:1;cursor:pointer;box-sizing:border-box}
#hv2-features .hv2-feat-nav:hover{background:rgba(214,176,106,.28)}
#hv2-features .hv2-feat-nav.is-left{left:calc(${EDGE}% - 24px)}
#hv2-features .hv2-feat-nav.is-right{right:calc(${EDGE}% - 24px)}
#hv2-features .hv2-feat-dots{display:flex;justify-content:center;align-items:flex-end;gap:10px;height:40px}
#hv2-features .hv2-feat-dot{width:12px;height:12px;padding:0;border-radius:6px;border:1px solid #f3dfa6;background:transparent;
  cursor:pointer;transition:width .3s ease,background .3s ease}
#hv2-features .hv2-feat-dot.is-on{width:30px;background:#f3dfa6}
@media ${COMPACT_MQ}{
  #hv2-features .hv2-feat-track{aspect-ratio:${FRAME.w}/${FRAME.h};touch-action:pan-y pinch-zoom}
  #hv2-features .hv2-feat-slide{width:100%}
  #hv2-features .hv2-feat-slide.is-active{transform:translateX(-50%)}
  #hv2-features .hv2-feat-slide.is-prev,#hv2-features .hv2-feat-slide.is-far-prev{transform:translateX(-150%);opacity:1;filter:none;pointer-events:none}
  #hv2-features .hv2-feat-slide.is-next,#hv2-features .hv2-feat-slide.is-far-next{transform:translateX(50%);opacity:1;filter:none;pointer-events:none}
  #hv2-features .hv2-feat-slide.is-far-prev,#hv2-features .hv2-feat-slide.is-far-next{opacity:0}
  #hv2-features .hv2-feat-nav{top:calc(50% - 22px);width:44px;height:44px;font-size:28px;background:rgba(8,10,22,.6)}
  #hv2-features .hv2-feat-nav.is-left{left:6px}
  #hv2-features .hv2-feat-nav.is-right{right:6px}
  #hv2-features .hv2-feat-dots{gap:18px;height:44px;align-items:center}
  #hv2-features .hv2-feat-dot{position:relative}
  #hv2-features .hv2-feat-dot:before{content:"";position:absolute;inset:-14px -6px}
}
@media (prefers-reduced-motion:reduce){
  #hv2-features .hv2-feat-slide,#hv2-features .hv2-feat-dot{transition:none}
}
`;

export const FEATURES_JS = `(function(){
  if (!window.__hv2) return;
  var BANNERS = ${JSON.stringify(BANNERS)};
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-features');
    var n = BANNERS.length;
    if (!host || !n) return;
    var el = api.el;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var cur = 0, timer = null, hover = false, focused = false, inView = false, failed = 0;

    var track = el('div', { 'class': 'hv2-feat-track' });
    var dots = el('div', { 'class': 'hv2-feat-dots' });
    var slides = BANNERS.map(function(src, i){
      var img = el('img', { alt: 'Tính năng đặc sắc ' + (i + 1), draggable: 'false', 'data-src': src });
      img.addEventListener('error', function(){
        if (++failed < n) return;
        stop();
        host.removeAttribute('data-ready');
        console.warn('[hv2 features] no banner could be loaded');
      });
      var link = el('div', { 'class': 'hv2-feat-link' }, [img]);
      // a side slide brings itself to the centre
      link.addEventListener('click', function(){ if (i !== cur) go(i); });
      var slide = el('div', { 'class': 'hv2-feat-slide' }, [link]);
      track.appendChild(slide);
      var dot = el('button', { type: 'button', 'class': 'hv2-feat-dot', 'aria-label': 'Tính năng ' + (i + 1) });
      dot.addEventListener('click', function(){ go(i); });
      dots.appendChild(dot);
      return { slide: slide, link: link, img: img, dot: dot };
    });
    var left = el('button', { type: 'button', 'class': 'hv2-feat-nav is-left', 'aria-label': 'Trước', text: '\\u2039' });
    var right = el('button', { type: 'button', 'class': 'hv2-feat-nav is-right', 'aria-label': 'Sau', text: '\\u203a' });
    left.addEventListener('click', function(){ go(cur - 1); });
    right.addEventListener('click', function(){ go(cur + 1); });
    var wrap = el('div', { 'class': 'hv2-feat', role: 'region', 'aria-roledescription': 'carousel', 'aria-label': 'Tính năng đặc sắc' },
      [track, left, right, dots]);
    wrap.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') hover = true; });
    wrap.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse'){ hover = false; restart(); } });
    // keyboard focus pauses autoplay too, so a focused slide is never rotated away
    wrap.addEventListener('focusin', function(){ focused = true; });
    wrap.addEventListener('focusout', function(e){ if (!wrap.contains(e.relatedTarget)){ focused = false; restart(); } });
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) restart(); });
    if (api.swipe) api.swipe(track, function(){ go(cur + 1); }, function(){ go(cur - 1); });
    host.appendChild(wrap);

    function render(){
      slides.forEach(function(s, i){
        var d = ((i - cur) % n + n) % n;
        if (d > n / 2) d -= n;
        var cls = d === 0 ? 'is-active' : d === -1 ? 'is-prev' : d === 1 ? 'is-next' : d < 0 ? 'is-far-prev' : 'is-far-next';
        s.slide.className = 'hv2-feat-slide ' + cls;
        s.slide.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
        s.dot.classList.toggle('is-on', d === 0);
        s.dot.setAttribute('aria-current', d === 0 ? 'true' : 'false');
      });
    }
    function go(i){ cur = ((i % n) + n) % n; render(); restart(); }
    // autoplay only advances while the carousel is on screen, the home layout is active and nobody hovers or focuses it
    function tick(){
      if (hover || focused || !inView || document.hidden || !document.documentElement.classList.contains('hv2')) return;
      cur = (cur + 1) % n;
      render();
    }
    function stop(){ if (timer){ clearInterval(timer); timer = null; } }
    function restart(){ stop(); if (!reduce && failed < n) timer = setInterval(tick, 5000); }

    // banners are ~200KB each: only fetch once the section is close to the viewport
    function loadImages(){
      slides.forEach(function(s){ if (!s.img.getAttribute('src')) s.img.src = s.img.getAttribute('data-src'); });
    }
    if ('IntersectionObserver' in window){
      var lazy = new IntersectionObserver(function(entries){
        if (!entries.some(function(e){ return e.isIntersecting; })) return;
        lazy.disconnect();
        loadImages();
      }, { rootMargin: '600px 0px' });
      // news and heroes stay hidden until their data arrives, so at first paint this section sits
      // right under the key visual; judge the distance only once the visitor starts scrolling
      var arm = function(){ lazy.observe(host); };
      if (window.scrollY > 0) arm(); else window.addEventListener('scroll', arm, { once: true, passive: true });
      new IntersectionObserver(function(entries){
        var was = inView;
        inView = entries[entries.length - 1].isIntersecting;
        if (inView && !was) restart(); // a full interval on screen before the first advance
      }, { threshold: 0.3 }).observe(wrap);
    } else {
      loadImages();
      inView = true;
    }

    render();
    // the section must be displayed for the observers to fire, so it is shown once built;
    // it is hidden again if every banner fails to load
    api.ready('hv2-features');
    restart();
  });
})();`;
