// section-music.mjs — the home page's own music player, bottom-right corner (the reference site the owner picked uses a
// hosted third-party widget; nothing of it is reused, this is written here and serves the site's own files).
//
// The songs are whatever audio files sit in overrides/home/nhac on the server: the owner drops a file in, names it
// "Tên bài - Ca sĩ.mp3", and it shows up — server.mjs reads the folder on every request of MUSIC.api, so no restart is
// needed. A picture with the same name is used as the cover, otherwise MUSIC.cover.
//
// Browsers block sound until the visitor interacts with the page, so nothing plays by itself: the player opens quiet and
// waits for the play button. The audio element keeps preload="none", so no song is fetched until then (the files are
// served from this VPS). The chosen song, its position, the volume, shuffle/repeat and the collapsed state are kept in
// the visitor's browser. With no files in the folder the player is not built at all.
import { COMPACT_MQ } from './compact.mjs';

export const MUSIC = {
  enabled: true,
  api: '/3qdc-vi/api/nhac',
  // cover for songs that have no picture of their own
  cover: '/3qdc-vi/home/logo-3qdc.webp',
  // same cloud frame as the social bar / download sidebar, drawn at the same 0.275x
  frame: '/3qdc-vi/home/khung-mxh-may.webp',
};

export const MUSIC_CSS = MUSIC.enabled ? `
/* music player, bottom right: a round spinning disc when collapsed, the full box when open */
#hv2-music{display:none}
/* above the tool buttons (z-index 12): opening the box lies over the lowest of them until it is collapsed again */
html.hv2:not(.hv2-embed) #hv2-music{display:block;position:fixed;right:14px;bottom:16px;z-index:13}
#hv2-music .hv2-mu-mini{display:none;width:56px;height:56px;padding:0;border:2px solid rgba(214,176,106,.75);
  border-radius:50%;background:#16273b center/cover no-repeat;cursor:pointer;
  box-shadow:0 6px 16px rgba(0,0,0,.55)}
#hv2-music.hv2-mu-off .hv2-mu-mini{display:block}
#hv2-music.hv2-mu-off .hv2-mu-box{display:none}
#hv2-music .hv2-mu-box{width:300px;box-sizing:border-box;padding:30px 18px;color:#e9d9b0;
  border:0 solid transparent;border-image:url("${MUSIC.frame}") 122 124 122 fill / 33.5px 34px 33.5px stretch;
  border-radius:24px;background:#16273b;filter:drop-shadow(0 8px 18px rgba(0,0,0,.55))}
#hv2-music .hv2-mu-head{display:flex;align-items:center;gap:10px}
#hv2-music .hv2-mu-disc{flex:0 0 auto;width:56px;height:56px;border-radius:50%;border:2px solid rgba(214,176,106,.75);
  background:#0b0d18 center/cover no-repeat;animation:hv2-mu-spin 14s linear infinite;animation-play-state:paused}
#hv2-music.hv2-mu-play .hv2-mu-disc,#hv2-music.hv2-mu-play .hv2-mu-mini{animation:hv2-mu-spin 14s linear infinite}
@keyframes hv2-mu-spin{to{transform:rotate(360deg)}}
#hv2-music .hv2-mu-meta{min-width:0;flex:1 1 auto}
#hv2-music .hv2-mu-title{font-size:14px;font-weight:600;color:#f3e6c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hv2-music .hv2-mu-artist{font-size:12px;color:#b4a68a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hv2-music .hv2-mu-min{flex:0 0 auto;width:26px;height:26px;padding:0;border:0;background:transparent;color:#e9d9b0;cursor:pointer}
#hv2-music .hv2-mu-seek{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:11px;color:#b4a68a}
#hv2-music input[type=range]{flex:1 1 auto;min-width:0;height:4px;accent-color:#d6b06a;cursor:pointer}
#hv2-music .hv2-mu-ctl{display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:8px}
#hv2-music .hv2-mu-ctl button{width:30px;height:30px;padding:0;border:0;border-radius:50%;background:transparent;
  color:#e9d9b0;cursor:pointer;line-height:0}
#hv2-music .hv2-mu-ctl button:hover{background:rgba(214,176,106,.18)}
#hv2-music .hv2-mu-ctl button.on{color:#f3c96b}
#hv2-music .hv2-mu-ctl .hv2-mu-play{width:38px;height:38px;border:1px solid rgba(214,176,106,.7)}
#hv2-music svg{width:100%;height:100%;fill:currentColor;pointer-events:none}
#hv2-music .hv2-mu-ctl button svg{width:18px;height:18px}
#hv2-music .hv2-mu-ctl .hv2-mu-play svg{width:22px;height:22px}
#hv2-music .hv2-mu-vol{display:flex;align-items:center;gap:6px;margin-top:8px;color:#b4a68a}
#hv2-music .hv2-mu-vol svg{width:16px;height:16px;flex:0 0 auto}
#hv2-music .hv2-mu-list{display:none;margin:10px 0 0;padding:8px 0 0;max-height:160px;overflow:auto;list-style:none;
  border-top:1px solid rgba(214,176,106,.3)}
#hv2-music.hv2-mu-open-list .hv2-mu-list{display:block}
#hv2-music .hv2-mu-list li{padding:5px 6px;font-size:13px;border-radius:6px;cursor:pointer;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
#hv2-music .hv2-mu-list li:hover{background:rgba(214,176,106,.14)}
#hv2-music .hv2-mu-list li.on{color:#f3c96b}
/* phones and tablets: the box would cover the page, so it starts as the disc and opens narrower */
@media ${COMPACT_MQ}{
  html.hv2:not(.hv2-embed) #hv2-music{right:12px;bottom:calc(12px + env(safe-area-inset-bottom))}
  #hv2-music .hv2-mu-box{width:min(300px,92vw)}
  #hv2-music .hv2-mu-mini{width:48px;height:48px}
}
` : '';

