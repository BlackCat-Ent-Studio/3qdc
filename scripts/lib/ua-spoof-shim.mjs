// Single source of the UA-spoof shim used by the mobile internal entry.
// The umi router (wrappers chunk) decides PC vs mobile purely from
// navigator.userAgent (detectmobilebrowsers regex). Spoofing it to an iPhone
// UA makes the app self-route to #/m/fab and HOLD there under any real UA.
// Non-destructive: a separate tagged <script>, injected before umi.js; the
// original bundle is never modified.

export const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Bare IIFE body — also used directly via Playwright addInitScript in the proof.
export const SHIM_JS = `(function(){
  var UA=${JSON.stringify(MOBILE_UA)};
  function def(obj,prop,val){ try{ Object.defineProperty(obj,prop,{get:function(){return val;},configurable:true}); }catch(e){ try{ obj[prop]=val; }catch(_){} } }
  def(navigator,'userAgent',UA);
  def(navigator,'vendor','Apple Computer, Inc.');
  def(navigator,'platform','iPhone');
  def(navigator,'maxTouchPoints',5);
})();`;

// HTML block injected as the FIRST child of <head> (before the rem script + umi.js).
export const SHIM_HTML = `<script data-mirror-shim="ua-mobile">${SHIM_JS}</script>`;
