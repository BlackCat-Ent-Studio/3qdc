// Outbound <a> links work normally (original targets). Two custom re-points:
//   - "Vào trang chủ" nav pill (a.star-site-fab-kv-link_box-index) → our home mirror
//     https://3qdc-home.wanmeivn.com  (opens in a new tab)
//   - "Truy cập website" emblem (div onclick .kv-book__click / .book___2GKN9) → our site
//     https://3qdc.wanmeivn.com/
// Non-destructive runtime overlay (bundle untouched).

const SHIM_JS = `(function(){
  var HOME='/home';                                    // "Vào trang chủ" → unified home section (same tab)
  var SITE='https://3qdc.wanmeivn.com/';               // "Truy cập website" → our site
  function fixIndex(){
    try{ var as=document.querySelectorAll('.star-site-fab-kv-link_box-index');
      for(var i=0;i<as.length;i++){ var a=as[i];
        if(a.getAttribute('href')!==HOME){ a.setAttribute('href',HOME); a.setAttribute('target','_self'); a.removeAttribute('rel'); }
      }
    }catch(e){}
  }
  // book emblem is a <div> with JS onclick → intercept and send to SITE
  document.addEventListener('click',function(e){
    var n=e.target;
    while(n&&n!==document){
      var c=n.className||'';
      if(typeof c==='string' && (c.indexOf('kv-book')>-1 || c.indexOf('book___')>-1 || c.indexOf('BookBtnWrapper')>-1)){
        e.preventDefault(); e.stopPropagation();
        try{ (window.top||window).location.href=SITE; }catch(_){ window.location.href=SITE; }
        return false;
      }
      n=n.parentNode;
    }
  },true);
  function run(){ fixIndex(); }
  if(document.readyState!=='loading')run(); else document.addEventListener('DOMContentLoaded',run);
  (function start(){ if(document.body){ try{ new MutationObserver(run).observe(document.body,{childList:true,subtree:true}); }catch(e){} } else setTimeout(start,50); })();
  var c=0,iv=setInterval(function(){run(); if(++c>24)clearInterval(iv);},500);
})();`;

const BOOK_FX = '.star-site-fab-kv-book__click,.book___2GKN9,.star-site-fab-kv-link_box-index{cursor:pointer;}';

export const NEUTER_HTML =
  `<script data-mirror-neuter-links>${SHIM_JS}</script>` +
  `<style data-mirror-neuter-css>${BOOK_FX}</style>`;