export const MUSIC_JS = MUSIC.enabled ? `(function(){
  if (!window.__hv2 || document.documentElement.classList.contains('hv2-embed')) return;
  var CFG = ${JSON.stringify(MUSIC)};
  var K = { i: 'hv2-music-i', t: 'hv2-music-t', v: 'hv2-music-vol', off: 'hv2-music-off', sh: 'hv2-music-shuffle', rp: 'hv2-music-repeat' };
  var SVG = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm12 0v12l-9-6z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 6l9 6-9 6z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4V8h-2.2l-2.3 3-1.3-1.7L13.8 6H17V3zM3 6h4.2l6.6 9H17v-3l4 4-4 4v-3h-4.2L6.2 8H3V6zm0 10h4.2l1.7-2.3 1.3 1.7L8.2 18H3v-2z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.6 3l2.2-2.2-1.4-1.4L15.2 10.6 13 8.4 11.6 9.8l2.2 2.2-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2 1.4-1.4L16.6 12z"/></svg>',
    min: '<svg viewBox="0 0 24 24"><path d="M6 11h12v2H6z"/></svg>',
  };
  var get = function(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  var set = function(k, v){ try { localStorage.setItem(k, v); } catch (e) {} };
  var mmss = function(s){
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  };

  window.__hv2.onMount(function(api){
    var el = api.el;
    var songs = [], i = 0, box, audio, disc, mini, title, artist, seek, cur, dur, playBtn, listEl, volRange, volIcon;
    var shuffle = get(K.sh, '0') === '1', repeat = get(K.rp, '0') === '1', loaded = false, saveAt = 0;

    function iconBtn(cls, svg, label, fn){
      var b = el('button', { type: 'button', 'class': cls, title: label, 'aria-label': label });
      b.innerHTML = svg;
      b.addEventListener('click', fn);
      return b;
    }
    function cover(s){ return (s && s.cover) || CFG.cover; }
    function playing(){ return audio && !audio.paused && !audio.ended; }

    function build(){
      box = el('div', { id: 'hv2-music', 'data-home-v2': '', role: 'region', 'aria-label': 'Nhạc nền' });
      audio = el('audio', { preload: 'none' });
      mini = el('button', { type: 'button', 'class': 'hv2-mu-mini', title: 'Mở trình phát nhạc', 'aria-label': 'Mở trình phát nhạc' });
      mini.addEventListener('click', function(){ setOff(false); });
      var inner = el('div', { 'class': 'hv2-mu-box' });
      var head = el('div', { 'class': 'hv2-mu-head' });
      disc = el('div', { 'class': 'hv2-mu-disc' });
      var meta = el('div', { 'class': 'hv2-mu-meta' });
      title = el('div', { 'class': 'hv2-mu-title' });
      artist = el('div', { 'class': 'hv2-mu-artist' });
      meta.appendChild(title); meta.appendChild(artist);
      head.appendChild(disc); head.appendChild(meta);
      head.appendChild(iconBtn('hv2-mu-min', SVG.min, 'Thu gọn trình phát', function(){ setOff(true); }));

      var seekRow = el('div', { 'class': 'hv2-mu-seek' });
      cur = el('span', { text: '0:00' });
      seek = el('input', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Vị trí bài hát' });
      dur = el('span', { text: '0:00' });
      seek.addEventListener('input', function(){
        if (audio.duration) audio.currentTime = audio.duration * (seek.value / 1000);
      });
      seekRow.appendChild(cur); seekRow.appendChild(seek); seekRow.appendChild(dur);

      var ctl = el('div', { 'class': 'hv2-mu-ctl' });
      var shBtn = iconBtn('hv2-mu-shuffle', SVG.shuffle, 'Phát ngẫu nhiên', function(){
        shuffle = !shuffle; set(K.sh, shuffle ? '1' : '0'); shBtn.classList.toggle('on', shuffle);
      });
      shBtn.classList.toggle('on', shuffle);
      var rpBtn = iconBtn('hv2-mu-repeat', SVG.repeat, 'Lặp lại một bài', function(){
        repeat = !repeat; set(K.rp, repeat ? '1' : '0'); rpBtn.classList.toggle('on', repeat);
      });
      rpBtn.classList.toggle('on', repeat);
      playBtn = iconBtn('hv2-mu-play', SVG.play, 'Phát', toggle);
      var listBtn = iconBtn('hv2-mu-listbtn', SVG.list, 'Danh sách bài hát', function(){
        box.classList.toggle('hv2-mu-open-list');
      });
      ctl.appendChild(shBtn);
      ctl.appendChild(iconBtn('hv2-mu-prev', SVG.prev, 'Bài trước', function(){ step(-1, true); }));
      ctl.appendChild(playBtn);
      ctl.appendChild(iconBtn('hv2-mu-next', SVG.next, 'Bài sau', function(){ step(1, true); }));
      ctl.appendChild(rpBtn);
      ctl.appendChild(listBtn);

      var volRow = el('div', { 'class': 'hv2-mu-vol' });
      volIcon = el('span');
      volIcon.innerHTML = SVG.vol;
      volRange = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round(audioVol() * 100)), 'aria-label': 'Âm lượng' });
      volRange.addEventListener('input', function(){
        audio.volume = volRange.value / 100;
        set(K.v, String(audio.volume));
        volIcon.innerHTML = audio.volume > 0 ? SVG.vol : SVG.mute;
      });
      volRow.appendChild(volIcon); volRow.appendChild(volRange);

      listEl = el('ul', { 'class': 'hv2-mu-list' });

      inner.appendChild(head); inner.appendChild(seekRow); inner.appendChild(ctl); inner.appendChild(volRow); inner.appendChild(listEl);
      box.appendChild(mini); box.appendChild(inner); box.appendChild(audio);
      document.body.appendChild(box);
      // the layout keeps a corner free for the disc once the player exists (placeTools listens for resize)
      window.dispatchEvent(new Event('resize'));

      audio.volume = audioVol();
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('loadedmetadata', onTime);
      audio.addEventListener('play', onState);
      audio.addEventListener('pause', onState);
      audio.addEventListener('ended', function(){ if (repeat){ audio.currentTime = 0; audio.play(); } else step(1, true); });
      audio.addEventListener('error', function(){ title.textContent = 'Không phát được bài này'; });
      window.addEventListener('pagehide', saveTime);
      document.addEventListener('visibilitychange', function(){ if (document.hidden) saveTime(); });
      // leaving the home page (the layout removes html.hv2) stops the sound
      new MutationObserver(function(){
        if (!document.documentElement.classList.contains('hv2') && playing()) audio.pause();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    function audioVol(){ var v = parseFloat(get(K.v, '0.7')); return isFinite(v) && v >= 0 && v <= 1 ? v : 0.7; }

    function setOff(off){
      box.classList.toggle('hv2-mu-off', off);
      set(K.off, off ? '1' : '0');
    }
    function onState(){
      var on = playing();
      box.classList.toggle('hv2-mu-play', on);
      playBtn.innerHTML = on ? SVG.pause : SVG.play;
      playBtn.setAttribute('title', on ? 'Tạm dừng' : 'Phát');
      playBtn.setAttribute('aria-label', on ? 'Tạm dừng' : 'Phát');
    }
    function onTime(){
      var d = audio.duration || 0;
      cur.textContent = mmss(audio.currentTime);
      dur.textContent = mmss(d);
      if (d) seek.value = String(Math.round((audio.currentTime / d) * 1000));
      var now = Date.now();
      if (now - saveAt > 5000){ saveAt = now; saveTime(); }
    }
    function saveTime(){ set(K.i, String(i)); set(K.t, String(Math.floor(audio.currentTime || 0))); }

    function select(n, play){
      if (!songs.length) return;
      i = (n + songs.length) % songs.length;
      var s = songs[i];
      audio.src = s.file;
      title.textContent = s.title;
      title.setAttribute('title', s.title);
      artist.textContent = s.artist || '';
      disc.style.backgroundImage = 'url("' + cover(s) + '")';
      mini.style.backgroundImage = 'url("' + cover(s) + '")';
      [].forEach.call(listEl.children, function(li, k){ li.classList.toggle('on', k === i); });
      set(K.i, String(i));
      set(K.t, '0');
      if (play) audio.play().catch(function(){});
    }
    function step(d, play){
      if (songs.length < 2) return select(i, play);
      select(shuffle ? Math.floor(Math.random() * songs.length) : i + d, play);
    }
    function toggle(){
      if (playing()) { audio.pause(); saveTime(); return; }
      if (!audio.src) select(i, true); else audio.play().catch(function(){});
    }

    function fill(list){
      songs = list;
      listEl.textContent = '';
      songs.forEach(function(s, k){
        var li = el('li', { text: s.artist ? s.title + ' — ' + s.artist : s.title, title: s.title });
        li.addEventListener('click', function(){ select(k, true); });
        listEl.appendChild(li);
      });
      var saved = parseInt(get(K.i, '0'), 10);
      select(isFinite(saved) && saved >= 0 && saved < songs.length ? saved : 0, false);
      var t = parseInt(get(K.t, '0'), 10);
      if (isFinite(t) && t > 0){
        // the song is only fetched on play, so the saved position is applied once its length is known
        audio.addEventListener('loadedmetadata', function once(){
          audio.removeEventListener('loadedmetadata', once);
          if (t < audio.duration - 2) audio.currentTime = t;
        });
      }
      // the disc is the resting state everywhere: the open box would lie over the tool buttons in the same corner
      setOff(get(K.off, '1') === '1');
      onState();
    }

    function load(){
      if (loaded) return;
      loaded = true;
      fetch(CFG.api, { credentials: 'omit' }).then(function(r){ return r.ok ? r.json() : []; }).then(function(list){
        if (!Array.isArray(list) || !list.length) return;   // no songs in the folder yet: no player
        build();
        fill(list);
      }).catch(function(){});
    }

    if (document.readyState === 'complete') setTimeout(load, 800);
    else window.addEventListener('load', function(){ setTimeout(load, 800); });
  });
})();` : '';
