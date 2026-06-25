// nav-sync.mjs — single authority for tab title + menu→clean-path wiring (unified).
// Injected per entry with a config; replaces the per-i18n title-pin (removed) so
// no two scripts fight over document.title.
//   cfg = {
//     brand:  'string' (suffix),
//     def:    'string' (fallback section title),
//     titles: { '#/hashPrefix': 'Tên trang' },   // prefix match (longest wins)
//     paths:  { '#/exactMenuHref': '/clean-path' } // EXACT match → reload to clean path
//   }
export function NAV_SYNC_HTML(cfg) {
  return `<script data-nav-sync>(function(){
    var BRAND=${JSON.stringify(cfg.brand || '3Q Đại Chiến')};
    var DEF=${JSON.stringify(cfg.def || '')};
    var T=${JSON.stringify(cfg.titles || {})};
    var P=${JSON.stringify(cfg.paths || {})};
    function key(){ var h=location.hash||'', best=''; for(var k in T){ if(h.indexOf(k)===0 && k.length>best.length) best=k; } return best; }
    function setTitle(){ var k=key(), name=k?T[k]:DEF; document.title = name ? (name+' | '+BRAND) : BRAND; }
    if(document.readyState!=='loading')setTitle(); else document.addEventListener('DOMContentLoaded',setTitle);
    window.addEventListener('hashchange',setTitle);
    var c=0,iv=setInterval(function(){ setTitle(); if(++c>40)clearInterval(iv); },400); // re-pin vs umi
    // Wire ONLY top-level menu links (exact hash) → reload to clean section path.
    // Content links (#/main/person?rowId=…, #/details/…) are NOT exact → left to the app.
    document.addEventListener('click',function(e){
      try{
        var a=e.target&&e.target.closest?e.target.closest('a[href^="#/"]'):null;
        if(!a) return;
        var h=a.getAttribute('href')||'';
        if(P[h]){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); location.assign(P[h]); }
      }catch(_){}
    },true);
  })();</script>`;
}
