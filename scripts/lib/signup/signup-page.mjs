// signup-page.mjs — the /dang-ky-som landing page, laid out like the reference pre-registration landing the owner
// picked (quannhica): key visual with three buttons, the three sign-up steps in the owner's tiled-roof frame, the
// server-wide milestones, the invite block, the five feature banners in the owner's pavilion frame, top power.
// Real today: the phone number form, the live count and the milestones (set in /quan-tri). Not yet: gifts, claiming,
// invites, sign-in, store/community links — those controls say they open at launch, and no gift quantity is shown
// (nothing is promised before the owner publishes the real rewards).
// Styles live in signup-page.css next to this file (read once at start-up); pictures in overrides/dang-ky-som.
import { readFileSync } from 'node:fs';
import { esc } from '../news/news-theme.mjs';
import { shareTags } from '../news/news-pages.mjs';
import { SITE_ORIGIN, LOGO } from '../news/news-config.mjs';
import { BANNERS } from '../home/layout-v2/section-features.mjs';

const CSS = readFileSync(new URL('./signup-page.css', import.meta.url), 'utf8');
const ART = '/3qdc-vi/dang-ky-som/';
const KV = '/3qdc-vi/home/anh-nen-slogan-vi.webp';
const FONTS = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap';

// the headline and tagline written on each banner, in BANNERS order
const FEATURES = [
  ['Một Bước Đăng Tiêu', 'Cùng Vui Tiệc Sao Trời'],
  ['Tân Hồn Tướng', 'Triệu Hồi Võ Linh'],
  ['Tự Chọn Hồn Tướng', 'Lên Thẳng Full Đỏ'],
  ['Trung Thu Sum Vầy', 'Tặng Tướng Chọn Lọc'],
  ['Tiên Cung Mở Đón', 'Du Ngoạn Thần Tiên'],
];
// which reward icons each block shows (kinds only — the real rewards are announced at launch)
const STEP_GIFTS = [['token', 'ingot', 'hero', 'scroll'], ['hero', 'ingot', 'chest', 'token'], ['token', 'hourglass', 'grain', 'ingot']];
const TIER_GIFTS = [['grain', 'ingot'], ['grain', 'ingot'], ['hourglass', 'token'], ['grain', 'ingot'], ['hero', 'chest'], ['chest', 'token'], ['hero', 'ingot'], ['hero', 'chest']];
const INVITES = [[1, ['chest', 'token']], [3, ['chest', 'token']], [5, ['chest', 'token']], [10, ['hero', 'token']]];
const GIFT_NAMES = { ingot: 'Nguyên bảo', scroll: 'Sách kinh nghiệm', hourglass: 'Tăng tốc', chest: 'Rương', grain: 'Lương thảo', token: 'Lệnh chiêu mộ', hero: 'Thẻ tướng' };

