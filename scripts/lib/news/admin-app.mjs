// admin-app.mjs — the browser side of /quan-tri: sign-in, set password, article list and article editor.
// adminApp is serialised into the page (never run on the server). It talks only to /quan-tri/api/*; the server re-checks
// every permission and cleans every article, so nothing here is a security boundary — it only keeps the screens honest.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminApp() {
  const DATA = JSON.parse(document.getElementById('adm-data').textContent);
  const CATS = DATA.cats, LIB = DATA.library, HOST = DATA.host, LOGO = DATA.logo, ROLES = DATA.roles, THEME_BUTTON = DATA.themeButton;
  const app = document.getElementById('app');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || '';
  // a button that deletes for good asks first by changing its label: the first click arms it, a second click within
  // 4 s goes ahead (same as deleting an article from the list; no pop-up dialog)
  const armDelete = (b, idle) => {
    if (b.dataset.armed > Date.now() - 4000) return true;
    b.dataset.armed = Date.now();
    b.textContent = 'Bấm lần nữa để xoá';
    setTimeout(() => { if (b.isConnected && !b.disabled) b.textContent = idle; }, 4000);
    return false;
  };
  // sites an article can go to (empty when the split is switched off: then there is nothing to choose)
  const SITES = DATA.sites || [];
  const siteName = (id) => (SITES.find((s) => s.id === id) || {}).name || '';
  // articles saved before the choice existed belong to the main site
  const siteOfPost = (p) => (p.site === 'phu' ? 'phu' : 'chinh');
  // where a reader finds the article: its address on the main site, or its reader link on the side site
  const addrPrefix = (site) => (SITES.length && site === 'phu' ? '3qdaichien.wanmeivn.com/#tin/' : `${HOST}/tin-tuc/`);
  const fmtTime = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}` : '—');
  const slugify = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
  const initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase();
  const avatar = (name) => `<span class="av" title="${esc(name)}">${esc(initials(name))}</span>`;
  const siteNowLocal = (ms) => new Date((ms || Date.now()) + 7 * 3600e3).toISOString().slice(0, 16);

  let me = null;
  let leaving = null; // cleanup for the open editor (stop the lock heartbeat, release the lock)
  let dirty = () => false;
  // bumped whenever a new screen is drawn; an answer that arrives after the user moved on is ignored
  let screen = 0;

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  // Calls the API; a lost session sends the user to the sign-in form. Resolves { ok, status, data }.
  async function api(method, path, body) {
    let res;
    const payload = body ? JSON.stringify(body) : undefined;
    // the server closes the connection on anything over 1 MB; say why before sending instead of a network error
    if (payload && new Blob([payload]).size > 1000000) {
      return { ok: false, status: 413, data: { error: 'Bài quá dài để lưu (tối đa khoảng 1 MB kể cả mã định dạng). Hãy bớt nội dung hoặc chia thành nhiều bài.' } };
    }
    try {
      res = await fetch('/quan-tri/api' + path, {
        method, credentials: 'same-origin', cache: 'no-store',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: payload,
      });
    } catch (e) {
      return { ok: false, status: 0, data: { error: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' } };
    }
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'Máy chủ trả lời lạ (' + res.status + ').' }; }
    if (res.status === 401 && path !== '/dang-nhap') { me = null; renderLogin(path === '/toi' ? '' : data.error); }
    return { ok: res.ok, status: res.status, data };
  }

  // the server says whether a published article is already visible (the viewer's clock may be off)
  function stateOf(p) {
    if (p.status === 'published') return p.visible ? 'published' : 'scheduled';
    return p.status;
  }
  const STATE = { published: 'Đã đăng', scheduled: 'Hẹn giờ', pending: 'Chờ duyệt', draft: 'Nháp' };
  const ACTION_WORDS = { luu: 'lưu', 'gui-duyet': 'gửi duyệt', 'rut-ve': 'rút về nháp', 'dang-ngay': 'đăng', 'hen-gio': 'hẹn giờ đăng', 'tra-lai': 'trả lại cho người viết', 'go-bai': 'gỡ bài', 'bo-ghim': 'bỏ ghim' };

  // These pages still work on one game (3qdc) with the three old kinds of view; the page that names the games replaces
  // this. The server decides what an account may do (403), so the view only chooses what to show:
  //   manager = the whole game or any management right in it · editor = writes news · phieu = reviews tickets only
  //   kind = the account's real role (owner / member): only owners see the accounts page
  const PRESET_GRANTS = { manager: { '3qdc': '*' }, editor: { '3qdc': { 'tin-tuc': ['viet'] } }, phieu: { '3qdc': { 'phieu-be-ngoan': ['duyet'] } } };
  function presetOf(grants) {
    const s = JSON.stringify(grants || {});
    return Object.keys(PRESET_GRANTS).find((k) => JSON.stringify(PRESET_GRANTS[k]) === s) || 'custom';
  }
  function viewOf(u) {
    const g = u.role === 'owner' ? '*' : (u.grants || {})['3qdc'];
    let role = 'none';
    if (g === '*') role = 'manager';
    else if (g && typeof g === 'object') {
      const has = (m, p) => Array.isArray(g[m]) && g[m].includes(p);
      if (has('tin-tuc', 'duyet') || has('nhac', 'quan-ly') || has('dang-ky-som', 'quan-ly') || has('phieu-be-ngoan', 'quan-ly')) role = 'manager';
      else if (has('tin-tuc', 'viet')) role = 'editor';
      else if (has('phieu-be-ngoan', 'duyet')) role = 'phieu';
    }
    return Object.assign({}, u, { kind: u.role, role });
  }

  function header(active) {
    // a "Duyệt phiếu" account has one section only
    const tabs = me.role === 'manager'
      ? [['posts', '#/', 'Bài viết'], ['music', '#/nhac', 'Nhạc nền'], ['signup', '#/dang-ky-som', 'Đăng ký sớm'], ['phieu', '#/phieu-be-ngoan', 'Phiếu Bé Ngoan'], ['trash', '#/thung-rac', 'Thùng rác']].concat(me.kind === 'owner' ? [['users', '#/nguoi-dung', 'Người dùng']] : [])
      : me.role === 'phieu' ? [['phieu', '#/phieu-be-ngoan', 'Phiếu Bé Ngoan']] : null;
    const nav = tabs
      ? `<nav class="adm-nav" aria-label="Mục quản trị">${tabs
        .map(([key, href, label]) => `<a href="${href}"${(active || 'posts') === key ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`
      : '';
    // On phones the account row is folded behind this button (CSS hides .who until the header carries data-menu).
    const menuBtn = `<button type="button" class="adm-menu" id="adm-menu" aria-expanded="false" aria-controls="adm-who" aria-label="Tài khoản và tuỳ chọn">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>`;
    return `<header class="adm-h"><div class="wrap"><a href="#/" class="adm-logo"><img src="${esc(LOGO)}" alt="3Q Đại Chiến"></a><span class="ttl">Quản trị tin tức</span>${menuBtn}${nav}
<div class="who" id="adm-who">${THEME_BUTTON}${avatar(me.name)}<span><b>${esc(me.name)}</b> · ${esc(ROLES[me.kind === 'owner' ? 'owner' : me.role] || me.role)}</span>
<a class="btn btn-ghost btn-sm" href="/tin-tuc" target="_blank" rel="noopener">Xem trang tin</a><button type="button" class="btn btn-ghost btn-sm" id="logout">Đăng xuất</button></div></div></header>`;
  }
  function bindHeader() {
    const head = $('.adm-h');
    const menu = $('#adm-menu');
    // The sticky editor toolbar sits below the header, whose height changes with the width (one row on a desktop,
    // a second row for the tab strip on a phone) and when the account panel opens, so measure it instead of guessing.
    const trackHeight = () => document.documentElement.style.setProperty('--adm-h', Math.round(head.getBoundingClientRect().height) + 'px');
    trackHeight();
    if (window.ResizeObserver) new ResizeObserver(trackHeight).observe(head);
    else window.addEventListener('resize', trackHeight);
    if (menu) {
      const setOpen = (open) => {
        head.toggleAttribute('data-menu', open);
        menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      menu.addEventListener('click', () => setOpen(!head.hasAttribute('data-menu')));
      // tapping a section tab or anything inside the panel closes it again
      head.addEventListener('click', (e) => { if (e.target.closest('.adm-nav a, .who a')) setOpen(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    }
    $('#logout').addEventListener('click', async () => {
      if (dirty() && !window.confirm('Bài đang có thay đổi chưa lưu. Vẫn đăng xuất?')) return;
      cleanupEditor();
      await api('POST', '/dang-xuat', {});
      me = null;
      renderLogin();
    });
  }

  // ---------- sign in / set password ----------
  function authShell(inner) {
    cleanupEditor();
    app.innerHTML = `<main class="auth"><div class="theme-float">${THEME_BUTTON}</div><div class="auth-box"><img src="${esc(LOGO)}" alt="3Q Đại Chiến" class="auth-logo">${inner}</div></main>`;
  }

  function renderLogin(notice) {
    authShell(`<h1>Quản trị tin tức</h1><p class="meta">Đăng nhập để viết và đăng bài.</p>
<form id="login" novalidate>
<div class="field"><label for="l-user">Tên đăng nhập</label><input class="inp" id="l-user" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
<div class="field"><label for="l-pass">Mật khẩu</label><input class="inp" id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
<div class="err" id="l-err" role="alert"${notice ? '' : ' hidden'}>${esc(notice || '')}</div>
<button class="btn btn-fire auth-btn" type="submit">Đăng nhập</button>
<p class="auth-alt">Chưa có tài khoản? <a href="/quan-tri/dang-ky">Đăng ký</a></p>
<p class="meta small">Quên mật khẩu: liên hệ Quản lý để được cấp link đặt lại.</p>
</form>`);
    $('#l-user').focus();
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#l-err');
      const btn = e.target.querySelector('button[type=submit]');
      err.hidden = true; btn.disabled = true;
      const r = await api('POST', '/dang-nhap', { username: $('#l-user').value, password: $('#l-pass').value });
      btn.disabled = false;
      if (!r.ok) { err.textContent = r.data.error || 'Không đăng nhập được.'; err.hidden = false; $('#l-pass').select(); return; }
      me = viewOf(r.data.user);
      route();
    });
  }

  function renderSetPassword() {
    // the one-time token is in the # part of the link; take it and clear it from the address bar and history
    const token = location.hash.replace(/^#/, '');
    try { history.replaceState(null, '', '/quan-tri/dat-mat-khau'); } catch (e) { /* keep going */ }
    authShell(`<h1>Đặt mật khẩu</h1><p class="meta">Link này dùng được một lần trong 30 phút. Mật khẩu ít nhất 10 ký tự — nên là một câu dễ nhớ.</p>
<form id="setpw" novalidate>
<div class="field"><label for="s-pass">Mật khẩu mới</label><input class="inp" id="s-pass" type="password" autocomplete="new-password" minlength="10" required></div>
<div class="field"><label for="s-pass2">Nhập lại mật khẩu</label><input class="inp" id="s-pass2" type="password" autocomplete="new-password" minlength="10" required></div>
<div class="err" id="s-err" role="alert" hidden></div>
<button class="btn btn-fire auth-btn" type="submit">Lưu mật khẩu</button>
</form>`);
    if (!token) { $('#s-err').textContent = 'Link thiếu mã. Hãy mở đúng link được gửi cho bạn.'; $('#s-err').hidden = false; }
    $('#s-pass').focus();
    $('#setpw').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#s-err');
      const a = $('#s-pass').value, b = $('#s-pass2').value;
      err.hidden = true;
      if (a.length < 10) { err.textContent = 'Mật khẩu cần ít nhất 10 ký tự.'; err.hidden = false; return; }
      if (a !== b) { err.textContent = 'Hai lần nhập không giống nhau.'; err.hidden = false; return; }
      const r = await api('POST', '/dat-mat-khau', { token, password: a });
      if (!r.ok) { err.textContent = r.data.error || 'Không đặt được mật khẩu.'; err.hidden = false; return; }
      authShell(`<h1>Đã đặt mật khẩu</h1><p>Tài khoản <b>${esc(r.data.user.username)}</b> (${esc(r.data.user.name)}) đã sẵn sàng.</p><a class="btn btn-fire auth-btn" href="/quan-tri">Đăng nhập</a>`);
    });
  }

  // Registration: the account waits for a manager's approval before it can sign in.
  function renderRegister() {
    authShell(`<h1>Đăng ký</h1><p class="meta">Tài khoản mới cần <b>Quản lý duyệt</b> trước khi đăng nhập được.</p>
<form id="reg" novalidate>
<div class="field"><label for="r-user">Tên đăng nhập</label><input class="inp" id="r-user" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32" required>
<span class="hint">3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới.</span></div>
<div class="field"><label for="r-name">Tên hiển thị</label><input class="inp" id="r-name" autocomplete="name" maxlength="60" required>
<span class="hint">Hiện dưới bài viết: “Đăng bởi …”.</span></div>
<div class="field"><label for="r-pass">Mật khẩu</label><input class="inp" id="r-pass" type="password" autocomplete="new-password" minlength="10" required>
<span class="hint">Ít nhất 10 ký tự — nên là một câu dễ nhớ.</span></div>
<div class="field"><label for="r-pass2">Nhập lại mật khẩu</label><input class="inp" id="r-pass2" type="password" autocomplete="new-password" minlength="10" required></div>
<div class="err" id="r-err" role="alert" hidden></div>
<button class="btn btn-fire auth-btn" type="submit">Đăng ký</button>
<p class="auth-alt">Đã có tài khoản? <a href="/quan-tri">Đăng nhập</a></p>
</form>`);
    $('#r-user').focus();
    $('#r-user').addEventListener('change', (e) => { e.target.value = e.target.value.trim().toLowerCase(); });
    $('#reg').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#r-err');
      const btn = e.target.querySelector('button[type=submit]');
      const username = $('#r-user').value.trim().toLowerCase();
      const name = $('#r-name').value.trim();
      const a = $('#r-pass').value, b = $('#r-pass2').value;
      err.hidden = true;
      const say = (msg) => { err.textContent = msg; err.hidden = false; };
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) return say('Tên đăng nhập 3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới; bắt đầu bằng chữ hoặc số.');
      if (!name) return say('Nhập tên hiển thị.');
      if (a.length < 10) return say('Mật khẩu cần ít nhất 10 ký tự.');
      if (a !== b) return say('Hai lần nhập mật khẩu không giống nhau.');
      btn.disabled = true;
      const r = await api('POST', '/dang-ky', { username, name, password: a });
      btn.disabled = false;
      if (!r.ok) return say(r.data.error || 'Không đăng ký được.');
      authShell(`<h1>Đã gửi đăng ký</h1><p>Tài khoản <b>${esc(r.data.user.username)}</b> (${esc(r.data.user.name)}) đang <b>chờ Quản lý duyệt</b>.</p>
<p class="meta">Khi được duyệt, bạn đăng nhập bằng tên đăng nhập và mật khẩu vừa tạo. Hãy báo Quản lý tên đăng nhập của bạn để được duyệt nhanh.</p>
<a class="btn btn-fire auth-btn" href="/quan-tri">Về trang đăng nhập</a>`);
    });
  }

  // A manager's invite link (/quan-tri/moi#<token>): the person picks a name and password; the account then waits for
  // a manager's approval, with the invite's role ("Duyệt phiếu") preselected. The token is taken from the # part and
  // cleared from the address bar.
  function renderAcceptInvite() {
    const token = location.hash.replace(/^#/, '');
    try { history.replaceState(null, '', '/quan-tri/moi'); } catch (e) { /* keep going */ }
    authShell(`<h1>Nhận lời mời</h1><p class="meta">Bạn được mời làm <b>Duyệt phiếu</b> cho Phiếu Bé Ngoan. Tạo tài khoản rồi chờ <b>Quản lý duyệt</b> là đăng nhập được — link chỉ dùng được một lần.</p>
<form id="inv" novalidate>
<div class="field"><label for="i-user">Tên đăng nhập</label><input class="inp" id="i-user" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32" required>
<span class="hint">3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới.</span></div>
<div class="field"><label for="i-name">Tên hiển thị</label><input class="inp" id="i-name" autocomplete="name" maxlength="60" required></div>
<div class="field"><label for="i-pass">Mật khẩu</label><input class="inp" id="i-pass" type="password" autocomplete="new-password" minlength="10" required>
<span class="hint">Ít nhất 10 ký tự — nên là một câu dễ nhớ.</span></div>
<div class="field"><label for="i-pass2">Nhập lại mật khẩu</label><input class="inp" id="i-pass2" type="password" autocomplete="new-password" minlength="10" required></div>
<div class="err" id="i-err" role="alert" hidden></div>
<button class="btn btn-fire auth-btn" type="submit">Tạo tài khoản</button>
</form>`);
    const err = $('#i-err');
    const say = (msg) => { err.textContent = msg; err.hidden = false; };
    if (!token) say('Link thiếu mã. Hãy mở đúng link Quản lý gửi cho bạn.');
    $('#i-user').focus();
    $('#i-user').addEventListener('change', (e) => { e.target.value = e.target.value.trim().toLowerCase(); });
    $('#inv').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      const username = $('#i-user').value.trim().toLowerCase();
      const name = $('#i-name').value.trim();
      const a = $('#i-pass').value, b = $('#i-pass2').value;
      err.hidden = true;
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) return say('Tên đăng nhập 3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới; bắt đầu bằng chữ hoặc số.');
      if (!name) return say('Nhập tên hiển thị.');
      if (a.length < 10) return say('Mật khẩu cần ít nhất 10 ký tự.');
      if (a !== b) return say('Hai lần nhập mật khẩu không giống nhau.');
      btn.disabled = true;
      const r = await api('POST', '/nhan-loi-moi', { token, username, name, password: a });
      btn.disabled = false;
      if (!r.ok) return say(r.data.error || 'Không tạo được tài khoản.');
      authShell(`<h1>Đã tạo tài khoản</h1><p>Tài khoản <b>${esc(r.data.user.username)}</b> (${esc(r.data.user.name)}) đang <b>chờ Quản lý duyệt</b> làm Duyệt phiếu.</p>
<p class="meta">Khi được duyệt, bạn đăng nhập bằng tên đăng nhập và mật khẩu vừa tạo. Hãy báo Quản lý tên đăng nhập của bạn để được duyệt nhanh.</p>
<a class="btn btn-fire auth-btn" href="/quan-tri">Về trang đăng nhập</a>`);
    });
  }

  // ---------- accounts (managers) ----------
  const ROLE_PILL = { owner: ['Chủ', 's-published'], manager: ['Quản lý', 's-published'], editor: ['Biên tập', 's-draft'], phieu: ['Duyệt phiếu', 's-scheduled'], custom: ['Tuỳ chỉnh', 's-draft'], pending: ['Chờ duyệt', 's-pending'] };

  async function renderUsers() {
    cleanupEditor();
    const mine = screen;
    app.innerHTML = `${header('users')}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải danh sách người dùng…</p></main>`;
    bindHeader();
    const r = await api('GET', '/nguoi-dung');
    if (mine !== screen || !me) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return; }
    access = { invites: r.data.invites || [], codes: r.data.codes || [] };
    drawUsers(r.data.users, r.data.me, '');
  }

  // open invite links and live Claude codes, kept between redraws of the accounts page; a link or code just made is
  // shown once in `fresh` and gone on the next redraw (the server never shows it again)
  let access = { invites: [], codes: [] };
  let fresh = null;

  function drawUsers(users, myName, notice) {
    // the kind shown for an account: owner, pending, or the preset its grants equal ("custom" = anything else)
    const kindOf = (u) => (u.role === 'member' ? presetOf(u.grants) : u.role);
    const order = { pending: 0, owner: 1, manager: 2, editor: 3, phieu: 4 };
    const rows = users.slice().sort((a, b) => (order[kindOf(a)] ?? 5) - (order[kindOf(b)] ?? 5) || String(b.createdAt).localeCompare(String(a.createdAt)));
    const waiting = users.filter((u) => u.role === 'pending').length;
    const roleSelect = (kind, username, id) => `<select class="sel" id="${id}" aria-label="Vai trò của ${esc(username)}">${[['editor', 'Biên tập'], ['phieu', 'Duyệt phiếu'], ['manager', 'Quản lý'], ['custom', 'Tuỳ chỉnh (giữ nguyên)']]
      .filter(([v]) => v !== 'custom' || kind === 'custom')
      .map(([v, l]) => `<option value="${v}"${kind === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    const phieuUsers = users.filter((u) => kindOf(u) === 'phieu' && !u.disabled);
    const nameOf = (un) => (users.find((u) => u.username === un) || {}).name || un;
    const shown = fresh;
    fresh = null;
    const freshBox = shown ? `<div class="warnbar" style="margin:12px 0"><b>${shown.kind === 'link' ? 'Link mời mới' : 'Mã cho Claude mới'}</b> — chỉ hiện <b>một lần</b>, hãy sao chép và gửi riêng cho người dùng ngay:
<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input class="inp" id="fresh-val" readonly value="${esc(shown.value)}" style="flex:1;min-width:260px;font-family:monospace"><button type="button" class="btn btn-fire btn-sm" id="fresh-copy">Sao chép</button></div></div>` : '';
    const accessHtml = `<section class="adm-access" style="margin:28px 0">
<h2>Link mời Duyệt phiếu</h2>
<p class="meta">Người nhận link tự tạo tài khoản rồi <b>chờ bạn duyệt</b> trong bảng trên (vai trò <b>Duyệt phiếu</b> đã chọn sẵn). Duyệt phiếu chỉ thấy mục Phiếu Bé Ngoan, không thấy email người chơi, không xoá phiếu, không xuất CSV. Mỗi link dùng một lần, hết hạn sau 7 ngày.</p>
<div class="acts" style="margin:10px 0"><button type="button" class="btn btn-fire btn-sm" id="inv-new">Tạo link mời</button></div>
${access.invites.length ? `<ul class="meta">${access.invites.map((i) => `<li>Link tạo bởi ${esc(i.createdBy)} lúc ${fmtTime(i.createdAt)} · hết hạn ${fmtTime(siteNowLocal(i.exp))} <button type="button" class="btn btn-ghost btn-xs" data-inv-huy="${esc(i.id)}">Huỷ</button></li>`).join('')}</ul>` : '<p class="meta">Không có link mời nào đang chờ dùng.</p>'}
<h2 style="margin-top:22px">Mã cho Claude</h2>
<p class="meta">Mã để Claude của người Duyệt phiếu tự xem và xử lý phiếu qua <code>https://${esc(HOST)}/mcp</code>. Khoá tài khoản hoặc đổi vai trò thì mã của người đó tự hết hiệu lực.</p>
${phieuUsers.length ? `<div class="acts" style="margin:10px 0"><select class="sel" id="code-user" aria-label="Tài khoản">${phieuUsers.map((u) => `<option value="${esc(u.username)}">${esc(u.name)} (${esc(u.username)})</option>`).join('')}</select>
<input class="inp" id="code-label" maxlength="40" placeholder="Ghi chú, vd: Claude máy nhà" aria-label="Ghi chú cho mã" style="max-width:240px"><button type="button" class="btn btn-fire btn-sm" id="code-new">Tạo mã</button></div>` : '<p class="meta">Chưa có tài khoản Duyệt phiếu nào đang hoạt động.</p>'}
${access.codes.length ? `<ul class="meta">${access.codes.map((c) => `<li><b>${esc(nameOf(c.username))}</b> · ${esc(c.label)} · mã …${esc(c.hint)} · tạo ${fmtTime(c.createdAt)} · ${c.lastUsedAt ? 'dùng lần cuối ' + fmtTime(c.lastUsedAt) : 'chưa dùng'} <button type="button" class="btn btn-danger btn-xs" data-code-thu="${esc(c.id)}">Thu hồi</button></li>`).join('')}</ul>` : '<p class="meta">Chưa có mã nào đang dùng.</p>'}
</section>`;
    $('main').innerHTML = `<div class="adm-top"><div><h1>Người dùng</h1><p>${waiting ? `<b>${waiting}</b> tài khoản đăng ký đang chờ duyệt. Chỉ duyệt người bạn biết — Biên tập viết bài, Quản lý đăng bài và quản lý các phần của game.` : 'Không có tài khoản nào chờ duyệt. Người mới đăng ký tại trang Đăng ký và sẽ hiện ở đây.'}</p></div></div>
<div class="err" id="u-err" role="alert"${notice ? '' : ' hidden'}>${esc(notice)}</div>
${freshBox}
<div class="tbl-wrap"><table class="posts users"><thead><tr><th>Người dùng</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>
${rows.map((u) => {
    const [label, cls] = u.disabled ? ['Đã khoá', 's-locked'] : (ROLE_PILL[kindOf(u)] || [u.role, 's-draft']);
    const self = u.username === myName;
    let acts;
    if (self) acts = '<span class="meta">Tài khoản của bạn</span>';
    else if (u.role === 'pending') {
      // an account from an invite link comes with the invite's role already chosen
      acts = `${roleSelect(presetOf(u.wantGrants) === 'custom' ? 'editor' : presetOf(u.wantGrants), u.username, 'role-' + esc(u.username))}<button type="button" class="btn btn-fire btn-sm" data-act="duyet" data-user="${esc(u.username)}">Duyệt</button><button type="button" class="btn btn-danger btn-sm" data-act="tu-choi" data-user="${esc(u.username)}">Từ chối</button>`;
    } else {
      acts = `${u.role === 'owner' ? '' : roleSelect(kindOf(u), u.username, 'role-' + esc(u.username)) + `<button type="button" class="btn btn-ghost btn-sm" data-act="vai-tro" data-user="${esc(u.username)}">Đổi vai trò</button>`}${u.disabled
        ? `<button type="button" class="btn btn-ghost btn-sm" data-act="mo-khoa" data-user="${esc(u.username)}">Mở khoá</button>`
        : `<button type="button" class="btn btn-danger btn-sm" data-act="khoa" data-user="${esc(u.username)}">Khoá</button>`}`;
    }
    return `<tr data-user="${esc(u.username)}"><td><div class="person">${avatar(u.name)}<b>${esc(u.name)}</b></div></td><td class="meta">${esc(u.username)}${u.invitedBy ? `<div class="small">qua link mời của ${esc(u.invitedBy)}</div>` : ''}</td>
<td><span class="pill ${cls}">${label}</span></td><td class="meta">${fmtTime(u.createdAt)}</td><td><div class="acts">${acts}</div></td></tr>`;
  }).join('')}
</tbody></table></div>
${accessHtml}`;
    const armed = {};
    if (shown) {
      $('#fresh-val').addEventListener('focus', (e) => e.target.select());
      $('#fresh-copy').addEventListener('click', async () => {
        const v = $('#fresh-val');
        try { await navigator.clipboard.writeText(v.value); toast('Đã sao chép'); } catch (e) { v.select(); toast('Bấm Ctrl+C để sao chép'); }
      });
    }
    // invite links and Claude codes: each answer brings the new lists (and the new link or code, once)
    const accessCall = async (path, body, b, onFresh) => {
      if (b) b.disabled = true;
      const mine = screen;
      const r = await api('POST', path, body);
      if (mine !== screen) return;
      if (!r.ok) {
        if (b) b.disabled = false;
        if (r.status !== 401) { const e = $('#u-err'); e.textContent = r.data.error || 'Không thực hiện được.'; e.hidden = false; }
        return;
      }
      access = { invites: r.data.invites || [], codes: r.data.codes || [] };
      if (onFresh) fresh = onFresh(r.data);
      drawUsers(users, myName, '');
    };
    $('#inv-new').addEventListener('click', (e) => accessCall('/loi-moi', { role: 'phieu' }, e.target,
      (d) => ({ kind: 'link', value: `${location.origin}/quan-tri/moi#${d.token}` })));
    $$('[data-inv-huy]').forEach((b) => b.addEventListener('click', () => accessCall(`/loi-moi/${b.getAttribute('data-inv-huy')}/huy`, {}, b)));
    if ($('#code-new')) $('#code-new').addEventListener('click', (e) => accessCall('/ma-claude', { username: $('#code-user').value, label: $('#code-label').value }, e.target,
      (d) => ({ kind: 'code', value: d.code })));
    $$('[data-code-thu]').forEach((b) => b.addEventListener('click', () => {
      if (!(armed['code' + b.getAttribute('data-code-thu')] > Date.now() - 4000)) {
        armed['code' + b.getAttribute('data-code-thu')] = Date.now();
        b.textContent = 'Bấm lần nữa';
        setTimeout(() => { if (b.isConnected) b.textContent = 'Thu hồi'; }, 4000);
        return;
      }
      accessCall(`/ma-claude/${b.getAttribute('data-code-thu')}/thu-hoi`, {}, b);
    }));
    $$('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      const action = b.getAttribute('data-act');
      const username = b.getAttribute('data-user');
      // refusing and locking ask for a second click
      if ((action === 'tu-choi' || action === 'khoa') && !(armed[username + action] > Date.now() - 4000)) {
        armed[username + action] = Date.now();
        const was = b.textContent;
        b.textContent = 'Bấm lần nữa';
        setTimeout(() => { if (b.isConnected) b.textContent = was; }, 4000);
        return;
      }
      const sel = document.getElementById('role-' + username);
      const role = sel ? sel.value : undefined;
      // "Tuỳ chỉnh" has no preset to send: such an account keeps its rights unless another kind is chosen
      if ((action === 'duyet' || action === 'vai-tro') && !PRESET_GRANTS[role]) {
        const e = $('#u-err'); e.textContent = 'Chọn Biên tập, Duyệt phiếu hoặc Quản lý.'; e.hidden = false;
        return;
      }
      $$('[data-act]').forEach((x) => { x.disabled = true; });
      const mine = screen;
      const r = await api('POST', '/nguoi-dung/' + encodeURIComponent(username), { action: action === 'vai-tro' ? 'quyen' : action, grants: PRESET_GRANTS[role] });
      if (mine !== screen) return;
      if (!r.ok) {
        if (r.status === 401) return;
        $$('[data-act]').forEach((x) => { x.disabled = false; });
        const e = $('#u-err'); e.textContent = r.data.error || 'Không thực hiện được.'; e.hidden = false;
        return;
      }
      toast({ duyet: `Đã duyệt ${username}`, 'tu-choi': `Đã từ chối ${username}`, khoa: `Đã khoá ${username}`, 'mo-khoa': `Đã mở khoá ${username}`, 'vai-tro': `Đã đổi vai trò ${username}` }[action]);
      drawUsers(r.data.users, r.data.me, '');
    }));
  }

  // ---------- article list ----------
  const listView = { state: 'all', cat: 'all', site: 'all' };

  async function renderList() {
    cleanupEditor();
    const mine = screen;
    app.innerHTML = `${header()}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải danh sách bài…</p></main>`;
    bindHeader();
    const r = await api('GET', '/bai');
    if (mine !== screen || !me) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return; }
    const posts = r.data.items;
    let pendingBar = '';
    const draw = () => {
      const rows = posts.filter((p) => (listView.state === 'all' || stateOf(p) === listView.state) && (listView.cat === 'all' || p.category === listView.cat)
          && (listView.site === 'all' || siteOfPost(p) === listView.site))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      const n = (s) => posts.filter((p) => s === 'all' || stateOf(p) === s).length;
      const hint = me.role === 'manager'
        ? 'Bài Biên tập gửi lên nằm ở mục <b>Chờ duyệt</b>: mở bài, đăng hoặc trả lại kèm ghi chú.'
        : 'Viết xong bấm <b>Gửi duyệt</b> — Quản lý sẽ xem và đăng. Bài đã gửi thì rút về nháp mới sửa được.';
      $('main').innerHTML = `${pendingBar}<div class="adm-top"><div><h1>Bài viết</h1><p>${hint}</p></div><a class="btn btn-fire" href="#/viet-bai">+ Viết bài mới</a></div>
<div class="filters">${['all', 'published', 'scheduled', 'pending', 'draft'].map((s) => `<button type="button" class="tab${listView.state === s ? ' on' : ''}" data-st="${s}">${s === 'all' ? 'Tất cả' : STATE[s]}<small>${n(s)}</small></button>`).join('')}
<select id="fcat" aria-label="Lọc theo mục"><option value="all">Mọi mục</option>${CATS.map((c) => `<option value="${c.id}"${listView.cat === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
${SITES.length ? `<select id="fsite" aria-label="Lọc theo trang"><option value="all">Mọi trang</option>${SITES.map((s) => `<option value="${s.id}"${listView.site === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}</div>
<div class="tbl-wrap"><table class="posts posts-bai"><thead><tr><th>Bài viết</th><th>Mục</th><th>Trạng thái</th><th>Người viết</th><th>Sửa lần cuối</th><th></th></tr></thead><tbody>
${rows.map((p) => {
    const st = stateOf(p);
    const canEdit = me.role === 'manager' || p.status === 'draft';
    return `<tr data-id="${p.id}">
<td><div class="p-title">${p.cover ? `<img class="cover" src="${esc(p.cover)}" alt="" loading="lazy">` : '<div class="cover"></div>'}<div><b>${esc(p.title)}</b><small>${SITES.length && siteOfPost(p) === 'phu' ? '3qdaichien/#tin/' : '/tin-tuc/'}${esc(p.slug)}</small>${p.pinned ? ' <span class="pin">Ghim</span>' : ''}${p.lockedBy ? `<div class="lock">● ${esc(p.lockedBy)} đang sửa bài này</div>` : ''}${p.status === 'draft' && p.reviewNote ? `<div class="lock">↩ Trả lại: ${esc(p.reviewNote)}</div>` : ''}</div></div></td>
<td><span class="chip c-${esc(p.category)}">${esc(catName(p.category))}</span>${SITES.length ? `<div style="margin-top:6px"><span class="chip c-${siteOfPost(p)}">${esc(siteName(siteOfPost(p)))}</span></div>` : ''}</td>
<td><span class="pill s-${st}">${STATE[st]}</span>${st === 'scheduled' || st === 'published' ? `<div class="meta" style="margin-top:4px">${fmtTime(p.publishAt)}</div>` : ''}</td>
<td><div class="person">${avatar(p.author)}${esc(p.author)}</div></td>
<td class="meta">${fmtTime(p.updatedAt)}<br>bởi ${esc(p.updatedBy)}</td>
<td><div class="acts"><a class="btn btn-ghost btn-sm" href="#/sua/${p.id}">${canEdit ? 'Sửa' : 'Mở'}</a><a class="btn btn-ghost btn-sm" href="/quan-tri/xem-truoc/${p.id}">Xem</a>${me.role === 'manager' ? `<button type="button" class="btn btn-danger btn-sm" data-del="${p.id}">Xoá</button>` : ''}</div></td></tr>`;
  }).join('')}
${rows.length ? '' : `<tr><td colspan="6" class="meta" style="text-align:center;padding:30px">${posts.length ? 'Không có bài nào khớp bộ lọc.' : 'Chưa có bài nào. Bấm “Viết bài mới” để bắt đầu.'}</td></tr>`}
</tbody></table></div>`;
      $$('[data-st]').forEach((b) => b.addEventListener('click', () => { listView.state = b.getAttribute('data-st'); draw(); }));
      $('#fcat').addEventListener('change', (e) => { listView.cat = e.target.value; draw(); });
      if ($('#fsite')) $('#fsite').addEventListener('change', (e) => { listView.site = e.target.value; draw(); });
      // managers delete straight from the list: first click asks, second click (within 4 s) moves it to the trash
      $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
        const id = +b.getAttribute('data-del');
        if (!(b.dataset.armed > Date.now() - 4000)) {
          b.dataset.armed = Date.now();
          b.textContent = 'Bấm lần nữa';
          setTimeout(() => { if (b.isConnected) b.textContent = 'Xoá'; }, 4000);
          return;
        }
        const post = posts.find((x) => x.id === id);
        b.disabled = true;
        const r = await api('POST', `/bai/${id}/xoa`, { baseUpdatedAt: post.updatedAt });
        if (mine !== screen) return;
        if (!r.ok) {
          if (r.status === 401) return;
          b.disabled = false; b.textContent = 'Xoá';
          $('main').insertAdjacentHTML('afterbegin', `<div class="err" style="margin-top:16px">${esc(r.data.error || 'Không xoá được.')}${r.status === 409 ? ' <a href="#/" class="btn btn-ghost btn-xs" id="list-reload">Tải lại danh sách</a>' : ''}</div>`);
          const rl = $('#list-reload'); if (rl) rl.addEventListener('click', (e) => { e.preventDefault(); renderList(); });
          return;
        }
        posts.splice(posts.indexOf(post), 1);
        toast(`Đã chuyển “${post.title}” vào thùng rác`);
        draw();
      }));
    };
    draw();
    // owners: point at registrations waiting for approval
    if (me.kind === 'owner') {
      const u = await api('GET', '/nguoi-dung');
      if (mine !== screen || !u.ok) return;
      const waiting = u.data.users.filter((x) => x.role === 'pending').length;
      if (waiting) { pendingBar = `<div class="warnbar" id="pending-users"><b>${waiting}</b> tài khoản đăng ký đang chờ duyệt. <a href="#/nguoi-dung">Xem và duyệt →</a></div>`; draw(); }
    }
  }

  // ---------- trash (managers) ----------
  async function renderTrash() {
    cleanupEditor();
    const mine = screen;
    app.innerHTML = `${header('trash')}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải thùng rác…</p></main>`;
    bindHeader();
    const r = await api('GET', '/thung-rac');
    if (mine !== screen || !me) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return; }
    const draw = (items, notice) => {
      $('main').innerHTML = `<div class="adm-top"><div><h1>Thùng rác</h1><p>Bài đã xoá nằm ở đây. <b>Khôi phục</b> đưa bài về <b>Nháp</b> — người chơi chưa thấy cho tới khi đăng lại. <b>Xoá vĩnh viễn</b> thì bài mất hẳn, không lấy lại được.</p></div>${items.length ? `<button type="button" class="btn btn-danger" id="t-empty">Dọn sạch thùng rác (${items.length})</button>` : ''}</div>
<div class="err" id="t-err" role="alert"${notice ? '' : ' hidden'}>${esc(notice || '')}</div>
<div class="tbl-wrap"><table class="posts posts-rac"><thead><tr><th>Bài viết</th><th>Mục</th><th>Lúc xoá</th><th>Người viết</th><th>Xoá bởi</th><th></th></tr></thead><tbody>
${items.map((t) => `<tr data-file="${esc(t.file)}">
<td><div class="p-title">${t.cover ? `<img class="cover" src="${esc(t.cover)}" alt="" loading="lazy">` : '<div class="cover"></div>'}<div><b>${esc(t.title)}</b><small>/tin-tuc/${esc(t.slug)} · trước khi xoá: ${esc(STATE[t.status] || t.status)}</small></div></div></td>
<td><span class="chip c-${esc(t.category)}">${esc(catName(t.category))}</span></td>
<td class="meta">${fmtTime(t.deletedAt)}</td>
<td><div class="person">${avatar(t.author)}${esc(t.author)}</div></td>
<td class="meta">${esc(t.deletedBy || '—')}</td>
<td><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-restore="${esc(t.file)}">Khôi phục</button><button type="button" class="btn btn-danger btn-sm" data-purge="${esc(t.file)}">Xoá vĩnh viễn</button></div></td></tr>`).join('')}
${items.length ? '' : '<tr><td colspan="6" class="meta" style="text-align:center;padding:30px">Thùng rác trống.</td></tr>'}
</tbody></table></div>`;
      $$('[data-restore]').forEach((b) => b.addEventListener('click', async () => {
        $$('[data-restore]').forEach((x) => { x.disabled = true; });
        const mine2 = screen;
        const res = await api('POST', `/thung-rac/${encodeURIComponent(b.getAttribute('data-restore'))}/khoi-phuc`, {});
        if (mine2 !== screen) return;
        if (!res.ok) { if (res.status !== 401) draw(items, res.data.error || 'Không khôi phục được.'); return; }
        toast(`Đã khôi phục “${res.data.post.title}” về Nháp`);
        draw(res.data.items, '');
      }));
      $$('[data-purge]').forEach((b) => b.addEventListener('click', async () => {
        if (!armDelete(b, 'Xoá vĩnh viễn')) return;
        $$('[data-purge],[data-restore],#t-empty').forEach((x) => { x.disabled = true; });
        const mine2 = screen;
        const res = await api('POST', `/thung-rac/${encodeURIComponent(b.getAttribute('data-purge'))}/xoa-han`, {});
        if (mine2 !== screen) return;
        if (!res.ok) { if (res.status !== 401) draw(items, res.data.error || 'Không xoá được.'); return; }
        toast(`Đã xoá vĩnh viễn “${res.data.title}”`);
        draw(res.data.items, '');
      }));
      const empty = $('#t-empty');
      if (empty) empty.addEventListener('click', async () => {
        if (!armDelete(empty, `Dọn sạch thùng rác (${items.length})`)) return;
        $$('[data-purge],[data-restore],#t-empty').forEach((x) => { x.disabled = true; });
        const mine2 = screen;
        const res = await api('POST', '/thung-rac/don-sach', {});
        if (mine2 !== screen) return;
        if (!res.ok) { if (res.status !== 401) draw(items, res.data.error || 'Không dọn được thùng rác.'); return; }
        toast(`Đã xoá vĩnh viễn ${res.data.deleted} bài`);
        draw(res.data.items, '');
      });
    };
    draw(r.data.items, '');
  }

  // ---------- background music of the home page (managers) ----------
  // The songs are plain files in one folder on the server, so this page is that folder: upload adds a file, delete
  // removes it, and the player on the home page follows at once (it reads the same folder on every visit).
  const MUSIC_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/x-wav'];
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

  async function renderMusic() {
    cleanupEditor();
    const mine = screen;
    app.innerHTML = `${header('music')}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải danh sách nhạc…</p></main>`;
    bindHeader();
    const r = await api('GET', '/nhac');
    if (mine !== screen || !me) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return; }
    const max = r.data.max || 15728640;
    const total = r.data.total || 314572800;

    const draw = (items, notice) => {
      const used = items.reduce((n, s) => n + (s.bytes || 0), 0);
      $('main').innerHTML = `<div class="adm-top"><div><h1>Nhạc nền</h1>
<p>Những bài này phát ở bàn nhạc góc dưới phải <b>trang chủ</b>. Thêm hoặc xoá là có hiệu lực ngay, không cần khởi động lại web.
Đặt tên file kiểu <b>Tên bài - Ca sĩ.mp3</b> để bàn nhạc hiện đúng tên và ca sĩ. Mỗi bài tối đa ${mb(max)}, tất cả cộng lại tối đa ${mb(total)}.</p></div>
<div><input type="file" id="m-file" accept="audio/*" multiple hidden><button type="button" class="btn btn-fire" id="m-add">+ Thêm bài hát</button></div></div>
<div class="err" id="m-err" role="alert"${notice ? '' : ' hidden'}>${esc(notice || '')}</div>
<p class="meta" id="m-used">Đang dùng ${mb(used)} / ${mb(total)} — ${items.length} bài.</p>
<div class="tbl-wrap"><table class="posts posts-nhac"><thead><tr><th>Bài hát</th><th>Ca sĩ</th><th>Dung lượng</th><th>Nghe thử</th><th></th></tr></thead><tbody>
${items.map((s) => `<tr data-name="${esc(s.name)}">
<td><div class="p-title"><div><b>${esc(s.title)}</b><div class="meta">${esc(s.name)}</div></div></div></td>
<td class="meta">${esc(s.artist || '—')}</td>
<td class="meta">${mb(s.bytes || 0)}</td>
<td><audio controls preload="none" src="${esc(s.file)}" style="height:32px;max-width:220px"></audio></td>
<td><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-del-song="${esc(s.name)}">Xoá</button></div></td></tr>`).join('')}
${items.length ? '' : '<tr><td colspan="5" class="meta" style="text-align:center;padding:30px">Chưa có bài hát nào. Bấm “Thêm bài hát” để tải lên.</td></tr>'}
</tbody></table></div>`;

      const err = (msg) => { const e = $('#m-err'); e.textContent = msg; e.hidden = !msg; };
      $('#m-add').addEventListener('click', () => $('#m-file').click());
      $('#m-file').addEventListener('change', async () => {
        const files = [...$('#m-file').files];
        $('#m-file').value = '';
        if (!files.length) return;
        const mine2 = screen;
        let list = items;
        for (const f of files) {
          if (!MUSIC_TYPES.includes(f.type)) { err(`“${f.name}”: chỉ nhận MP3, M4A, OGG hoặc WAV.`); continue; }
          if (f.size > max) { err(`“${f.name}” nặng ${mb(f.size)}, quá giới hạn ${mb(max)} mỗi bài.`); continue; }
          $('#m-used').textContent = `Đang tải lên “${f.name}” (${mb(f.size)})…`;
          let res;
          try {
            res = await fetch('/quan-tri/api/nhac', {
              method: 'POST', credentials: 'same-origin', body: f,
              headers: { 'Content-Type': f.type, 'X-Ten-File': encodeURIComponent(f.name) },
            });
          } catch (e2) { err('Mất kết nối khi tải bài hát lên. Thử lại.'); break; }
          let data = {};
          try { data = await res.json(); } catch (e2) { data = { error: 'Máy chủ trả lời lạ (' + res.status + ').' }; }
          if (res.status === 401) { me = null; renderLogin(data.error); return; }
          if (mine2 !== screen) return;
          if (!res.ok) { err(data.error || `Không tải lên được “${f.name}”.`); continue; }
          list = data.items;
          toast(`Đã thêm “${data.name}”`);
        }
        draw(list, '');
      });
      $$('[data-del-song]').forEach((b) => b.addEventListener('click', async () => {
        const name = b.getAttribute('data-del-song');
        if (!window.confirm(`Xoá “${name}” khỏi nhạc nền? Người chơi sẽ không nghe bài này nữa.`)) return;
        $$('[data-del-song]').forEach((x) => { x.disabled = true; });
        const mine2 = screen;
        const res = await api('POST', `/nhac/${encodeURIComponent(name)}/xoa`, {});
        if (mine2 !== screen) return;
        if (!res.ok) { if (res.status !== 401) draw(items, res.data.error || 'Không xoá được bài này.'); return; }
        toast(`Đã xoá “${name}”`);
        draw(res.data.items, '');
      }));
    };
    draw(r.data.items, '');
  }

  // ---------- early sign-ups (managers) ----------
  // Phone numbers left on /dang-ky-som, newest first: search by digits, page through, download everything as CSV (the
  // gifts are sent by hand for now), and set the milestones the page shows.
  const fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN');

  async function renderSignups() {
    cleanupEditor();
    const mine = screen;
    const view = { q: '', page: 1 };
    app.innerHTML = `${header('signup')}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải danh sách đăng ký…</p></main>`;
    bindHeader();

    const load = async () => {
      const r = await api('GET', `/dang-ky-som?q=${encodeURIComponent(view.q)}&trang=${view.page}`);
      if (mine !== screen || !me) return null;
      if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return null; }
      return r.data;
    };

    const draw = (d) => {
      $('main').innerHTML = `<div class="adm-top"><div><h1>Đăng ký sớm</h1>
<p>Số điện thoại khách để lại ở trang <a href="/dang-ky-som" target="_blank" rel="noopener">/dang-ky-som</a>. Quà chưa phát tự động — tải CSV để gửi tay.</p></div>
<a class="btn btn-fire" href="/quan-tri/api/dang-ky-som/csv" download>Tải CSV (${fmtNum(d.total)} số)</a></div>
<form class="dks-find" id="s-find"><input class="inp" id="s-q" type="search" inputmode="numeric" placeholder="Tìm theo số, ví dụ 0912" value="${esc(view.q)}" aria-label="Tìm theo số điện thoại">
<button type="submit" class="btn btn-ghost">Tìm</button>${view.q ? '<button type="button" class="btn btn-ghost" id="s-clear">Bỏ lọc</button>' : ''}
<span class="meta">${view.q ? `${fmtNum(d.count)} / ${fmtNum(d.total)} số khớp` : `Tổng ${fmtNum(d.total)} số`}</span></form>
<div class="tbl-wrap"><table class="posts posts-dks"><thead><tr><th>Số điện thoại</th><th>STT</th><th>Thời gian</th><th>Nguồn</th><th>IP</th><th></th></tr></thead><tbody>
${d.items.map((s) => `<tr><td><b>${esc(s.sdt)}</b></td><td class="meta">#${s.stt}</td><td class="meta">${fmtTime(s.luc)}</td><td class="meta">${esc(s.nguon || '—')}</td><td class="meta">${esc(s.ip || '—')}</td><td><div class="acts"><button type="button" class="btn btn-danger btn-sm" data-del-sdt="${esc(s.sdt)}">Xoá</button></div></td></tr>`).join('')}
${d.items.length ? '' : `<tr><td colspan="6" class="meta" style="text-align:center;padding:30px">${view.q ? 'Không có số nào khớp.' : 'Chưa có ai đăng ký.'}</td></tr>`}
</tbody></table></div>
${d.pages > 1 ? `<div class="dks-pager"><button type="button" class="btn btn-ghost btn-sm" id="s-prev"${d.page <= 1 ? ' disabled' : ''}>‹ Mới hơn</button>
<span class="meta">Trang ${d.page} / ${d.pages}</span><button type="button" class="btn btn-ghost btn-sm" id="s-next"${d.page >= d.pages ? ' disabled' : ''}>Cũ hơn ›</button></div>` : ''}
<div class="box dks-moc"><h3>Mốc hiện trên trang đăng ký</h3>
<p class="meta">Các số người đăng ký, tăng dần, cách nhau bằng dấu phẩy (tối đa 8 mốc). Trang đăng ký đổi theo ngay.</p>
<form class="row" id="s-moc-form"><input class="inp" id="s-moc" value="${esc(d.milestones.join(', '))}" aria-label="Các mốc"><button type="submit" class="btn btn-ghost">Lưu mốc</button></form>
<div class="err" id="s-moc-err" role="alert" hidden></div></div>`;

      const again = async () => { const nd = await load(); if (nd) draw(nd); };
      $('#s-find').addEventListener('submit', (e) => { e.preventDefault(); view.q = $('#s-q').value.replace(/\D/g, ''); view.page = 1; again(); });
      if ($('#s-clear')) $('#s-clear').addEventListener('click', () => { view.q = ''; view.page = 1; again(); });
      if ($('#s-prev')) $('#s-prev').addEventListener('click', () => { view.page = d.page - 1; again(); });
      if ($('#s-next')) $('#s-next').addEventListener('click', () => { view.page = d.page + 1; again(); });
      $$('[data-del-sdt]').forEach((b) => b.addEventListener('click', async () => {
        if (!armDelete(b, 'Xoá')) return;
        const sdt = b.getAttribute('data-del-sdt');
        b.disabled = true;
        const mine2 = screen;
        const res = await api('POST', '/dang-ky-som/xoa', { sdt });
        if (mine2 !== screen) return;
        if (!res.ok) { b.disabled = false; b.textContent = 'Xoá'; if (res.status !== 401) toast(res.data.error || 'Không xoá được.'); return; }
        toast(`Đã xoá ${sdt} — còn ${fmtNum(res.data.count)} số`);
        again();
      }));
      $('#s-moc-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#s-moc-err');
        // "10.000" is ten thousand here: dots are thousand separators, commas/semicolons/spaces separate milestones
        const list = $('#s-moc').value.replace(/\./g, '').split(/[,;\s]+/).filter(Boolean).map(Number);
        const mine2 = screen;
        const res = await api('POST', '/dang-ky-som/moc', { milestones: list });
        if (mine2 !== screen) return;
        if (!res.ok) { if (res.status !== 401) { err.textContent = res.data.error || 'Không lưu được mốc.'; err.hidden = false; } return; }
        err.hidden = true;
        $('#s-moc').value = res.data.milestones.join(', ');
        toast('Đã lưu mốc: ' + res.data.milestones.map(fmtNum).join(' · '));
      });
    };

    const d = await load();
    if (d) draw(d);
  }

  // ---------- gift tickets from Phiếu Bé Ngoan (managers) ----------
  // Players ask for gifts on phieubengoan.3qdc.wanmeivn.com, one ticket a day. Give the gifts in the game, then mark the
  // ticket given (or refused) here with an optional reply: the player sees both in their history.
  const PHIEU_ST = { cho: 'Đang chờ', tra: 'Đã trả', tu: 'Từ chối' };
  const phieuView = { ngay: 'hom-nay', st: 'all' };

  async function renderPhieu() {
    cleanupEditor();
    const mine = screen;
    app.innerHTML = `${header('phieu')}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải phiếu…</p></main>`;
    bindHeader();
    const qs = () => `ngay=${phieuView.ngay}&st=${phieuView.st}`;

    const load = async () => {
      const r = await api('GET', `/phieu-be-ngoan?${qs()}`);
      if (mine !== screen || !me) return null;
      if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return null; }
      return r.data;
    };

    // "Duyệt phiếu" accounts see no email addresses, no CSV and no delete button (the server refuses those anyway)
    const full = me.role === 'manager';
    const draw = (d) => {
      const c = d.counts;
      $('main').innerHTML = `<div class="adm-top"><div><h1>Phiếu Bé Ngoan</h1>
<p>Người chơi gửi phiếu ở <a href="https://phieubengoan.3qdc.wanmeivn.com/" target="_blank" rel="noopener">phieubengoan.3qdc.wanmeivn.com</a>. Trả quà trong game xong thì bấm <b>Đã trả</b>, người chơi sẽ thấy trong lịch sử.</p></div>
${full ? `<a class="btn btn-fire" href="/quan-tri/api/phieu-be-ngoan/csv?${qs()}" download>Xuất CSV</a>` : ''}</div>
<div class="filters">${['all', 'cho', 'tra', 'tu'].map((s) => `<button type="button" class="tab${phieuView.st === s ? ' on' : ''}" data-pst="${s}">${s === 'all' ? 'Tất cả' : PHIEU_ST[s]}<small>${fmtNum(c[s])}</small></button>`).join('')}
<select id="fngay" aria-label="Ngày gửi">${[['hom-nay', 'Hôm nay'], ['hom-qua', 'Hôm qua'], ['tat-ca', 'Mọi ngày']].map(([v, l]) => `<option value="${v}"${phieuView.ngay === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
<span class="meta">${fmtNum(d.cho)} phiếu đang chờ (mọi ngày)</span></div>
<div class="tbl-wrap"><table class="posts posts-phieu"><thead><tr><th>Phiếu</th><th>Nhân vật</th><th>Quà muốn nhận</th><th>Ghi chú</th><th>Trạng thái</th><th>Xử lý</th></tr></thead><tbody>
${d.items.map((t) => `<tr data-id="${esc(t.id)}">
<td>${full ? `<b>${esc(t.email)}</b>` : `<span class="meta">Mã ${esc(t.id)}</span>`}<div class="meta">${fmtTime(t.luc)}</div></td>
<td><b>${esc(t.acc)}</b><div class="meta">Server ${esc(t.serverTen || t.server)}</div></td>
<td><ul class="phieu-qua">${t.qua.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></td>
<td class="meta">${esc(t.ghiChu) || '—'}</td>
<td><span class="pill s-phieu-${esc(t.st)}">${PHIEU_ST[t.st] || esc(t.st)}</span>${t.xuLyBoi ? `<div class="meta" style="margin-top:4px">${esc(t.xuLyBoi)} · ${fmtTime(t.xuLyLuc)}</div>` : ''}</td>
<td>${t.st === 'cho'
    ? `<div class="phieu-act"><input class="inp" maxlength="160" placeholder="Phản hồi cho người chơi (không bắt buộc)" aria-label="Phản hồi" data-reply="${esc(t.id)}"><div class="acts"><button type="button" class="btn btn-fire btn-sm" data-set="tra" data-id="${esc(t.id)}">Đã trả</button><button type="button" class="btn btn-danger btn-sm" data-set="tu" data-id="${esc(t.id)}">Từ chối</button></div></div>`
    : `<div class="meta">${t.phanHoi ? esc(t.phanHoi) : 'Không có phản hồi.'}</div><button type="button" class="btn btn-ghost btn-xs" data-set="cho" data-id="${esc(t.id)}" style="margin-top:6px">Đưa về Đang chờ</button>`}
${full ? `<div style="margin-top:8px"><button type="button" class="btn btn-danger btn-xs" data-del-phieu="${esc(t.id)}">Xoá phiếu</button></div>` : ''}</td></tr>`).join('')}
${d.items.length ? '' : `<tr><td colspan="6" class="meta" style="text-align:center;padding:30px">${c.all ? 'Không có phiếu nào khớp bộ lọc.' : 'Chưa có phiếu nào trong ngày này.'}</td></tr>`}
</tbody></table></div>`;

      const again = async () => { const nd = await load(); if (nd) draw(nd); };
      $$('[data-pst]').forEach((b) => b.addEventListener('click', () => { phieuView.st = b.getAttribute('data-pst'); again(); }));
      $('#fngay').addEventListener('change', (e) => { phieuView.ngay = e.target.value; again(); });
      $$('[data-set]').forEach((b) => b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        const st = b.getAttribute('data-set');
        const box = $(`[data-reply="${id}"]`);
        b.disabled = true;
        const r = await api('POST', `/phieu-be-ngoan/${id}`, { st, phanHoi: box ? box.value : '' });
        if (mine !== screen) return;
        if (!r.ok) { b.disabled = false; if (r.status !== 401) toast(r.data.error || 'Không đổi được trạng thái.'); return; }
        toast(st === 'cho' ? 'Đã đưa phiếu về Đang chờ' : `Đã đánh dấu: ${PHIEU_ST[st]}`);
        again();
      }));
      $$('[data-del-phieu]').forEach((b) => b.addEventListener('click', async () => {
        if (!armDelete(b, 'Xoá phiếu')) return;
        b.disabled = true;
        const r = await api('POST', `/phieu-be-ngoan/${b.getAttribute('data-del-phieu')}/xoa`, {});
        if (mine !== screen) return;
        if (!r.ok) { b.disabled = false; b.textContent = 'Xoá phiếu'; if (r.status !== 401) toast(r.data.error || 'Không xoá được phiếu.'); return; }
        toast('Đã xoá phiếu');
        again();
      }));
    };

    const d = await load();
    if (d) draw(d);
  }

  // ---------- picture upload (cover, pictures in the text) ----------
  const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  // Sends one picture file; resolves its /tin-tuc-anh/… address, or null after showing why it failed.
  async function uploadPicture(file, say) {
    if (!file) return null;
    if (!UPLOAD_TYPES.includes(file.type)) { say('Chỉ nhận ảnh JPG, PNG hoặc WEBP.'); return null; }
    if (file.size > 5 * 1024 * 1024) { say(`Ảnh nặng ${(file.size / 1048576).toFixed(1)} MB, quá giới hạn 5 MB. Hãy giảm kích thước (khuyên dùng 1200×675) rồi tải lại.`); return null; }
    if (file.size > 2 * 1024 * 1024) toast(`Ảnh nặng ${(file.size / 1048576).toFixed(1)} MB — trang sẽ tải chậm hơn. Nên nén xuống dưới 1 MB nếu được.`);
    let res;
    try {
      res = await fetch('/quan-tri/api/anh', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type }, body: file });
    } catch (e) {
      say('Không tải được ảnh lên (mất kết nối). Thử lại.');
      return null;
    }
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'Máy chủ trả lời lạ (' + res.status + ').' }; }
    if (res.status === 401) { me = null; renderLogin(data.error); return null; }
    if (!res.ok) { say(data.error || 'Không tải được ảnh lên.'); return null; }
    return data.url;
  }

  // ---------- editor ----------
  function cleanupEditor() {
    screen++;
    if (leaving) { const f = leaving; leaving = null; f(); }
    dirty = () => false;
  }

  async function renderEditor(id) {
    cleanupEditor();
    if (!id) return drawEditor(null, '', []);
    const mine = screen;
    app.innerHTML = `${header()}<main class="wrap"><p class="meta" style="padding:40px 0">Đang mở bài…</p></main>`;
    bindHeader();
    const r = await api('GET', '/bai/' + id);
    if (mine !== screen || !me) return;
    if (!r.ok) {
      if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)} <a href="#/">← Về danh sách</a></div>`;
      return;
    }
    drawEditor(r.data.post, r.data.lockedBy, r.data.history);
  }

  function drawEditor(post, lockedBy, versions) {
    cleanupEditor();
    const manager = me.role === 'manager';
    const p = post ? Object.assign({}, post) : { id: 0, slug: '', title: '', category: CATS[0].id, cover: '', pinned: false, status: 'draft', publishAt: null, summary: '', content: '', reviewNote: '' };
    const st = post ? stateOf(post) : 'draft';
    const live = !!post && st === 'published';
    const editable = manager || !post || post.status === 'draft';
    // a new article has no site until the writer picks one; an existing one shows where it is now
    const site0 = post ? siteOfPost(post) : '';
    let slugTouched = !!post;
    const mode0 = st === 'scheduled' ? 'scheduled' : st === 'published' ? 'now' : 'draft';
    const defaultWhen = post && st === 'scheduled' ? post.publishAt.slice(0, 16) : siteNowLocal(Date.now() + 86400e3).slice(0, 11) + '20:00';
    const firstRadio = !post || post.status === 'draft' ? 'Lưu nháp — chỉ nhóm thấy' : post.status === 'pending' ? 'Giữ ở chờ duyệt' : 'Gỡ khỏi trang tin (về nháp)';

    let publishBox;
    if (manager) {
      publishBox = `<div class="radios" role="radiogroup" aria-label="Trạng thái">
