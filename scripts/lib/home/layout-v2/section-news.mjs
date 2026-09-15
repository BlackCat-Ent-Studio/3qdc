// section-news.mjs — "Tin Tức Sự Kiện" block for the home layout-v2 overlay.
// Left: autoplaying slider of the static planning banners already in the mirror.
// Right: three tabs — Thông báo and Sự kiện backed by the news-list API snapshots the site already serves
// (getListRecommend, size 4, page 0), each row linking to the existing news page; Cẩm nang has no source
// on the home page yet and shows the empty-list state.
// Titles are rendered raw; the i18n overlay already on the page translates them.

const STATIC = '/cdn-cn.lingxigames.com/wukongbuild/star-gw/1.0.0/prod/views/static/';

// snapshot file per tab (collectionIds 323 notices, 324 events); the first tab is selected by default.
// Cẩm nang (guides) intentionally has no file: its articles live on /huong-dan with their own title dictionary.
const TABS = [
  ['Thông báo', 'endpoint.json__b5a051b4db5a8cbca'],
  ['Sự kiện', 'endpoint.json__b586100e43cbf4eaf'],
  ['Cẩm nang', null],
];

// banners belong to the planning page (official comics / hero side stories); the first one is the
// Vietnamese artwork served from overrides/home (same 808x316 size), the others are still the originals
const BANNERS = ['/3qdc-vi/home/tin-tuc-banner-1-vi.webp']
  .concat(['banner2.50e6c137.jpg', 'banner3.8050d575.jpg', 'banner4.7d8e2d36.jpg'].map((f) => STATIC + f));

export const NEWS_CSS = `
#hv2-news .hv2-news{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:28px;padding:24px;
  background:rgba(18,21,38,.92);border:1px solid rgba(214,176,106,.35);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
#hv2-news .hv2-slider{position:relative;aspect-ratio:808/316;border-radius:10px;overflow:hidden;background:#000}
#hv2-news .hv2-slider-link{position:absolute;inset:0;display:block}
#hv2-news .hv2-slide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s ease}
#hv2-news .hv2-slide.is-on{opacity:1}
#hv2-news .hv2-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;gap:8px;pointer-events:none}
#hv2-news .hv2-dot{width:10px;height:10px;padding:0;border-radius:50%;border:1px solid #f3dfa6;background:transparent;
  cursor:pointer;pointer-events:auto}
#hv2-news .hv2-dot.is-on{background:#f3dfa6}
#hv2-news .hv2-tabs{display:flex;gap:6px;margin-bottom:14px;border-bottom:1px solid rgba(214,176,106,.25)}
#hv2-news .hv2-tab{padding:9px 16px;border:0;border-radius:8px 8px 0 0;background:transparent;color:#bfb59a;
  font-size:16px;font-weight:600;cursor:pointer}
#hv2-news .hv2-tab.is-on{background:linear-gradient(180deg,#e8a23a,#b9621c);color:#fff}
#hv2-news .hv2-list{list-style:none;margin:0;padding:0;min-height:236px}
#hv2-news .hv2-row{display:flex;align-items:center;gap:14px;padding:10px 4px;border-bottom:1px dashed rgba(214,176,106,.18);
  color:#e8e2d0;text-decoration:none}
#hv2-news .hv2-row:hover .hv2-row-title{color:#f3c56a}
#hv2-news .hv2-date{flex:0 0 46px;text-align:center;line-height:1.1;color:#f3dfa6;font-weight:700;font-size:18px}
#hv2-news .hv2-date small{display:block;font-size:12px;font-weight:400;color:#9b927c}
#hv2-news .hv2-row-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}
#hv2-news .hv2-empty{padding:24px 4px;color:#9b927c}
#hv2-news .hv2-more{display:block;margin-top:16px;padding:10px;text-align:center;border:1px solid rgba(214,176,106,.6);
  border-radius:8px;color:#f3dfa6;text-decoration:none}
#hv2-news .hv2-more:hover{background:rgba(214,176,106,.14)}
`;

