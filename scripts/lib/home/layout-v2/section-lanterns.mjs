// section-lanterns.mjs — sky lanterns rising over the home page (replaced the falling snow copied from lyzwlkj.vip).
// The owner's lantern art (3qdc-home-assets\trang-chu-chỉnh sửa\den-khong-minh-frames: 8 flicker frames of one lantern,
// 125ms each) is served as one 8-frame sprite, 128px a frame. Each lantern drifts up from below the screen with a slow
// sway and tilt, flickers on its own phase, and fades out near the top before starting again from the bottom; bigger
// lanterns are nearer: faster and brighter.
// Drawn on one fixed canvas that never takes a click (pointer-events:none) and sits under the header, the mascot, the
// music player and the side bars (z-index 8; they use 9–13). Desktop layout only: hidden on phones and touch tablets
// (COMPACT_MQ), in the embedded hero page, off the home route (html.hv2 removed) and for visitors who ask for reduced
// motion. Drawing stops whenever the canvas is hidden or the tab is in the background.
// LANTERNS.enabled = false removes the effect.

import { COMPACT_MQ } from './compact.mjs';

export const LANTERNS = {
  enabled: true,
  sprite: '/3qdc-vi/home/den-khong-minh/den-khong-minh-sprite.webp',
  frame: 128, frames: 8, frameMs: 125,
  count: 18, minSize: 28, maxSize: 64,
  // px per frame at 60 fps, for the smallest and the biggest lantern
  minSpeed: 0.35, maxSpeed: 1.1,
  // share of the screen height at the top where a lantern fades out
  fadeTop: 0.2,
};

export const LANTERNS_CSS = LANTERNS.enabled ? `
#hv2-lanterns{display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:8}
html.hv2:not(.hv2-embed) #hv2-lanterns{display:block}
@media ${COMPACT_MQ}{html.hv2:not(.hv2-embed) #hv2-lanterns{display:none}}
@media (prefers-reduced-motion:reduce){html.hv2:not(.hv2-embed) #hv2-lanterns{display:none}}
` : '';

export const LANTERNS_JS = LANTERNS.enabled ? `(function(){
  if (document.documentElement.classList.contains('hv2-embed')) return;
  var CFG = ${JSON.stringify(LANTERNS)};
  function init(){
    var cv = document.createElement('canvas');
    cv.id = 'hv2-lanterns'; cv.setAttribute('aria-hidden', 'true'); cv.setAttribute('data-home-v2', '');
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), W = 0, H = 0, list = [], raf = 0, last = 0;
    var sprite = new Image(); sprite.src = CFG.sprite;
    function rnd(a, b){ return a + Math.random() * (b - a); }
    function fit(){
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // depth 0 = far (small, slow, dim), 1 = near
    function reset(l, anywhere){
      var d = Math.random();
      l.size = CFG.minSize + d * (CFG.maxSize - CFG.minSize);
      l.speed = CFG.minSpeed + d * (CFG.maxSpeed - CFG.minSpeed);
      l.alpha = 0.55 + 0.45 * d;
      l.x = rnd(0, W - l.size);
      l.y = anywhere ? rnd(0, H) : H + rnd(0, H * 0.3);
      l.step = rnd(0, Math.PI * 2); l.stepSize = rnd(0.008, 0.02); l.sway = rnd(0.2, 0.5);
      l.phase = rnd(0, CFG.frames * CFG.frameMs);
    }
    function frame(t){
      // speeds are per frame at 60 fps; k keeps them the same on 120/144 Hz screens
      var k = last ? Math.min((t - last) / (1000 / 60), 3) : 1;
      last = t;
      ctx.clearRect(0, 0, W, H);
      var ready = sprite.complete && sprite.naturalWidth, fade = H * CFG.fadeTop;
      for (var i = 0; i < list.length; i++){
        var l = list[i];
        l.y -= l.speed * k; l.step += l.stepSize * k; l.x += Math.sin(l.step) * l.sway * k;
        if (l.y < -l.size) reset(l, false);
        if (!ready) continue;
        var f = Math.floor((t + l.phase) / CFG.frameMs) % CFG.frames;
        ctx.globalAlpha = l.alpha * Math.max(0, Math.min(1, (l.y + l.size) / fade));
        ctx.save();
        ctx.translate(l.x + l.size / 2, l.y + l.size / 2);
        ctx.rotate(Math.cos(l.step) * 0.07);
        ctx.drawImage(sprite, f * CFG.frame, 0, CFG.frame, CFG.frame, -l.size / 2, -l.size / 2, l.size, l.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    // runs only while the canvas is shown (home route, desktop layout) and the tab is visible
    function sync(){
      var on = !document.hidden && cv.offsetWidth > 0;
      if (on && !raf){
        if (window.innerWidth !== W || window.innerHeight !== H) fit();
        if (!list.length) for (var n = 0; n < CFG.count; n++){ var l = {}; reset(l, true); list.push(l); }
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
