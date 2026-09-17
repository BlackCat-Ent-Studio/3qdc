// section-heroes-mobile.mjs — "Hệ Thống Tướng" block of the home page in the compact layout (phones, touch tablets, narrow
// windows; see compact.mjs).
// The desktop block embeds the /tuong hero page, which is laid out for a wide screen; in the compact layout that frame is
// not loaded (section-heroes.mjs) and this block is shown instead: the four faction tabs (Vietnamese artwork), the current
// hero's portrait with the name and position, arrows and a sideways swipe to change hero, the three in-game skills with
// their names written under the icons (no hover on a touch screen), and a strip of the faction's hero icons.
//
// Data: the site's own hero roster (hero-roster-data.mjs: 4 factions x 13 heroes with their Vietnamese names) and artwork
// in overrides/home/tuong/<rowId>/ — the portrait made for phones (mobile.png, 750x1624 with a transparent background) and
// the round icons (icon.png grey, icon-on.png for the selected hero). The skills are looked up by the Vietnamese name, as
// in the desktop block (HERO_SKILLS, hero-skills-data.mjs). Nothing is loaded from the mirror.

import { HERO_SKILLS } from './hero-skills-data.mjs';
import { HERO_FACTIONS, HERO_ART_DIR, DEFAULT_FACTION } from './hero-roster-data.mjs';
import { COMPACT_MQ } from './compact.mjs';


export const HEROES_MOBILE_CSS = `
#hv2-heroes .hv2-hm{display:none}
@media ${COMPACT_MQ}{
  #hv2-heroes .hv2-hm{display:block;overflow:hidden;border-radius:14px;border:1px solid rgba(214,176,106,.45);
    background:linear-gradient(180deg,#f1f4fa 0,#d9e1ef 70%,#c9d3e6 100%)}
  #hv2-heroes .hv2-hm-tabs{display:flex;justify-content:center;gap:10px;padding:12px 8px 4px}
  #hv2-heroes .hv2-hm-tab{display:block;width:56px;height:65px;padding:0;border:0;background:none;cursor:pointer;
    -webkit-tap-highlight-color:transparent}
  #hv2-heroes .hv2-hm-tab img{display:block;width:100%;height:100%;object-fit:contain}
  /* 3:4 and about 70% of the window height on a tall screen; on a phone turned sideways it keeps at least 320px of width
     (the portrait then runs a little past the window height rather than shrinking to a sliver) */
  #hv2-heroes .hv2-hm-stage{position:relative;aspect-ratio:3/4;width:min(100%,max(320px,calc(70vh * .75)));margin:0 auto;overflow:hidden;touch-action:pan-y pinch-zoom}
  #hv2-heroes .hv2-hm-art{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:50% 46%;
    transition:opacity .35s ease;user-select:none;-webkit-user-drag:none}
  #hv2-heroes .hv2-hm-art.is-loading{opacity:.15}
  #hv2-heroes .hv2-hm-name{position:absolute;left:0;top:14px;max-width:78%;padding:6px 18px 8px 14px;box-sizing:border-box;
    background:linear-gradient(90deg,#8e1d1d 0,#a3302a 70%,rgba(163,48,42,0) 100%);color:#fff;
    font-family:"HvHeroName","Segoe UI",Roboto,Arial,sans-serif;font-size:clamp(24px,7vw,32px);line-height:1.15;
    text-shadow:0 1px 2px rgba(0,0,0,.35)}
  #hv2-heroes .hv2-hm-count{position:absolute;right:12px;top:20px;padding:2px 10px;border-radius:12px;
    background:rgba(8,10,22,.55);color:#f3dfa6;font-size:13px;line-height:20px}
  #hv2-heroes .hv2-hm-nav{position:absolute;top:50%;z-index:2;display:flex;align-items:center;justify-content:center;
    width:44px;height:44px;margin-top:-22px;padding:0 0 4px;box-sizing:border-box;border-radius:50%;
    border:1px solid #b88a3c;background:rgba(255,255,255,.8);color:#8e1d1d;font-size:30px;line-height:1;cursor:pointer}
  #hv2-heroes .hv2-hm-nav.is-left{left:8px}
  #hv2-heroes .hv2-hm-nav.is-right{right:8px}
  #hv2-heroes .hv2-hm-foot{background:rgba(8,10,22,.94);border-top:1px solid rgba(214,176,106,.4)}
  #hv2-heroes .hv2-hm-skills{display:flex;justify-content:center;gap:12px;min-height:106px;padding:12px 8px 6px;box-sizing:border-box}
  #hv2-heroes .hv2-hm-skills[hidden]{display:flex;visibility:hidden}
  #hv2-heroes .hv2-hm-sk{display:flex;flex-direction:column;align-items:center;gap:6px;width:92px;margin:0}
  #hv2-heroes .hv2-hm-sk img{width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid #d6b06a;
    box-shadow:0 2px 8px rgba(0,0,0,.4)}
  #hv2-heroes .hv2-hm-sk figcaption{color:#f3dfa6;font-size:12.5px;line-height:1.25;text-align:center;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  #hv2-heroes .hv2-hm-sk small{display:block;color:#9b927c;font-size:11px}
  #hv2-heroes .hv2-hm-strip{display:flex;gap:8px;overflow-x:auto;padding:8px 12px 14px;scrollbar-width:none;
    -webkit-overflow-scrolling:touch}
  #hv2-heroes .hv2-hm-strip::-webkit-scrollbar{display:none}
  #hv2-heroes .hv2-hm-thumb{flex:0 0 auto;width:48px;height:48px;padding:0;border:2px solid rgba(214,176,106,.25);border-radius:10px;
    overflow:hidden;background:#1b1f36;cursor:pointer}
  #hv2-heroes .hv2-hm-thumb img{display:block;width:100%;height:100%;object-fit:cover}
  #hv2-heroes .hv2-hm-thumb.is-on{border-color:#f3dfa6;box-shadow:0 0 0 2px rgba(243,223,166,.35)}
  #hv2-heroes .hv2-hm-empty{padding:40px 16px;text-align:center;color:#5d6478}
}
@media (prefers-reduced-motion:reduce){
  #hv2-heroes .hv2-hm-art{transition:none}
}
`;