const ICONS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-ingot" viewBox="0 0 48 48"><ellipse cx="24" cy="32" rx="19" ry="8" fill="#b9811f"/><path d="M6 30c2-8 8-10 18-10s16 2 18 10c-6 5-30 5-36 0z" fill="#f4c64f"/><ellipse cx="24" cy="21" rx="9" ry="6" fill="#ffe28a"/><ellipse cx="22" cy="19" rx="3" ry="2" fill="#fff6cc"/></symbol>
<symbol id="i-scroll" viewBox="0 0 48 48"><rect x="9" y="10" width="30" height="28" rx="3" fill="#f2e2b8"/><rect x="6" y="8" width="36" height="6" rx="3" fill="#b3321e"/><rect x="6" y="34" width="36" height="6" rx="3" fill="#b3321e"/><path d="M15 20h18M15 25h18M15 30h12" stroke="#8a6a45" stroke-width="2"/></symbol>
<symbol id="i-hourglass" viewBox="0 0 48 48"><rect x="11" y="6" width="26" height="5" rx="2" fill="#8c5a1c"/><rect x="11" y="37" width="26" height="5" rx="2" fill="#8c5a1c"/><path d="M15 11h18c0 8-6 10-6 13s6 5 6 13H15c0-8 6-10 6-13s-6-5-6-13z" fill="#cfe9f2"/><path d="M18 34h12c0-4-6-6-6-8 0 2-6 4-6 8z" fill="#e8b650"/><path d="M34 22l6-6 0 6z" fill="#2f9a5f"/></symbol>
<symbol id="i-chest" viewBox="0 0 48 48"><rect x="7" y="20" width="34" height="20" rx="3" fill="#b3321e"/><path d="M7 20c0-8 7-12 17-12s17 4 17 12z" fill="#d9542c"/><rect x="7" y="19" width="34" height="4" fill="#f4c64f"/><rect x="21" y="18" width="6" height="10" rx="1" fill="#f4c64f"/><rect x="22.5" y="22" width="3" height="3" fill="#6a2a10"/></symbol>
<symbol id="i-grain" viewBox="0 0 48 48"><path d="M24 44V14" stroke="#b58a3a" stroke-width="3"/><g fill="#e8b650"><ellipse cx="19" cy="18" rx="4" ry="7" transform="rotate(-25 19 18)"/><ellipse cx="29" cy="18" rx="4" ry="7" transform="rotate(25 29 18)"/><ellipse cx="18" cy="28" rx="4" ry="7" transform="rotate(-25 18 28)"/><ellipse cx="30" cy="28" rx="4" ry="7" transform="rotate(25 30 28)"/><ellipse cx="24" cy="9" rx="3.5" ry="6"/></g></symbol>
<symbol id="i-token" viewBox="0 0 48 48"><path d="M24 4l16 8v14c0 9-7 15-16 18C15 41 8 35 8 26V12z" fill="#c23a24"/><path d="M24 9l11 6v11c0 6-5 11-11 13-6-2-11-7-11-13V15z" fill="#f0d6a0"/><path d="M19 20h10M24 16v16M19 27h10" stroke="#8f2414" stroke-width="2.4"/></symbol>
<symbol id="i-hero" viewBox="0 0 48 48"><rect x="8" y="4" width="32" height="40" rx="3" fill="#6b4221"/><rect x="11" y="7" width="26" height="34" rx="2" fill="#e7cf98"/><circle cx="24" cy="18" r="6" fill="#8c5a1c"/><path d="M14 38c1-8 5-12 10-12s9 4 10 12z" fill="#b3321e"/><path d="M24 4l3 4h-6z" fill="#f4c64f"/></symbol>
</svg>`;

const PLAY_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 5l23 19L8 43c-1.2-.6-2-1.8-2-3.2V8.2C6 6.8 6.8 5.6 8 5z" fill="#34a853"/><path d="M31 24L8 5c.9-.4 2-.4 3 .2l26 14.6z" fill="#4285f4"/><path d="M31 24L8 43c.9.4 2 .4 3-.2l26-14.6z" fill="#ea4335"/><path d="M37 19.8l5.2 2.9c1.8 1 1.8 3.6 0 4.6L37 28.2 31 24z" fill="#fbbc04"/></svg>';
const APP_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="3" y="3" width="42" height="42" rx="10" fill="#1a8cff"/><path d="M24 12l-9 16h18M20 20l-7 13M28 20l7 13M12 30h24" stroke="#fff" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>';

const fmt = (n) => Number(n).toLocaleString('vi-VN');
const gift = (kind) => `<div class="gift" title="${GIFT_NAMES[kind]}"><svg aria-hidden="true"><use href="#i-${kind}"/></svg></div>`;
const gifts = (kinds) => `<div class="gifts">${kinds.map(gift).join('')}</div>`;
const shortNum = (m) => (m >= 1000 && m % 1000 === 0 ? `${fmt(m / 1000)}K` : fmt(m));

// Rail fill (0–100): the milestones sit at equal steps from the first node to the last. Also sent to the browser.
function railPct(count, ms) {
  var n = ms.length, prev = 0, pos = n;
  for (var i = 0; i < n; i++) {
    if (count < ms[i]) { pos = i + (count - prev) / (ms[i] - prev); break; }
    prev = ms[i];
  }
  return n < 2 ? (count >= ms[0] ? 100 : 0) : Math.max(0, Math.min(100, ((pos - 1) / (n - 1)) * 100));
}

// The browser part: the phone form (real), the count redraw after a sign-up, the banner switcher, the menu drawer, the
// scroll buttons and a small notice for everything that opens at launch.
function signupApp(railPct) {
  var data = JSON.parse(document.getElementById('dks-data').textContent);
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var fmt = function (n) { return Number(n).toLocaleString('vi-VN'); };
  var tt;
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 2600); }

  function goRegister() {
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('dang-ky').scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }
  $('#go-register').addEventListener('click', function (e) { e.preventDefault(); goRegister(); });
  $$('[data-store]').forEach(function (b) {
    b.addEventListener('click', function () { goRegister(); toast('Đăng ký sớm trên ' + (b.getAttribute('data-store') === 'play' ? 'Google Play' : 'App Store') + ' sẽ mở khi có link — hãy để lại số điện thoại trước nhé.'); });
  });
  $$('[data-soon]').forEach(function (el) { el.addEventListener('click', function (e) { e.preventDefault(); toast(el.getAttribute('data-soon')); }); });

  // ---- phone sign-up ----
  var form = $('#dks-form'), input = $('#dks-sdt'), msg = $('#dks-msg'), btn = form.querySelector('button[type="submit"]');
  var say = function (text, kind) { msg.textContent = text; msg.className = 'dks-msg' + (kind ? ' ' + kind : ''); };
  var nguon = '';
  try { nguon = new URLSearchParams(location.search).get('nguon') || ''; } catch (e) { /* old browser */ }
  function showCount(count) {
    $('#dks-count').textContent = fmt(count);
    $('#dks-fill').style.width = railPct(count, data.milestones).toFixed(2) + '%';
    $$('[data-moc]').forEach(function (el) { el.classList.toggle(el.classList.contains('node') ? 'on' : 'reached', count >= Number(el.getAttribute('data-moc'))); });
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
      if (x.status === 201) { say('Đăng ký thành công! Quà ra mắt sẽ gửi theo số này.', 'ok'); input.value = ''; $('#state-1').textContent = 'Đã ghi nhận số điện thoại của bạn'; }
      else if (x.status === 200 && x.d.already) say('Số này đã đăng ký rồi — bạn không cần đăng ký lại.', 'ok');
      else say(x.d.error || 'Không gửi được. Thử lại sau ít phút.', 'err');
      if (typeof x.d.count === 'number') showCount(x.d.count);
    }, function () {
      say('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 'err');
    }).then(function () { btn.disabled = false; });
  });

  // ---- rules / history ----
  var lastFocus = null;
  function openModal(title, html) {
    lastFocus = document.activeElement;
    $('#modal-h').textContent = title; $('#modal-body').innerHTML = html; $('#ov').hidden = false; $('#modal-x').focus();
  }
  function closeModal() { $('#ov').hidden = true; if (lastFocus) lastFocus.focus(); }
  $('#modal-x').addEventListener('click', closeModal);
  $('#ov').addEventListener('click', function (e) { if (e.target.id === 'ov') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#ov').hidden) closeModal(); });
  $('#btn-rules').addEventListener('click', function () { openModal('Thể Lệ', $('#rules').innerHTML); });
  $('#btn-history').addEventListener('click', function () { openModal('Lịch Sử', '<p class="empty">Lịch sử mời bạn và nhận quà mở khi game ra mắt.</p>'); });

  // ---- feature banners ----
  var img = $('#dks-feat-img'), items = $$('[data-feat]');
  items.forEach(function (b) {
    b.addEventListener('click', function () {
      img.src = data.banners[Number(b.getAttribute('data-feat'))];
      img.alt = b.getAttribute('data-alt');
      items.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });

  // ---- phone menu ----
  var mb = $('#menu-btn'), dr = $('#drawer');
  mb.addEventListener('click', function () { var open = dr.hidden; dr.hidden = !open; mb.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  $$('#drawer a').forEach(function (a) { a.addEventListener('click', function () { dr.hidden = true; mb.setAttribute('aria-expanded', 'false'); }); });
}

export function renderSignupPage({ count, milestones }) {
  const title = 'Đăng ký sớm | 3Q Đại Chiến';
  const description = 'Đăng ký sớm 3Q Đại Chiến bằng số điện thoại để nhận quà ra mắt — càng nhiều người đăng ký, mốc quà càng lớn.';
  const n = milestones.length;
  const nodes = milestones.map((m, i) => `<span class="node${count >= m ? ' on' : ''}" data-moc="${m}" style="left:${(n < 2 ? 50 : 10 + (80 * i) / (n - 1)).toFixed(2)}%"></span>`).join('');
  const tiers = milestones.map((m, i) => `<div class="card${count >= m ? ' reached' : ''}" data-moc="${m}"><h3>${shortNum(m)}</h3><p class="need">${fmt(m)} người đăng ký</p>${gifts(TIER_GIFTS[i % TIER_GIFTS.length])}<p class="gift-note">Quà công bố khi ra mắt</p><button type="button" class="claim soon" disabled>Nhận khi ra mắt</button></div>`).join('');
  const invites = INVITES.map(([k, kinds]) => `<div class="card"><h3>Mời ${k} Chúa Công</h3>${gifts(kinds)}<button type="button" class="claim soon" disabled>Mở khi ra mắt</button></div>`).join('');
  const feats = FEATURES.map(([name, sub], i) => `<li><button type="button" data-feat="${i}" data-alt="${esc(`${name} · ${sub}`)}" aria-pressed="${i === 0}"><i>${i + 1}</i><b>${esc(name)}</b><small>${esc(sub)}</small></button></li>`).join('');
  const rows = Array.from({ length: 10 }, (_, i) => `<tr><td class="n">${i + 1}</td><td class="wait">Chờ mở máy chủ</td><td class="wait">—</td><td class="wait">—</td></tr>`).join('');
  const stepGifts = (i) => `${gifts(STEP_GIFTS[i])}<p class="gift-note">Quà công bố khi ra mắt</p>`;
  const soonLogin = 'Đăng nhập mở khi game ra mắt.';
  const soonLink = (what) => `${what} của 3Q Đại Chiến sẽ có link sớm.`;
  const tiersCols = `--cols:${Math.min(n, 5)}`;
  const data = JSON.stringify({ milestones, banners: BANNERS });

  return `<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
