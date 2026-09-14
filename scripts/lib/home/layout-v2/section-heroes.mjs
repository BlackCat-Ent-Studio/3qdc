// section-heroes.mjs — "Hệ Thống Tướng" block for the home layout-v2 overlay.
// The block embeds the site's own hero page (/tuong → #/main/person) so the home page shows exactly that
// layout: name + CV voice, faction tabs, hero list, portrait, biography, skill tabs and its background.
// The frame is named 'hv2-embed'; layout-v2 (also injected into /tuong) sees that name and hides the hero
// page's left navigation, and never builds the home layout inside the frame.

export const HEROES_CSS = `
/* full-bleed block: the embedded page lays itself out for the whole frame width */
#home-v2 #hv2-heroes.hv2-section{max-width:none;padding:72px 0 64px}
#hv2-heroes .hv2-heroes-frame{display:block;width:100%;height:calc(100vh - 88px);min-height:560px;border:0;background:#0b0d18}
`;

export const HEROES_JS = `(function(){
  if (!window.__hv2) return;
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-heroes');
    if (!host) return;
    var frame = api.el('iframe', { 'class': 'hv2-heroes-frame', name: 'hv2-embed', title: 'Hệ Thống Tướng' });
    host.appendChild(frame);
    // the section must be displayed for the observer below to fire
    api.ready('hv2-heroes');

    // the hero page is a whole app instance (plus its background video): load it only when the block is
    // near the viewport. Sections above render late, so judge the distance once the visitor starts scrolling.
    var wanted = false;
    function load(){ wanted = true; if (frame.getAttribute('src') !== '/tuong') frame.src = '/tuong'; }
    // leaving the home route without a reload hides the layout: stop the embedded app, its background
    // video and any CV audio, and bring the hero page back when the home route returns
    window.addEventListener('hashchange', function(){
      if (!wanted) return;
      if (document.documentElement.classList.contains('hv2')) load();
      else if (frame.getAttribute('src') !== 'about:blank') frame.src = 'about:blank';
    });
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
