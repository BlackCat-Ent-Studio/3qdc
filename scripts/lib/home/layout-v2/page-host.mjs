// page-host.mjs — lets a home-page widget (music player, mascot) run on the site's other pages too.
// On the home page the layout script hands its helpers to the widgets as window.__hv2. Elsewhere (news, early sign-up)
// there is no such script, so pageHostJs() writes a small stand-in with the three things the widgets use: el() to
// build elements, compact() for the phone/tablet layout, and onMount() to start once the body exists. It also puts
// pageClass on <html> so the widget's CSS, written for html.hv2, has a selector that applies on those pages.
// The snippet declares PAGE (true away from the home page) and host (the helpers) inside the widget's own function.
import { COMPACT_MQ } from './compact.mjs';

export function pageHostJs(pageClass) {
  return `var PAGE = !window.__hv2;
  var host = window.__hv2 || {
    el: function(tag, attrs, kids){
      var n = document.createElement(tag);
      if (attrs) for (var k in attrs){ if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); }
      (kids || []).forEach(function(c){ if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      return n;
    },
    compact: function(){ return !!(window.matchMedia && matchMedia(${JSON.stringify(COMPACT_MQ)}).matches); },
    onMount: function(fn){
      var go = function(){ document.documentElement.classList.add(${JSON.stringify(pageClass)}); fn(host); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    }
  };`;
}

// "html.hv2:not(.hv2-embed) #x ..." -> the same rule also for "html.<pageClass> #x ..." (every selector in the list)
export function alsoOnPages(css, pageClass) {
  return css.replace(/html\.hv2:not\(\.hv2-embed\) (#[^{,]+)/g, (m, rest) => `${m},html.${pageClass} ${rest}`);
}