${shareTags({ title, description, url: SITE_ORIGIN + '/dang-ky-som', image: SITE_ORIGIN + KV, type: 'website' })}
<link rel="icon" href="${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${CSS}</style>
</head><body>
${ICONS}
<header class="hd">
  <div class="wrap">
    <nav class="l" aria-label="Menu chính"><a href="/">Trang Chủ</a><a href="#" data-soon="${esc(soonLink('Fanpage'))}">Fanpage</a></nav>
    <a class="medal" href="/" aria-label="3Q Đại Chiến — Trang chủ"><img src="${LOGO}" alt="3Q Đại Chiến" width="203" height="152"></a>
    <nav class="r" aria-label="Cộng đồng và tài khoản"><a href="#" data-soon="${esc(soonLink('Group'))}">Group</a><button type="button" data-soon="${esc(soonLogin)}">Đăng Nhập</button></nav>
    <button type="button" class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="drawer" aria-label="Mở menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </div>
</header>
<div class="drawer" id="drawer" hidden><a href="/">Trang Chủ</a><a href="#dang-ky">Đăng Ký Sớm</a><a href="#moc">Mốc Toàn Server</a><a href="#moi-ban">Mời Chúa Công</a><a href="#tinh-nang">Tính Năng</a><a href="/tin-tuc">Tin Tức</a></div>

