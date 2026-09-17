// section-news.mjs — "Tin Tức Sự Kiện" block for the home layout-v2 overlay.
// Right: three tabs — Thông báo, Sự kiện, Cẩm nang — with the newest articles of the site's own news pages
// (/api/tin-tuc, published articles only). Each row opens its article at /tin-tuc/<slug>; "Xem thêm" opens the
// news page on the selected tab. A tab without articles shows "Chưa có bài viết".
// Left: autoplaying slider of the cover pictures of those same articles (the rows of the selected tab, in the same
// order); a slide opens its article. When the tab has no article with a cover, the Vietnamese banner shows alone.

// Compact layout (COMPACT_MQ): slider on top and tabs + list under it in one column, the slider follows a sideways swipe,
// tabs and rows are finger-sized and titles take up to two lines.

import { COMPACT_MQ } from './compact.mjs';

// tab label and news category id; the first tab is selected by default
const TABS = [
  ['Thông báo', 'thong-bao'],
  ['Sự kiện', 'su-kien'],
  ['Cẩm nang', 'cam-nang'],
];

// shown when the selected tab has no article with a cover: the Vietnamese key art ("Tinh Hà Rực Sáng", 1756x896, close
// to the 16:9 frame so its lettering is not cut; already loaded as the page background)
const FALLBACK = '/3qdc-vi/home/anh-nen-slogan-vi.webp';

// the block sits in the owner's navy frame (overrides/home/khung-tin-tuc.webp, 2016x608: double gold trim, gold cloud
// ornaments reaching 71px into each corner, flat #121526 inside), drawn as a 9-slice border image with 80px corner slices
// so only the straight trim and the flat middle stretch. Shown at 0.5x on desktop (ornaments ~36px) and 0.3x on phones
// (~21px); the padding keeps the slider, tabs and list clear of the ornaments. The rounded background of the same navy
// hides the faint hairline Chrome leaves where the slices meet.
const NEWS_FRAME = '/3qdc-vi/home/khung-tin-tuc.webp';

// "Xem thêm" button frame (overrides/home/khung-nut-xem-them-rong.webp, 1008x176): plain 15px gold trim, a gold dragon in
// each top corner (54x62px), plain bottom corners (16px), flat #121526 inside. 9-slice 64 56 18 56 so each dragon sits
// whole in its corner cell and only the plain trim stretches; shown at 0.4x (dragons ~22x25px, trim ~6px).
const MORE_FRAME = '/3qdc-vi/home/khung-nut-xem-them-rong.webp';

