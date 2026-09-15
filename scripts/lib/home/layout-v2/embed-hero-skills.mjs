// embed-hero-skills.mjs — skill icons for the "Hệ Thống Tướng" block of the home page.
// Only inside the home page's hero iframe (html.hv2-embed, set by layout-v2.mjs): the skill / bond / guide
// tabs (技绊略) and the skill description panel are hidden, and the current hero's Nộ công, Bị động and
// Giác tỉnh icons are shown where the tabs were, as gold-ringed round icons with the skill name on hover.
// The biography row (type ribbon, quality badge, biography text) is removed from the layout, so the icon row
// sits right under the red name band; the icons are 72px (the Nộ công / Bị động artwork is 80px), and 64px
// in a hero frame of 1200px or less, where the home sidebar's collapse arrow would otherwise cover the last icon.
// Next to the big hero name, the CV block (voice button, "cv", dot, voice actor) is hidden; the name stays put.
// The faction tabs (魏吴蜀群, normal and selected) show the Vietnamese artwork from overrides/home instead of the
// bundle's base64 PNGs, which are told apart by a chunk of base64 unique to each of the eight images.

const FACTION_TABS = [
  ['LS3od1jOVT/AHgzAHgzAHgyfLSylKCOf', '/3qdc-vi/home/phe-1-nguy-hover-dang-chon.png'],
  ['HgzAHgyfLS1wICExEBLAHgzAHgyYJiKH', '/3qdc-vi/home/phe-1-nguy-thuong.png'],
  ['HgzAHgzPVkDVXkbhbVHBRTTAHgzAHgyl', '/3qdc-vi/home/phe-2-ngo-hover-dang-chon.png'],
  ['FxrAHgxLFBefLS2fLS2fLS2fLS1PFRhm', '/3qdc-vi/home/phe-2-ngo-thuong.png'],
  ['YUjPV0GsJx7AHgzAHgzpeFneak/AHgzA', '/3qdc-vi/home/phe-3-thuc-hover-dang-chon.png'],
  ['HgzAHgyfLS0xEBKfLS1pGx/AHgyYJiKH', '/3qdc-vi/home/phe-3-thuc-thuong.png'],
  ['LS3lc1beaU7AHgzAHgzAHgyfLS2fLS2r', '/3qdc-vi/home/phe-4-quan-hover-dang-chon.png'],
  ['LS1dGBvAHgxLFBeeLCyfLS1wICExEBJp', '/3qdc-vi/home/phe-4-quan-thuong.png'],
];
// Icons and names are read from the skill list the hero page keeps rendering (hidden), so they follow every
// hero change and the i18n overlay's translation. The standalone /tuong page is not affected.

export const HERO_SKILLS_CSS = `
html.hv2-embed .star-site-person-advance-wrapper,
html.hv2-embed .star-site-person-advance-skills__wrapper,
html.hv2-embed .star-site-person-advance-restrain{display:none!important}
html.hv2-embed .star-site-person-introduction{display:none!important}
html.hv2-embed .star-site-person-cv-wrapper{display:none!important}
html.hv2-embed .hv2-sk{display:flex;align-items:center;gap:26px;height:80px}
html.hv2-embed .hv2-sk-item{position:relative;display:block;flex:0 0 auto;width:80px;height:80px;outline:none}
html.hv2-embed .hv2-sk-item img{position:absolute;left:2px;top:2px;width:72px;height:72px;border-radius:50%;object-fit:cover;
  border:3px solid #d6b06a;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:transform .2s ease,border-color .2s ease}
html.hv2-embed .hv2-sk-item:hover img,html.hv2-embed .hv2-sk-item:focus-visible img{border-color:#f3dfa6;transform:scale(1.06)}
html.hv2-embed .hv2-sk-item::after{content:attr(data-name);position:absolute;left:50%;top:calc(100% + 10px);transform:translateX(-50%);
  white-space:nowrap;padding:5px 12px;border-radius:4px;background:rgba(28,12,12,.88);color:#f3dfa6;font-size:14px;line-height:1.3;
  opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:5}
html.hv2-embed .hv2-sk-item:hover::after,html.hv2-embed .hv2-sk-item:focus-visible::after{opacity:1}
@media (max-width:1200px){
  html.hv2-embed .hv2-sk{gap:14px;height:72px}
  html.hv2-embed .hv2-sk-item{width:72px;height:72px}
  html.hv2-embed .hv2-sk-item img{width:64px;height:64px}
}
`;

