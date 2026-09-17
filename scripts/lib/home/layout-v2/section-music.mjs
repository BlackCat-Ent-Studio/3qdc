// section-music.mjs — the home page's music player, bottom right, built to look like the one on the page the owner
// picked (lyzwlkj.vip). That player is a hosted third-party widget (myhkw.cn, needs jQuery, plays their own account's
// playlist), so nothing of it is reused: the look was measured off their page (plans\…\reports\ban-nhac-goc\) and
// rebuilt here over the site's own files.
//
// Measured from theirs and kept: 300px wide, 155px body + 25px white strip, background rgba(70,84,115,.8), 5px corners,
// 12px white text in three rows (song / artist / album on the left, time / shuffle / lyrics on the right), the round
// cover in the middle with the play button on it, four 22px controls, and the bottom strip with the playlist button, a
// switch, the orange progress bar, shuffle and volume. Collapsed, it slides off the right edge and leaves its tab.
//
// The songs are whatever audio files sit in overrides/home/nhac on the server: the owner drops a file in, names it
// "Tên bài - Ca sĩ.mp3", and it shows up (server.mjs reads the folder on every request of MUSIC.api, no restart). A
// picture with the same name is its cover, otherwise MUSIC.cover. With no files the player is not built at all.
//
// Browsers block sound until the visitor interacts with the page, so nothing plays by itself and the audio element
// keeps preload="none" (the files are served from this VPS). The song, its position, the volume, shuffle/repeat and the
// collapsed state are kept in the visitor's browser.
import { COMPACT_MQ } from './compact.mjs';

export const MUSIC = {
  enabled: true,
  api: '/3qdc-vi/api/nhac',
  cover: '/3qdc-vi/home/logo-3qdc.webp',
};

// their palette, measured on the page
const BG = 'rgba(70,84,115,.8)';
const BAR = '#ff5722';       // progress fill
const BAR_BG = '#b0aeb2';    // progress track
const INK = '#38343e';       // icons on the white strip

