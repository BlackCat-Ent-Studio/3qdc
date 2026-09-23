// signup-page.mjs — the /dang-ky-som page: phone number form, sign-ups so far against the milestones, the five
// feature banners (the home page's, in its gold frame) and the download QR. Built on the news pages' shell (header,
// footer, light/dark theme); the browser part is a small script with no library.
import { esc, pageShell } from '../news/news-theme.mjs';
import { shareTags } from '../news/news-pages.mjs';
import { SITE_ORIGIN } from '../news/news-config.mjs';
import { BANNERS, FRAME, WINDOW } from '../home/layout-v2/section-features.mjs';

const KV = '/3qdc-vi/home/anh-nen-slogan-vi.webp';
const QR = '/3qdc-vi/home/qr-3qdc.png';
// the headline and tagline written on each banner, in BANNERS order
const FEATURES = [
  ['Một Bước Đăng Tiêu', 'Cùng Vui Tiệc Sao Trời'],
  ['Tân Hồn Tướng', 'Triệu Hồi Võ Linh'],
  ['Tự Chọn Hồn Tướng', 'Lên Thẳng Full Đỏ'],
  ['Trung Thu Sum Vầy', 'Tặng Tướng Chọn Lọc'],
  ['Tiên Cung Mở Đón', 'Du Ngoạn Thần Tiên'],
];

const fmt = (n) => Number(n).toLocaleString('vi-VN');
const pct = (v, of) => `${((v / of) * 100).toFixed(3)}%`;

// Width (0–100) of the progress bar: the milestones sit at equal steps along it, and the fill moves evenly between
// two of them. Also sent to the browser (toString), so the bar is drawn the same way after a sign-up.
function progressPct(count, ms) {
  var n = ms.length, prev = 0;
  for (var i = 0; i < n; i++) {
    if (count < ms[i]) return ((i + (count - prev) / (ms[i] - prev)) / n) * 100;
    prev = ms[i];
  }
  return 100;
}

const CSS = `
.dks{padding-bottom:64px}
.dks h2{font-family:var(--display);font-weight:700;font-size:clamp(28px,3.4vw,38px);line-height:1.1;margin:0 0 6px;color:var(--gold-hi)}
.dks .lead{margin:0 0 18px;color:var(--muted)}
.dks-sec{margin-top:40px}
.dks-card{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:24px}
.dks-top{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:20px;align-items:stretch}
.dks-form{display:flex;gap:10px;flex-wrap:wrap}
.dks-form input{flex:1 1 240px;min-width:0;min-height:52px;padding:0 16px;border:1px solid var(--line);border-radius:8px;
  background:var(--ink-2);font-size:18px;letter-spacing:.04em}
.dks-form input:focus{border-color:var(--gold);outline:none}
.dks-form .btn{min-height:52px;padding-inline:32px;font-size:17px}
.dks-form .btn:disabled{opacity:.6;cursor:wait}
.dks-hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
.dks-msg{min-height:1.6em;margin:12px 0 0;font-weight:600}
.dks-msg.ok{color:var(--cat-cn)}
.dks-msg.err{color:var(--cat-sk)}
.dks-note{margin:10px 0 0;color:var(--faint);font-size:13.5px}
.dks-qr{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center}
.dks-qr img{width:150px;height:150px;border-radius:8px;background:#fff;padding:6px}
.dks-qr span{color:var(--text-2);font-size:14px}
.dks-count{margin:0 0 20px;font-size:17px;color:var(--text-2)}
.dks-count b{font-family:var(--display);font-size:clamp(34px,4vw,46px);color:var(--gold-hi);font-variant-numeric:tabular-nums;margin:0 4px}
.dks-bar{position:relative;height:12px;border-radius:6px;background:var(--ink-2);border:1px solid var(--line);margin:0 0 18px}
.dks-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(90deg,var(--ember-dk),var(--ember),var(--gold-hi));transition:width .6s ease}
.dks-bar s{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:var(--ink-2);border:2px solid var(--line)}
.dks-bar s.done{background:var(--gold-hi);border-color:var(--gold-hi)}
.dks-mocs{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.dks-mocs li{border:1px solid var(--line-soft);border-radius:8px;padding:12px;background:var(--tint-row);display:flex;flex-direction:column;gap:4px}
.dks-mocs li.done{border-color:var(--gold);background:var(--tint)}
.dks-mocs b{font-size:17px;color:var(--gold-hi);font-variant-numeric:tabular-nums}
.dks-mocs span{font-size:13.5px;color:var(--muted)}
.dks-state{align-self:flex-start;margin-top:4px;padding:2px 10px;border-radius:999px;border:1px solid var(--line);font-size:12.5px!important;color:var(--text-2)!important}
.dks-mocs li.done .dks-state{background:var(--gold-hi);border-color:var(--gold-hi);color:var(--on-gold)!important;font-weight:600}
.dks-feat{display:grid;grid-template-columns:300px minmax(0,1fr);gap:24px;align-items:center}
.dks-feat ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.dks-feat button{width:100%;display:grid;grid-template-columns:44px minmax(0,1fr);gap:0 12px;align-items:center;text-align:left;
  min-height:60px;padding:8px 12px;border:1px solid var(--line-soft);border-radius:8px;background:var(--ink-2);cursor:pointer}
.dks-feat button:hover{border-color:var(--gold)}
.dks-feat button[aria-pressed="true"]{border-color:var(--gold);background:var(--tint)}
.dks-feat button em{grid-row:span 2;font-style:normal;font-family:var(--display);font-weight:700;font-size:28px;color:var(--faint)}
.dks-feat button[aria-pressed="true"] em{color:var(--ember)}
.dks-feat button b{font-size:15.5px;color:var(--text)}
.dks-feat button small{color:var(--muted);font-size:13px}
.dks-frame{position:relative;aspect-ratio:${FRAME.w}/${FRAME.h}}
.dks-frame:after{content:"";position:absolute;inset:0;pointer-events:none;background:url("${FRAME.src}") no-repeat 0 0/100% 100%}
.dks-window{position:absolute;left:${pct(WINDOW.x, FRAME.w)};top:${pct(WINDOW.y, FRAME.h)};width:${pct(WINDOW.w, FRAME.w)};height:${pct(WINDOW.h, FRAME.h)};
  background:#12152a;-webkit-mask:url("${FRAME.mask}") no-repeat 0 0/100% 100%;mask:url("${FRAME.mask}") no-repeat 0 0/100% 100%}
.dks-window img{display:block;width:100%;height:100%;object-fit:cover}
@media (max-width:760px){
  .dks-card{padding:18px 16px}
  .dks-top{grid-template-columns:1fr}
  .dks-form .btn{flex:1 1 100%}
  .dks-qr{flex-direction:row;justify-content:flex-start;text-align:left}
  .dks-qr img{width:96px;height:96px}
  .dks-mocs{grid-template-columns:1fr 1fr!important}
  .dks-feat{grid-template-columns:1fr}
  .dks-feat .dks-frame{order:-1}
}
`;