export const HERO_SKILLS_JS = `(function(){
  if (!document.documentElement.classList.contains('hv2-embed')) return;
  // skill list order from the API: 0 Phổ công, 1 Nộ công, 2 Bị động, 3 Giác tỉnh; the basic attack is left out
  var FIRST = 1, COUNT = 3;

  // "Nộ công – Xích Bích Tai Viêm Bạo"; the star-level prefix of passives ("Tam tinh-") is dropped, and when the
  // description has no proper skill name (e.g. "Giác tỉnh+1: …") only the skill type is shown
  function label(li){
    var type = ((li.querySelector('.star-site-person-advance-skills-name') || {}).textContent || '').trim();
    var desc = (li.querySelector('.star-site-person-advance-skills-describe') || {}).textContent || '';
    var name = desc.split(/[:：]/)[0].replace(/^[^-–:]{0,12}tinh *[-–] */i, '').trim();
    if (!name || !type || name.indexOf(type) === 0 || name.length > 40 || name === desc.trim()) return type || name;
    return type + ' – ' + name;
  }

  function sync(){
    var box = document.querySelector('.star-site-person-advance-box');
    if (!box) return;
    // a skill without an icon is left out rather than shown as an empty ring
    var lis = [].slice.call(document.querySelectorAll('.star-site-person-advance-skills > li'), FIRST, FIRST + COUNT)
      .filter(function(li){ var im = li.querySelector('img'); return im && im.getAttribute('src'); });
    var row = box.querySelector('.hv2-sk');
    if (!row){
      row = document.createElement('div');
      row.className = 'hv2-sk';
      box.insertBefore(row, box.firstChild);
    }
    while (row.children.length > lis.length) row.removeChild(row.lastChild);
    while (row.children.length < lis.length){
      var item = document.createElement('span');
      item.className = 'hv2-sk-item';
      item.tabIndex = 0;
      item.setAttribute('role', 'img');
      var img = document.createElement('img');
      img.alt = '';
      item.appendChild(img);
      row.appendChild(item);
    }
    // write only what changed, so this observer's own mutations settle immediately
    lis.forEach(function(li, i){
      var item = row.children[i], img = item.firstChild;
      var icon = li.querySelector('img');
      var src = (icon && icon.getAttribute('src')) || '';
      var text = label(li);
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      if (item.getAttribute('data-name') !== text){ item.setAttribute('data-name', text); item.setAttribute('aria-label', text); }
    });
  }

  // faction tabs: the app sets a base64 src on render and on every faction change; swap it for the Vietnamese file
  // (the normal and hover images together load all eight files when the tabs first render, so later swaps
  // paint at once; measured under a slow no-store network, no preload needed)
  var FACTION_TABS = ${JSON.stringify(FACTION_TABS)};
  function swapTabs(){
    // each tab has two images: __item, and __item-hover which the page's CSS shows instead while hovering
    var imgs = document.querySelectorAll('.star-site-person-battle—tab-wrapper__item, .star-site-person-battle—tab-wrapper__item-hover');
    for (var i = 0; i < imgs.length; i++){
      var src = imgs[i].getAttribute('src') || '';
      if (src.indexOf('data:') !== 0) continue;
      for (var k = 0; k < FACTION_TABS.length; k++){
        if (src.indexOf(FACTION_TABS[k][0]) !== -1){ imgs[i].setAttribute('src', FACTION_TABS[k][1]); break; }
      }
    }
  }

  function update(){ swapTabs(); sync(); }
  function start(){
    update();
    new MutationObserver(update).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src'] });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();`;
