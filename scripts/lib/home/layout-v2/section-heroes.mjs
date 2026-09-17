// section-heroes.mjs — "Hệ Thống Tướng" block for the home layout-v2 overlay (desktop layout; phones and tablets use
// section-heroes-mobile.mjs).
// The block used to embed the mirrored /tuong hero page in an iframe. It is now built here from the site's own data
// (hero-roster-data.mjs, hero-skills-data.mjs) and artwork (overrides/home/tuong/), drawn exactly like that page did
// inside the frame: background video, red title band, big hero name, the four faction tabs, the vertical hero list with
// up/down arrows, the hero's big portrait and the three in-game skill icons. Nothing is loaded from /tuong or the mirror.
//
// Geometry: the hero page laid its pieces out in vh of its own window (the frame), so every size below is the /tuong CSS
// value in units of the stage height (--hv2-u = stage height / 100) and its rem (stage width / 7.5, for the entrance
// animation). The stage keeps the frame's size: height = window height below the fixed header (at least 560px), width =
// that height x the aspect of the /tuong pane right of its left navigation (17.30475vh wide), centred.
//
// Behaviour measured on /tuong: the selected hero sits in the top slot of a four-slot looping list; an arrow moves one
// slot, a click on an icon brings that hero to the top, the wheel does nothing; a faction tab selects its first hero; the
// name, band, portrait, tabs and skills slide in from below once when the block first appears, later changes are instant.
// The video loads when the block comes near and only plays while it is on screen and the home layout is showing.

import { HERO_SKILLS } from './hero-skills-data.mjs';
import { HERO_FACTIONS, HERO_ART_DIR, HERO_BG_DIR, DEFAULT_FACTION } from './hero-roster-data.mjs';
import { COMPACT_MQ } from './compact.mjs';

const NAV_VH = 0.1730475;
const HEADER_H = 88;
const MIN_STAGE_H = 560;

// a /tuong length in vh -> the same length in this stage
const u = (n) => `calc(var(--hv2-u) * ${n})`;
const S = '#hv2-heroes .hv2-hd';

