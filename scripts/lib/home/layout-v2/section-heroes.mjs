// section-heroes.mjs — "Hệ Thống Tướng" block for the home layout-v2 overlay.
// The block embeds the site's own hero page (/tuong → #/main/person) so the home page shows exactly that
// layout: name + CV voice, faction tabs, hero list, portrait, biography, skill tabs and its background.
// The frame is named 'hv2-embed'; layout-v2 (also injected into /tuong) sees that name and hides the hero
// page's left navigation, and never builds the home layout inside the frame.

// On /tuong the hero layout fills the pane right of the left navigation (17.30475vh wide), and its pieces are
// placed relative to that pane's centre and height. The frame therefore keeps that pane's aspect ratio for the
// visitor's window, centred, so everything sits where it does on the original page.
const NAV_VH = 0.1730475;
const HEADER_H = 88;
const MIN_FRAME_H = 560;

// The frame's navigations share the visitor's back/forward history. The hero page opens at the address its app pushes when
// it starts (first hero of the default faction), so that push is ignored as the same path and adds no entry; switching the
// frame off and on again uses location.replace for the same reason. Otherwise the back button only steps the hidden frame.
const FRAME_URL = '/tuong#/main/person?rowId=0&tbId=454680400827016707';

// Compact layout (COMPACT_MQ): the frame is not shown and never loaded (the hero page is laid out for a wide screen and
// brings a whole app plus a background video); section-heroes-mobile.mjs shows its own hero block instead. Widening the
// window past the compact width loads the frame as usual; narrowing it again stops the frame.

import { COMPACT_MQ } from './compact.mjs';

export const HEROES_CSS = `
#home-v2 #hv2-heroes.hv2-section{max-width:none;padding:72px 0 64px}
#hv2-heroes .hv2-heroes-stage{background:#dfe6f3}
#hv2-heroes .hv2-heroes-frame{display:block;margin:0 auto;width:100%;height:calc(100vh - ${HEADER_H}px);min-height:${MIN_FRAME_H}px;
  border:0;background:#dfe6f3}
@media ${COMPACT_MQ}{
  #home-v2 #hv2-heroes.hv2-section{max-width:720px;padding:40px max(16px,env(safe-area-inset-left)) 36px}
  #hv2-heroes .hv2-heroes-stage{display:none}
}
`;

export const HEROES_JS = `(function(){
  if (!window.__hv2) return;
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-heroes');
    if (!host) return;
    var frame = api.el('iframe', { 'class': 'hv2-heroes-frame', name: 'hv2-embed', title: 'Hệ Thống Tướng' });
    var stage = api.el('div', { 'class': 'hv2-heroes-stage' }, [frame]);
    host.appendChild(stage);
    // the section must be displayed for sizing and for the observer below
    api.ready('hv2-heroes');

    // frame height = viewport below the fixed header; width = that height x the /tuong pane aspect in this window
    function size(){
      var vh = window.innerHeight;
      var h = Math.max(${MIN_FRAME_H}, vh - ${HEADER_H});
      var aspect = (window.innerWidth - ${NAV_VH} * vh) / vh;
      var w = Math.min(stage.clientWidth, Math.round(h * aspect));
      frame.style.height = h + 'px';
      frame.style.width = w + 'px';
    }
    size();
    var resizeTimer = null;
    window.addEventListener('resize', function(){ clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 150); });

    // the hero page is a whole app instance (plus its background video): load it only when the block is
    // near the viewport. Sections above render late, so judge the distance once the visitor starts scrolling.
    var wanted = false, started = false, showing = false;
    function go(url){
      // a new frame's first navigation replaces its initial blank document; later ones must not add history entries
      if (!started){ started = true; frame.src = url; return; }
      try { frame.contentWindow.location.replace(url); } catch (e) { frame.src = url; }
    }
    var compact = api.compact || function(){ return false; };
    function load(){ wanted = true; if (!showing && !compact()){ showing = true; go(${JSON.stringify(FRAME_URL)}); } }
    function stopFrame(){ if (showing){ showing = false; go('about:blank'); } }
    // leaving the home route without a reload hides the layout: stop the embedded app, its background
    // video and any CV audio, and bring the hero page back when the home route returns
    window.addEventListener('hashchange', function(){
      if (!wanted) return;
      if (document.documentElement.classList.contains('hv2')){ size(); load(); }
      else stopFrame();
    });
    // compact width: no frame; back to a wide window: the frame loads if the block was already reached
    if (api.compactQuery){
      var onCompact = function(){
        if (compact()) stopFrame();
        else if (wanted && document.documentElement.classList.contains('hv2')){ size(); load(); }
      };
      if (api.compactQuery.addEventListener) api.compactQuery.addEventListener('change', onCompact);
      else if (api.compactQuery.addListener) api.compactQuery.addListener(onCompact);
    }
    if (!('IntersectionObserver' in window)){ load(); return; }
    var io = new IntersectionObserver(function(entries){
      if (!entries.some(function(e){ return e.isIntersecting; })) return;
      io.disconnect();
      load();
    }, { rootMargin: '400px 0px' });
    var arm = function(){ io.observe(host); };
    if (window.scrollY > 0) arm(); else window.addEventListener('scroll', arm, { once: true, passive: true });
  });
})();`;