export const NEWS_CSS = `
#hv2-news .hv2-news{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:28px;padding:40px;
  border:0 solid transparent;border-image:url("${NEWS_FRAME}") 80 fill / 40px stretch;
  background:#121526;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
#hv2-news .hv2-slider{position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000}
#hv2-news .hv2-slider-link{position:absolute;inset:0;display:block;cursor:pointer}
#hv2-news .hv2-slide-item{position:absolute;inset:0;display:block;pointer-events:none}
#hv2-news .hv2-slide-item.is-on{pointer-events:auto;z-index:1}
#hv2-news .hv2-slide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s ease}
#hv2-news .hv2-slide.is-on{opacity:1}
#hv2-news .hv2-dots{position:absolute;left:0;right:0;bottom:10px;z-index:2;display:flex;justify-content:center;gap:8px;pointer-events:none}
#hv2-news .hv2-dots[hidden]{display:none}
#hv2-news .hv2-dot{width:10px;height:10px;padding:0;border-radius:50%;border:1px solid #f3dfa6;background:transparent;
  cursor:pointer;pointer-events:auto}
#hv2-news .hv2-dot.is-on{background:#f3dfa6}
#hv2-news .hv2-tabs{display:flex;gap:6px;margin-bottom:14px;border-bottom:1px solid rgba(214,176,106,.25)}
#hv2-news .hv2-tab{padding:9px 16px;border:0;border-radius:8px 8px 0 0;background:transparent;color:#bfb59a;
  font-size:16px;font-weight:600;cursor:pointer}
#hv2-news .hv2-tab.is-on{background:linear-gradient(180deg,#e8a23a,#b9621c);color:#fff}
#hv2-news .hv2-list{list-style:none;margin:0;padding:0;min-height:236px}
#hv2-news .hv2-row{display:flex;align-items:center;gap:14px;padding:10px 4px;border-bottom:1px dashed rgba(214,176,106,.18);
  color:#e8e2d0;text-decoration:none;cursor:pointer}
#hv2-news .hv2-row:hover .hv2-row-title{color:#f3c56a}
#hv2-news .hv2-date{flex:0 0 46px;text-align:center;line-height:1.1;color:#f3dfa6;font-weight:700;font-size:18px}
#hv2-news .hv2-date small{display:block;font-size:12px;font-weight:400;color:#9b927c}
#hv2-news .hv2-row-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}
#hv2-news .hv2-empty{padding:24px 4px;color:#9b927c}
#hv2-news .hv2-more{display:flex;align-items:center;justify-content:center;min-height:52px;box-sizing:border-box;margin-top:16px;
  padding:10px 28px;text-align:center;border:0 solid transparent;
  border-image:url("${MORE_FRAME}") 64 56 18 56 fill / 25.6px 22.4px 7.2px 22.4px stretch;
  border-radius:8px;background:#121526;color:#f3dfa6;text-decoration:none;cursor:pointer}
#hv2-news .hv2-more:hover{filter:brightness(1.18)}
@media ${COMPACT_MQ}{
  #hv2-news .hv2-news{grid-template-columns:minmax(0,1fr);gap:16px;padding:26px 14px;border-image-width:24px;border-radius:14px}
  #hv2-news .hv2-slider{touch-action:pan-y pinch-zoom;border-radius:8px}
  /* dots keep their look; the invisible ring around each makes a finger-sized target */
  #hv2-news .hv2-dots{gap:18px;bottom:12px}
  #hv2-news .hv2-dot{position:relative}
  #hv2-news .hv2-dot:before{content:"";position:absolute;inset:-12px}
  #hv2-news .hv2-tabs{gap:4px;margin-bottom:6px}
  #hv2-news .hv2-tab{flex:1 1 0;min-width:0;min-height:44px;padding:8px 4px;font-size:15px;white-space:nowrap}
  #hv2-news .hv2-list{min-height:0}
  #hv2-news .hv2-row{min-height:56px;padding:8px 2px}
  #hv2-news .hv2-row-title{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.35}
  #hv2-news .hv2-more{min-height:48px;margin-top:12px}
}
`;

