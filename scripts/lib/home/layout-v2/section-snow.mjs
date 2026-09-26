// section-snow.mjs — snow falling over the home page, as on lyzwlkj.vip (its jQuery "snowfall" plugin: four groups of
// 20 white pixel flakes, 8–20px, falling 1–5px a frame and swaying with a cosine). Redrawn here on one fixed canvas, so
// it needs no jQuery, follows the screen instead of the whole page, never takes a click (pointer-events:none) and sits
// under the header, the mascot, the music player and the side bars (z-index 8; they use 9–13).
// Desktop layout only, like the original: hidden on phones and touch tablets (COMPACT_MQ), in the embedded hero page,
// off the home route (html.hv2 removed) and for visitors who ask for reduced motion. Drawing stops whenever the canvas
// is hidden or the tab is in the background.
// The flake images live in overrides/home/tuyet/. SNOW.enabled = false removes the effect.

import { COMPACT_MQ } from './compact.mjs';

export const SNOW = {
  enabled: true,
  images: ['/3qdc-vi/home/tuyet/bong-tuyet-1.gif', '/3qdc-vi/home/tuyet/bong-tuyet-2.gif'],
  groups: 4, perGroup: 20, minSize: 8, maxSize: 20, minSpeed: 1, maxSpeed: 5,
};

export const SNOW_CSS = SNOW.enabled ? `
#hv2-snow{display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:8}
html.hv2:not(.hv2-embed) #hv2-snow{display:block}
@media ${COMPACT_MQ}{html.hv2:not(.hv2-embed) #hv2-snow{display:none}}
@media (prefers-reduced-motion:reduce){html.hv2:not(.hv2-embed) #hv2-snow{display:none}}
` : '';

export const SNOW_JS = SNOW.enabled ? `(function(){
  if (document.documentElement.classList.contains('hv2-embed')) return;
  var CFG = ${JSON.stringify(SNOW)};
  function init(){
    var cv = document.createElement('canvas');
    cv.id = 'hv2-snow'; cv.setAttribute('aria-hidden', 'true'); cv.setAttribute('data-home-v2', '');
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), W = 0, H = 0, flakes = [], raf = 0, last = 0;
    var imgs = CFG.images.map(function(src){ var i = new Image(); i.src = src; return i; });
    function rnd(a, b){ return Math.round(a + Math.random() * (b - a)); }
    function fit(){
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function reset(f){
      f.size = rnd(CFG.minSize * 100, CFG.maxSize * 100) / 100;
      f.speed = rnd(CFG.minSpeed, CFG.maxSpeed);
      f.x = rnd(0, W); f.y = -f.size; f.step = 0; f.stepSize = rnd(1, 10) / 100;
    }
    function frame(t){
      // speeds are per frame at 60 fps, as in the original; k keeps them the same on 120/144 Hz screens
      var k = last ? Math.min((t - last) / (1000 / 60), 3) : 1;
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++){
        var f = flakes[i];
        f.y += f.speed * k; f.step += f.stepSize * k; f.x += Math.cos(f.step) * k;
        if (f.y > H || f.x < -f.size || f.x > W) reset(f);
        if (f.img.complete && f.img.naturalWidth) ctx.drawImage(f.img, f.x, f.y, f.size, f.size);
      }
      raf = requestAnimationFrame(frame);
    }
    // runs only while the canvas is shown (home route, desktop layout) and the tab is visible
    function sync(){
      var on = !document.hidden && cv.offsetWidth > 0;
      if (on && !raf){
        if (window.innerWidth !== W || window.innerHeight !== H) fit();
        if (!flakes.length) for (var g = 0; g < CFG.groups; g++) for (var n = 0; n < CFG.perGroup; n++){
          var f = { img: imgs[g % imgs.length] }; reset(f); f.y = rnd(0, H); flakes.push(f);
        }
        last = 0; raf = requestAnimationFrame(frame);
      } else if (!on && raf){ cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, W, H); }
    }
    window.addEventListener('resize', function(){ if (raf) fit(); sync(); });
    document.addEventListener('visibilitychange', sync);
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();` : '';