export const MUSIC_CSS = MUSIC.enabled ? `
/* music player, bottom right (look measured on the reference page) */
#hv2-music{display:none}
html.hv2:not(.hv2-embed) #hv2-music{display:block;position:fixed;right:-300px;bottom:40px;width:300px;z-index:13;
  transform:translateX(-300px);transition:transform .3s ease;
  background:${BG};border-radius:5px;box-shadow:0 0 5px 5px rgba(0,0,0,.2);
  color:#fff;font-size:12px;line-height:16px;font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
html.hv2 #hv2-music.hv2-mu-off{transform:translateX(0)}
/* the tab hangs off the player's left edge, so it stays on screen when the player is slid away */
#hv2-music .hv2-mu-tab{position:absolute;left:-20px;bottom:30px;width:20px;height:46px;padding:0;border:0;
  border-radius:5px 0 0 5px;background:${BG};color:#fff;cursor:pointer;line-height:0}
#hv2-music .hv2-mu-tab svg{width:12px;height:12px}
#hv2-music.hv2-mu-off .hv2-mu-tab svg{transform:scaleX(-1)}
#hv2-music .hv2-mu-top{position:relative;height:155px;overflow:hidden;border-radius:5px 5px 0 0;background:rgba(0,0,0,.1)}
#hv2-music .hv2-mu-bg{position:absolute;inset:-20px;background:center/cover no-repeat;filter:blur(16px);opacity:.5}
#hv2-music .hv2-mu-info{position:absolute;left:5px;top:15px;width:290px}
#hv2-music .hv2-mu-row{display:flex;align-items:center;height:16px;margin-bottom:20px}
#hv2-music .hv2-mu-row > span{display:flex;align-items:center;gap:4px;min-width:0}
#hv2-music .hv2-mu-row .hv2-mu-l{flex:0 1 auto;max-width:140px}
#hv2-music .hv2-mu-row .hv2-mu-r{margin-left:auto;flex:0 0 auto}
#hv2-music .hv2-mu-row b{font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hv2-music .hv2-mu-row svg{width:12px;height:13px;flex:0 0 auto;fill:currentColor}
#hv2-music .hv2-mu-r.hv2-mu-btn{cursor:pointer}
#hv2-music .hv2-mu-r.hv2-mu-btn:hover{color:#ffd9a0}
#hv2-music .hv2-mu-r.on{color:#ffb15e}
#hv2-music .hv2-mu-r.hv2-mu-dim{opacity:.5;cursor:default}
/* cover in the middle, turning while the song plays, with the play button on it */
#hv2-music .hv2-mu-disc{position:absolute;left:50%;top:36px;width:100px;height:100px;margin-left:-50px;border-radius:50%;
  border:3px solid rgba(255,255,255,.85);background:#0b0d18 center/cover no-repeat;
  animation:hv2-mu-spin 14s linear infinite;animation-play-state:paused}
#hv2-music.hv2-mu-play .hv2-mu-disc{animation-play-state:running}
@keyframes hv2-mu-spin{to{transform:rotate(360deg)}}
#hv2-music .hv2-mu-status{position:absolute;left:50%;top:64px;margin-left:-22px;width:44px;height:44px;padding:0;
  border:0;border-radius:50%;background:rgba(70,84,115,.5);color:#fff;cursor:pointer;line-height:0;z-index:2}
#hv2-music .hv2-mu-status svg{width:40px;height:40px;fill:currentColor}
#hv2-music .hv2-mu-ctl{position:absolute;left:0;bottom:0;width:300px;height:44px}
#hv2-music .hv2-mu-ctl button{position:absolute;top:11px;width:22px;height:22px;padding:0;border:0;background:transparent;
  color:#fff;cursor:pointer;line-height:0}
#hv2-music .hv2-mu-ctl button svg{width:22px;height:22px;fill:currentColor}
#hv2-music .hv2-mu-ctl button:hover{color:#ffd9a0}
#hv2-music .hv2-mu-first{left:6px}
#hv2-music .hv2-mu-back{left:67px}
#hv2-music .hv2-mu-fwd{right:67px}
#hv2-music .hv2-mu-last{right:6px}
/* white strip: playlist, repeat switch, progress, shuffle, volume */
#hv2-music .hv2-mu-bottom{display:flex;align-items:center;gap:8px;height:25px;padding:0 8px;box-sizing:border-box;
  background:#fff;border-radius:0 0 5px 5px;color:${INK}}
#hv2-music .hv2-mu-bottom button{padding:0;border:0;background:transparent;color:${INK};cursor:pointer;line-height:0}
#hv2-music .hv2-mu-bottom button svg{width:16px;height:16px;fill:currentColor;display:block}
#hv2-music .hv2-mu-bottom button.on{color:${BAR}}
#hv2-music .hv2-mu-sw{position:relative;width:26px;height:14px;border-radius:7px;background:${BAR_BG};cursor:pointer;flex:0 0 auto}
#hv2-music .hv2-mu-sw::after{content:"";position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;
  background:#fff;transition:left .15s ease}
#hv2-music .hv2-mu-sw.on{background:${BAR}}
#hv2-music .hv2-mu-sw.on::after{left:14px}
#hv2-music .hv2-mu-prog{position:relative;flex:1 1 auto;height:5px;border-radius:3px;background:${BAR_BG};cursor:pointer}
#hv2-music .hv2-mu-prog i{position:absolute;left:0;top:0;height:5px;width:0;border-radius:3px;background:${BAR}}
#hv2-music .hv2-mu-prog b{position:absolute;top:-3px;left:0;width:11px;height:11px;margin-left:-5px;border-radius:50%;
  background:#fff;box-shadow:0 0 2px rgba(0,0,0,.45)}
/* playlist opens above the player */
#hv2-music .hv2-mu-list{display:none;position:absolute;right:0;bottom:calc(100% + 6px);width:300px;max-height:200px;
  overflow:auto;margin:0;padding:6px 0;list-style:none;background:rgba(70,84,115,.95);border-radius:5px;
  box-shadow:0 0 5px 5px rgba(0,0,0,.2)}
#hv2-music.hv2-mu-open-list .hv2-mu-list{display:block}
#hv2-music .hv2-mu-list li{padding:5px 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
#hv2-music .hv2-mu-list li:hover{background:rgba(255,255,255,.12)}
#hv2-music .hv2-mu-list li.on{color:#ffb15e}
/* Phones and tablets are a different room, not a smaller desktop: at rest the player is one round 52px disc in the
   thumb corner and covers nothing; tapping it opens a wide, short panel whose buttons are finger-sized. The album line,
   the lyrics item and the two 10-second seek buttons are left out there — too small to hit, and the page has little
   room to spare. */
@media ${COMPACT_MQ}{
  html.hv2:not(.hv2-embed) #hv2-music{right:12px;bottom:calc(12px + env(safe-area-inset-bottom));
    width:min(360px,calc(100vw - 24px));transform:none;transition:none;background:#28314a}
  html.hv2 #hv2-music.hv2-mu-off{transform:none;width:auto;background:transparent;box-shadow:none}
  #hv2-music.hv2-mu-off .hv2-mu-top,#hv2-music.hv2-mu-off .hv2-mu-bottom,#hv2-music.hv2-mu-off .hv2-mu-list{display:none}
  /* at rest: the turning cover is the button */
  #hv2-music .hv2-mu-tab{position:static;display:none;width:52px;height:52px;border-radius:50%;
    border:2px solid rgba(255,255,255,.85);background:${BG} center/cover no-repeat;background-image:var(--hv2-mu-cover);
    box-shadow:0 4px 14px rgba(0,0,0,.5)}
  #hv2-music.hv2-mu-off .hv2-mu-tab{display:block}
  #hv2-music.hv2-mu-off .hv2-mu-tab svg{display:none}
  #hv2-music.hv2-mu-off.hv2-mu-play .hv2-mu-tab{animation:hv2-mu-spin 14s linear infinite}
  /* open: a close button in the panel's corner instead of the desktop tab */
  #hv2-music:not(.hv2-mu-off) .hv2-mu-tab{position:absolute;display:block;left:auto;top:6px;right:6px;width:32px;height:32px;
    border:0;border-radius:50%;background:rgba(0,0,0,.35);box-shadow:none}
  #hv2-music:not(.hv2-mu-off) .hv2-mu-tab svg{display:block;width:14px;height:14px;margin:0 auto}
  /* open panel: cover + text on one line, then the three big controls */
  #hv2-music .hv2-mu-top{height:auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 12px 6px}
  #hv2-music .hv2-mu-disc{position:static;order:1;width:64px;height:64px;margin:0}
  #hv2-music .hv2-mu-status{left:14px;top:22px;margin:0;width:44px;height:44px}
  #hv2-music .hv2-mu-status svg{width:38px;height:38px}
  #hv2-music .hv2-mu-info{position:static;order:2;flex:1 1 0;width:auto;padding-right:30px}
  #hv2-music .hv2-mu-row{height:auto;margin-bottom:6px}
  #hv2-music .hv2-mu-row:last-child{display:none}
  #hv2-music .hv2-mu-row .hv2-mu-l{max-width:none}
  #hv2-music .hv2-mu-ctl{position:static;order:3;width:100%;height:auto;display:flex;align-items:center;
    justify-content:center;gap:34px;padding:2px 0 6px}
  #hv2-music .hv2-mu-ctl button{position:static;top:auto;left:auto;right:auto;width:44px;height:44px}
  #hv2-music .hv2-mu-ctl button svg{width:26px;height:26px;margin:0 auto}
  #hv2-music .hv2-mu-back,#hv2-music .hv2-mu-fwd{display:none}
  /* bottom strip: taller, so every control is a real touch target */
  #hv2-music .hv2-mu-bottom{height:40px;gap:12px;padding:0 12px}
  #hv2-music .hv2-mu-bottom button{width:32px;height:32px;display:flex;align-items:center;justify-content:center}
  #hv2-music .hv2-mu-bottom button svg{width:20px;height:20px}
  #hv2-music .hv2-mu-sw{width:34px;height:18px;border-radius:9px}
  #hv2-music .hv2-mu-sw::after{width:14px;height:14px}
  #hv2-music .hv2-mu-sw.on::after{left:18px}
  #hv2-music .hv2-mu-prog{height:6px}
  #hv2-music .hv2-mu-prog b{top:-4px;width:14px;height:14px;margin-left:-7px}
  /* the playlist fills the panel's width, one finger-sized row per song */
  #hv2-music .hv2-mu-list{left:0;right:0;width:auto;max-height:min(50vh,260px)}
  #hv2-music .hv2-mu-list li{padding:13px 14px}
}
` : '';