// The browser part: sends the form, then redraws the count, bar and milestones from the answer; switches the banner.
function signupApp(progressPct) {
  var data = JSON.parse(document.getElementById('dks-data').textContent);
  var fmt = function (n) { return Number(n).toLocaleString('vi-VN'); };
  var form = document.getElementById('dks-form');
  var input = document.getElementById('dks-sdt');
  var msg = document.getElementById('dks-msg');
  var btn = form.querySelector('button[type="submit"]');
  var say = function (text, kind) { msg.textContent = text; msg.className = 'dks-msg' + (kind ? ' ' + kind : ''); };
  // where the visitor came from (a link such as /dang-ky-som?nguon=fb); the server keeps it only when it is a plain tag
  var nguon = '';
  try { nguon = new URLSearchParams(location.search).get('nguon') || ''; } catch (e) { /* old browser */ }

  function showCount(count) {
    document.getElementById('dks-count').textContent = fmt(count);
    document.getElementById('dks-fill').style.width = progressPct(count, data.milestones).toFixed(2) + '%';
    Array.prototype.forEach.call(document.querySelectorAll('[data-moc]'), function (el) {
      var done = count >= Number(el.getAttribute('data-moc'));
      el.classList.toggle('done', done);
      var s = el.querySelector('.dks-state');
      if (s) s.textContent = done ? 'Đã đạt' : 'Chưa đạt';
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input.value.trim()) { say('Hãy nhập số điện thoại.', 'err'); input.focus(); return; }
    btn.disabled = true;
    say('Đang gửi…');
    fetch('/api/dang-ky-som', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdt: input.value, web: form.elements.web.value, nguon: nguon }),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d }; });
    }).then(function (x) {
      if (x.status === 201) { say('Đăng ký thành công! Quà ra mắt sẽ được gửi theo số này.', 'ok'); input.value = ''; }
      else if (x.status === 200 && x.d.already) say('Số này đã đăng ký rồi — bạn không cần đăng ký lại.', 'ok');
      else say(x.d.error || 'Không gửi được. Thử lại sau ít phút.', 'err');
      if (typeof x.d.count === 'number') showCount(x.d.count);
    }, function () {
      say('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 'err');
    }).then(function () { btn.disabled = false; });
  });

  var img = document.getElementById('dks-feat-img');
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-feat]'));
  items.forEach(function (b) {
    b.addEventListener('click', function () {
      img.src = data.banners[Number(b.getAttribute('data-feat'))];
      img.alt = b.getAttribute('data-alt');
      items.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
}

export function renderSignupPage({ count, milestones }) {
  const title = 'Đăng ký sớm | 3Q Đại Chiến';
  const description = 'Đăng ký sớm bằng số điện thoại để nhận thông báo và quà ra mắt 3Q Đại Chiến.';
  const n = milestones.length;
  const marks = milestones.map((m, i) => `<s data-moc="${m}" class="${count >= m ? 'done' : ''}" style="left:${(((i + 1) / n) * 100).toFixed(3)}%"></s>`).join('');
  const mocs = milestones.map((m) => `<li data-moc="${m}" class="${count >= m ? 'done' : ''}"><b>${fmt(m)} người</b><span>Quà sẽ công bố khi ra mắt</span><span class="dks-state">${count >= m ? 'Đã đạt' : 'Chưa đạt'}</span></li>`).join('');
  const feats = FEATURES.map(([name, sub], i) => `<li><button type="button" data-feat="${i}" data-alt="${esc(`${name} · ${sub}`)}" aria-pressed="${i === 0}">`
    + `<em>${String(i + 1).padStart(2, '0')}</em><b>${esc(name)}</b><small>${esc(sub)}</small></button></li>`).join('');

  const main = `<section class="band" style="background-image:url('${KV}')"><div class="wrap">
<nav class="crumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">›</span><span>Đăng ký sớm</span></nav>
<h1>Đăng Ký Sớm</h1><p>${esc(description)}</p>
</div><div class="band-fade" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div></section>
<main class="wrap dks">
<div class="dks-top">
<section class="dks-card" aria-labelledby="dks-h-form">
<h2 id="dks-h-form">Để lại số điện thoại</h2>
<p class="lead">Số di động Việt Nam, mỗi số đăng ký một lần.</p>
<form class="dks-form" id="dks-form" novalidate>
<label class="dks-hp" aria-hidden="true">Website <input name="web" tabindex="-1" autocomplete="off"></label>
<input id="dks-sdt" name="sdt" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Nhập số điện thoại" aria-label="Số điện thoại" required>
<button type="submit" class="btn btn-fire">Đăng Ký</button>
</form>
<p class="dks-msg" id="dks-msg" role="status" aria-live="polite"></p>
<p class="dks-note">Số điện thoại chỉ dùng để gửi quà và báo tin ra mắt game.</p>
</section>
<aside class="dks-card dks-qr"><img src="${QR}" alt="Mã QR tải game 3Q Đại Chiến" width="150" height="150"><span>Quét mã để xem cách tải game</span></aside>
</div>
<section class="dks-sec dks-card" aria-labelledby="dks-h-moc">
<h2 id="dks-h-moc">Mốc đăng ký toàn server</h2>
<p class="dks-count">Đã có<b id="dks-count">${fmt(count)}</b>người đăng ký</p>
<div class="dks-bar" aria-hidden="true"><i id="dks-fill" style="width:${progressPct(count, milestones).toFixed(2)}%"></i>${marks}</div>
<ol class="dks-mocs" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${mocs}</ol>
</section>
<section class="dks-sec" aria-labelledby="dks-h-feat">
<h2 id="dks-h-feat">Tính Năng Đặc Sắc</h2>
<div class="dks-feat"><ol>${feats}</ol>
<div class="dks-frame"><div class="dks-window"><img id="dks-feat-img" src="${BANNERS[0]}" alt="${esc(FEATURES[0].join(' · '))}" loading="lazy"></div></div></div>
</section>
</main>`;

  const data = JSON.stringify({ milestones, banners: BANNERS });
  return pageShell({
    title, description, active: 'signup',
    head: shareTags({ title, description, url: SITE_ORIGIN + '/dang-ky-som', image: SITE_ORIGIN + KV, type: 'website' }) + `<style>${CSS}</style>`,
    main,
    scripts: `<script type="application/json" id="dks-data">${data}</script><script>(${signupApp.toString()})(${progressPct.toString()});</script>`,
  });
}