export const NEWS_JS = `(function(){
  if (!window.__hv2) return;
  var TABS = ${JSON.stringify(TABS)};
  var FALLBACK = ${JSON.stringify(FALLBACK)};
  // a cover the news pages accept: the site's own artwork or an uploaded picture (same rule as the editor)
  var COVER_RE = /^\\/(?:3qdc-vi|tin-tuc-anh)(?:\\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/;
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-news');
    if (!host) return;
    var el = api.el;

    // slider: the slide layer and the dots as siblings; slides are rebuilt for the selected tab
    var slider = el('div', { 'class': 'hv2-slider' });
    var layer = el('div', { 'class': 'hv2-slider-link' });
    var dots = el('div', { 'class': 'hv2-dots' });
    slider.appendChild(layer);
    slider.appendChild(dots);
    var items = [], current = 0, hovering = false, shownKey = null;
    function mark(i, on){
      var item = items[i];
      item.classList.toggle('is-on', on);
      item.firstChild.classList.toggle('is-on', on);
      if (dots.children[i]) dots.children[i].classList.toggle('is-on', on);
      // only the visible slide can be reached with the keyboard or a screen reader
      if (on){ item.removeAttribute('tabindex'); item.removeAttribute('aria-hidden'); }
      else { item.setAttribute('tabindex', '-1'); item.setAttribute('aria-hidden', 'true'); }
    }
    function show(i){
      if (i === current || !items[i]) return;
      mark(current, false);
      current = i;
      mark(current, true);
    }
    function setSlides(articles){
      var pics = articles.filter(function(a){ return a && a.slug && COVER_RE.test(String(a.cover || '')); }).slice(0, 4);
      var key = JSON.stringify(pics.map(function(a){ return [a.slug, a.cover]; }));
      if (key === shownKey) return;
      shownKey = key;
      layer.textContent = '';
      dots.textContent = '';
      current = 0;
      var list = pics.length ? pics : [null];
      items = list.map(function(a, i){
        var img = el('img', { 'class': 'hv2-slide', src: a ? a.cover : FALLBACK, alt: a ? String(a.title || '') : '', loading: 'lazy' });
        var item = a
          ? el('a', { 'class': 'hv2-slide-item', href: '/tin-tuc/' + encodeURIComponent(a.slug) }, [img])
          : el('span', { 'class': 'hv2-slide-item' }, [img]);
        layer.appendChild(item);
        if (list.length > 1){
          var dot = el('button', { type: 'button', 'class': 'hv2-dot', 'aria-label': 'Ảnh ' + (i + 1) });
          dot.addEventListener('click', function(){ show(i); });
          dots.appendChild(dot);
        }
        return item;
      });
      dots.hidden = list.length < 2;
      items.forEach(function(it, i){ mark(i, i === 0); });
    }
    // pause only for a real mouse hover (touch taps would otherwise stop autoplay for good)
    slider.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') hovering = true; });
    slider.addEventListener('pointerleave', function(){ hovering = false; });
    // a swipe also holds autoplay for one full interval, so the slide just chosen is not replaced right away
    var heldUntil = 0;
    if (api.swipe) api.swipe(slider,
      function(){ if (items.length > 1){ heldUntil = Date.now() + 4500; show((current + 1) % items.length); } },
      function(){ if (items.length > 1){ heldUntil = Date.now() + 4500; show((current - 1 + items.length) % items.length); } });
    setInterval(function(){
      if (hovering || Date.now() < heldUntil || items.length < 2 || !document.documentElement.classList.contains('hv2')) return;
      show((current + 1) % items.length);
    }, 4500);

    // tabs + list
    var tabsBar = el('div', { 'class': 'hv2-tabs', role: 'tablist' });
    var list = el('ul', { 'class': 'hv2-list' });
    var more = el('a', { 'class': 'hv2-more', href: '/tin-tuc?muc=' + TABS[0][1], text: 'Xem thêm +' });
    var cache = {};   // category -> promise of articles (shared by concurrent clicks)
    var selected = 0;
    function renderList(articles){
      list.textContent = '';
      if (!articles.length){ list.appendChild(el('li', { 'class': 'hv2-empty', text: 'Chưa có bài viết' })); return; }
      articles.slice(0, 4).forEach(function(it){
        var t = String(it.publishAt || '');
        var date = el('span', { 'class': 'hv2-date' }, [t.slice(8, 10) || '--', el('small', { text: t.slice(5, 7) ? t.slice(5, 7) + '/' + t.slice(0, 4) : '' })]);
        var row = el('a', { 'class': 'hv2-row', href: '/tin-tuc/' + encodeURIComponent(it.slug) }, [date, el('span', { 'class': 'hv2-row-title', text: it.title || '' })]);
        list.appendChild(el('li', null, [row]));
      });
    }
    function load(muc){
      if (!cache[muc]){
        // a hung request gives up after 8s so the block still shows (empty) instead of staying hidden
        var ctl = window.AbortController ? new AbortController() : null;
        var timer = ctl ? setTimeout(function(){ ctl.abort(); }, 8000) : 0;
        cache[muc] = fetch('/api/tin-tuc?muc=' + encodeURIComponent(muc) + '&limit=4', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
          .then(function(r){ clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function(j){ return Array.isArray(j) ? j : []; })
          .catch(function(e){ delete cache[muc]; console.warn('[hv2 news]', e); return []; });
      }
      return cache[muc];
    }
    function select(i){
      selected = i;
      for (var k = 0; k < tabsBar.children.length; k++){
        tabsBar.children[k].classList.toggle('is-on', k === i);
        tabsBar.children[k].setAttribute('aria-selected', k === i ? 'true' : 'false');
      }
      more.setAttribute('href', '/tin-tuc?muc=' + TABS[i][1]);
      // a slower earlier response must not overwrite the list or slides of the tab now selected
      return load(TABS[i][1]).then(function(articles){
        if (selected !== i) return;
        var shown = articles.slice(0, 4);
        renderList(shown);
        setSlides(shown);
      });
    }
    TABS.forEach(function(tab, i){
      var b = el('button', { type: 'button', 'class': 'hv2-tab', role: 'tab', 'aria-selected': 'false', text: tab[0] });
      b.addEventListener('click', function(){ select(i); });
      tabsBar.appendChild(b);
    });

    var right = el('div', null, [tabsBar, list, more]);
    host.appendChild(el('div', { 'class': 'hv2-news' }, [slider, right]));
    // warm every tab so later switches render instantly
    TABS.forEach(function(tab){ load(tab[1]); });
    select(0).then(function(){ api.ready('hv2-news'); });
  });
})();`;
