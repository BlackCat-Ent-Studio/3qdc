// section-mascot.mjs — talking Live2D mascot in the bottom-left corner of the home page, the news pages and the early
// sign-up page (not /quan-tri, not the old wiki).
// Behaviour follows the open-source live2d-widget (stevenjoezhang, GPL-3.0) the owner picked from another site: a Live2D
// model that breathes and follows the mouse, a speech bubble (greeting by hour, a line for each part of the page under the
// mouse, a line when the mascot is clicked, idle chatter, holidays, coming back to the tab, copying text), a "talk" button
// and a "hide" button with a small tab to bring it back. The box, bubble and buttons are written here with Vietnamese
// lines; the widget's asteroids game, photo, hitokoto and GitHub buttons are left out.
//
// Models are drawn by the two loaders of live2d-widgets 1.0.1 (overrides/home/linh-vat/runtime/, see waifu-tips.js
// there): chunk/index.js with the Cubism 2 core live2d.min.js for an index.json + .moc model, chunk/index2.js with the
// Cubism 5 core for a .model3.json model (Cubism 3, 4 or 5). The version is read from the model file, and only the
// loader it needs is fetched. The Cubism 5 core is Live2D's own file (Live2D Proprietary Software License, free for a
// publisher under Live2D's small-business revenue line; the owner confirmed the studio is under it on 2026-10-27).
//
// MASCOT: Min, the studio's black cat, a Cubism 4 model the owner commissioned (2026-10). The web copy in
// overrides/home/linh-vat/min/ is built from the VTube Studio export with textures cut from 8192 to 2048 and nine
// expressions declared in min.model3.json; each line the mascot says can carry one of them (MOODS below), and the face
// goes back to normal when the line ends. A model without those expressions (Cubism 2, like the old Tia) just talks.
// To swap: put the model folder in overrides/home/linh-vat/<name>/ and point MASCOT.model at its index.json or
// .model3.json (restart). MASCOT.enabled = false removes the mascot.
//
// The loader (~210KB + Live2D's core) and the model (~4.5MB for Min) load only after the page has finished loading,
// and only when the visitor has not hidden the mascot. Drawing stops while the mascot is hidden or the visitor is on
// another page of the app.

import { COMPACT_MQ } from './compact.mjs';
import { pageHostJs, alsoOnPages } from './page-host.mjs';

export const MASCOT = {
  enabled: true,
  name: 'Min',
  model: '/3qdc-vi/home/linh-vat/min/min.model3.json',
  runtime: '/3qdc-vi/home/linh-vat/runtime/',
  cubism5Core: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
  // Min's head-tilt parameter (ParamAngleY) is rigged the other way round from Live2D's usual "positive = look up":
  // with the mouse above her the eyes looked up but the head bowed down. true = turn that parameter round.
  flipHeadY: true,
};

// [hour from, hour to, line]: greeting when the page opens
const GREETINGS = [
  [5, 10, 'Chào buổi sáng! Chúa công đã sẵn sàng chinh chiến Tam Quốc chưa?'],
  [11, 13, 'Buổi trưa rồi, nghỉ tay ăn cơm rồi hẵng ra trận nhé!'],
  [14, 17, 'Chiều nay chúa công định chiêu mộ vị tướng nào đây?'],
  [18, 21, 'Chào buổi tối! Vào game đánh vài trận cho vui nào~'],
  [22, 23, 'Khuya rồi đó, chơi xong nhớ đi ngủ sớm nha!'],
  [0, 4, 'Giờ này mà chúa công còn thức sao? Cú đêm chính hiệu rồi~'],
];