<label><input type="radio" name="e-mode" value="draft"${mode0 === 'draft' ? ' checked' : ''}> ${firstRadio}</label>
<label><input type="radio" name="e-mode" value="now"${mode0 === 'now' ? ' checked' : ''}> ${live ? 'Đang hiện trên trang tin' : 'Đăng ngay'}</label>
<label><input type="radio" name="e-mode" value="scheduled"${mode0 === 'scheduled' ? ' checked' : ''}> Hẹn giờ đăng</label></div>
<input type="datetime-local" id="e-when" class="inp" style="margin-top:10px" value="${esc(defaultWhen)}"${mode0 === 'scheduled' ? '' : ' hidden'} aria-label="Thời điểm đăng (giờ Việt Nam)">
<label class="chk"><input type="checkbox" id="e-pin"${p.pinned ? ' checked' : ''}> Ghim lên đầu mục (bỏ ghim bài đang ghim cùng mục)</label>
<div class="btns"><button type="button" class="btn btn-ghost btn-sm" id="e-prev">Xem trước</button><button type="button" class="btn btn-fire" id="e-save">Lưu</button></div>`;
    } else if (editable) {
      publishBox = `<p class="meta small" style="margin:0">Bài của Biên tập cần Quản lý duyệt trước khi hiện trên trang tin.</p>
