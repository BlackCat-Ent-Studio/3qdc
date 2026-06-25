// neuter-links.mjs — make the /#/index nav links usable.
// The clone only mirrors the #/index route, so the 6 internal /#/main/* nav
// routes white-screen here (their JS/CSS chunks are 404). Rewrite those internal
// hash links to our DEPLOYED main mirror (3qdc-main.wanmeivn.com), which mirrors
// every #/main/* route — opened in the SAME tab (same brand, seamless). The
// mirrored home (#/index) is left local. External links (store / wiki / tmall /
// download) still point to their live origin and are left untouched. Additive
// overlay — the umi bundle is never edited.

const ORIGIN = 'https://3qdc-main.wanmeivn.com';
const WIKI = 'https://3qdc-wiki.wanmeivn.com';

const SHIM_JS = `(function(){
  var O=${JSON.stringify(ORIGIN)};
  var W=${JSON.stringify(WIKI)};
  function fix(a){
    try{
      var h=a.getAttribute('href'); if(!h) return;
      // WIKI nav button (orig points at the Chinese wiki) → our wiki clone, same tab
      if(h.indexOf('sgzhx-wiki.lingxigames.com')>-1){
        if(a.getAttribute('href')!==W){ a.setAttribute('href',W); a.setAttribute('target','_self'); }
        return;
      }
      // internal hash route, but NOT the mirrored home → open the live page
      if(h.charAt(0)==='#' && h.indexOf('#/index')!==0){
        a.setAttribute('href', O+'/'+h);
        a.setAttribute('target','_self');
        a.setAttribute('data-mirror-extlink','1');
      }
    }catch(e){}
  }
  function scan(root){ try{ var base=(root&&root.querySelectorAll)?root:document; var as=base.querySelectorAll('a'); for(var i=0;i<as.length;i++)fix(as[i]); }catch(e){} }
  function run(){ scan(document); }
  if(document.readyState!=='loading')run(); else document.addEventListener('DOMContentLoaded',run);
  var mo=new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i]; if(m.addedNodes){ for(var j=0;j<m.addedNodes.length;j++){ var n=m.addedNodes[j]; if(n.nodeType===1){ if(n.tagName==='A')fix(n); scan(n); } } } } });
  (function start(){ if(document.body)mo.observe(document.body,{childList:true,subtree:true}); else setTimeout(start,50); })();
  var c=0,iv=setInterval(function(){run(); if(++c>24)clearInterval(iv);},500); // sweep ~12s for late React renders

  // umi <Link> navigates via an onClick (history.push) and ignores href, so the
  // rewrite above is not enough. Intercept the click in the CAPTURE phase (fires
  // before React's root listener) and navigate to our main mirror ourselves,
  // killing the SPA navigation that would otherwise white-screen on the un-mirrored
  // route. Same-tab navigation (it's our own branded site).
  document.addEventListener('click', function(e){
    try{
      var t=e.target, a=t&&t.closest?t.closest('a'):null;
      if(a&&a.getAttribute('data-mirror-extlink')==='1'){
        e.preventDefault(); e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        window.location.href=a.href;
      }
    }catch(err){}
  }, true);
})();`;

export const NEUTER_HTML = `<script data-mirror-links="rewrite">${SHIM_JS}</script>`;