export const HEROES_CSS = `
/* the big hero name: the bundle's Source Han Serif cut down to Latin + Vietnamese (75KB, draws identically) */
@font-face{font-family:"HvHeroName";src:url("/3qdc-vi/home/han-serif-viet.woff") format("woff")}
#home-v2 #hv2-heroes.hv2-section{max-width:none;padding:72px 0 64px}
#hv2-heroes .hv2-heroes-stage{background:#dfe6f3}
${S}{position:relative;z-index:0;margin:0 auto;overflow:hidden;background:#f5f5f9;color:rgba(0,0,0,.85);font-size:14px;line-height:1.5715}
/* the hero page's UI library sized every box border-box */
${S},${S} *,${S} *:before,${S} *:after{box-sizing:border-box}
${S}-video{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}
${S}-imgbg{position:relative;width:100%;height:100%;overflow:hidden}
${S}-person{width:100%;height:100%}
${S}-title{position:absolute;top:${u(22.05207)};left:0;width:100%;height:${u(11.94487)}}
${S}.is-in .hv2-hd-title{background:url("${HERO_BG_DIR}dai-do.png") no-repeat 50%/cover}
${S}-cv{position:absolute;z-index:10;display:flex;height:${u(34.8392)};bottom:${u(-1.14855)};left:calc(50% - ${u(62.02144)})}
/* /tuong sized Chinese names; the site's Vietnamese overlay (main/i18n-overlay.mjs) set these values for the translated
   names, one word per line, and they are what the block showed */
${S}-name{margin:0;align-self:flex-end;width:min-content;font-size:${u(8)};line-height:1.05;letter-spacing:normal;
  word-break:keep-all;white-space:normal;text-align:center;color:#c01e0c;font-family:"HvHeroName"}
${S}-art{position:relative;z-index:2;width:100%;height:100%;background:no-repeat 50%/cover}
${S}-desc{position:absolute;z-index:10;top:${u(37.13629)};left:calc(50% + ${u(31.77642)});width:${u(42.57274)}}
${S}-advance{position:relative;margin-top:${u(2.29709)}}
${S}-advance-box{display:flex;align-items:center}
${S}-dash{display:block;width:${u(14.62481)};height:${u(0.84227)}}
${S}-sk{display:flex;align-items:center;gap:26px;height:80px}
${S}-sk-item{position:relative;display:block;flex:0 0 auto;width:80px;height:80px;outline:none}
${S}-sk-item img{position:absolute;left:2px;top:2px;width:72px;height:72px;border-radius:50%;object-fit:cover;
  border:3px solid #d6b06a;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:transform .2s ease,border-color .2s ease}
${S}-sk-item:hover img,${S}-sk-item:focus-visible img{border-color:#f3dfa6;transform:scale(1.06)}
${S}-sk-item::after{content:attr(data-name);position:absolute;left:50%;top:calc(100% + 10px);transform:translateX(-50%);
  white-space:nowrap;padding:5px 12px;border-radius:4px;background:rgba(28,12,12,.88);color:#f3dfa6;font-size:14px;line-height:1.3;
  opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:5}
${S}-sk-item:hover::after,${S}-sk-item:focus-visible::after{opacity:1}
${S}.is-narrow .hv2-hd-sk{gap:14px;height:72px}
${S}.is-narrow .hv2-hd-sk-item{width:72px;height:72px}
${S}.is-narrow .hv2-hd-sk-item img{width:64px;height:64px}
${S}-battle{position:absolute;z-index:10;top:${u(37.90199)};left:calc(50% - ${u(73.50689)})}
${S}-tabs{position:relative;z-index:2;display:flex;align-items:center}
${S}-tab{position:relative;display:block;width:${u(7.35069)};height:${u(8.49923)};margin:0 ${u(2.67994)} 0 0;padding:0;border:0;
  background:none;cursor:pointer}
${S}-tab:before{content:"";position:absolute;top:50%;left:${u(-2.67994)};width:${u(2.67994)};border-bottom:${u(0.15314)} dashed #ccc}
${S}-tab:first-child:before{left:${u(-68.91271)};width:${u(68.91271)}}
${S}-tab img{display:block;width:100%;height:auto}
${S}-tab img+img,${S}-tab:hover img:first-child{display:none}
${S}-tab:hover img+img{display:block}
/* the list stands under the selected faction tab: /tuong moved it one tab pitch (7.35069 + 2.67994vh) per faction,
   0.97863vh left of that tab (measured at four window sizes); the script sets the faction index in --hv2-f */
${S}-list{position:absolute;top:${u(4.21133)};left:calc(var(--hv2-u) * (var(--hv2-f, 1) * 10.03063 - 0.97863));
  display:flex;align-items:center;justify-content:center;
  width:${u(9.26493)};height:${u(40.73507)};padding-top:${u(5.20674)};overflow:hidden}
${S}.is-in .hv2-hd-list{background:url("${HERO_BG_DIR}khung-cot-tuong.png") no-repeat;background-size:100% 100%}
${S}-box{position:relative}
${S}-arrow{position:absolute;left:calc(50% - ${u(1.53139)});width:${u(3.06279)};height:${u(1.99081)};padding:0;border:0;cursor:pointer;
  background:no-repeat;background-size:100% 100%}
${S}.is-in .hv2-hd-arrow{background-image:url("${HERO_BG_DIR}mui-ten.png")}
${S}.is-in .hv2-hd-arrow:hover{background-image:url("${HERO_BG_DIR}mui-ten-hover.png")}
${S}-arrow.is-prev{top:${u(-2.90965)}}
${S}-arrow.is-next{bottom:${u(-2.29709)};transform:rotate(180deg)}
${S}-view{width:${u(7.27412)};height:${u(28.7902)};overflow:hidden}
${S}-track{transition:transform .3s ease}
${S}-track.no-anim{transition:none}
${S}-item{display:block;width:100%;height:${u(7.19755)};padding:0;border:0;background:none;cursor:pointer}
${S}-item img{display:block;width:${u(6.27871)};height:${u(6.27871)};margin:0 auto}
${S}-item.is-on{background:url("${HERO_BG_DIR}khung-tuong-chon.png") no-repeat 50% 0;background-size:${u(7.27412)} ${u(7.12098)}}
${S}-item.is-on img{position:relative;z-index:-1}
@keyframes hv2-hd-in{0%{transform:translateY(calc(var(--hv2-rem) * 10));opacity:0}100%{transform:translateY(0);opacity:1}}
${S}-cv,${S}-art,${S}-desc,${S}-battle{opacity:0}
${S}.is-in .hv2-hd-cv{opacity:1;animation:hv2-hd-in .5s cubic-bezier(.25,.46,.45,.94) .3s both}
${S}.is-in .hv2-hd-art{opacity:1;animation:hv2-hd-in .5s cubic-bezier(.25,.46,.45,.94) .6s both}
${S}.is-in .hv2-hd-desc,${S}.is-in .hv2-hd-battle{opacity:1;animation:hv2-hd-in .5s cubic-bezier(.25,.46,.45,.94) .9s both}
@media (prefers-reduced-motion:reduce){
  ${S}.is-in .hv2-hd-cv,${S}.is-in .hv2-hd-art,${S}.is-in .hv2-hd-desc,${S}.is-in .hv2-hd-battle{animation:none}
  ${S}-track{transition:none}
}
@media ${COMPACT_MQ}{
  #home-v2 #hv2-heroes.hv2-section{max-width:720px;padding:40px max(16px,env(safe-area-inset-left)) 36px}
  #hv2-heroes .hv2-heroes-stage{display:none}
}
`;