<main>
  <h1 class="sr-only">Đăng Ký Sớm</h1>
  <section class="hero" id="trang-chu" aria-label="3Q Đại Chiến">
    <img class="kv" src="${KV}" alt="3Q Đại Chiến — Một Bước Đăng Tiêu, Cùng Vui Tiệc Sao Trời" width="1756" height="896">
    <div class="cta one">
      <button type="button" class="art-btn gold" data-store="play"><span>${PLAY_ICON}Đăng Ký Sớm Google Play</span></button>
      <a class="art-btn green" href="#dang-ky" id="go-register"><span class="sr-only">Đăng Ký Sớm</span></a>
      <button type="button" class="art-btn gold" data-store="app"><span>${APP_ICON}Đăng Ký Sớm App Store</span></button>
    </div>
  </section>

  <section class="sec alt" id="dang-ky">
    <div class="wrap">
      <div class="title"><h2>Đăng Ký Sớm Nhận Ngay Tướng Hiếm</h2><div class="orn"><b></b></div></div>
      <div class="reg">
        <img class="portrait" src="${ART}hero-a.webp" alt="" width="704" height="785">
        <div class="pavilion">
          <img class="roof-art" src="${ART}mai-ngoi.webp" alt="" width="815" height="271">
          <div class="panel">
            <div class="step" id="step-1">
              <h3>1. Thông Tin <em>Số Điện Thoại</em></h3>
              <form class="phone" id="dks-form" novalidate>
                <label class="dks-hp" aria-hidden="true">Website <input name="web" tabindex="-1" autocomplete="off"></label>
                <input id="dks-sdt" name="sdt" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Nhập Số Điện Thoại" aria-label="Số điện thoại">
                <button type="submit" class="brush-btn">Đăng Ký</button>
              </form>
              <p class="dks-msg" id="dks-msg" role="status" aria-live="polite"></p>
              ${stepGifts(0)}
              <div class="state" id="state-1"></div>
            </div>
            <div class="step" id="step-2">
              <h3>2. Đăng Ký Store <em>Nhận Tướng</em></h3>
              <div class="duo">
                <button type="button" class="ribbon blue" data-soon="${esc('Đăng ký sớm trên App Store sẽ mở khi có link.')}">ĐK Sớm App Store</button>
                <button type="button" class="ribbon red" data-soon="${esc('Đăng ký sớm trên Google Play sẽ mở khi có link.')}">ĐK Sớm Google Play</button>
              </div>
              ${stepGifts(1)}
            </div>
            <div class="step" id="step-3">
              <h3>3. Theo Dõi Fanpage &amp; <em>Tham Gia Group</em></h3>
              <div class="duo">
                <button type="button" class="ribbon pink" data-soon="${esc(soonLink('Fanpage'))}">Follow Fanpage</button>
                <button type="button" class="ribbon jade" data-soon="${esc(soonLink('Group'))}">Tham Gia Group</button>
              </div>
              ${stepGifts(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sec plain" id="moc">
    <div class="wrap">
      <div class="title"><h2>Toàn Dân Chung Sức – Đạt Mốc Đăng Ký Sớm</h2><div class="orn"><b></b></div>
        <p>Đã có <strong id="dks-count">${fmt(count)}</strong> người đăng ký nhận quà Độc Quyền</p></div>
      <div class="track" aria-hidden="true"><div class="rail"><div class="fill" id="dks-fill" style="width:${railPct(count, milestones).toFixed(2)}%"></div></div>${nodes}</div>
      <div class="tiers" style="${tiersCols}">${tiers}</div>
    </div>
  </section>

  <section class="sec alt inv" id="moi-ban">
    <img class="girl" src="${ART}hero-b.webp" alt="" width="612" height="795">
    <div class="wrap">
      <div class="title"><h2>Mời Chúa Công Cùng Tham Gia Đăng Ký</h2><div class="orn"><b></b></div></div>
      <div class="inv-top">
        <div class="scroll-bar">Đã Mời <b>0</b>/10 Chúa Công</div>
        <div class="trio">
          <button type="button" class="art-btn gold sm" data-soon="${esc('Mời bạn mở khi game ra mắt — mỗi người bạn đăng ký qua link của bạn tính 1 lượt.')}"><span>Mời Chúa Công</span></button>
          <button type="button" class="art-btn gold sm" id="btn-rules"><span>Thể Lệ</span></button>
          <button type="button" class="art-btn gold sm" id="btn-history"><span>Lịch Sử</span></button>
        </div>
      </div>
      <div class="inv-tiers">${invites}</div>
    </div>
  </section>

  <section class="sec plain" id="tinh-nang">
    <div class="wrap">
      <div class="title"><h2>Tính Năng Đặc Sắc</h2><div class="orn"><b></b></div></div>
      <div class="feat">
        <div class="feat-nav"><ol>${feats}</ol></div>
        <div class="view"><img id="dks-feat-img" src="${BANNERS[0]}" alt="${esc(FEATURES[0].join(' · '))}" width="1000" height="562"></div>
      </div>
    </div>
  </section>

  <section class="sec alt" id="top">
    <div class="wrap">
      <div class="title"><h2>Top Lực Chiến</h2><div class="orn"><b></b></div></div>
      <div class="rank">
        <div class="rank-scroll"><table><thead><tr><th>Hạng</th><th>Chúa Công</th><th>Liên minh</th><th>Lực chiến</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="note">Bảng xếp hạng lực chiến mở khi máy chủ ra mắt.</p>
      </div>
    </div>
  </section>
</main>

<footer class="ft ft-min">
  <img src="${LOGO}" alt="3Q Đại Chiến" width="203" height="152">
  <p><strong>© 2026 3Q Đại Chiến</strong></p>
  <p>Trò chơi dành cho người từ 12 tuổi trở lên. Chơi quá 180 phút một ngày sẽ ảnh hưởng xấu đến sức khoẻ.</p>
  <nav aria-label="Liên kết"><a href="/">Trang chủ</a><a href="/tin-tuc">Tin tức</a></nav>
</footer>

<template id="rules"><ol>
<li>Mỗi số điện thoại di động Việt Nam đăng ký sớm được một lần.</li>
<li>Quà từng bước và quà mốc toàn server được công bố khi game ra mắt; ai đã đăng ký sớm đều được tính.</li>
<li>Mời bạn: một lượt mời được tính khi người được mời đăng ký bằng số chưa từng đăng ký. Tự mời chính mình hoặc dùng số ảo sẽ không được tính.</li>
<li>Quà được gửi theo số điện thoại đã đăng ký sau ngày ra mắt.</li>
<li>Ban tổ chức có quyền điều chỉnh thể lệ và xử lý các trường hợp gian lận.</li>
</ol></template>
<div class="ov" id="ov" hidden><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-h"><button type="button" class="x" id="modal-x" aria-label="Đóng">×</button><h3 id="modal-h"></h3><div id="modal-body"></div></div></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="dks-data">${data}</script>
<script>(${signupApp.toString()})(${railPct.toString()});</script>
</body></html>`;
}
