// neuter-links.mjs — wiki header cross-link. The "home/house" icon in the top nav is an
// <a class="star-cj-nav__outlink" href="https://sgzhx.lingxigames.com/#/index"> pointing at the
// ORIGINAL Chinese home. Rewrite it to the deployed home clone. Re-applied on SPA re-render.
// (Only this one button is touched; other outbound links left as-is.)
const HOME = '/home';   // unified: wiki "home" icon → home section (same domain)

const JS = `(function(){
  var HOME=${JSON.stringify(HOME)};
  function fix(){
    try{
      var as=document.querySelectorAll('a.star-cj-nav__outlink[href]');
      for(var i=0;i<as.length;i++){
        var a=as[i], h=a.getAttribute('href')||'';
        if(h.indexOf('lingxigames.com/#/index')>-1 || /#\\/index$/.test(h)){
          if(a.getAttribute('href')!==HOME){ a.setAttribute('href',HOME); a.setAttribute('target','_self'); a.removeAttribute('onclick'); }
        }
      }
    }catch(e){}
  }
  if(document.readyState!=='loading')fix(); else document.addEventListener('DOMContentLoaded',fix);
  var mo=new MutationObserver(fix);
  (function s(){ if(document.body)mo.observe(document.body,{childList:true,subtree:true}); else setTimeout(s,50); })();
  var c=0,iv=setInterval(function(){fix(); if(++c>20)clearInterval(iv);},500);
})();`;

export const NEUTER_HTML = `<script data-mirror-neuter="home-link">${JS}</script>`;