// [selector, lines, mood?]: first match of the element under the mouse wins, so the more specific selectors come
// first; the mood is the face the mascot makes while saying the line (MOODS)
const HOVER = [
  ['#hv2-mascot canvas', ['Ơ… chúa công định làm gì đó?', 'Đừng chọc ta nữa mà~', 'Hì hì, nhột quá!', 'Ta đang canh cửa trang chủ đó nha!'], 'do-mat'],
  ['#hv2-mascot-talk', ['Muốn nghe ta kể chuyện không?', 'Bấm vào đây ta nói cho nghe nè!']],
  ['#hv2-mascot-hide', ['Chúa công muốn ta tạm lui sao?', 'Đừng đuổi ta đi mà…'], 'khoc'],
  ['.star-site-index-navs__item a[href="#/main/news"]', ['Tin mới nhất, sự kiện hot đều ở mục Tin tức!'], 'mat-to'],
  ['.star-site-index-navs__item a[href="#/main/person"]', ['Xem các danh tướng Tam Quốc ở mục Tướng nào!']],
  ['.star-site-index-navs__item a[href="#/main/feature"]', ['Những tính năng đặc sắc nhất của game đây!']],
  ['.star-site-index-navs__item a[href="#/index"]', ['Về đầu trang chủ nè.']],
  ['#hv2-dlpanel, #hv2-sidebar', ['Tải game ngay để cùng ta chinh phạt thiên hạ!', 'Quét mã QR là tải được liền đó!'], 'mat-to'],
  ['#hv2-social', ['Theo dõi fanpage để không lỡ quà tặng nha!', 'Vào cộng đồng giao lưu với các chúa công khác nào~'], 'logo'],
  ['#hv2-news', ['Có tin gì mới không ta? Cùng xem nào!']],
  ['#hv2-heroes', ['Mỗi phe đều có những vị tướng rất mạnh đó!', 'Chúa công thích tướng phe nào nhất?']],
  ['#hv2-features', ['Tính năng nào cũng thú vị hết á!']],
  // other pages (scoped by html.hv2-m-page so none of these fire on the home page)
  // news pages (list and article; their body is .has-site-h): shared header, then the list, then the article
  ['html.hv2-m-page .site-h .logo', ['Logo 3Q Đại Chiến đó, bấm vào là về trang chủ!'], 'logo'],
  ['html.hv2-m-page .site-h .nav a[href="/"]', ['Quay về trang chủ nè!', 'Về trang chủ xem tướng với tính năng nào!']],
  ['html.hv2-m-page .site-h .nav a[href="/tin-tuc"]', ['Tin mới nhất, sự kiện hot đều ở mục Tin tức!'], 'mat-to'],
  ['html.hv2-m-page .site-h .theme-btn', ['Đổi giao diện sáng tối cho dễ đọc nè!']],
  ['html.hv2-m-page .site-h .btn-fire', ['Tải game ngay để cùng ta chinh phạt thiên hạ!'], 'mat-to'],
  ['html.hv2-m-page #news-app .tab', ['Chọn Thông báo, Sự kiện hay Cẩm nang để lọc tin nha!']],
  ['html.hv2-m-page #news-app .search', ['Gõ từ khoá vào đây để tìm bài viết nè!']],
  ['html.hv2-m-page .has-site-h .feat, html.hv2-m-page .has-site-h .card', ['Bài này hay lắm, bấm vào đọc thử đi!', 'Có tin gì mới không ta? Cùng xem nào!']],
  ['html.hv2-m-page .has-site-h .share', ['Thấy hay thì chia sẻ cho bạn bè cùng đọc nha!']],
  ['html.hv2-m-page .has-site-h .pn', ['Đọc tiếp bài trước hoặc bài sau nè.']],
  ['html.hv2-m-page .has-site-h .aside', ['Mục lục của bài và các bài cùng chủ đề ở đây!']],
  ['html.hv2-m-page .has-site-h .prose', ['Đọc kỹ nha, cẩm nang này giúp chúa công mạnh lên nhiều đó!']],
  // early sign-up page
  ['html.hv2-m-page .hd .medal', ['Logo 3Q Đại Chiến đó, bấm vào là về trang chủ!'], 'logo'],
  ['html.hv2-m-page .hd nav.l a[href="/"]', ['Quay về trang chủ nè!']],
  ['html.hv2-m-page .hd [data-soon]', ['Theo dõi Fanpage và Group để không lỡ quà tặng nha!'], 'logo'],
  ['html.hv2-m-page #go-register', ['Bấm vào đây để đăng ký sớm nhận quà nè!'], 'mat-to'],
  ['html.hv2-m-page .hero .art-btn.gold', ['Đăng ký sớm trên cửa hàng ứng dụng để nhận tướng nha!'], 'mat-to'],
  ['html.hv2-m-page #dks-form', ['Nhập số điện thoại để đăng ký sớm, quà sẽ gửi theo số này!']],
  ['html.hv2-m-page #dang-ky', ['Làm đủ 3 bước là nhận trọn quà đăng ký sớm đó!']],
  ['html.hv2-m-page .claim', ['Đạt mốc rồi thì quà sẽ nhận ở đây nha!'], 'mat-to'],
  ['html.hv2-m-page #moc', ['Càng nhiều người đăng ký, quà mốc càng to!', 'Cùng rủ bạn bè đăng ký để đạt mốc nào!'], 'mat-to'],
  ['html.hv2-m-page #moi-ban', ['Mời bạn bè cùng đăng ký để nhận thêm quà nè!'], 'mat-to'],
  ['html.hv2-m-page #tinh-nang', ['Những tính năng đặc sắc nhất của game đây!', 'Tính năng nào cũng thú vị hết á!']],
  ['html.hv2-m-page #top', ['Bảng xếp hạng lực chiến sẽ có khi máy chủ mở nha!']],
  ['html.hv2-m-page .site-f, html.hv2-m-page .ft', ['Cảm ơn chúa công đã ghé thăm nha!']],
];

