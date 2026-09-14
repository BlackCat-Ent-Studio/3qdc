// section-heroes.mjs — "Hệ Thống Tướng" block for the home layout-v2 overlay.
// Faction buttons on the left, a wide portrait stage, and a strip of the faction's
// 13 hero avatars. Data comes from the per-faction hero-list snapshots the /tuong page
// already uses; only the 新官网* art is used because it is fully present in the mirror
// (the older PC立绘 set mostly lives on an external CDN). Names are rendered raw and
// translated by the i18n overlay already on the page.

const FACTIONS = [
  ['Ngụy', 'endpoint.json__b2412ba824b4fd564'],
  ['Thục', 'endpoint.json__b0f7c9532ef86b683'],
  ['Ngô', 'endpoint.json__beff936f54393802f'],
  ['Quần Hùng', 'endpoint.json__bd6ddfa18119474ba'],
];

export const HEROES_CSS = `
#hv2-heroes .hv2-heroes{display:grid;grid-template-columns:120px minmax(0,1fr);gap:24px}
#hv2-heroes .hv2-factions{display:flex;flex-direction:column;justify-content:center;gap:12px}
#hv2-heroes .hv2-faction{width:100px;height:100px;border-radius:50%;border:2px solid rgba(214,176,106,.55);
  background:radial-gradient(circle at 50% 40%,#2c3256,#12152a);color:#f3dfa6;font-size:19px;font-weight:800;
  line-height:1.15;cursor:pointer;transition:transform .2s ease}
#hv2-heroes .hv2-faction:hover{transform:scale(1.05)}
#hv2-heroes .hv2-faction.is-on{background:radial-gradient(circle at 50% 40%,#e8a23a,#8f2a16);border-color:#f3dfa6;color:#fff}
#hv2-heroes .hv2-stage{position:relative;aspect-ratio:2560/1306;border-radius:14px;overflow:hidden;
  border:1px solid rgba(214,176,106,.35);
  background:radial-gradient(ellipse at 50% 62%,rgba(243,197,106,.22),rgba(243,197,106,0) 58%),linear-gradient(180deg,#1b2040,#0b0d18)}
#hv2-heroes .hv2-portrait{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .35s ease}
#hv2-heroes .hv2-portrait.is-on{opacity:1}
#hv2-heroes .hv2-plate{position:absolute;left:28px;bottom:24px;padding:10px 22px;border-radius:8px;
  background:linear-gradient(90deg,rgba(143,42,22,.92),rgba(143,42,22,0));color:#fff}
#hv2-heroes .hv2-plate:empty,#hv2-heroes .hv2-plate.is-empty{display:none}
#hv2-heroes .hv2-plate small{display:block;color:#f3dfa6;font-size:14px;letter-spacing:.08em;text-transform:uppercase}
#hv2-heroes .hv2-plate strong{display:block;font-size:38px;line-height:1.15;text-shadow:0 2px 6px rgba(0,0,0,.6)}
#hv2-heroes .hv2-detail{position:absolute;right:24px;bottom:24px;padding:10px 20px;border:1px solid #f3dfa6;border-radius:8px;
  background:rgba(8,10,22,.6);color:#f3dfa6;text-decoration:none}
#hv2-heroes .hv2-detail:hover{background:rgba(214,176,106,.2)}
/* one row of 13 equal columns at every desktop width (avatars shrink below 64px if needed) */
#hv2-heroes .hv2-strip{grid-column:2;display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:10px 6px;margin-top:18px}
#hv2-heroes .hv2-avatar{min-width:0;padding:0;border:0;background:transparent;color:#bfb59a;font-size:12px;cursor:pointer}
#hv2-heroes .hv2-avatar-img{position:relative;display:block;width:min(64px,100%);aspect-ratio:1;margin:0 auto 4px;
  border-radius:50%;overflow:hidden;border:2px solid rgba(214,176,106,.3);background:#12152a;box-sizing:border-box}
#hv2-heroes .hv2-avatar-img img{position:absolute;inset:0;width:100%;height:100%}
#hv2-heroes .hv2-avatar-img .is-hover{opacity:0}
#hv2-heroes .hv2-avatar:hover .is-hover,#hv2-heroes .hv2-avatar.is-on .is-hover{opacity:1}
#hv2-heroes .hv2-avatar.is-on .hv2-avatar-img{border-color:#f3dfa6;box-shadow:0 0 12px rgba(243,197,106,.55)}
#hv2-heroes .hv2-avatar.is-on{color:#f3dfa6}
#hv2-heroes .hv2-avatar-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hv2-heroes .hv2-empty{grid-column:1/-1;padding:24px;color:#9b927c;text-align:center}
`;