export const HEROES_JS = `(function(){
  if (!window.__hv2) return;
  var FACTIONS = ${JSON.stringify(HERO_FACTIONS)};
  var DEFAULT_FACTION = ${DEFAULT_FACTION};
  var ART = ${JSON.stringify(HERO_ART_DIR)}, BG = ${JSON.stringify(HERO_BG_DIR)};
  // hero name (Vietnamese) -> [game hero id, Thường name, Kỹ name, Nộ name]
  var SKILLS = ${JSON.stringify(HERO_SKILLS)};
  var SLOTS = ['thuong', 'ky', 'no'];
  var VISIBLE = 4;
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-heroes');
    if (!host) return;
    var el = api.el;
    var compact = api.compact || function(){ return false; };

    var video = el('video', { 'class': 'hv2-hd-video', muted: '', loop: '', playsinline: '', preload: 'none', 'aria-hidden': 'true' });
    video.muted = true;
    var name = el('p', { 'class': 'hv2-hd-name' });
    var cv = el('div', { 'class': 'hv2-hd-cv' }, [name]);
    var title = el('div', { 'class': 'hv2-hd-title' }, [cv]);
    var art = el('div', { 'class': 'hv2-hd-art', role: 'img' });
    var skills = el('div', { 'class': 'hv2-hd-sk' });
    var dash = el('img', { 'class': 'hv2-hd-dash', alt: '', src: BG + 'net-gach.png' });
    var desc = el('div', { 'class': 'hv2-hd-desc' }, [el('div', { 'class': 'hv2-hd-advance' }, [el('div', { 'class': 'hv2-hd-advance-box' }, [skills, dash])])]);
    var person = el('div', { 'class': 'hv2-hd-person' }, [title, art, desc]);
    var tabs = el('div', { 'class': 'hv2-hd-tabs', role: 'group', 'aria-label': 'Phe' });
    var track = el('div', { 'class': 'hv2-hd-track' });
    var view = el('div', { 'class': 'hv2-hd-view' }, [track]);
    var prev = el('button', { type: 'button', 'class': 'hv2-hd-arrow is-prev', 'aria-label': 'Tướng trước' });
    var next = el('button', { type: 'button', 'class': 'hv2-hd-arrow is-next', 'aria-label': 'Tướng sau' });
    var list = el('div', { 'class': 'hv2-hd-list' }, [el('div', { 'class': 'hv2-hd-box' }, [prev, view, next])]);
    var battle = el('div', { 'class': 'hv2-hd-battle' }, [tabs, list]);
    var box = el('div', { 'class': 'hv2-hd', role: 'region', 'aria-label': 'Hệ Thống Tướng' }, [video, el('div', { 'class': 'hv2-hd-imgbg' }, [person, battle])]);
    var stage = el('div', { 'class': 'hv2-heroes-stage' }, [box]);
    host.appendChild(stage);
    api.ready('hv2-heroes');

    // stage size = the old frame size; the /tuong vh and rem become stage units
    function size(){
      var vh = window.innerHeight;
      var h = Math.max(${MIN_STAGE_H}, vh - ${HEADER_H});
      var w = Math.min(stage.clientWidth || window.innerWidth, Math.round(h * (window.innerWidth - ${NAV_VH} * vh) / vh));
      box.style.height = h + 'px';
      box.style.width = w + 'px';
      box.style.setProperty('--hv2-u', (h / 100) + 'px');
      box.style.setProperty('--hv2-rem', (w / 7.5) + 'px');
      box.classList.toggle('is-narrow', w <= 1200);
    }
    size();
    var resizeTimer = null;
    window.addEventListener('resize', function(){ clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 150); });

    var faction = DEFAULT_FACTION, hero = 0, pos = 0, heroes = [];
    function heroAt(i){ var n = heroes.length; return heroes[((i % n) + n) % n]; }
    function path(h, file){ return ART + h[0] + '/' + file; }

    FACTIONS.forEach(function(f, i){
      var t = el('button', { type: 'button', 'class': 'hv2-hd-tab', 'aria-label': f.label, 'aria-pressed': 'false' }, [el('img', { alt: '' }), el('img', { alt: '', src: '/3qdc-vi/home/' + f.tab + '-hover-dang-chon.png' })]);
      t.addEventListener('click', function(){ if (i !== faction) selectFaction(i); });
      tabs.appendChild(t);
    });

    function paintTabs(){
      for (var i = 0; i < tabs.children.length; i++){
        var on = i === faction, img = tabs.children[i].firstChild;
        var src = '/3qdc-vi/home/' + FACTIONS[i].tab + (on ? '-hover-dang-chon.png' : '-thuong.png');
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        tabs.children[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }

    // the list holds the faction three times over, so it can move a slot past either end and then jump back to the middle copy
    function buildList(){
      track.textContent = '';
      for (var c = 0; c < 3; c++) heroes.forEach(function(h, k){
        var b = el('button', { type: 'button', 'class': 'hv2-hd-item', 'aria-label': h[2], tabindex: c === 1 ? '0' : '-1' }, [el('img', { alt: '', src: path(h, 'icon.png'), draggable: 'false' })]);
        b.addEventListener('click', function(){ move(c * heroes.length + k); });
        track.appendChild(b);
      });
    }
    function place(i, animate){
      pos = i;
      track.classList.toggle('no-anim', !animate);
      track.style.transform = 'translateY(calc(var(--hv2-u) * ' + (-7.19755 * i) + '))';
    }
    function paintList(){
      for (var i = 0; i < track.children.length; i++){
        var on = (i % heroes.length) === hero, item = track.children[i], img = item.firstChild, h = heroes[i % heroes.length];
        item.classList.toggle('is-on', on);
        var src = path(h, on ? 'icon-on.png' : 'icon.png');
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      }
    }
    function move(i){
      hero = ((i % heroes.length) + heroes.length) % heroes.length;
      place(i, true);
      paintHero();
    }
    track.addEventListener('transitionend', function(){
      var n = heroes.length, mid = n + hero;
      if (pos !== mid) place(mid, false);
    });

    function selectFaction(i){
      faction = i;
      heroes = FACTIONS[i].heroes;
      hero = 0;
      battle.style.setProperty('--hv2-f', i);
      paintTabs();
      buildList();
      place(heroes.length, false);
      paintHero();
    }

    function paintHero(){
      var h = heroes[hero];
      name.textContent = h[2];
      art.style.backgroundImage = 'url("' + path(h, 'pc.png') + '")';
      art.setAttribute('aria-label', h[2]);
      paintList();
      paintSkills(h[2]);
      // warm the next portraits so an arrow click paints at once
      [hero + 1, hero - 1].forEach(function(k){ new Image().src = path(heroAt(k), 'pc.png'); });
    }

    function paintSkills(shown){
      var entry = Object.prototype.hasOwnProperty.call(SKILLS, shown) ? SKILLS[shown] : null;
      skills.textContent = '';
      if (!entry){ console.warn('hero skills: no in-game skills for', shown); return; }
      SLOTS.forEach(function(slot, i){
        var text = entry[i + 1] || 'Đang cập nhật';
        skills.appendChild(el('span', { 'class': 'hv2-hd-sk-item', tabindex: '0', role: 'img', 'aria-label': text, 'data-name': text },
          [el('img', { alt: '', src: '/3qdc-vi/home/hero-skills/' + entry[0] + '/' + slot + '.png' })]));
      });
    }

    prev.addEventListener('click', function(){ move(pos - 1); });
    next.addEventListener('click', function(){ move(pos + 1); });
    // the list only moves by its transform: focusing a hidden icon (keyboard) must not scroll the clipped view instead
    view.addEventListener('scroll', function(){ if (view.scrollTop) view.scrollTop = 0; });
    track.addEventListener('focusin', function(e){
      var i = Array.prototype.indexOf.call(track.children, e.target);
      if (i >= 0 && (i < pos || i >= pos + VISIBLE)) move(i);
    });

    // first appearance: content, entrance animation and the background video; the video plays only while visible
    var started = false, onScreen = false;
    function start(){
      if (started || compact()) return;
      started = true;
      size();
      selectFaction(faction);
      video.src = BG + 'video-nen.mp4';
      requestAnimationFrame(function(){ box.classList.add('is-in'); });
      syncVideo();
    }
    function syncVideo(){
      if (!started) return;
      var play = onScreen && !document.hidden && !compact() && document.documentElement.classList.contains('hv2');
      if (play){ var p = video.play(); if (p && p.catch) p.catch(function(){}); }
      else if (!video.paused) video.pause();
    }
    document.addEventListener('visibilitychange', syncVideo);
    window.addEventListener('hashchange', function(){ size(); syncVideo(); });
    if (api.compactQuery){
      var onCompact = function(){ if (!compact()){ size(); if (onScreen) start(); } syncVideo(); };
      if (api.compactQuery.addEventListener) api.compactQuery.addEventListener('change', onCompact);
      else if (api.compactQuery.addListener) api.compactQuery.addListener(onCompact);
    }
    if (!('IntersectionObserver' in window)){ onScreen = true; start(); return; }
    // near: build and start loading (400px ahead, as the frame did); on screen: play the video. The sections above render
    // late, so the page is short when it opens and this block looks near: judge the distance once the visitor scrolls.
    var io = new IntersectionObserver(function(entries){
      if (entries.some(function(e){ return e.isIntersecting; })){ onScreen = true; start(); } else onScreen = false;
      syncVideo();
    }, { rootMargin: '400px 0px' });
    var arm = function(){ io.observe(stage); };
    if (window.scrollY > 0) arm(); else window.addEventListener('scroll', arm, { once: true, passive: true });
  });
})();`;