<div class="btns"><button type="button" class="btn btn-ghost btn-sm" id="e-prev">Xem trước</button><button type="button" class="btn btn-ghost" id="e-draft">Lưu nháp</button><button type="button" class="btn btn-fire" id="e-send">Gửi duyệt</button></div>`;
    } else if (post.status === 'pending') {
      publishBox = `<p style="margin:0">Bài đang <b>chờ Quản lý duyệt</b>. Muốn sửa thì rút về nháp (bài sẽ không còn trong hàng chờ).</p>
<div class="btns"><button type="button" class="btn btn-ghost btn-sm" id="e-prev">Xem trước</button><button type="button" class="btn btn-fire" id="e-back">Rút về nháp để sửa</button></div>`;
    } else {
      publishBox = `<p style="margin:0">Bài ${st === 'scheduled' ? 'đã hẹn giờ đăng' : 'đã đăng'} — chỉ Quản lý sửa được.</p>
<div class="btns"><button type="button" class="btn btn-ghost btn-sm" id="e-prev">Xem trước</button></div>`;
    }

    const reviewBox = manager && post && post.status === 'pending'
      ? `<div class="box"><h3>Trả lại cho người viết</h3><textarea id="e-note" class="inp" rows="3" maxlength="300" placeholder="Cần sửa gì? Ví dụ: thiếu ảnh bìa, sai ngày sự kiện…"></textarea>
