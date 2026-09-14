// section-treasure.mjs — "Kho Báu" block for the home layout-v2 overlay.
// Two tabs backed by the media-folder snapshots the /kho-bau page already uses:
//   CG (folder 2157, default): poster cards that open the light 'ld' MP4 in a lightbox.
//   Wallpapers (folder 2158): a grid built only when the tab is first opened, because the
//   mirror holds just the original files (0.7–4 MB each; the thumbnail URLs are dead).
// One shared lightbox shows either a video or a full image and closes on Esc, a backdrop
// click, the close button, or when the home layout is torn down.

const CG_FILE = 'endpoint.json__b05e570235888dacc';
const WALLPAPER_FILE = 'endpoint.json__bb22b1de7cb6b4ece';

export const TREASURE_CSS = `
#hv2-treasure .hv2-tr{padding:24px;background:rgba(18,21,38,.92);border:1px solid rgba(214,176,106,.35);border-radius:14px;
  box-shadow:0 12px 40px rgba(0,0,0,.35)}
#hv2-treasure .hv2-tr-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:20px;
  border-bottom:1px solid rgba(214,176,106,.25)}
#hv2-treasure .hv2-tabs{display:flex;gap:6px}
#hv2-treasure .hv2-tab{padding:9px 18px;border:0;border-radius:8px 8px 0 0;background:transparent;color:#bfb59a;
  font-size:16px;font-weight:600;cursor:pointer}
#hv2-treasure .hv2-tab.is-on{background:linear-gradient(180deg,#e8a23a,#b9621c);color:#fff}
#hv2-treasure .hv2-more{margin-bottom:8px;padding:7px 16px;border:1px solid rgba(214,176,106,.6);border-radius:8px;
  color:#f3dfa6;text-decoration:none;white-space:nowrap}
#hv2-treasure .hv2-more:hover{background:rgba(214,176,106,.14)}
#hv2-treasure .hv2-tr-pane[hidden]{display:none}
#hv2-treasure .hv2-empty{padding:24px 4px;color:#9b927c;text-align:center}
/* CG cards */
#hv2-treasure .hv2-cg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
#hv2-treasure .hv2-cg-card{display:block;min-width:0;padding:0;border:1px solid rgba(214,176,106,.35);border-radius:10px;
  overflow:hidden;background:#12152a;color:#e8e2d0;text-align:left;cursor:pointer}
#hv2-treasure .hv2-cg-media{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;background:#000}
#hv2-treasure .hv2-cg-poster{display:block;width:100%;height:100%;object-fit:cover;transition:transform .3s ease}
#hv2-treasure .hv2-cg-card:hover .hv2-cg-poster{transform:scale(1.04)}
#hv2-treasure .hv2-cg-play{position:absolute;left:50%;top:50%;width:64px;height:64px;transform:translate(-50%,-50%);
  border-radius:50%;border:2px solid #f3dfa6;background:rgba(8,10,22,.6);box-sizing:border-box}
#hv2-treasure .hv2-cg-play:after{content:"";position:absolute;left:25px;top:18px;border-style:solid;border-width:12px 0 12px 20px;
  border-color:transparent transparent transparent #f3dfa6}
#hv2-treasure .hv2-cg-card:hover .hv2-cg-play{background:rgba(214,176,106,.35)}
#hv2-treasure .hv2-cg-name{display:block;padding:10px 12px;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* wallpapers: 5 x 2 square tiles; the lightbox shows the whole picture */
#hv2-treasure .hv2-wp{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
#hv2-treasure .hv2-wp-item{display:block;min-width:0;aspect-ratio:1;padding:0;border:1px solid rgba(214,176,106,.3);
  border-radius:8px;overflow:hidden;background:#12152a;cursor:pointer}
#hv2-treasure .hv2-wp-item img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .3s ease}
#hv2-treasure .hv2-wp-item.is-port img{object-position:50% 22%}
#hv2-treasure .hv2-wp-item:hover img{transform:scale(1.05)}
/* shared lightbox, above the fixed header (z 9-11) and sidebar (z 12) */
html.hv2-lock,html.hv2-lock body{overflow:hidden!important}
#hv2-lightbox{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(3,4,10,.9)}
#hv2-lightbox .hv2-lb-media{display:block;max-width:92vw;max-height:86vh;border-radius:6px;box-shadow:0 12px 48px rgba(0,0,0,.6)}
#hv2-lightbox video.hv2-lb-media{width:min(92vw,calc(86vh * 16 / 9));background:#000}
#hv2-lightbox .hv2-lb-close{position:absolute;top:18px;right:22px;width:44px;height:44px;padding:0;border-radius:50%;
  border:1px solid #f3dfa6;background:rgba(8,10,22,.7);color:#f3dfa6;font-size:22px;line-height:1;cursor:pointer}
#hv2-lightbox .hv2-lb-close:hover{background:rgba(214,176,106,.28)}
#hv2-lightbox .hv2-lb-caption{position:absolute;left:0;right:0;bottom:14px;padding:0 80px;text-align:center;color:#e8e2d0;font-size:14px}
#hv2-lightbox .hv2-lb-wait{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#bfb59a;font-size:15px;pointer-events:none}
`;