const CLICK = ['Á! Đừng chọc ta mà~', 'Ơ! Chúa công làm ta giật mình!', 'Chúa công rảnh quá ha?', 'Nhột quá đi mất!'];
// poked again and again (ANGRY_POKES within ANGRY_WINDOW)
const ANGRY = ['Hừ, ta giận đó nha!', 'Chọc nữa là ta cắn đó!', 'Ta sẽ mách Gia Cát Lượng đó!'];

// idle chatter (every 20s without mouse or keyboard) and the "talk" button
const TALK = [
  'Lâu quá không thấy chúa công tương tác, ta buồn đó…',
  'Nhớ lưu trang này lại để ghé thăm thường xuyên nha!',
  'Nghe nói sắp có sự kiện mới đó, chờ xem nhé!',
  'Chúa công đã tải game chưa? Vào chơi với ta đi~',
  'Ta nghe nói Triệu Vân một mình phá trăm vạn quân Tào đó!',
  'Thiên hạ đại thế, hợp lâu tất phân, phân lâu tất hợp…',
  'Rê chuột quanh trang đi, ta sẽ giới thiệu từng chỗ cho nghe!',
];

// ['MM-DD' or 'MM-DD..MM-DD', line]: added to the idle lines on those days
const HOLIDAYS = [
  ['01-01', 'Chúc mừng năm mới {year}! Năm nay chúc chúa công gặp toàn tướng xịn!'],
  ['02-14', 'Hôm nay Valentine đó, chúa công có hẹn ai chưa?'],
  ['03-08', 'Hôm nay là 8/3, nhớ tặng hoa cho các nàng nhé!'],
  ['04-30', 'Chào mừng ngày Giải phóng miền Nam 30/4!'],
  ['05-01', 'Quốc tế Lao động 1/5 rồi, nghỉ ngơi và vào game thôi!'],
  ['06-01', 'Tết thiếu nhi 1/6 vui vẻ nha~'],
  ['09-02', 'Mừng Quốc khánh 2/9!'],
  ['10-20', 'Chúc mừng ngày Phụ nữ Việt Nam 20/10!'],
  ['11-20', 'Ngày Nhà giáo Việt Nam 20/11, nhớ tri ân thầy cô nha!'],
  ['12-20..12-31', 'Giáng sinh sắp tới rồi, ông già Noel có mang tướng mới không ta?'],
];

const MESSAGES = {
  back: 'A, chúa công quay lại rồi!',
  copy: 'Chúa công vừa sao chép gì đó? Chia sẻ nhớ ghi nguồn 3Q Đại Chiến nha~',
  hide: 'Vậy ta tạm lui, khi nào cần cứ gọi ta nhé!',
  show: 'Ta quay lại rồi đây!',
};