<div class="btns"><button type="button" class="btn btn-ghost" id="e-return">Trả lại</button></div></div>` : '';
    const dangerBox = manager && post
      ? `<div class="box"><h3>Xoá bài</h3><p class="meta small" style="margin:0 0 10px">Bài chuyển vào thùng rác trên máy chủ (khôi phục được khi cần).</p><button type="button" class="btn btn-danger btn-sm" id="e-del">Xoá bài</button></div>` : '';
    const historyBox = post && versions.length
      ? `<div class="box"><h3>Lịch sử (${versions.length} bản gần nhất)</h3><ul class="hist">${versions.map((h, i) => `<li>${avatar(h.actor)}<span>${esc(h.actor)} ${esc(ACTION_WORDS[h.action] || h.action)}<small>${fmtTime(h.savedAt)}${i === 0 ? ' · bản hiện tại' : ''}</small></span>${i === 0 || !editable ? '' : `<button type="button" class="btn btn-ghost btn-xs" data-rev="${esc(h.rev)}">Nạp</button>`}</li>`).join('')}</ul></div>` : '';

    app.innerHTML = `${header()}<main class="wrap">
<div id="e-lockbar"></div>
${p.status === 'draft' && p.reviewNote ? `<div class="warnbar">Quản lý trả lại bài: ${esc(p.reviewNote)}</div>` : ''}
<div class="adm-top" style="padding-bottom:0"><div><a class="meta" href="#/" style="text-decoration:none">← Tất cả bài viết</a><h1 style="margin-top:8px">${post ? (editable ? 'Sửa bài' : 'Xem bài') : 'Viết bài mới'}</h1>
${post ? `<p><span class="pill s-${st}">${STATE[st]}</span>${post.publishAt ? ` <span class="meta">${st === 'scheduled' ? 'đăng lúc' : 'đăng'} ${fmtTime(post.publishAt)}</span>` : ''}</p>` : ''}</div></div>
<div class="ed">
<div>
<div class="field"><label for="e-title">Tiêu đề</label><textarea id="e-title" class="inp t-inp" rows="2" maxlength="150" placeholder="Ví dụ: Khai mở máy chủ S2 Trường Bản">${esc(p.title)}</textarea></div>
<div class="field" style="margin-top:-8px"><div class="slug"><span id="e-addr">${esc(addrPrefix(site0 || 'chinh'))}</span><input id="e-slug" value="${esc(p.slug)}" aria-label="Đường dẫn bài" placeholder="tu-dong-tao-tu-tieu-de" maxlength="80" spellcheck="false"></div></div>
<div class="field"><label for="e-sum">Tóm tắt <span class="lbl-note">— hiện trên thẻ bài và khi chia sẻ</span></label>
<textarea id="e-sum" class="inp" rows="2" maxlength="220" placeholder="Một hai câu nói bài này có gì cho người chơi">${esc(p.summary)}</textarea><span class="count" id="e-count"></span></div>
<div class="field"><span class="lbl">Nội dung</span>
<div class="editor">
<div class="tb" role="toolbar" aria-label="Định dạng"${editable ? '' : ' hidden'}>
<button type="button" data-cmd="formatBlock" data-val="P">Đoạn văn</button><button type="button" data-cmd="formatBlock" data-val="H2">Tiêu đề lớn</button><button type="button" data-cmd="formatBlock" data-val="H3">Tiêu đề nhỏ</button><span class="sep"></span>
<button type="button" data-cmd="bold" aria-label="In đậm"><b>B</b></button><button type="button" data-cmd="italic" aria-label="In nghiêng"><i>I</i></button><button type="button" data-cmd="insertUnorderedList">• Danh sách</button><button type="button" data-cmd="insertOrderedList">1. Danh sách</button><span class="sep"></span>
<button type="button" data-pop="link">Liên kết</button><button type="button" data-pop="image">Ảnh</button><button type="button" data-ins="table">Bảng</button><button type="button" data-ins="gift">Ô giftcode</button><button type="button" data-ins="note">Lưu ý</button>
</div>
<div id="e-pop"></div>
<div class="ce prose" id="e-body" contenteditable="${editable ? 'true' : 'false'}" data-ph="Bắt đầu viết… Dùng “Tiêu đề lớn” để chia mục — mục lục bên cạnh bài sẽ tự tạo từ các tiêu đề này."></div>
</div></div>
</div>
<div class="side">
<div class="box"><h3>Đăng bài</h3>${publishBox}<div class="err" id="e-err" role="alert" hidden></div></div>
${reviewBox}
${SITES.length ? `<div class="box"><h3>Đăng lên</h3><div class="cats sites" role="radiogroup" aria-label="Đăng lên trang">${SITES.map((s) => `<label class="c-${s.id}" title="${esc(s.hint)}"><input type="radio" name="e-site" value="${s.id}"${site0 === s.id ? ' checked' : ''}${editable ? '' : ' disabled'}><span>${esc(s.name)}</span></label>`).join('')}</div>
<p class="meta small" style="margin:8px 0 0">${site0 ? esc((SITES.find((s) => s.id === site0) || {}).hint || '') : 'Chọn một trang — bài chỉ hiện ở trang đó.'}</p></div>` : ''}
<div class="box"><h3>Mục</h3><div class="cats">${CATS.map((c) => `<label class="c-${c.id}"><input type="radio" name="e-cat" value="${c.id}"${p.category === c.id ? ' checked' : ''}${editable ? '' : ' disabled'}><span>${esc(c.name)}</span></label>`).join('')}</div></div>
<div class="box"><h3>Ảnh bìa</h3>
<img class="cover" id="e-cover" src="${esc(p.cover)}" alt=""${p.cover ? '' : ' hidden'}>
${editable ? `<div class="lib">${LIB.map((src) => `<img src="${esc(src)}" data-cover="${esc(src)}" class="${p.cover === src ? 'on' : ''}" alt="Ảnh thư viện" tabindex="0" loading="lazy">`).join('')}</div>
<div class="upl"><label class="btn btn-ghost btn-sm upl-btn">Tải ảnh bìa từ máy<input type="file" id="e-file" accept="image/jpeg,image/png,image/webp"></label>
<span class="hint">JPG, PNG, WEBP · tối đa 5 MB · khuyên dùng 1200×675</span></div>` : ''}
</div>
<div class="box"><h3>Khi chia sẻ lên Facebook</h3><div class="fb" id="e-fb"></div></div>
${historyBox}
${dangerBox}
</div>
</div></main>`;
    bindHeader();

    const title = $('#e-title'), slug = $('#e-slug'), sum = $('#e-sum'), body = $('#e-body'), err = $('#e-err');
    body.innerHTML = p.content;
    [title, slug, sum].forEach((el) => { el.disabled = !editable; });
    const mode = () => { const r = $('input[name="e-mode"]:checked'); return r ? r.value : 'draft'; };
    const cat = () => $('input[name="e-cat"]:checked').value;
    const siteVal = () => { const r = $('input[name="e-site"]:checked'); return r ? r.value : null; };
    const collect = () => ({
      title: title.value.trim(), slug: slug.value || slugify(title.value), summary: sum.value.trim(), content: body.innerHTML,
      category: cat(), site: siteVal(), cover: p.cover || '', pinned: !!($('#e-pin') && $('#e-pin').checked),
    });
    // the hint under "Đăng lên" follows the choice
    $$('input[name="e-site"]').forEach((r) => r.addEventListener('change', () => {
      const s = SITES.find((x) => x.id === siteVal()); const hint = $('.sites') && $('.sites').nextElementSibling;
      if (hint && s) hint.textContent = s.hint;
      if ($('#e-addr')) $('#e-addr').textContent = addrPrefix(siteVal());
    }));
    let saved = JSON.stringify(collect());
    dirty = () => editable && JSON.stringify(collect()) !== saved;

    const showErr = (msg, reload) => {
      err.innerHTML = esc(msg) + (reload ? ' <button type="button" class="btn btn-ghost btn-xs" id="e-reload">Tải lại bản mới</button>' : '');
      err.hidden = false;
      const b = $('#e-reload');
      if (b) b.addEventListener('click', () => { dirty = () => false; renderEditor(post.id); });
    };

    const saveBtn = $('#e-save');
    const syncMode = () => {
      if (!manager) return;
      $('#e-when').hidden = mode() !== 'scheduled';
      saveBtn.textContent = {
        draft: !post || post.status === 'draft' ? 'Lưu nháp' : post.status === 'pending' ? 'Lưu' : 'Gỡ bài',
        now: live ? 'Cập nhật bài' : 'Đăng bài',
        scheduled: st === 'scheduled' ? 'Cập nhật giờ hẹn' : 'Hẹn giờ đăng',
      }[mode()];
    };
    const syncFb = () => {
      $('#e-count').textContent = `${sum.value.length}/160`;
      $('#e-count').classList.toggle('over', sum.value.length > 160);
      $('#e-fb').innerHTML = `${p.cover ? `<img class="cover" src="${esc(p.cover)}" alt="">` : '<div class="cover fb-empty"></div>'}<div><small>${esc(HOST)}</small><b>${esc(title.value || 'Tiêu đề bài viết')}</b><p>${esc(sum.value || 'Tóm tắt sẽ hiện ở đây')}</p></div>`;
    };
    $$('input[name="e-mode"]').forEach((r) => r.addEventListener('change', syncMode));
    title.addEventListener('input', () => { if (!slugTouched) slug.value = slugify(title.value); syncFb(); });
    slug.addEventListener('input', () => { slugTouched = true; });
    slug.addEventListener('change', () => { slug.value = slugify(slug.value); });
    sum.addEventListener('input', syncFb);
    const setCover = (src) => {
      p.cover = src;
      const c = $('#e-cover'); c.src = src; c.hidden = false;
      $$('[data-cover]').forEach((x) => x.classList.toggle('on', x.getAttribute('data-cover') === src));
      syncFb();
    };
    $$('[data-cover]').forEach((x) => {
      x.addEventListener('click', () => setCover(x.getAttribute('data-cover')));
      x.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCover(x.getAttribute('data-cover')); } });
    });
    if ($('#e-file')) {
      $('#e-file').addEventListener('change', async (e) => {
        const input = e.target;
        err.hidden = true;
        input.disabled = true;
        const mine = screen;
        const url = await uploadPicture(input.files[0], showErr);
        if (mine !== screen) return;
        input.disabled = false; input.value = '';
        if (url) { setCover(url); toast('Đã tải ảnh bìa lên'); }
      });
    }

    // formatting: execCommand on the remembered selection
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* older browsers */ }
    let range = null;
    const keep = () => { const s = getSelection(); if (s.rangeCount && body.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
    ['keyup', 'mouseup', 'blur'].forEach((ev) => body.addEventListener(ev, keep));
    const restore = () => { body.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
    const run = (cmd, val) => { restore(); document.execCommand(cmd, false, val); keep(); };
    const noSteal = (b) => b.addEventListener('mousedown', (e) => e.preventDefault());
    $$('[data-cmd]').forEach((b) => { noSteal(b); b.addEventListener('click', () => run(b.getAttribute('data-cmd'), b.getAttribute('data-val') ? `<${b.getAttribute('data-val')}>` : null)); });
    const SNIP = {
      table: '<div class="tbl"><table><thead><tr><th>Mốc</th><th>Phần thưởng</th><th>Số lượng</th></tr></thead><tbody><tr><td>…</td><td>…</td><td>…</td></tr><tr><td>…</td><td>…</td><td>…</td></tr></tbody></table></div>',
      gift: '<div class="gift"><div><small>Giftcode</small><code>NHAPMA</code></div></div>',
      note: '<div class="note"><strong>Lưu ý:</strong> …</div>',
    };
    // blocks (table, gift code, note, picture) go right after the paragraph holding the caret — replacing it when it is
    // empty — followed by an empty paragraph that takes the caret, so several blocks in a row keep their order
    // (execCommand('insertHTML') leaves the caret in unpredictable places around block content)
    const insertBlock = (html) => {
      restore();
      const sel = getSelection();
      let anchor = sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
      if (anchor && !body.contains(anchor)) anchor = null;
      while (anchor && anchor.parentNode !== body) anchor = anchor.parentNode;
      const tpl = document.createElement('template');
      tpl.innerHTML = html + '<p><br></p>';
      const para = tpl.content.lastChild;
      const emptyPara = anchor && anchor.nodeName === 'P' && !anchor.textContent.trim() && !anchor.querySelector('img');
      if (anchor) anchor.after(tpl.content); else body.append(tpl.content);
      if (emptyPara) anchor.remove();
      const r = document.createRange();
      r.setStart(para, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
      keep();
    };
    $$('[data-ins]').forEach((b) => { noSteal(b); b.addEventListener('click', () => insertBlock(SNIP[b.getAttribute('data-ins')])); });
    const pop = $('#e-pop');
    const closePop = () => { pop.innerHTML = ''; pop.removeAttribute('data-kind'); };
    // The table cell holding the caret, if any: a picture put there stays inline (item icons in a rewards table).
    const caretCell = () => {
      let n = range ? range.startContainer : null;
      while (n && n !== body) { if (n.nodeName === 'TD' || n.nodeName === 'TH') return n; n = n.parentNode; }
      return null;
    };
    const putPicture = (src) => {
      const cell = caretCell();
      if (cell) {
        restore();
        const img = document.createElement('img');
        img.src = src; img.alt = '';
        const sel = getSelection();
        const r = sel.rangeCount && cell.contains(sel.getRangeAt(0).startContainer) ? sel.getRangeAt(0) : null;
        if (r) { r.deleteContents(); r.insertNode(img); r.setStartAfter(img); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); } else cell.prepend(img);
        keep();
      } else {
        insertBlock(`<figure><img src="${esc(src)}" alt=""><figcaption>Chú thích ảnh…</figcaption></figure>`);
      }
      closePop();
    };
    async function openPicturePop() {
      const inCell = !!caretCell();
      const draw = (uploads, note) => {
        const thumbs = (list) => list.map((src) => `<img src="${esc(src)}" data-put="${esc(src)}" alt="" loading="lazy">`).join('');
        pop.innerHTML = `<div class="pop pop-pics">
