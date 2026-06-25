// bbs-shim.mjs — the fans (同人) page builds its forum API host at runtime
// (`https://p10488-bbs.ejoy.com/...`) so static URL-rewrite can't catch it and
// the live request fails CORS. Patch fetch + XMLHttpRequest at runtime to strip
// that host → same-origin, so the server serves the captured snapshot. Must run
// BEFORE the umi bundle, so it is injected as an early <head> child.

const SHIM_JS = `(function(){
  var H=/https?:\\/\\/p10488-bbs\\.ejoy\\.com/g;
  try{
    var of=window.fetch;
    if(of){ window.fetch=function(i,init){ try{ if(typeof i==='string'){i=i.replace(H,'');} else if(i&&i.url){i=new Request(i.url.replace(H,''),i);} }catch(e){} return of.call(this,i,init); }; }
    var oo=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(m,u){ try{ if(typeof u==='string')u=u.replace(H,''); }catch(e){} return oo.apply(this,[m,u].concat([].slice.call(arguments,2))); };
  }catch(e){}
})();`;

export const BBS_SHIM_HTML = `<script data-mirror-bbs-shim>${SHIM_JS}</script>`;
