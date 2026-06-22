// Neuter all EXTERNAL links → href="#" and swallow the click. Internal SPA hash
// routes (#/fab, #/index...) are left intact. Non-destructive runtime overlay
// (bundle untouched); re-applies on React re-render via MutationObserver.
// User no longer uses the original outbound links (shop/download/social/legal...).

const SHIM_JS = `(function(){
  // external http(s) OR the internal #/index "go to homepage" route (unmirrored)
  function dead(a){ var h=a.getAttribute('href'); return h && (/^https?:/i.test(h) || h.indexOf('#/index')>-1); }
  function neuter(root){
    try{
      var as=(root&&root.querySelectorAll?root:document).querySelectorAll('a[href]');
      for(var i=0;i<as.length;i++){ var a=as[i];
        if(dead(a) && a.getAttribute('href')!=='#'){ a.setAttribute('href','#'); a.removeAttribute('target'); a.setAttribute('data-mirror-neutered','1'); }
      }
    }catch(e){}
  }
  function run(){ neuter(document); }
  var DEST='https://3qdc.wanmeivn.com/';
  // capture-phase: redirect the "Truy cập website" emblem to DEST (block its
  // original onclick → original site); swallow other neutered '#' links.
  document.addEventListener('click',function(e){
    var n=e.target;
    while(n&&n!==document){
      var c=n.className||'';
      if(typeof c==='string' && (c.indexOf('kv-book')>-1 || c.indexOf('book___')>-1 || c.indexOf('BookBtnWrapper')>-1)){
        e.preventDefault(); e.stopPropagation();
        try{ (window.top||window).location.href=DEST; }catch(_){ window.location.href=DEST; }
        return false;
      }
      if(n.tagName==='A'&&n.getAttribute('data-mirror-neutered')){ e.preventDefault(); e.stopPropagation(); return false; }
      n=n.parentNode;
    }
  },true);
  if(document.readyState!=='loading')run(); else document.addEventListener('DOMContentLoaded',run);
  var mo=new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i]; if(m.addedNodes){ for(var j=0;j<m.addedNodes.length;j++){ var nn=m.addedNodes[j]; if(nn.nodeType===1)neuter(nn); } } else if(m.type==='attributes'&&m.target.tagName==='A'){ neuter(document); } } });
  (function start(){ if(document.body)mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href']}); else setTimeout(start,50); })();
  var c=0,iv=setInterval(function(){run(); if(++c>24)clearInterval(iv);},500);
})();`;

// The "Truy cập website" emblem navigates via a JS onclick on a <div> (not <a>);
// the capture-phase handler above intercepts it and redirects to DEST instead.
// Keep it clickable + show a pointer cursor.
const BOOK_FX = '.star-site-fab-kv-book__click,.book___2GKN9{cursor:pointer;}';

export const NEUTER_HTML =
  `<script data-mirror-neuter-links>${SHIM_JS}</script>` +
  `<style data-mirror-neuter-css>${BOOK_FX}</style>`;