// Faces (expression names in min.model3.json) for the moments that are not hover lines; 'thuong' is the normal face
// she goes back to when a line ends. 'vui' (smile) is built from the eye-smile / mouth-form / cheek parameters, but
// the artist left those unrigged, so for now it looks like the normal face; a smile added to the model later shows
// up here without code changes. 'logo' shows the GrowX X, which the owner hid for now (2026-10-27): the web
// texture_00.png has the X made transparent, the copy with it is kept in /srv/_backup/min-co-logo/. While LOGO_SHOWN
// is false a 'logo' mood is shown as 'vui'.
// The cry face also plays the tear loop (motion group "Cry") until the line ends.
const MOODS = {
  greet: 'vui', night: 'buon-ngu', talk: 'vui', poke: 'ngac-nhien', angry: 'gian', idle: 'buon-ngu',
  hide: 'khoc', show: 'chui-hop', back: 'vui', copy: 'logo',
};
const LOGO_SHOWN = false;
// pokes within this many ms that make her angry
const ANGRY_POKES = 3, ANGRY_WINDOW = 5000;
// Who may cut whom off: something the visitor does to her (poke, hide, call back, talk button) always gets an answer;
// a line about the part of the page under the mouse comes next; her own chatter (greeting, idle talk, coming back to
// the tab, copying) never blocks either of them. (The owner found her too slow to react while she was chattering.)
const PRIO = { chatter: 9, hover: 10, action: 12 };

// box: square, sized from the room under the vertically centred social bar (407px high with its cloud frame), then
// grown by GROW because the client asked for a bigger mascot. At GROW = 1.26 the top of the box reaches about 30-40px
// into the bar's row; the icons stay clickable because that corner of the artwork is transparent, so a future mascot
// with tall hair or a hat needs this measured again (verify\check-mascot-size.cjs).
// The speech bubble sits to the right of the mascot, clear of the bar.
const SOCIAL_BAR_H = 407;
const GROW = 1.26;
const MAX_BOX = Math.round(250 * GROW);
// square side on a phone: about a third of a 393px screen, small enough to leave the page readable
const PHONE_BOX = 130;
// Min's model leaves an empty strip under her paws, 6.8% of the box at every size (measured 2026-10-27); the box is
// pushed that far below the screen edge (a hair less) so she sits on the bottom edge, as the owner asked.
const FEET_GAP = 0.065;

// the rules are written for the home page (html.hv2); alsoOnPages() gives each one to the other pages (html.hv2-m-page)
export const MASCOT_CSS = MASCOT.enabled ? alsoOnPages(`
#hv2-mascot,#hv2-mascot-toggle{display:none}
html.hv2:not(.hv2-embed) #hv2-mascot{--hv2-m:min(${MAX_BOX}px,calc((100vh - ${SOCIAL_BAR_H}px) / 2 * ${GROW} - 8px));display:block;position:fixed;
  left:6px;bottom:calc(var(--hv2-m) * -${FEET_GAP});width:var(--hv2-m);height:var(--hv2-m);z-index:11;pointer-events:none;transition:transform .5s ease}
#hv2-mascot.hv2-m-off{transform:translateY(110%)}
#hv2-mascot canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;cursor:grab}
#hv2-mascot .hv2-m-tips{position:absolute;left:76%;bottom:60%;width:220px;padding:8px 12px;box-sizing:border-box;
  background:rgba(255,246,227,.94);border:1px solid rgba(201,154,74,.8);border-radius:12px;
  box-shadow:0 3px 12px rgba(0,0,0,.35);color:#4a2e12;font:14px/1.45 system-ui,sans-serif;text-align:left;
  opacity:0;transform:translateY(-6px);transition:opacity .3s,transform .3s;pointer-events:none}
#hv2-mascot .hv2-m-tips.on{opacity:1;transform:none}
#hv2-mascot .hv2-m-tools{position:absolute;right:-30px;bottom:18%;display:flex;flex-direction:column;gap:6px;
  opacity:0;transition:opacity .3s;pointer-events:auto}
#hv2-mascot:hover .hv2-m-tools,#hv2-mascot .hv2-m-tools:focus-within{opacity:1}
#hv2-mascot .hv2-m-tools button{width:28px;height:28px;padding:5px;border:1px solid rgba(201,154,74,.8);border-radius:50%;
  background:rgba(22,39,59,.9);color:#f3d9a0;cursor:pointer}
#hv2-mascot .hv2-m-tools button:hover{color:#fff;background:#9a4a12}
#hv2-mascot .hv2-m-tools svg{display:block;width:100%;height:100%;fill:currentColor}
html.hv2:not(.hv2-embed) #hv2-mascot-toggle.on{display:block;position:fixed;left:0;bottom:64px;z-index:11;padding:8px 6px;
  border:1px solid rgba(201,154,74,.8);border-left:0;border-radius:0 8px 8px 0;background:rgba(22,39,59,.92);color:#f3d9a0;
  font:13px/1 system-ui,sans-serif;writing-mode:vertical-rl;cursor:pointer}
html.hv2:not(.hv2-embed) #hv2-mascot-toggle.on:hover{color:#fff;background:#9a4a12}
/* Phones: the client asked for the mascot with her mouth moving and the speech bubble above her, nothing else.
   She sits in the free bottom-left corner (the music button owns the bottom-right), the bubble goes over her head
   because there is no room beside her, and the hide button stays visible since a finger cannot hover. */
@media ${COMPACT_MQ}{
  /* flush with the bottom edge: an 8px gap here reads as a dark strip under her feet on a dense phone screen
     (about 22 device pixels on the owner's Redmi) */
  html.hv2:not(.hv2-embed) #hv2-mascot{--hv2-m:${PHONE_BOX}px;left:8px;bottom:calc(var(--hv2-m) * -${FEET_GAP})}
  #hv2-mascot .hv2-m-tips{left:0;right:auto;bottom:100%;width:min(62vw,240px);margin-bottom:8px;font-size:13.5px}
  #hv2-mascot .hv2-m-tools{right:2px;bottom:auto;top:2px;opacity:1;gap:8px}
  #hv2-mascot .hv2-m-tools button{width:32px;height:32px;padding:7px;background:rgba(22,39,59,.92)}
  #hv2-mascot-talk{display:none}
  /* a finger dragging across her must scroll the page, not be swallowed by the model */
  #hv2-mascot canvas{touch-action:pan-y}
  html.hv2:not(.hv2-embed) #hv2-mascot-toggle.on{bottom:96px;min-height:44px;padding:10px 7px}
}
@media (max-height:600px){html.hv2:not(.hv2-embed) #hv2-mascot,html.hv2:not(.hv2-embed) #hv2-mascot-toggle.on{display:none}}
@media (prefers-reduced-motion:reduce){#hv2-mascot,#hv2-mascot .hv2-m-tips{transition:none}}
`, 'hv2-m-page') : '';