export const TREASURE_JS = `(function(){
  if (!window.__hv2) return;
  var CG_FILE = ${JSON.stringify(CG_FILE)};
  var WALLPAPER_FILE = ${JSON.stringify(WALLPAPER_FILE)};
  window.__hv2.onMount(function(api){
    var host = api.section('hv2-treasure');
    if (!host) return;
    var el = api.el;
    var root = document.documentElement;

    // ---- shared lightbox
    var box = null, boxMedia = null, opener = null;
    function onKey(e){
      if (e.key === 'Escape'){ closeBox(); return; }
      if (e.key !== 'Tab' || !box) return;
      // keep keyboard focus inside the dialog: the player (videos only) and the close button
      var stops = [boxMedia && boxMedia.tagName === 'VIDEO' ? boxMedia : null, box.querySelector('.hv2-lb-close')].filter(Boolean);
      var at = stops.indexOf(document.activeElement);
      e.preventDefault();
      stops[(at + (e.shiftKey ? stops.length - 1 : 1) + stops.length) % stops.length].focus();
    }
    function closeBox(){
      if (!box) return;
      var b = box, m = boxMedia, from = opener;
      box = null; boxMedia = null; opener = null; // cleared first so media events fired by the cleanup are ignored
      if (m && m.tagName === 'VIDEO'){
        try { m.pause(); } catch (e) {}
        m.removeAttribute('src');
        m.load(); // stops the network stream of the detached video
      } else if (m && m.tagName === 'IMG'){
        m.removeAttribute('src'); // lets the browser drop an unfinished multi-MB original
      }
      if (b.parentNode) b.parentNode.removeChild(b);
      root.classList.remove('hv2-lock');
      document.removeEventListener('keydown', onKey);
      if (from && root.classList.contains('hv2')) try { from.focus({ preventScroll: true }); } catch (e) {}
    }
    function openBox(media, caption, from){
      closeBox();
      var close = el('button', { type: 'button', 'class': 'hv2-lb-close', 'aria-label': 'Đóng', text: '\\u2715' });
      close.addEventListener('click', closeBox);
      box = el('div', { id: 'hv2-lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Kho báu', 'data-home-v2': '' },
        [media, close, caption ? el('div', { 'class': 'hv2-lb-caption', text: caption }) : null]);
      box.addEventListener('click', function(e){ if (e.target === box) closeBox(); });
      boxMedia = media;
      opener = from || null;
      document.body.appendChild(box);
      root.classList.add('hv2-lock');
      document.addEventListener('keydown', onKey);
      close.focus({ preventScroll: true });
    }
    // layout-v2 registered its hashchange handler first, so hv2 is already removed when leaving #/index
    window.addEventListener('hashchange', function(){ if (!root.classList.contains('hv2')) closeBox(); });

    function openVideo(cg, from){
      var v = el('video', { 'class': 'hv2-lb-media', controls: '', playsinline: '', preload: 'metadata' });
      if (cg.poster) v.setAttribute('poster', cg.poster);
      var fellBack = false;
      v.addEventListener('error', function(){
        if (boxMedia !== v) return;
        if (!fellBack && cg.ld && cg.full){
          fellBack = true; // the light file is missing: stream the original instead
          v.src = cg.full;
          var p = v.play(); if (p && p.catch) p.catch(function(){});
          return;
        }
        if (!box.querySelector('.hv2-lb-wait')) box.appendChild(el('div', { 'class': 'hv2-lb-wait', text: 'Không phát được video' }));
      });
      v.src = cg.ld || cg.full;
      openBox(v, cg.name, from);
      var p = v.play(); if (p && p.catch) p.catch(function(){}); // autoplay may be refused; controls remain
    }
    function openImage(src, from){
      var img = el('img', { 'class': 'hv2-lb-media', alt: '', decoding: 'async' });
      var wait = el('div', { 'class': 'hv2-lb-wait', text: 'Đang tải…' });
      img.addEventListener('load', function(){ if (wait.parentNode) wait.parentNode.removeChild(wait); });
      img.addEventListener('error', function(){ wait.textContent = 'Không tải được ảnh'; });
      img.src = src;
      openBox(img, '', from);
      box.appendChild(wait);
    }

    // ---- data
    function list(file, tag){
      return api.snap(file)
        .then(function(j){ return (j && j.result && j.result.list) || []; })
        .catch(function(e){ console.warn('[hv2 treasure]', tag, e); return []; });
    }
    function showEmpty(pane){
      pane.textContent = '';
      pane.appendChild(el('div', { 'class': 'hv2-empty', text: 'Chưa có dữ liệu' }));
    }
    function renderCg(pane){
      return list(CG_FILE, 'cg').then(function(items){
        items = items.filter(function(it){ return it.ldUrl || it.url; }).slice(0, 3);
        pane.textContent = '';
        if (!items.length){ showEmpty(pane); return 0; }
        var grid = el('div', { 'class': 'hv2-cg' });
        items.forEach(function(it){
          // names are rendered raw so the page's i18n overlay can translate them
          var cg = { name: String(it.name || ''), ld: api.local(it.ldUrl), full: api.local(it.url), poster: api.local(it.poster) };
          var card = el('button', { type: 'button', 'class': 'hv2-cg-card' }, [
            el('span', { 'class': 'hv2-cg-media' }, [
              cg.poster ? el('img', { 'class': 'hv2-cg-poster', src: cg.poster, alt: '', loading: 'lazy' }) : null,
              el('span', { 'class': 'hv2-cg-play' })
            ]),
            el('span', { 'class': 'hv2-cg-name', text: cg.name })
          ]);
          card.addEventListener('click', function(){ openVideo(cg, card); });
          grid.appendChild(card);
        });
        pane.appendChild(grid);
        return items.length;
      });
    }
    function renderWallpapers(pane){
      pane.textContent = ''; // a retry must not keep the previous "no data" message
      pane.appendChild(el('div', { 'class': 'hv2-empty', text: 'Đang tải…' }));
      return list(WALLPAPER_FILE, 'wallpapers').then(function(items){
        items = items.filter(function(it){ return it.url; }).slice(0, 10);
        pane.textContent = '';
        if (!items.length){ showEmpty(pane); return 0; }
        var grid = el('div', { 'class': 'hv2-wp' });
        items.forEach(function(it){
          var src = api.local(it.url);
          var portrait = Number(it.height) > Number(it.width);
          var tile = el('button', { type: 'button', 'class': 'hv2-wp-item' + (portrait ? ' is-port' : ''), 'aria-label': 'Xem hình nền' }, [
            el('img', { src: src, alt: '', loading: 'lazy', decoding: 'async' })
          ]);
          tile.addEventListener('click', function(){ openImage(src, tile); });
          grid.appendChild(tile);
        });
        pane.appendChild(grid);
        return items.length;
      });
    }

    // ---- tabs: a pane is built the first time its tab is selected (wallpapers are heavy)
    var TABS = [['CG cốt truyện', renderCg], ['Hình nền', renderWallpapers]];
    var tabsBar = el('div', { 'class': 'hv2-tabs', role: 'tablist' });
    var panes = [], built = [], selected = -1;
    TABS.forEach(function(t, i){
      var b = el('button', { type: 'button', 'class': 'hv2-tab', role: 'tab', 'aria-selected': 'false', text: t[0] });
      b.addEventListener('click', function(){ select(i); });
      tabsBar.appendChild(b);
      var pane = el('div', { 'class': 'hv2-tr-pane', role: 'tabpanel' });
      pane.hidden = true;
      panes.push(pane);
    });
    function select(i){
      if (i !== selected){
        selected = i;
        for (var k = 0; k < panes.length; k++){
          tabsBar.children[k].classList.toggle('is-on', k === i);
          tabsBar.children[k].setAttribute('aria-selected', k === i ? 'true' : 'false');
          panes[k].hidden = k !== i;
        }
      }
      if (!built[i]){
        // a render error (malformed snapshot) counts as empty so the tab can be retried
        built[i] = TABS[i][1](panes[i]).then(null, function(e){ console.warn('[hv2 treasure]', e); return 0; }).then(function(n){
          if (!n) built[i] = null; // allow a retry on the next click
          return n;
        });
      }
      return built[i];
    }

    var head = el('div', { 'class': 'hv2-tr-head' }, [tabsBar, el('a', { 'class': 'hv2-more', href: '/kho-bau', text: 'Xem kho báu +' })]);
    host.appendChild(el('div', { 'class': 'hv2-tr' }, [head].concat(panes)));

    // show the section once it has content: CG by default, wallpapers only if CG is unavailable
    select(0).then(function(n){
      if (n) return n;
      return select(1);
    }).then(function(n){ if (n) api.ready('hv2-treasure'); });
  });
})();`;
