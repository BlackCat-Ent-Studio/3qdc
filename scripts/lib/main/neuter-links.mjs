// neuter-links.mjs — main cross-links to the deployed wiki clone. Two targets:
//  (1) left-nav "Hướng dẫn" <a href="https://sgzhx-wiki.lingxigames.com..."> (original Chinese wiki)
//  (2) person-section skill-advance items <a href="#/details/<id>"> — a hero-GUIDE detail route that
//      was never mirrored (white/blank screen). Since those guides live in the wiki, send them there.
// Only #/details (person advance) uses that route — news/feature/etc don't — so the rewrite is safe.
// Re-applied on SPA re-render; click intercepted in capture phase (umi hash-routing safety).
const WIKI = '/wiki/';   // unified: wiki links → /wiki section (same domain, same server)

const JS = `(function(){
  var WIKI=${JSON.stringify(WIKI)};
  function fix(){
    try{
      // (1) "Hướng dẫn" nav → wiki clone
      var w=document.querySelectorAll('a[href*="sgzhx-wiki.lingxigames.com"]');
      for(var i=0;i<w.length;i++){ var a=w[i]; if(a.getAttribute('href')!==WIKI){ a.setAttribute('href',WIKI); a.setAttribute('target','_self'); a.removeAttribute('onclick'); } }
      // (2) person skill-advance guide links (#/details/<id>, un-mirrored) → wiki clone
      var d=document.querySelectorAll('a[href^="#/details/"]');
      for(var j=0;j<d.length;j++){ var b=d[j]; b.setAttribute('data-mirror-wikilink','1'); if(b.getAttribute('href')!==WIKI){ b.setAttribute('href',WIKI); b.setAttribute('target','_self'); } }
    }catch(e){}
  }
  if(document.readyState!=='loading')fix(); else document.addEventListener('DOMContentLoaded',fix);
  var mo=new MutationObserver(fix);
  (function s(){ if(document.body)mo.observe(document.body,{childList:true,subtree:true}); else setTimeout(s,50); })();
  var c=0,iv=setInterval(function(){fix(); if(++c>24)clearInterval(iv);},500);

  // umi hash-routing may hijack the click before the browser follows the rewritten href; intercept
  // in the capture phase for our marked links and navigate to the wiki ourselves.
  document.addEventListener('click', function(e){
    try{
      var t=e.target, a=t&&t.closest?t.closest('a[data-mirror-wikilink]'):null;
      if(a){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); window.location.href=WIKI; }
    }catch(err){}
  }, true);
})();`;

export const NEUTER_HTML = `<script data-mirror-neuter="wiki-link">${JS}</script>`;