export const HEROES_MOBILE_JS = `(function(){
  if (!window.__hv2) return;
  var FACTIONS = ${JSON.stringify(HERO_FACTIONS)};
  var DEFAULT_FACTION = ${DEFAULT_FACTION};
  var ART = ${JSON.stringify(HERO_ART_DIR)};
  // hero name as shown (translated) -> [game hero id, Thường name, Kỹ name, Nộ name]
  var SKILLS = ${JSON.stringify(HERO_SKILLS)};
  var SLOTS = [['thuong', 'Thường'], ['ky', 'Kỹ'], ['no', 'Nộ']];
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-heroes');
    if (!host || !api.compact) return;
    var el = api.el;

    var tabs = el('div', { 'class': 'hv2-hm-tabs', role: 'group', 'aria-label': 'Phe' });
    var art = el('img', { 'class': 'hv2-hm-art', alt: '', draggable: 'false' });
    var name = el('div', { 'class': 'hv2-hm-name' });
    var count = el('div', { 'class': 'hv2-hm-count' });
    var prev = el('button', { type: 'button', 'class': 'hv2-hm-nav is-left', 'aria-label': 'Tướng trước', text: '\\u2039' });
    var next = el('button', { type: 'button', 'class': 'hv2-hm-nav is-right', 'aria-label': 'Tướng sau', text: '\\u203a' });
    var stage = el('div', { 'class': 'hv2-hm-stage' }, [art, name, count, prev, next]);
    var skills = el('div', { 'class': 'hv2-hm-skills', hidden: '' });
    var strip = el('div', { 'class': 'hv2-hm-strip', role: 'group', 'aria-label': 'Danh sách tướng' });
    var box = el('div', { 'class': 'hv2-hm' }, [tabs, stage, el('div', { 'class': 'hv2-hm-foot' }, [skills, strip])]);
    host.appendChild(box);

    var faction = DEFAULT_FACTION, heroes = [], hero = 0, cache = {}, started = false;
    FACTIONS.forEach(function(f, i){
      var b = el('button', { type: 'button', 'class': 'hv2-hm-tab', 'aria-pressed': 'false' }, [el('img', { alt: '' })]);
      // the selected faction again only when its list failed to load (a retry)
      b.addEventListener('click', function(){ if (i !== faction || !heroes.length){ started = true; selectFaction(i); } });
      tabs.appendChild(b);
    });
    function paintTabs(){
      for (var i = 0; i < tabs.children.length; i++){
        var on = i === faction, b = tabs.children[i], img = b.firstChild;
        var src = '/3qdc-vi/home/' + FACTIONS[i].tab + (on ? '-hover-dang-chon.png' : '-thuong.png');
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    // tab labels for screen readers (the artwork carries the Vietnamese faction names)
    ['Ngụy', 'Ngô', 'Thục', 'Quần'].forEach(function(label, i){ tabs.children[i].setAttribute('aria-label', label); });

    function load(i){
      if (!cache[i]) cache[i] = Promise.resolve(FACTIONS[i].heroes.map(function(h){
        var dir = ART + h[0] + '/';
        return { name: h[2], art: dir + 'mobile.png', icon: dir + 'icon.png', iconOn: dir + 'icon-on.png' };
      }));
      return cache[i];
    }

    function selectFaction(i){
      faction = i;
      paintTabs();
      return load(i).then(function(list){
        if (faction !== i) return;
        heroes = list;
        strip.textContent = '';
        if (!list.length){
          art.removeAttribute('src'); name.textContent = ''; count.textContent = ''; skills.hidden = true;
          strip.appendChild(el('div', { 'class': 'hv2-hm-empty', text: 'Chưa có dữ liệu' }));
          return;
        }
        list.forEach(function(h, k){
          var t = el('button', { type: 'button', 'class': 'hv2-hm-thumb', 'aria-pressed': 'false', 'aria-label': 'Tướng ' + (k + 1) },
            [el('img', { src: h.icon, alt: '', loading: 'lazy' })]);
          t.addEventListener('click', function(){ selectHero(k); });
          strip.appendChild(t);
        });
        selectHero(0);
      });
    }

    function selectHero(k){
      if (!heroes.length) return;
      hero = ((k % heroes.length) + heroes.length) % heroes.length;
      var h = heroes[hero];
      if (art.getAttribute('src') !== h.art){
        art.classList.add('is-loading');
        art.onload = art.onerror = function(){ art.classList.remove('is-loading'); };
        art.setAttribute('src', h.art);
      }
      name.textContent = h.name;
      count.textContent = (hero + 1) + ' / ' + heroes.length;
      for (var i = 0; i < strip.children.length; i++){
        var t = strip.children[i], on = i === hero, img = t.firstChild, hh = heroes[i];
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (img && hh){ var src = on && hh.iconOn ? hh.iconOn : hh.icon; if (img.getAttribute('src') !== src) img.setAttribute('src', src); }
      }
      var cur = strip.children[hero];
      if (cur){
        // keep the selected icon in view inside the strip only (scrollIntoView would also scroll the page)
        var left = cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2;
        strip.scrollTo ? strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' }) : (strip.scrollLeft = Math.max(0, left));
      }
      // warm the neighbours' portraits so the next swipe paints at once
      [hero + 1, hero - 1].forEach(function(n){ var nb = heroes[(n + heroes.length) % heroes.length]; if (nb) new Image().src = nb.art; });
      paintSkills();
    }

    function paintSkills(){
      var shown = (name.textContent || '').trim();
      var entry = Object.prototype.hasOwnProperty.call(SKILLS, shown) ? SKILLS[shown] : null;
      if (!entry){ skills.hidden = true; return; }
      if (skills.children.length !== SLOTS.length){
        skills.textContent = '';
        SLOTS.forEach(function(){ skills.appendChild(el('figure', { 'class': 'hv2-hm-sk' }, [el('img', { alt: '' }), el('figcaption')])); });
      }
      SLOTS.forEach(function(slot, i){
        var fig = skills.children[i], img = fig.firstChild, cap = fig.lastChild;
        var src = '/3qdc-vi/home/hero-skills/' + entry[0] + '/' + slot[0] + '.png';
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        var text = entry[i + 1] || 'Đang cập nhật';
        if (cap.getAttribute('data-name') !== text){
          cap.setAttribute('data-name', text);
          cap.textContent = '';
          cap.appendChild(el('small', { text: slot[1] }));
          cap.appendChild(document.createTextNode(text));
        }
      });
      skills.hidden = false;
    }
    new MutationObserver(paintSkills).observe(name, { childList: true, characterData: true, subtree: true });

    prev.addEventListener('click', function(){ selectHero(hero - 1); });
    next.addEventListener('click', function(){ selectHero(hero + 1); });
    api.swipe(stage, function(){ selectHero(hero + 1); }, function(){ selectHero(hero - 1); });

    // load the first faction only on the compact layout, once the block comes near the viewport (after the first scroll)
    // (the tab artwork is only fetched here, so a desktop window never downloads it)
    function start(){
      if (started || !api.compact()) return;
      started = true;
      selectFaction(faction);
    }
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        if (!entries.some(function(e){ return e.isIntersecting; })) return;
        if (!api.compact()) return;
        io.disconnect();
        start();
      }, { rootMargin: '600px 0px' });
      var arm = function(){ io.observe(host); };
      if (window.scrollY > 0) arm(); else window.addEventListener('scroll', arm, { once: true, passive: true });
    } else start();
    // a window narrowed to the compact width after the page opened shows the block with its data
    if (api.compactQuery){
      var onCompact = function(){ if (api.compact() && window.scrollY > 0) start(); };
      if (api.compactQuery.addEventListener) api.compactQuery.addEventListener('change', onCompact);
      else if (api.compactQuery.addListener) api.compactQuery.addListener(onCompact);
    }
  });
})();`;