export const NEWS_JS = `(function(){
  if (!window.__hv2) return;
  var TABS = ${JSON.stringify(TABS)};
  var BANNERS = ${JSON.stringify(BANNERS)};
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-news');
    if (!host) return;
    var el = api.el;

    // slider: the link wraps only the images; dots are siblings so they never navigate
    var slider = el('div', { 'class': 'hv2-slider' });
    var link = el('a', { 'class': 'hv2-slider-link', href: '/ke-hoach', 'aria-label': 'Kế hoạch' });
    var dots = el('div', { 'class': 'hv2-dots' });
    var slides = BANNERS.map(function(src, i){
      var img = el('img', { 'class': 'hv2-slide' + (i === 0 ? ' is-on' : ''), src: src, alt: '', loading: 'lazy' });
      link.appendChild(img);
      var dot = el('button', { type: 'button', 'class': 'hv2-dot' + (i === 0 ? ' is-on' : ''), 'aria-label': 'Banner ' + (i + 1) });
      dot.addEventListener('click', function(){ show(i); });
      dots.appendChild(dot);
      return img;
    });
    slider.appendChild(link);
    slider.appendChild(dots);
    var current = 0, hovering = false;
    function show(i){
      slides[current].classList.remove('is-on'); dots.children[current].classList.remove('is-on');
      current = i;
      slides[current].classList.add('is-on'); dots.children[current].classList.add('is-on');
    }
    // pause only for a real mouse hover (touch taps would otherwise stop autoplay for good)
    slider.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') hovering = true; });
    slider.addEventListener('pointerleave', function(){ hovering = false; });
    setInterval(function(){
      if (hovering || !document.documentElement.classList.contains('hv2')) return;
      show((current + 1) % slides.length);
    }, 4500);

    // tabs + list
    var tabsBar = el('div', { 'class': 'hv2-tabs', role: 'tablist' });
    var list = el('ul', { 'class': 'hv2-list' });
    var cache = {};   // file -> promise of items (shared by concurrent clicks)
    var selected = 0;
    function renderList(items){
      list.textContent = '';
      if (!items.length){ list.appendChild(el('li', { 'class': 'hv2-empty', text: 'Chưa có dữ liệu' })); return; }
      items.slice(0, 4).forEach(function(it){
        var t = String(it.onlineTime || '');
        var date = el('span', { 'class': 'hv2-date' }, [t.slice(8, 10) || '--', el('small', { text: t.slice(5, 7) ? t.slice(5, 7) + '/' + t.slice(0, 4) : '' })]);
        var row = el('a', { 'class': 'hv2-row', href: '/tin-tuc' }, [date, el('span', { 'class': 'hv2-row-title', text: it.title || '' })]);
        list.appendChild(el('li', null, [row]));
      });
    }
    function load(file){
      if (!file) return Promise.resolve([]); // a tab without a source shows the empty state
      if (!cache[file]){
        cache[file] = api.snap(file)
          .then(function(j){ return (j && j.result && j.result.list) || []; })
          .catch(function(e){ delete cache[file]; console.warn('[hv2 news]', e); return []; });
      }
      return cache[file];
    }
    function select(i){
      selected = i;
      for (var k = 0; k < tabsBar.children.length; k++){
        tabsBar.children[k].classList.toggle('is-on', k === i);
        tabsBar.children[k].setAttribute('aria-selected', k === i ? 'true' : 'false');
      }
      // a slower earlier response must not overwrite the list of the tab now selected
      return load(TABS[i][1]).then(function(items){ if (selected === i) renderList(items); });
    }
    TABS.forEach(function(tab, i){
      var b = el('button', { type: 'button', 'class': 'hv2-tab', role: 'tab', 'aria-selected': 'false', text: tab[0] });
      b.addEventListener('click', function(){ select(i); });
      tabsBar.appendChild(b);
    });

    var right = el('div', null, [tabsBar, list, el('a', { 'class': 'hv2-more', href: '/tin-tuc', text: 'Xem thêm +' })]);
    host.appendChild(el('div', { 'class': 'hv2-news' }, [slider, right]));
    // warm every tab so later switches render instantly
    TABS.forEach(function(tab){ load(tab[1]); });
    select(0).then(function(){ api.ready('hv2-news'); });
  });
})();`;