export const MUSIC_JS = MUSIC.enabled ? `(function(){
  if (!window.__hv2 || document.documentElement.classList.contains('hv2-embed')) return;
  var CFG = ${JSON.stringify(MUSIC)};
  var K = { i: 'hv2-music-i', t: 'hv2-music-t', v: 'hv2-music-vol', off: 'hv2-music-off', sh: 'hv2-music-shuffle', rp: 'hv2-music-repeat' };
  var SEEK = 10; // seconds the rewind / forward buttons jump
  var SVG = {
    note: '<svg viewBox="0 0 24 24"><path d="M12 3v10.6a4 4 0 1 0 2 3.4V7h5V3h-7z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.6V6h-2v7.4l5.2 3.1 1-1.7-4.2-2.2z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z"/></svg>',
    album: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4V8h-2.2l-2.3 3-1.3-1.7L13.8 6H17V3zM3 6h4.2l6.6 9H17v-3l4 4-4 4v-3h-4.2L6.2 8H3V6zm0 10h4.2l1.7-2.3 1.3 1.7L8.2 18H3v-2z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 5.5l7 4.5-7 4.5v-9z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM11 8H9v8h2V8zm4 0h-2v8h2V8z"/></svg>',
    first: '<svg viewBox="0 0 24 24"><path d="M6 6h2.5v12H6zm12 0v12l-9-6z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M11 6v12l-8-6zm10 0v12l-8-6z"/></svg>',
    fwd: '<svg viewBox="0 0 24 24"><path d="M13 6l8 6-8 6zM3 6l8 6-8 6z"/></svg>',
    last: '<svg viewBox="0 0 24 24"><path d="M15.5 6H18v12h-2.5zM6 6l9 6-9 6z"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M3 5h12v2H3zm0 5h12v2H3zm0 5h8v2H3zm12 .5l6-3.5-6-3.5z"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.6 3l2.2-2.2-1.4-1.4L15.2 10.6 13 8.4 11.6 9.8l2.2 2.2-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2 1.4-1.4L16.6 12z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 5l7 7-7 7z"/></svg>',
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
    var songs = [], i = 0, saveAt = 0, autoOff = false, reopened = false;
    var fetching = false, lastFetch = 0, badFiles = 0;
    var REFRESH_MS = 30000;
    var box, audio, bg, disc, status, title, artist, album, time, shuffleTop, listEl;
    var prog, progFill, progKnob, swRepeat, btnShuffle, btnVol, tab;
    var shuffle = get(K.sh, '0') === '1', repeat = get(K.rp, '0') === '1';

    function icon(svg){ var s = el('span'); s.innerHTML = svg; return s; }
    function button(cls, svg, label, fn){
      var b = el('button', { type: 'button', 'class': cls, title: label, 'aria-label': label });
      b.innerHTML = svg;
      if (fn) b.addEventListener('click', fn);
      return b;
    }
    function row(iconSvg, rightSvg, rightText){
      var r = el('div', { 'class': 'hv2-mu-row' });
      var l = el('span', { 'class': 'hv2-mu-l' });
      l.appendChild(icon(iconSvg));
      var lb = el('b');
      l.appendChild(lb);
      r.appendChild(l);
      var rt = el('span', { 'class': 'hv2-mu-r' });
      rt.appendChild(icon(rightSvg));
      var rb = el('b', { text: rightText });
      rt.appendChild(rb);
      r.appendChild(rt);
      return { row: r, left: lb, right: rt, rightText: rb };
    }
    function playing(){ return audio && !audio.paused && !audio.ended; }
    function cover(s){ return (s && s.cover) || CFG.cover; }
    function vol0(){ var v = parseFloat(get(K.v, '0.7')); return isFinite(v) && v >= 0 && v <= 1 ? v : 0.7; }

    function build(){
      box = el('div', { id: 'hv2-music', 'data-home-v2': '', role: 'region', 'aria-label': 'Nhạc nền' });
      audio = el('audio', { preload: 'none' });
      tab = button('hv2-mu-tab', SVG.arrow, 'Thu gọn trình phát nhạc', function(){ setOff(!box.classList.contains('hv2-mu-off'), true); });

      var top = el('div', { 'class': 'hv2-mu-top' });
      bg = el('div', { 'class': 'hv2-mu-bg' });
      var info = el('div', { 'class': 'hv2-mu-info' });
      var r1 = row(SVG.note, SVG.clock, '0:00 / 0:00');
      var r2 = row(SVG.user, SVG.shuffle, 'Ngẫu nhiên');
      var r3 = row(SVG.album, SVG.pin, 'Lời bài hát');
      title = r1.left; time = r1.rightText; artist = r2.left; album = r3.left;
      shuffleTop = r2.right;
      shuffleTop.classList.add('hv2-mu-btn');
      shuffleTop.setAttribute('title', 'Phát ngẫu nhiên');
      shuffleTop.addEventListener('click', toggleShuffle);
      // no .lrc files yet, so the lyrics item is only shown, greyed out
      r3.right.classList.add('hv2-mu-dim');
      r3.right.setAttribute('title', 'Chưa có lời bài hát');
      info.appendChild(r1.row); info.appendChild(r2.row); info.appendChild(r3.row);

      disc = el('div', { 'class': 'hv2-mu-disc' });
      status = button('hv2-mu-status', SVG.play, 'Phát', toggle);
      var ctl = el('div', { 'class': 'hv2-mu-ctl' });
      ctl.appendChild(button('hv2-mu-first', SVG.first, 'Bài trước', function(){ step(-1, true); }));
      ctl.appendChild(button('hv2-mu-back', SVG.back, 'Lùi ' + SEEK + ' giây', function(){ audio.currentTime = Math.max(0, audio.currentTime - SEEK); }));
      ctl.appendChild(button('hv2-mu-fwd', SVG.fwd, 'Tới ' + SEEK + ' giây', function(){ if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + SEEK); }));
      ctl.appendChild(button('hv2-mu-last', SVG.last, 'Bài sau', function(){ step(1, true); }));
      top.appendChild(bg); top.appendChild(info); top.appendChild(disc); top.appendChild(status); top.appendChild(ctl);

      var bottom = el('div', { 'class': 'hv2-mu-bottom' });
      bottom.appendChild(button('hv2-mu-listbtn', SVG.list, 'Danh sách bài hát', function(){ box.classList.toggle('hv2-mu-open-list'); }));
      swRepeat = el('span', { 'class': 'hv2-mu-sw', role: 'switch', title: 'Lặp lại một bài', 'aria-label': 'Lặp lại một bài' });
      swRepeat.addEventListener('click', function(){
        repeat = !repeat; set(K.rp, repeat ? '1' : '0');
        swRepeat.classList.toggle('on', repeat);
        swRepeat.setAttribute('aria-checked', repeat ? 'true' : 'false');
      });
      swRepeat.classList.toggle('on', repeat);
      swRepeat.setAttribute('aria-checked', repeat ? 'true' : 'false');
      bottom.appendChild(swRepeat);
      prog = el('div', { 'class': 'hv2-mu-prog', role: 'slider', 'aria-label': 'Vị trí bài hát' });
      progFill = el('i'); progKnob = el('b');
      prog.appendChild(progFill); prog.appendChild(progKnob);
      prog.addEventListener('click', function(e){
        if (!audio.duration) return;
        var r = prog.getBoundingClientRect();
        audio.currentTime = audio.duration * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      });
      bottom.appendChild(prog);
      btnShuffle = button('hv2-mu-shufflebtn', SVG.shuffle, 'Phát ngẫu nhiên', toggleShuffle);
      btnShuffle.classList.toggle('on', shuffle);
      bottom.appendChild(btnShuffle);
      btnVol = button('hv2-mu-vol', SVG.vol, 'Tắt tiếng', function(){
        audio.volume = audio.volume > 0 ? 0 : (vol0() || 0.7);
        if (audio.volume > 0) set(K.v, String(audio.volume));
        btnVol.innerHTML = audio.volume > 0 ? SVG.vol : SVG.mute;
        btnVol.setAttribute('title', audio.volume > 0 ? 'Tắt tiếng' : 'Bật tiếng');
      });
      bottom.appendChild(btnVol);

      listEl = el('ul', { 'class': 'hv2-mu-list' });

      box.appendChild(tab); box.appendChild(top); box.appendChild(bottom); box.appendChild(listEl); box.appendChild(audio);
      document.body.appendChild(box);

      audio.volume = vol0();
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('loadedmetadata', onTime);
      audio.addEventListener('play', onState);
      audio.addEventListener('pause', onState);
      audio.addEventListener('ended', function(){ if (repeat){ audio.currentTime = 0; audio.play(); } else step(1, true); });
      // a song deleted in /quan-tri while someone is listening: move on to the next one instead of stopping dead
      // (badFiles guards against walking a whole broken list; a song that plays clears it)
      audio.addEventListener('playing', function(){ badFiles = 0; });
      audio.addEventListener('error', function(){
        if (!audio.src) return;
        if (songs.length > 1 && ++badFiles < songs.length){ step(1, true); return; }
        title.textContent = 'Không phát được bài này';
      });
      window.addEventListener('pagehide', saveTime);
      document.addEventListener('visibilitychange', function(){ if (document.hidden) saveTime(); });
      // once the download sidebar slides in (same corner), the player tucks itself away unless the viewer opened it again;
      // back at the top of the page it comes out. Leaving the home page stops the sound.
      new MutationObserver(function(){
        var html = document.documentElement;
        if (!html.classList.contains('hv2') && playing()) audio.pause();
        var scrolled = html.classList.contains('hv2-scrolled');
        if (!scrolled){ reopened = false; if (autoOff){ autoOff = false; setOff(false, false); } }
        else if (!autoOff && !reopened && !box.classList.contains('hv2-mu-off')){ autoOff = true; setOff(true, false); }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    function toggleShuffle(){
      shuffle = !shuffle;
      set(K.sh, shuffle ? '1' : '0');
      btnShuffle.classList.toggle('on', shuffle);
      shuffleTop.classList.toggle('on', shuffle);
    }
    function setOff(off, byViewer){
      box.classList.toggle('hv2-mu-off', off);
      tab.setAttribute('title', off ? 'Mở trình phát nhạc' : 'Thu gọn trình phát nhạc');
      tab.setAttribute('aria-label', tab.getAttribute('title'));
      if (byViewer){
        set(K.off, off ? '1' : '0');
        autoOff = false;
        // opening it by hand while scrolled means "leave it out"; opening it at the top of the page does not stop the
        // player from tucking itself away again when the sidebar slides in
        reopened = !off && document.documentElement.classList.contains('hv2-scrolled');
      }
    }
    function onState(){
      var on = playing();
      box.classList.toggle('hv2-mu-play', on);
      status.innerHTML = on ? SVG.pause : SVG.play;
      status.setAttribute('title', on ? 'Tạm dừng' : 'Phát');
      status.setAttribute('aria-label', on ? 'Tạm dừng' : 'Phát');
    }
    function onTime(){
      var d = audio.duration || 0;
      time.textContent = mmss(audio.currentTime) + ' / ' + mmss(d);
      var p = d ? (audio.currentTime / d) : 0;
      progFill.style.width = (p * 100) + '%';
      progKnob.style.left = (p * 100) + '%';
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
      artist.textContent = s.artist || '—';
      album.textContent = s.title;
      disc.style.backgroundImage = 'url("' + cover(s) + '")';
      bg.style.backgroundImage = 'url("' + cover(s) + '")';
      // on phones the collapsed player IS this cover (see --hv2-mu-cover in the compact rules)
      box.style.setProperty('--hv2-mu-cover', 'url("' + cover(s) + '")');
      markList();
      set(K.i, String(i)); set(K.t, '0');
      if (play) audio.play().catch(function(){});
    }
    function step(d, play){
      if (songs.length < 2) return select(i, play);
      select(shuffle ? Math.floor(Math.random() * songs.length) : i + d, play);
    }
    function toggle(){
      if (playing()){ audio.pause(); saveTime(); return; }
      if (!audio.src) select(i, true); else audio.play().catch(function(){});
    }

    // the <li> list and the songs array; used both on the first fill and on every later refresh
    function fillList(list){
      songs = list;
      listEl.textContent = '';
      songs.forEach(function(s, k){
        var li = el('li', { text: s.artist ? s.title + ' — ' + s.artist : s.title, title: s.title });
        li.addEventListener('click', function(){ select(k, true); });
        listEl.appendChild(li);
      });
    }
    function markList(){
      [].forEach.call(listEl.children, function(li, k){ li.classList.toggle('on', k === i); });
    }
    function fill(list){
      fillList(list);
      var saved = parseInt(get(K.i, '0'), 10);
      select(isFinite(saved) && saved >= 0 && saved < songs.length ? saved : 0, false);
      var t = parseInt(get(K.t, '0'), 10);
      if (isFinite(t) && t > 0){
        audio.addEventListener('loadedmetadata', function once(){
          audio.removeEventListener('loadedmetadata', once);
          if (t < audio.duration - 2) audio.currentTime = t;
        });
      }
      // phones start with just the disc so the page stays clear; on a mouse screen the panel is open
      setOff(get(K.off, api.compact() ? '1' : '0') === '1', false);
      if (document.documentElement.classList.contains('hv2-scrolled') && !box.classList.contains('hv2-mu-off')){
        autoOff = true; setOff(true, false);
      }
      onState();
      onTime();
    }

    // Asking the server for the songs. A failed request (server restarting, a hiccup on the way) answers null, which is
    // NOT the same as an empty folder: only a real answer with no songs in it means "nothing to show". That difference is
    // why the player once vanished for a whole visit after a bad deploy.
    function fetchList(){
      if (fetching) return Promise.resolve(null);
      fetching = true;
      lastFetch = Date.now();
      return fetch(CFG.api, { credentials: 'omit', cache: 'no-store' })
        .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function(list){ fetching = false; return Array.isArray(list) ? list : []; })
        .catch(function(){ fetching = false; return null; });
    }
    function load(tries){
      fetchList().then(function(list){
        if (list === null){
          if (tries < 3) setTimeout(function(){ load(tries + 1); }, tries === 0 ? 2000 : 5000);
          return;
        }
        if (!list.length) return;   // the folder really is empty: no player
        if (!box) build();
        fill(list);
      });
    }
    // Songs added or deleted in /quan-tri show up without reloading the page: the list is asked again when the viewer
    // comes back to this tab (at most once every REFRESH_MS). A failed ask or an empty answer never removes the player
    // that is already playing.
    function refresh(){
      if (document.hidden || Date.now() - lastFetch < REFRESH_MS) return;
      fetchList().then(function(list){
        if (list === null || !list.length) return;
        if (!box){ build(); fill(list); return; }
        if (songs.length === list.length && songs.every(function(s, k){ return s.file === list[k].file; })) return;
        var cur = songs[i] && songs[i].file;
        fillList(list);
        var at = -1;
        list.forEach(function(s, k){ if (s.file === cur) at = k; });
        if (at >= 0){ i = at; markList(); return; }   // same song still there: keep playing it
        if (playing()) audio.pause();
        select(0, false);
      });
    }

    document.addEventListener('visibilitychange', function(){ if (!document.hidden) refresh(); });
    window.addEventListener('focus', refresh);

    if (document.readyState === 'complete') setTimeout(function(){ load(0); }, 800);
    else window.addEventListener('load', function(){ setTimeout(function(){ load(0); }, 800); });
  });
})();` : '';