<div class="pop-row"><span class="meta">${inCell ? 'Con trỏ đang ở <b>ô bảng</b>: ảnh chèn gọn trong ô (hợp cho icon vật phẩm).' : 'Bấm ảnh để chèn vào vị trí con trỏ.'}</span>
<label class="btn btn-ghost btn-sm upl-btn">Tải ảnh từ máy<input type="file" id="e-pic-file" accept="image/jpeg,image/png,image/webp"></label></div>
${note ? `<div class="meta">${esc(note)}</div>` : ''}
${uploads.length ? `<div class="pop-row"><span class="lbl">Ảnh đã tải lên</span></div><div class="pop-row">${thumbs(uploads)}</div>` : ''}
<div class="pop-row"><span class="lbl">Ảnh trang chủ</span></div><div class="pop-row">${thumbs(LIB)}</div></div>`;
        $$('[data-put]', pop).forEach((x) => { noSteal(x); x.addEventListener('click', () => putPicture(x.getAttribute('data-put'))); });
        $('#e-pic-file').addEventListener('change', async (e) => {
          const mine = screen;
          e.target.disabled = true;
          const url = await uploadPicture(e.target.files[0], (msg) => toast(msg));
          if (mine !== screen || pop.getAttribute('data-kind') !== 'image') return;
          if (url) putPicture(url); else { e.target.disabled = false; e.target.value = ''; }
        });
      };
      draw([], 'Đang tải danh sách ảnh đã tải lên…');
      const mine = screen;
      const r = await api('GET', '/anh');
      if (mine !== screen || pop.getAttribute('data-kind') !== 'image') return;
      draw(r.ok ? r.data.items.map((x) => x.url) : [], r.ok ? '' : (r.data.error || ''));
    }
    $$('[data-pop]').forEach((b) => {
      noSteal(b);
      b.addEventListener('click', () => {
        const kind = b.getAttribute('data-pop');
        if (pop.getAttribute('data-kind') === kind) return closePop();
        pop.setAttribute('data-kind', kind);
        if (kind === 'link') {
          pop.innerHTML = '<div class="pop"><input class="inp" id="e-url" placeholder="https://… (bôi đen chữ trước khi chèn)"><button type="button" class="btn btn-fire btn-sm" id="e-url-ok">Chèn liên kết</button></div>';
          noSteal($('#e-url-ok'));
          $('#e-url-ok').addEventListener('click', () => {
            const u = $('#e-url').value.trim();
            if (/^https:\/\/\S+$/.test(u)) { run('createLink', u); closePop(); } else toast('Liên kết cần bắt đầu bằng https://');
          });
        } else {
          openPicturePop();
        }
      });
    });

    // saving
    const busy = (on) => $$('.side button').forEach((b) => { b.disabled = on; });
    async function act(action, extra) {
      err.hidden = true;
      const bodyData = Object.assign(collect(), { action, baseUpdatedAt: post ? post.updatedAt : undefined }, extra || {});
      busy(true);
      const mine = screen;
      const r = await api('POST', post ? '/bai/' + post.id : '/bai', bodyData);
      if (mine !== screen) { if (r.ok) toast('Đã lưu bài “' + r.data.post.title + '”'); return r.ok ? r.data.post : null; }
      busy(false);
      if (!r.ok) { if (r.status !== 401) showErr(r.data.error || 'Không lưu được.', r.status === 409); return null; }
      const newPost = r.data.post;
      if (!post) { try { history.replaceState(null, '', '#/sua/' + newPost.id); lastHash = location.hash; } catch (e) { /* ignore */ } }
      const s2 = stateOf(newPost);
      toast({ luu: 'Đã lưu', 'gui-duyet': 'Đã gửi duyệt — Quản lý sẽ xem bài', 'rut-ve': 'Đã rút bài về nháp', 'dang-ngay': live ? 'Đã cập nhật bài trên trang tin' : 'Đã đăng — bài hiện trên trang Tin tức', 'hen-gio': `Đã hẹn đăng lúc ${fmtTime(newPost.publishAt)}`, 'tra-lai': 'Đã trả lại bài cho người viết', 'go-bai': 'Đã gỡ bài khỏi trang tin' }[action] || STATE[s2]);
      drawEditor(newPost, '', r.data.history || []);
      return newPost;
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const m = mode();
        if (m === 'now') return act('dang-ngay');
        if (m === 'scheduled') {
          const when = $('#e-when').value;
          if (!when) return showErr('Chọn ngày giờ đăng.');
          return act('hen-gio', { publishAt: when });
        }
        return act(live || st === 'scheduled' ? 'go-bai' : 'luu');
      });
    }
    if ($('#e-draft')) $('#e-draft').addEventListener('click', () => act('luu'));
    if ($('#e-send')) $('#e-send').addEventListener('click', () => act('gui-duyet'));
    if ($('#e-back')) $('#e-back').addEventListener('click', () => act('rut-ve'));
    if ($('#e-return')) {
      $('#e-return').addEventListener('click', () => {
        const note = $('#e-note').value.trim();
        if (!note) return showErr('Ghi chú cho người viết biết cần sửa gì.');
        return act('tra-lai', { note });
      });
    }
    if ($('#e-del')) {
      let armed = 0;
      $('#e-del').addEventListener('click', async (e) => {
        const b = e.currentTarget;
        if (Date.now() - armed > 4000) { armed = Date.now(); b.textContent = 'Bấm lần nữa để xoá'; setTimeout(() => { if (b.isConnected) b.textContent = 'Xoá bài'; }, 4000); return; }
        busy(true);
        const r = await api('POST', `/bai/${post.id}/xoa`, { baseUpdatedAt: post.updatedAt });
        busy(false);
        if (!r.ok) { if (r.status !== 401) showErr(r.data.error || 'Không xoá được.', r.status === 409); return; }
        dirty = () => false;
        toast('Đã xoá bài');
        location.hash = '#/';
      });
    }
    // preview: the saved article on its real page, opened in this tab (its "Về trang sửa bài" link comes back here).
    // Unsaved changes are saved first — except on a published or scheduled article, where saving would change the live
    // site and leaving would lose them: the editor stays and asks for a save first.
    $('#e-prev').addEventListener('click', async () => {
      err.hidden = true;
      if (!title.value.trim()) return showErr('Nhập tiêu đề để xem trước.');
      let target = post;
      if (!post || dirty()) {
        if (live || st === 'scheduled') return showErr('Bài có thay đổi chưa lưu. Lưu thay đổi trước rồi mới bấm Xem trước (bài đã đăng / hẹn giờ nên không tự lưu).');
        target = await act('luu');
      }
      if (!target) return;
      location.href = '/quan-tri/xem-truoc/' + target.id;
    });
    // bring back an older version into the form (saved only when the user saves)
    $$('[data-rev]').forEach((b) => b.addEventListener('click', async () => {
      const mine = screen;
      const r = await api('GET', `/bai/${post.id}/lich-su/${b.getAttribute('data-rev')}`);
      if (mine !== screen) return;
      if (!r.ok) { if (r.status !== 401) showErr(r.data.error); return; }
      const old = r.data.revision.post;
      title.value = old.title; slug.value = old.slug; sum.value = old.summary || ''; body.innerHTML = old.content;
      const c = $(`input[name="e-cat"][value="${old.category}"]`); if (c) c.checked = true;
      const s = $(`input[name="e-site"][value="${siteOfPost(old)}"]`); if (s) s.checked = true;
      if (old.cover) setCover(old.cover);
      syncFb();
      toast(`Đã nạp bản lúc ${fmtTime(r.data.revision.savedAt)} — bấm Lưu để giữ bản này`);
    }));

    // "someone else is editing" — heartbeat while the editor is open
    if (post && editable) {
      const lockbar = $('#e-lockbar');
      const showLock = (name) => { lockbar.innerHTML = name ? `<div class="warnbar">${esc(name)} đang mở bài này. Nếu cả hai cùng sửa, người lưu sau sẽ được báo để tải lại — hãy báo ${esc(name)} trước khi sửa.</div>` : ''; };
      showLock(lockedBy);
      const beat = async () => { const r = await api('POST', `/bai/${post.id}/khoa`, {}); if (r.ok) showLock(r.data.lockedBy); };
      beat();
      const timer = setInterval(beat, 30000);
      leaving = () => {
        clearInterval(timer);
        try { fetch(`/quan-tri/api/bai/${post.id}/khoa`, { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{"release":true}' }); } catch (e) { /* page closing */ }
      };
    }
    syncMode(); syncFb();
    if (!post) title.focus();
  }

  // ---------- routing ----------
  let lastHash = location.hash;
  function route() {
    if (!me) return renderLogin();
    const h = location.hash.replace(/^#/, '') || '/';
    let m;
    if (me.role === 'phieu') renderPhieu();
    else if (h === '/viet-bai') renderEditor(null);
    else if ((m = h.match(/^\/sua\/(\d+)$/))) renderEditor(+m[1]);
    else if (h === '/nhac' && me.role === 'manager') renderMusic();
    else if (h === '/dang-ky-som' && me.role === 'manager') renderSignups();
    else if (h === '/phieu-be-ngoan' && me.role === 'manager') renderPhieu();
    else if (h === '/nguoi-dung' && me.kind === 'owner') renderUsers();
    else if (h === '/thung-rac' && me.role === 'manager') renderTrash();
    else renderList();
    lastHash = location.hash;
    window.scrollTo(0, 0);
    afterRoute();
  }

  // ---------- sideways swipe between the sections (touch screens only) ----------
  // The sections in tab order; a swipe moves one step and stops at either end rather than wrapping, so the tab strip
  // stays the map of where you are. The editor is left out on purpose: a stray swipe must never drop unsaved text.
  const SECTIONS = ['#/', '#/nhac', '#/dang-ky-som', '#/phieu-be-ngoan', '#/thung-rac', '#/nguoi-dung'];
  let slideFrom = '';

  function afterRoute() {
    const main = $('main') || app;
    if (slideFrom) {
      main.classList.add(slideFrom === 'right' ? 'adm-in-right' : 'adm-in-left');
      slideFrom = '';
    }
    const on = $('.adm-nav a.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function bindSwipe() {
    let x0 = 0, y0 = 0, t0 = 0, tracking = false;
    const swipeable = () => me && me.role === 'manager'
      && window.matchMedia('(max-width:820px)').matches
      && !$('.ed'); // the editor keeps its own gestures
    // a gesture that starts on one of these belongs to the control, not to the page
    const owned = (el) => !!(el && el.closest && el.closest('input,textarea,select,audio,video,[contenteditable="true"],.adm-nav,.tb,.ce'));
    document.addEventListener('touchstart', (e) => {
      tracking = false;
      if (e.touches.length !== 1 || !swipeable() || owned(e.target)) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); tracking = true;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      // far enough sideways, clearly more sideways than down, and not a slow drag that was really a scroll
      if (Date.now() - t0 > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const here = SECTIONS.indexOf(location.hash || '#/');
      const next = here + (dx < 0 ? 1 : -1);
      if (here < 0 || next < 0 || next >= SECTIONS.length) return;
      slideFrom = dx < 0 ? 'right' : 'left';
      location.hash = SECTIONS[next];
    }, { passive: true });
  }
  window.addEventListener('hashchange', () => {
    // a new set-password link pasted into the same tab: show the form for that token
    if (location.pathname.indexOf('/quan-tri/dat-mat-khau') === 0) { if (location.hash.length > 1) renderSetPassword(); return; }
    if (location.pathname.indexOf('/quan-tri/moi') === 0) { if (location.hash.length > 1) renderAcceptInvite(); return; }
    if (dirty() && !window.confirm('Bài đang có thay đổi chưa lưu. Rời trang này?')) {
      try { history.replaceState(null, '', lastHash || '#/'); } catch (e) { /* ignore */ }
      return;
    }
    route();
  });
  window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('pagehide', () => { if (leaving) { const f = leaving; leaving = null; f(); } });

  (async function boot() {
    bindSwipe();
    if (location.pathname.replace(/\/+$/, '') === '/quan-tri/dat-mat-khau') return renderSetPassword();
    if (location.pathname.replace(/\/+$/, '') === '/quan-tri/dang-ky') return renderRegister();
    if (location.pathname.replace(/\/+$/, '') === '/quan-tri/moi') return renderAcceptInvite();
    const r = await api('GET', '/toi');
    if (r.ok) { me = viewOf(r.data.user); route(); } else if (r.status !== 401) renderLogin(r.data.error);
  })();
}
