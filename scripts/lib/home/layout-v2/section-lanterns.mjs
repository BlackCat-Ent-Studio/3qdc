// section-lanterns.mjs — sky lanterns rising over the home page (replaced the falling snow copied from lyzwlkj.vip).
// The owner's lantern art (3qdc-home-assets\trang-chu-chỉnh sửa\den-khong-minh-frames: 8 flicker frames of one lantern,
// 125ms each) is served as one 8-frame sprite, 128px a frame. Each lantern drifts up from below the screen with a slow
// sway and tilt, flickers on its own phase, and fades out near the top before starting again from the bottom; bigger
// lanterns are nearer: faster and brighter.
// Drawn on one fixed canvas that never takes a click (pointer-events:none) and sits under the header, the mascot, the
// music player and the side bars (z-index 8; they use 9–13). Hidden in the embedded hero page, off the home route
// (html.hv2 removed) and for visitors who ask for reduced motion. Drawing stops whenever the canvas is hidden or the tab
// is in the background.
// Compact layout (phones, touch tablets: COMPACT_MQ) uses the lighter LANTERNS.compact settings and gets a round switch
// in the header, left of the menu button. It starts on, except on weak devices (LANTERNS.weak), and the visitor's choice
// is kept in localStorage; "off" (html.hv2-lan-off) hides the canvas, which stops the drawing. The desktop has no switch.
// LANTERNS.enabled = false removes the effect.

import { COMPACT_MQ } from './compact.mjs';

export const LANTERNS = {
  enabled: true,
  sprite: '/3qdc-vi/home/den-khong-minh/den-khong-minh-sprite.webp',
  frame: 128, frames: 8, frameMs: 125,
  count: 18, minSize: 28, maxSize: 64, maxDpr: 2,
  // phones and touch tablets: fewer, smaller lanterns on a lighter canvas (measured on a Pixel 5 with the CPU 4x slower:
  // 34 fps with the desktop settings, 47 with these)
  compact: { count: 10, minSize: 20, maxSize: 40, maxDpr: 1.5 },
  // px per frame at 60 fps, for the smallest and the biggest lantern
  minSpeed: 0.35, maxSpeed: 1.1,
  // share of the screen height at the top where a lantern fades out
  fadeTop: 0.2,
  // the compact switch starts off where the browser reports at most this much memory (GB, Chrome/Android only) or at
  // most this many CPU cores (Apple devices excluded: Safari does not report the real core count)
  weak: { memory: 2, cores: 4 },
  storeKey: 'hv2-lanterns',
};

const SWITCH_BG = `url(${LANTERNS.sprite}) 0 50%/${LANTERNS.frames * 30}px 30px no-repeat`;

export const LANTERNS_CSS = LANTERNS.enabled ? `
#hv2-lanterns{display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:8}
html.hv2:not(.hv2-embed) #hv2-lanterns{display:block}
#hv2-lan-btn{display:none}
@media ${COMPACT_MQ}{
  html.hv2.hv2-lan-off:not(.hv2-embed) #hv2-lanterns{display:none}
  html.hv2:not(.hv2-embed) #hv2-lan-btn{display:block;position:fixed;top:6px;right:58px;z-index:13;width:44px;height:44px;margin:0;
    padding:0;box-sizing:border-box;border:1px solid #c9a45c;border-radius:10px;background:#0b0f1e;cursor:pointer;
    -webkit-tap-highlight-color:transparent}
  #hv2-lan-btn::before{content:'';position:absolute;left:6px;top:6px;width:30px;height:30px;background:${SWITCH_BG}}
  #hv2-lan-btn[aria-pressed="false"]::before{filter:grayscale(1) brightness(.6)}
  #hv2-lan-btn[aria-pressed="false"]::after{content:'';position:absolute;left:8px;right:8px;top:50%;height:3px;margin-top:-1.5px;
    border-radius:2px;background:#e9d9b0;transform:rotate(-45deg)}
}
@media (prefers-reduced-motion:reduce){html.hv2:not(.hv2-embed) #hv2-lanterns,html.hv2:not(.hv2-embed) #hv2-lan-btn{display:none}}
` : '';

export const LANTERNS_JS = LANTERNS.enabled ? `(function(){
  if (document.documentElement.classList.contains('hv2-embed')) return;
  var CFG = ${JSON.stringify(LANTERNS)};
  var compactMq = window.matchMedia(${JSON.stringify(COMPACT_MQ)});
  var root = document.documentElement;
  function saved(){ try { return localStorage.getItem(CFG.storeKey); } catch (e) { return null; } }
  function weak(){
    var n = navigator, apple = /iPhone|iPad|iPod|Macintosh/.test(n.userAgent);
    return (n.deviceMemory && n.deviceMemory <= CFG.weak.memory) || (!apple && n.hardwareConcurrency && n.hardwareConcurrency <= CFG.weak.cores);
  }
  // the compact switch: saved choice first, otherwise on unless the device is weak
  var on = saved() ? saved() === 'on' : !weak();
  root.classList.toggle('hv2-lan-off', !on);
  function init(){
    var cv = document.createElement('canvas');
    cv.id = 'hv2-lanterns'; cv.setAttribute('aria-hidden', 'true'); cv.setAttribute('data-home-v2', '');
    document.body.appendChild(cv);
    var btn = document.createElement('button');
    btn.id = 'hv2-lan-btn'; btn.type = 'button'; btn.setAttribute('data-home-v2', '');
    function label(){
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Tắt đèn khổng minh' : 'Bật đèn khổng minh');
      btn.title = btn.getAttribute('aria-label');
    }
    label();
    btn.addEventListener('click', function(){
      on = !on;
      try { localStorage.setItem(CFG.storeKey, on ? 'on' : 'off'); } catch (e) {}
      root.classList.toggle('hv2-lan-off', !on);
      label();
    });
    document.body.appendChild(btn);

    var ctx = cv.getContext('2d'), W = 0, H = 0, list = [], raf = 0, last = 0, mode = '';
    var sprite = new Image(); sprite.src = CFG.sprite;
    function set(){ return compactMq.matches ? CFG.compact : CFG; }
    function rnd(a, b){ return a + Math.random() * (b - a); }
    function fit(){
      var dpr = Math.min(window.devicePixelRatio || 1, set().maxDpr);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // depth 0 = far (small, slow, dim), 1 = near
    function reset(l, anywhere){
      var s = set(), d = Math.random();
      l.size = s.minSize + d * (s.maxSize - s.minSize);
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
    // runs only while the canvas is shown (home route, not switched off) and the tab is visible; switching between the
    // desktop and the compact layout (a tablet turned) rebuilds the lanterns with that layout's settings
    function sync(){
      var shown = !document.hidden && cv.offsetWidth > 0, m = compactMq.matches ? 'compact' : 'desktop';
      if (shown && m !== mode){ mode = m; list = []; W = H = 0; }
      if (shown && !raf){
        if (window.innerWidth !== W || window.innerHeight !== H) fit();
        if (!list.length) for (var n = 0; n < set().count; n++){ var l = {}; reset(l, true); list.push(l); }
        last = 0; raf = requestAnimationFrame(frame);
      } else if (!shown && raf){ cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, W, H); }
    }
    window.addEventListener('resize', function(){
      var m = compactMq.matches ? 'compact' : 'desktop';
      if (raf && m !== mode){ cancelAnimationFrame(raf); raf = 0; }
      else if (raf) fit();
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();` : '';