export const HEROES_JS = `(function(){
  if (!window.__hv2) return;
  var FACTIONS = ${JSON.stringify(FACTIONS)};
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-heroes');
    if (!host) return;
    var el = api.el;

    var factionBar = el('div', { 'class': 'hv2-factions' });
    var portrait = el('img', { 'class': 'hv2-portrait', alt: '' });
    var plateFaction = el('small');
    var plateName = el('strong');
    var plate = el('div', { 'class': 'hv2-plate is-empty' }, [plateFaction, plateName]);
    var stage = el('div', { 'class': 'hv2-stage' }, [
      portrait, plate, el('a', { 'class': 'hv2-detail', href: '/tuong', text: 'Xem chi tiết' })
    ]);
    var strip = el('div', { 'class': 'hv2-strip' });
    host.appendChild(el('div', { 'class': 'hv2-heroes' }, [factionBar, stage, strip]));

    var cache = {};        // file -> promise of hero list
    var faction = -1;      // faction whose button is selected
    var stripFaction = -1; // faction whose avatars are currently rendered
    var shownSrc = '';     // portrait currently requested
    var nearViewport = false, pendingSrc = '';

    function detail(h, key){
      for (var i = 0; i < h.details.length; i++) if (h.details[i].key === key) return h.details[i].val;
      return '';
    }
    function load(file){
      if (!cache[file]){
        cache[file] = api.snap(file).then(function(j){
          var items = (j && j.result && j.result.items) || [];
          return items.map(function(h){
            return { name: h.priVal || '', portrait: api.local(detail(h, '新官网PC立绘')),
              icon: api.local(detail(h, '新官网Icon')), hover: api.local(detail(h, '新官网hoverIcon')) };
          });
        }).catch(function(e){ delete cache[file]; console.warn('[hv2 heroes]', e); return []; });
      }
      return cache[file];
    }

    // portraits are ~400KB each: only fetch once the section is close to the viewport
    function showPortrait(src){
      if (src && src === shownSrc && portrait.classList.contains('is-on')) return;
      shownSrc = src;
      portrait.classList.remove('is-on');
      if (!src) return;
      if (!nearViewport){ pendingSrc = src; return; }
      var probe = new Image();
      probe.onload = function(){
        if (shownSrc !== src) return; // a newer hero was picked meanwhile
        portrait.src = src;
        portrait.classList.add('is-on');
      };
      probe.src = src;
    }
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        if (!entries.some(function(e){ return e.isIntersecting; })) return;
        nearViewport = true; io.disconnect();
        if (pendingSrc){ var s = pendingSrc; pendingSrc = ''; showPortrait(s); }
      }, { rootMargin: '600px 0px' });
      io.observe(host);
    } else {
      nearViewport = true;
    }

    function clearStage(){
      plate.classList.add('is-empty');
      plateFaction.textContent = '';
      plateName.textContent = '';
      showPortrait('');
    }
    function selectHero(heroes, fi, i){
      var h = heroes[i];
      for (var k = 0; k < strip.children.length; k++){
        var on = k === i;
        strip.children[k].classList.toggle('is-on', on);
        strip.children[k].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      plate.classList.remove('is-empty');
      plateFaction.textContent = FACTIONS[fi][0];
      plateName.textContent = h.name;
      showPortrait(h.portrait);
    }
    function renderStrip(heroes, fi){
      stripFaction = fi;
      strip.textContent = '';
      if (!heroes.length){
        strip.appendChild(el('div', { 'class': 'hv2-empty', text: 'Chưa có dữ liệu' }));
        clearStage();
        return;
      }
      heroes.forEach(function(h, i){
        var b = el('button', { type: 'button', 'class': 'hv2-avatar', 'aria-pressed': 'false' }, [
          el('span', { 'class': 'hv2-avatar-img' }, [
            el('img', { src: h.icon, alt: '', loading: 'lazy' }),
            el('img', { 'class': 'is-hover', src: h.hover, alt: '', loading: 'lazy' })
          ]),
          el('span', { 'class': 'hv2-avatar-name', text: h.name })
        ]);
        // fi is captured at render time so a stale strip never mislabels the faction
        b.addEventListener('click', function(){ selectHero(heroes, fi, i); });
        // warm the portrait so the switch is instant
        b.addEventListener('pointerenter', function(){ if (nearViewport && h.portrait) (new Image()).src = h.portrait; });
        strip.appendChild(b);
      });
      selectHero(heroes, fi, 0);
    }
    function selectFaction(i){
      if (i === faction && stripFaction === i) return Promise.resolve([]);
      faction = i;
      for (var k = 0; k < factionBar.children.length; k++){
        factionBar.children[k].classList.toggle('is-on', k === i);
        factionBar.children[k].setAttribute('aria-pressed', k === i ? 'true' : 'false');
      }
      return load(FACTIONS[i][1]).then(function(heroes){
        if (faction === i) renderStrip(heroes, i);
        return heroes;
      });
    }
    FACTIONS.forEach(function(f, i){
      var b = el('button', { type: 'button', 'class': 'hv2-faction', 'aria-pressed': 'false', text: f[0] });
      b.addEventListener('click', function(){ selectFaction(i); });
      factionBar.appendChild(b);
    });

    // show the section only when there is something to show
    selectFaction(0).then(function(heroes){ if (heroes.length) api.ready('hv2-heroes'); });
  });
})();`;