export const MASCOT_JS = MASCOT.enabled ? `(function(){
  if (document.documentElement.classList.contains('hv2-embed')) return;
  // on the home page it uses the layout's helpers; on the news and early sign-up pages it runs on its own (page-host.mjs)
  ${pageHostJs('hv2-m-page')}
  var CFG = ${JSON.stringify({ MASCOT, GREETINGS, HOVER, CLICK, ANGRY, TALK, HOLIDAYS, MESSAGES, MOODS, LOGO_SHOWN, ANGRY_POKES, ANGRY_WINDOW, PRIO })};
  var HIDE_KEY = 'hv2-mascot-hidden';
  var ICON_TALK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6L4 21l4.6-2.6c1.1.3 2.2.4 3.4.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg>';
  var ICON_HIDE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/></svg>';

  host.onMount(function(api){
    var el = api.el;
    var box, tips, toggle, started = false, timer = null, level = -1, engine = null;

    function pick(a){ return Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a; }
    function hidden(){ try { return localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; } }
    function setHidden(v){ try { if (v) localStorage.setItem(HIDE_KEY, '1'); else localStorage.removeItem(HIDE_KEY); } catch (e) {} }
    // the face for a line: a model without expressions (Cubism 2) has no engine.face and only talks
    function face(mood){
      if (!engine || !engine.face) return;
      if (mood === 'logo' && !CFG.LOGO_SHOWN) mood = 'vui';
      engine.face(mood || 'thuong', mood === 'khoc');
    }
    // A line with a lower priority never replaces one still showing with a higher priority (PRIO). While it shows she
    // makes the given face, then goes back to the normal face. The bubble stays about as long as it takes to read the
    // line (never longer than ms), and her mouth moves only for a short moment, not for the whole bubble: the owner
    // found her chattering through every word too much.
    var mouthTimer = null;
    function say(text, ms, priority, mood){
      if (!text || !tips || (level > priority && timer)) return;
      clearTimeout(timer); clearTimeout(mouthTimer);
      level = priority;
      var line = pick(text);
      tips.textContent = line;
      tips.classList.add('on');
      face(mood);
      if (engine && engine.talking){
        engine.talking(true);
        mouthTimer = setTimeout(function(){ engine.talking(false); }, Math.min(1500, 300 + line.split(' ').length * 120));
      }
      timer = setTimeout(function(){
        tips.classList.remove('on'); timer = null; level = -1;
        face('thuong');
      }, Math.min(ms, 1800 + line.length * 45));
    }
    function night(){ var h = new Date().getHours(); return h >= 22 || h <= 4; }
    function greeting(){
      var h = new Date().getHours();
      for (var i = 0; i < CFG.GREETINGS.length; i++){ var g = CFG.GREETINGS[i]; if (h >= g[0] && h <= g[1]) return g[2]; }
      return CFG.TALK[0];
    }
    function holidayLines(){
      var d = new Date(), md = ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2), out = [];
      CFG.HOLIDAYS.forEach(function(x){
        var r = x[0].split('..'), from = r[0], to = r[1] || r[0];
        if (md >= from && md <= to) out.push(x[1].replace('{year}', d.getFullYear()));
      });
      return out;
    }
    // shown on phones too now; only a screen too short for her (a phone turned sideways) is left out, which is the
    // same line the CSS draws with max-height:600px
    function showing(){ return window.innerHeight > 600; }

    function build(){
      box = el('div', { id: 'hv2-mascot', 'data-home-v2': '', 'aria-label': 'Linh vật ' + CFG.MASCOT.name });
      tips = el('div', { 'class': 'hv2-m-tips', role: 'status', 'aria-live': 'polite' });
      // both loaders look the canvas up by this id
      var canvas = el('canvas', { id: 'live2d', width: '600', height: '600' });
      var tools = el('div', { 'class': 'hv2-m-tools' });
      var talk = el('button', { type: 'button', id: 'hv2-mascot-talk', title: 'Nói chuyện', 'aria-label': 'Nói chuyện' });
      var hide = el('button', { type: 'button', id: 'hv2-mascot-hide', title: 'Ẩn linh vật', 'aria-label': 'Ẩn linh vật' });
      talk.innerHTML = ICON_TALK; hide.innerHTML = ICON_HIDE;
      tools.appendChild(talk); tools.appendChild(hide);
      box.appendChild(tips); box.appendChild(canvas); box.appendChild(tools);
      toggle = el('button', { type: 'button', id: 'hv2-mascot-toggle', 'data-home-v2': '' }, ['Linh vật']);
      document.body.appendChild(box); document.body.appendChild(toggle);

      talk.addEventListener('click', function(){ say(CFG.TALK.concat(holidayLines()), 6000, CFG.PRIO.action, CFG.MOODS.talk); });
      // she cries a moment, then slides down
      hide.addEventListener('click', function(){
        say(CFG.MESSAGES.hide, 1800, CFG.PRIO.action, CFG.MOODS.hide);
        setHidden(true);
        setTimeout(function(){ box.classList.add('hv2-m-off'); toggle.classList.add('on'); sync(); }, 1300);
      });
      toggle.addEventListener('click', function(){
        setHidden(false);
        toggle.classList.remove('on');
        box.classList.remove('hv2-m-off');
        start();
        sync();
        say(CFG.MESSAGES.show, 3000, CFG.PRIO.action, CFG.MOODS.show);
      });
    }

    function script(src){
      return new Promise(function(resolve, reject){
        var s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = function(){ reject(new Error('cannot load ' + src)); };
        document.head.appendChild(s);
      });
    }
    // loader + model are fetched once, the first time the mascot is actually shown
    function start(){
      if (started || hidden() || !showing()) return;
      started = true;
      var url = CFG.MASCOT.model;
      fetch(url).then(function(r){ if (!r.ok) throw new Error('model ' + r.status); return r.json(); }).then(function(setting){
        if (setting.Version === 3 || setting.FileReferences){
          return script(CFG.MASCOT.cubism5Core).then(function(){ return import(CFG.MASCOT.runtime + 'chunk/index2.js'); }).then(function(m){
            var app = new m.AppDelegate();
            // The loader turns the mouse into a look direction measured against her own small canvas, so anywhere on
            // the page counts as "far away" and she stares at the edge of her range (eyes rolled up, head turned right
            // round). Measured against the whole window instead, from about where her face is, she follows the mouse
            // the way the old mascot did: a little to the side = a little turn. Replaced before initialize(), which
            // binds this method as the listener.
            app.onMouseMove = function(ev){
              var c = this._subdelegates.at(0).getCanvas().getBoundingClientRect();
              var clamp = function(v){ return Math.max(-1, Math.min(1, v)); };
              var x = clamp((ev.clientX - (c.left + c.width / 2)) / (window.innerWidth * 0.5));
              var y = clamp(((c.top + c.height * 0.35) - ev.clientY) / (window.innerHeight * 0.5));
              this._subdelegates.at(0).getLive2DManager().onDrag(x, y);
            };
            app.initialize(); app.changeModel(url); app.run();
            // the loaded model (the loader's LAppModel); null until its files have arrived
            var model = function(){ try { return app._subdelegates.at(0).getLive2DManager()._models.at(0); } catch (e) { return null; } };
            // The loader returns before the model's files have arrived, and the model does not move at all until its last
            // texture is in; the greeting waits for that (at most 15s) so her first face and mouth really show.
            // flipHeadY: turn ParamAngleY round just before each frame is computed (the loader restores the parameters
            // at the start of every frame, so this never adds up).
            var ready = new Promise(function(resolve){
              var tries = 0, poll = setInterval(function(){
                var md = model(), cm = md && md._model, core = cm && cm._model;
                var loaded = core && md._modelSetting && md._textureCount >= md._modelSetting.getTextureCount();
                if (!loaded && ++tries < 150) return;
                clearInterval(poll);
                resolve();
                if (!core || !CFG.MASCOT.flipHeadY) return;
                var i = core.parameters.ids.indexOf('ParamAngleY'), update = cm.update.bind(cm);
                if (i >= 0) cm.update = function(){ core.parameters.values[i] = -core.parameters.values[i]; update(); };
              }, 100);
            });
            engine = {
              stop: function(){ app.stop(); },
              run: function(){ if (!app._drawFrameId) app.run(); },
              // expression by name (min.model3.json); tears = also play the looping tear motion, any other face stops it
              face: function(name, tears){
                var md = model();
                if (!md || !md.setExpression) return;
                md.setExpression(name);
                if (tears){
                  // the loader ignores the file's Loop flag, so the tears would fall once and stop; loop them by hand
                  var q = md.startMotion('Cry', 0, 3), mo = q && q._motion;
                  if (mo && mo.setLoop){ mo.setLoop(true); if (mo.setLoopFadeIn) mo.setLoopFadeIn(false); }
                }
                else if (md._motionManager) md._motionManager.stopAllMotions();
              },
              // The loader opens the mouth by the loudness of a sound file (its lip sync); there is no sound here, so
              // while she talks it is given a made-up loudness that rises and falls a few times a second.
              talking: function(on){
                var md = model();
                if (!md || !md._wavFileHandler) return;
                md._wavFileHandler.getRms = on ? function(){ return 0.15 + 0.45 * Math.abs(Math.sin(Date.now() / 90)); } : function(){ return 0; };
              }
            };
            return ready;
          });
        }
        return script(CFG.MASCOT.runtime + 'live2d.min.js').then(function(){ return import(CFG.MASCOT.runtime + 'chunk/index.js'); }).then(function(m){
          // the loader follows the mouse on the whole document from the start, but asks the model for hit areas before the
          // model has loaded (a page error on an early mouse move or click): ignore those events until it is there
          ['followPointer', 'modelTurnHead'].forEach(function(k){
            var fn = m.default.prototype[k];
            if (typeof fn !== 'function' || fn.hv2Guarded) return;
            m.default.prototype[k] = function(e){ if (this.live2DMgr && this.live2DMgr.model) return fn.call(this, e); };
            m.default.prototype[k].hv2Guarded = true;
          });
          var model = new m.default();
          engine = {
            stop: function(){ if (model._drawFrameId){ cancelAnimationFrame(model._drawFrameId); model._drawFrameId = null; } model.isDrawStart = false; },
            run: function(){ if (model.gl) model.startDraw(); }
          };
          return model.init('live2d', url, setting);
        });
      }).then(function(){
        if (!engine) throw new Error('no loader');
        sync();
        say(greeting(), 7000, CFG.PRIO.chatter, night() ? CFG.MOODS.night : CFG.MOODS.greet);
      }).catch(function(e){
        console.warn('[hv2 mascot] could not be loaded', e);
        box.style.display = 'none';
      });
    }
    // draw only while the home layout shows the mascot (not hidden, not on another page of the app, screen tall enough)
    function sync(){
      if (!engine) return;
      var on = (PAGE || document.documentElement.classList.contains('hv2')) && !box.classList.contains('hv2-m-off') && showing();
      if (on) engine.run(); else engine.stop();
    }

    function listen(){
      var active = false, last = null, idle = null;
      window.addEventListener('mousemove', function(){ active = true; });
      window.addEventListener('keydown', function(){ active = true; });
      // a phone has no mouse: without these she would count every visitor as idle and chatter every 20 seconds
      window.addEventListener('touchstart', function(){ active = true; }, { passive: true });
      window.addEventListener('scroll', function(){ active = true; }, { passive: true });
      setInterval(function(){
        if (active){ active = false; clearInterval(idle); idle = null; }
        else if (!idle) idle = setInterval(function(){
          if (PAGE || document.documentElement.classList.contains('hv2')) say(CFG.TALK.concat(holidayLines()), 6000, CFG.PRIO.chatter, CFG.MOODS.idle);
        }, 20000);
      }, 1000);
      document.addEventListener('mouseover', function(e){
        // the lines below are for a mouse moving over the page; a tap also fires mouseover once, and on a phone the
        // client only wants her to talk when she is tapped
        if (!started || !e.target.closest || api.compact()) return;
        for (var i = 0; i < CFG.HOVER.length; i++){
          if (!e.target.closest(CFG.HOVER[i][0])) continue;
          if (last === CFG.HOVER[i][0]) return;
          last = CFG.HOVER[i][0];
          say(CFG.HOVER[i][1], 4000, CFG.PRIO.hover, CFG.HOVER[i][2]);
          return;
        }
        last = null;
      });
      // The Live2D loader handles the canvas's own touch events, and on a phone no click ever comes out of them, so
      // listen for the touch as well; the flag keeps a tap from speaking twice where both events do arrive.
      var canvasEl = box.querySelector('canvas'), tapped = 0, pokes = [];
      // surprised by a poke, angry when poked again and again
      function poked(){
        var now = Date.now();
        pokes = pokes.filter(function(t){ return now - t < CFG.ANGRY_WINDOW; }).concat(now);
        if (pokes.length >= CFG.ANGRY_POKES) say(CFG.ANGRY, 4000, CFG.PRIO.action, CFG.MOODS.angry);
        else say(CFG.CLICK, 4000, CFG.PRIO.action, CFG.MOODS.poke);
      }
      canvasEl.addEventListener('click', function(){ if (Date.now() - tapped > 500) poked(); });
      canvasEl.addEventListener('touchend', function(){ tapped = Date.now(); poked(); }, { passive: true });
      document.addEventListener('copy', function(){ if (started) say(CFG.MESSAGES.copy, 6000, CFG.PRIO.chatter, CFG.MOODS.copy); });
      document.addEventListener('visibilitychange', function(){ if (started && !document.hidden) say(CFG.MESSAGES.back, 6000, CFG.PRIO.chatter, CFG.MOODS.back); });
      // She stays put while the page scrolls: the visitor decides when she goes, with the hide button, and brings her
      // back with the tab. (An earlier version stepped aside past the first screen; the owner wants the choice made
      // by hand, not by scrolling.)
      // the compact layout (tablet turned, window narrowed) hides the mascot by CSS; widening again starts it if needed
      window.addEventListener('resize', function(){ if (!started) start(); sync(); });
      // leaving the home page (hash navigation removes html.hv2) pauses drawing, coming back resumes it
      new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      // the Cubism 2 loader zooms the model on mouse wheel and blocks page scrolling; stop the event before it gets there
      box.addEventListener('mousewheel', function(e){ e.stopPropagation(); }, true);
    }

    build();
    if (hidden()){ box.classList.add('hv2-m-off'); toggle.classList.add('on'); }
    listen();
    var go = function(){ setTimeout(start, 1200); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  });
})();` : '';

// The same mascot for the site's other pages (news, early sign-up; never /quan-tri, not the old wiki), in one piece.
export const MASCOT_PAGE_HTML = MASCOT.enabled ? `<style>${MASCOT_CSS}</style><script>${MASCOT_JS}</script>` : '';
