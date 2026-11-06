// admin-app.mjs — the browser side of /quan-tri: the frame (side bar, top bar, game switcher, overview, dialogs) and the routing.
// The news screens live in admin-news-app.mjs and are handed in as adminNews; the gift tickets, early sign-ups and music screens
// live in admin-parts-app.mjs (adminParts); the owner's screens (rights, invite links, Claude codes, record) live in
// admin-access-app.mjs (adminAccess); sign-in, register, set password and accept-invite live in admin-auth-app.mjs (adminAuth)
// (all are serialised into the page; none runs on the server).
// It talks only to /quan-tri/api/*; the server re-checks every permission and cleans every article, so nothing here is a
// security boundary — it only keeps the screens honest.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminApp(adminNews, adminParts, adminAccess, adminAuth) {
  const DATA = JSON.parse(document.getElementById('adm-data').textContent);
  const CATS = DATA.cats, LIB = DATA.library, HOST = DATA.host, LOGO = DATA.logo, MARKS = DATA.marks || {}, THEME_KEY = DATA.themeKey;
  const app = document.getElementById('app');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || '';
  // a button that deletes for good asks first by changing its label and colour: the first click arms it, a second click
  // within 4 s goes ahead (no pop-up dialog). disarm puts the button back as it was.
  const disarm = (b) => {
    if (b.dataset.idle != null) { b.innerHTML = b.dataset.idle; delete b.dataset.idle; }
    b.classList.remove('armed');
    b.dataset.armed = 0;
  };
  const armDelete = (b, idle, ask) => {
    if (b.dataset.armed > Date.now() - 4000) return true;
    b.dataset.armed = Date.now();
    b.dataset.idle = b.innerHTML;
    b.textContent = ask || 'Bấm lần nữa để xoá';
    b.classList.add('armed');
    setTimeout(() => { if (b.isConnected && !b.disabled) disarm(b); }, 4000);
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
  let ownerFlag = false; // set when /toi says the account is an owner
  let leaving = null; // cleanup for the open editor (stop the lock heartbeat, release the lock)
  let dirty = () => false;
  // bumped whenever a new screen is drawn; an answer that arrives after the user moved on is ignored
  let screen = 0;

  // pop-up message at the bottom right: stays 3.6 s (longer while the pointer is on it), has a close button, at most three at once
  function toast(msg) {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'sh-toast';
    t.innerHTML = `${I.check}<span></span><button type="button" aria-label="Đóng thông báo">${I.x}</button>`;
    t.querySelector('span').textContent = msg;
    let timer;
    const drop = () => { clearTimeout(timer); t.remove(); };
    t.querySelector('button').addEventListener('click', drop);
    t.addEventListener('mouseenter', () => clearTimeout(timer));
    t.addEventListener('mouseleave', () => { timer = setTimeout(drop, 1600); });
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    timer = setTimeout(drop, 3600);
  }

  // Calls the API; a lost session sends the user to the sign-in form. Resolves { ok, status, data }.
  // A path of a part (/bai, /nhac …) goes to the open game: /g/<game>/…
  async function api(method, path, body) {
    let res;
    const payload = body ? JSON.stringify(body) : undefined;
    // the server closes the connection on anything over 1 MB; say why before sending instead of a network error
    if (payload && new Blob([payload]).size > 1000000) {
      return { ok: false, status: 413, data: { error: 'Bài quá dài để lưu (tối đa khoảng 1 MB kể cả mã định dạng). Hãy bớt nội dung hoặc chia thành nhiều bài.' } };
    }
    try {
      res = await fetch('/quan-tri/api' + gp(path), {
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

  // ---------- who is signed in, and the games they can open ----------
  // me = { username, name, role: 'owner' | 'member', grants }; GAMES = what /toi says: for each game the menu, the
  // permissions held per part, the parts switched on and the web addresses. The server already filtered it by rights and
  // refuses (403) anything outside them, so these only choose what to show.
  const DEFAULT_GAME = '3qdc'; // an address without a game (older bookmarks, "#/sua/12") belongs to this game
  let GAMES = [];
  let curGame = null; // the game the open screen belongs to
  // what the frame shows as the place: 'overview' | 'game' (part: false = the game's own page, no part) | 'system' | 'none'
  let nav = { kind: 'overview', part: false };
  let curSection = ''; // hash of the open section, for the sideways swipe
  let crumbTail = ''; // the last step of the path on a screen inside a part ("Sửa bài"); cleared with every screen
  let preSetter = null; // the news list takes its first filter from a link on the overview (data-pre)
  let work = null; // jobs waiting per game { at, byGame: { game: [{ n, txt, tab, pre, info }] }, accounts }
  let siteState = null; // which web addresses answer { "game/site": { ok, code } }
  const isOwner = () => !!me && ownerFlag;
  const gameOf = (id) => GAMES.find((g) => g.id === id) || null;
  const can = (mod, perm) => { const g = gameOf(curGame); return !!g && (g.perms[mod] || []).includes(perm); };
  const gh = (rest) => '#/g/' + curGame + (rest || '/'); // a hash inside the open game
  const menuHref = (g, m) => '#/g/' + g.id + m[1].slice(1); // the server's '#/thung-rac' -> '#/g/3qdc/thung-rac'
  // someone with a single game (and not an owner) goes straight into it: no overview, no game switcher
  const isSingle = () => !isOwner() && GAMES.length === 1;

  // The API addresses below belong to a part and are reached through the open game: /g/<game>/…
  const PART_PATHS = ['/anh', '/bai', '/thung-rac', '/phieu-be-ngoan', '/dang-ky-som', '/nhac'];
  const gp = (p) => (PART_PATHS.some((x) => p === x || p.startsWith(x + '/') || p.startsWith(x + '?')) ? '/g/' + curGame + p : p);

  // Loads /toi: who is signed in and which games they can open. Resolves the answer (the caller checks .ok).
  async function loadMe() {
    const r = await api('GET', '/toi');
    if (r.ok) { me = r.data.user; ownerFlag = r.data.user.role === 'owner'; GAMES = r.data.games || []; work = null; siteState = null; }
    return r;
  }

  // ---------- frame: side bar, top bar, game switcher ----------
  const svgIcon = (p) => `<svg class="sh-ic" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    home: svgIcon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    chevR: svgIcon('<path d="M9 6l6 6-6 6"/>'),
    updown: svgIcon('<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>'),
    check: svgIcon('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    search: svgIcon('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'),
    arrow: svgIcon('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    menu: svgIcon('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    sun: svgIcon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>').replace('class="sh-ic"', 'class="sh-ic i-sun"'),
    moon: svgIcon('<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>').replace('class="sh-ic"', 'class="sh-ic i-moon"'),
    logout: svgIcon('<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10"/>'),
    users: svgIcon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M18 13.5a6.5 6.5 0 013.5 5.5"/>'),
    layers: svgIcon('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    copy: svgIcon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>'),
    lock: svgIcon('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    news: svgIcon('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
    trash: svgIcon('<path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),
    ticket: svgIcon('<path d="M4 8a2 2 0 002-2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a2 2 0 000-4z"/><path d="M14 6v12"/>'),
    userplus: svgIcon('<circle cx="10" cy="8" r="3.5"/><path d="M3.5 19a6.5 6.5 0 0113 0M19 8v6M16 11h6"/>'),
    music: svgIcon('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
    x: svgIcon('<path d="M6 6l12 12M18 6L6 18"/>'),
    link: svgIcon('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
    key: svgIcon('<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>'),
    list: svgIcon('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
  };
  // the part each tab belongs to (the trash is a step inside the news part)
  const PART_OF = { posts: 'tin-tuc', trash: 'tin-tuc', phieu: 'phieu-be-ngoan', signup: 'dang-ky-som', music: 'nhac' };
  const partName = (g, tab) => ((g.parts.find((p) => p.id === PART_OF[tab]) || {}).name) || tab;
  // menu entries read as the part (news = "Tin tức"); the trash is shown one step in, only while the news part is open
  const menuLabel = (g, m) => (m[0] === 'posts' ? partName(g, 'posts') : m[2]);
  const TAB_ICON = { posts: I.news, trash: I.trash, phieu: I.ticket, signup: I.userplus, music: I.music };

  // A game's mark: a picture, or a few letters on the game's colour (sizes in px)
  function tile(g, size) {
    const m = MARKS[g.id] || {};
    if (m.img && size >= (m.imgFrom || 0)) return `<img class="sh-tile" src="${esc(m.img)}" width="${size}" height="${size}" alt="" aria-hidden="true">`;
    const mono = m.mono || String(g.name || g.id).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return `<span class="sh-tile" style="width:${size}px;height:${size}px;background:${m.color || 'var(--game-thu)'};font-size:${Math.round(size * 0.4)}px" aria-hidden="true">${esc(mono)}</span>`;
  }

  function roleLabel() {
    if (isOwner()) return 'Quản lý tổng';
    if (!GAMES.length) return 'Chưa có quyền';
    if (GAMES.length > 1) return GAMES.length + ' game';
    const g = GAMES[0];
    if ((me.grants || {})[g.id] === '*') return 'Quản lý ' + g.name;
    return g.parts.filter((p) => (g.perms[p.id] || []).length).map((p) => p.name).join(', ') || 'Chưa có quyền';
  }

  // jobs waiting, from the numbers the overview fetched (the side bar shows them once they are known)
  const jobsOf = (gid) => (work && work.byGame[gid]) || [];
  const urgentOf = (gid) => jobsOf(gid).filter((a) => !a.info).reduce((s, a) => s + a.n, 0);
  const tabCount = (gid, tab) => (jobsOf(gid).find((a) => a.tab === tab && !a.info) || { n: 0 }).n;
  const accountsWaiting = () => (work && work.accounts ? work.accounts.filter((u) => u.role === 'pending').length : 0);

  function navLink(label, href, on, icon, n) {
    return `<a class="sh-nv" href="${esc(href)}"${on ? ' aria-current="page"' : ''}>${icon || ''}<span>${esc(label)}</span>${n ? `<span class="sh-cnt" aria-label="${n} việc chờ">${n}</span>` : ''}</a>`;
  }

  function menuLinks(g, tab, icons) {
    const inNews = PART_OF[tab] === 'tin-tuc';
    return g.menu.filter((m) => m[0] !== 'trash' || inNews).map((m) => {
      const on = nav.kind === 'game' && nav.part && m[0] === tab;
      const trash = m[0] === 'trash';
      const link = navLink(menuLabel(g, m), menuHref(g, m), on, trash || icons ? (trash ? I.trash : TAB_ICON[m[0]]) : '', tabCount(g.id, m[0]));
      return trash ? `<div class="sh-sub2">${link}</div>` : link;
    }).join('');
  }

  function navHtml(active) {
    const tab = active || 'posts';
    let h = '';
    if (isSingle()) {
      const g = GAMES[0];
      h += `<div class="sh-label">${tile(g, 16)}${esc(g.name)}</div>`;
      h += g.menu.length ? menuLinks(g, tab, true) : navLink('Trang game', '#/g/' + g.id + '/', nav.kind === 'game', I.layers);
    } else {
      h += navLink('Tổng quan', '#/tong-quan', nav.kind === 'overview', I.home);
      if (GAMES.length) h += '<div class="sh-label">Game</div>';
      for (const g of GAMES) {
        const here = nav.kind === 'game' && curGame === g.id;
        h += navLink(g.name, '#/g/' + g.id + '/', here && !nav.part, tile(g, 20), urgentOf(g.id));
        if (here) {
          h += `<div class="sh-sub">${g.menu.length ? menuLinks(g, tab, false) : '<span class="sh-nv sh-dim">Chưa bật phần nào</span>'}</div>`;
        }
      }
    }
    if (isOwner()) {
      const sys = (k) => nav.kind === 'system' && nav.sys === k;
      h += '<div class="sh-label">Hệ thống</div>';
      h += navLink('Phân quyền', '#/nguoi-dung', sys('perm'), I.users, accountsWaiting());
      h += navLink('Link mời', '#/link-moi', sys('invite'), I.link);
      h += navLink('Mã cho Claude', '#/ma-claude', sys('codes'), I.key);
      h += navLink('Nhật ký', '#/nhat-ky', sys('log'), I.list);
    }
    return h;
  }

  function sideHtml(active) {
    const g = nav.kind === 'game' ? gameOf(curGame) : null;
    const newsSite = g && can('tin-tuc', 'viet') ? g.sites.find((s) => s.module === 'tin-tuc' && s.host && s.host.indexOf('/') < 0) : null;
    return `<aside class="sh-side" id="sh-side" aria-label="Thanh điều hướng">
<div class="sh-brand"><span class="sh-mark" aria-hidden="true">W</span><div><b>Quản trị</b><small>wanmeivn.com</small></div></div>
<nav class="sh-nav" id="sh-nav" aria-label="Điều hướng chính">${navHtml(active)}</nav>
${newsSite ? `<div class="sh-foot"><a href="https://${esc(newsSite.host)}/tin-tuc" target="_blank" rel="noopener">Xem trang tin ↗</a></div>` : ''}
</aside><div class="sh-scrim" aria-hidden="true"></div>`;
  }

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  function themeButton() {
    const dark = isDark();
    return `<button type="button" class="sh-btn sh-btn-ghost sh-btn-icon sh-theme" data-adm-theme aria-pressed="${dark}" aria-label="${dark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}" title="${dark ? 'Nền sáng' : 'Nền tối'}">${I.sun}${I.moon}</button>`;
  }

  function switcherHtml(g) {
    return `<div class="sh-sw" id="sw"><button type="button" class="sh-sw-btn" id="sw-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="sw-pop" aria-label="Đổi game, đang chọn ${esc(g.name)}">${tile(g, 20)}<span>${esc(g.name)}</span>${I.updown}</button>
<div class="sh-sw-pop" id="sw-pop" hidden>
<div class="sh-sw-search">${I.search}<input id="sw-input" role="combobox" aria-expanded="true" aria-controls="sw-list" aria-autocomplete="list" aria-label="Tìm game" placeholder="Tìm game…" autocomplete="off"></div>
<div class="sh-sw-group" id="sw-gl">Game bạn được quản lý</div>
<ul class="sh-sw-list" id="sw-list" role="listbox" aria-labelledby="sw-gl"></ul>
<div class="sh-sw-foot"><a href="#/tong-quan">${I.home} Xem tổng quan mọi game</a></div>
</div></div>`;
  }

  const SYS_NAMES = { perm: 'Phân quyền', invite: 'Link mời', codes: 'Mã cho Claude', log: 'Nhật ký' };

  function topHtml(active) {
    const tab = active || 'posts';
    const sep = `<li class="sh-sep" aria-hidden="true">${I.chevR}</li>`;
    const crumb = (txt, href) => `<li><a href="${href}">${esc(txt)}</a></li>`;
    const here = (txt) => `<li><span aria-current="page">${esc(txt)}</span></li>`;
    const c = [];
    const g = nav.kind === 'game' ? gameOf(curGame) : null;
    if (nav.kind === 'overview') c.push(here('Tổng quan'));
    else if (g) {
      if (!isSingle()) c.push(crumb('Tổng quan', '#/tong-quan'));
      c.push(`<li>${isSingle() ? `<span class="sh-plain-game">${tile(g, 18)}${esc(g.name)}</span>` : switcherHtml(g)}</li>`);
      const m = nav.part ? g.menu.find((x) => x[0] === tab) : null;
      if (m) {
        const first = g.menu.find((x) => PART_OF[x[0]] === PART_OF[tab]) || m;
        if (crumbTail) c.push(crumb(partName(g, tab), menuHref(g, first)), here(crumbTail));
        else if (tab === 'trash') c.push(crumb(partName(g, 'posts'), menuHref(g, first)), here(menuLabel(g, m)));
        else c.push(here(menuLabel(g, m)));
      }
    } else if (nav.kind === 'system') {
      if (!isSingle()) c.push(crumb('Tổng quan', '#/tong-quan'));
      c.push('<li><span class="sh-plain">Hệ thống</span></li>', here(SYS_NAMES[nav.sys] || 'Phân quyền'));
    } else {
      if (!isSingle() && GAMES.length) c.push(crumb('Tổng quan', '#/tong-quan'));
      c.push(here('Không có quyền'));
    }
    return `<header class="sh-top">
<button type="button" class="sh-btn sh-btn-ghost sh-btn-icon sh-burger" id="sh-menu" aria-expanded="false" aria-controls="sh-side" aria-label="Mở menu">${I.menu}</button>
<nav class="sh-crumbs" aria-label="Đường dẫn"><ol>${c.join(sep)}</ol></nav>
<div class="sh-top-r">${themeButton()}<span class="sh-vr" aria-hidden="true"></span>
<div class="sh-who"><span class="sh-av" aria-hidden="true">${esc(initials(me.name))}</span><div class="sh-who-txt"><b>${esc(me.name)}</b><small>${esc(roleLabel())}</small></div></div>
<button type="button" class="sh-btn sh-btn-ghost sh-btn-icon" id="logout" aria-label="Đăng xuất" title="Đăng xuất">${I.logout}</button></div>
</header>`;
  }

  // every signed-in screen starts with this and then writes its own <main class="wrap">
  function header(active) { return sideHtml(active) + topHtml(active); }

  async function doLogout(confirmed) {
    if (!confirmed && dirty()) return leaveDlg(() => doLogout(true));
    cleanupEditor();
    await api('POST', '/dang-xuat', {});
    me = null; ownerFlag = false; GAMES = []; work = null; siteState = null;
    renderLogin();
  }

  // light / dark: remembered in this browser; the key is read in <head> before the page paints
  function toggleTheme() {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode: this page only */ }
    const dark = next === 'dark';
    $$('[data-adm-theme]').forEach((b) => {
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('aria-label', dark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối');
      b.title = dark ? 'Nền sáng' : 'Nền tối';
    });
  }

  // game switcher: a button that opens a search box over the list of games (arrow keys, Enter, Esc)
  const SW = { open: false, items: [], active: 0 };
  const normText = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
  function swOpen() {
    const pop = $('#sw-pop');
    if (!pop) return;
    SW.open = true; pop.hidden = false; $('#sw-btn').setAttribute('aria-expanded', 'true');
    const inp = $('#sw-input'); inp.value = ''; swFill(''); inp.focus();
  }
  function swClose(focusBtn) {
    const pop = $('#sw-pop');
    if (!pop || !SW.open) return;
    SW.open = false; pop.hidden = true; $('#sw-btn').setAttribute('aria-expanded', 'false');
    if (focusBtn) $('#sw-btn').focus();
  }
  function swFill(q) {
    SW.items = GAMES.filter((g) => normText(g.name + ' ' + g.id).includes(normText(q)));
    SW.active = Math.max(0, SW.items.findIndex((g) => g.id === curGame));
    $('#sw-list').innerHTML = SW.items.length ? SW.items.map((g) => {
      const n = urgentOf(g.id);
      return `<li class="sh-sw-opt" role="option" id="swo-${esc(g.id)}" aria-selected="${g.id === curGame}" data-pick="${esc(g.id)}">${tile(g, 24)}<span><b>${esc(g.name)}</b><small>${g.parts.length ? g.parts.length + ' phần' : 'Chưa bật phần nào'}</small></span>${n ? `<span class="sh-cnt">${n}</span>` : ''}<span class="sh-chk">${I.check}</span></li>`;
    }).join('') : '<li class="sh-sw-empty" role="presentation">Không có game nào khớp.</li>';
    swMark();
  }
  function swMark() {
    $$('.sh-sw-opt').forEach((el, i) => { el.dataset.active = String(i === SW.active); });
    const cur = SW.items[SW.active];
    $('#sw-input').setAttribute('aria-activedescendant', cur ? 'swo-' + cur.id : '');
    const el = cur && document.getElementById('swo-' + cur.id);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function swPick(id) {
    swClose(false);
    location.hash = '#/g/' + id + '/';
  }

  // ---------- dialogs ----------
  // A dialog sits over the page (#overlay, outside #app): the page behind it is inert, Tab stays inside, Esc closes it.
  const OV = { el: null, last: null, onOk: null };
  const dialogOpen = () => !!OV.el;
  function openOverlay(html, onOk) {
    OV.last = document.activeElement; OV.onOk = onOk || null;
    $('#overlay').innerHTML = '<div class="sh-dscrim" data-act="ovClose"></div>' + html;
    OV.el = $('#overlay').querySelector('[role="alertdialog"],[role="dialog"]');
    app.inert = true;
    const f = OV.el.querySelector('[data-autofocus]') || OV.el.querySelector('input,select,textarea,button');
    if (f) f.focus();
  }
  function closeOverlay() {
    if (!OV.el) return;
    $('#overlay').innerHTML = ''; OV.el = null; app.inert = false;
    if (OV.last && document.contains(OV.last)) OV.last.focus();
    OV.last = null;
  }
  function confirmDlg({ title, body, ok, cancel, danger }, onOk) {
    openOverlay(`<div class="sh-dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-b"><div class="sh-dlg-b"><h2 id="dlg-t">${esc(title)}</h2><p id="dlg-b">${esc(body)}</p></div>
<div class="sh-dlg-f"><button type="button" class="sh-btn" data-act="ovClose" data-autofocus>${esc(cancel || 'Thôi')}</button><button type="button" class="sh-btn ${danger === false ? 'sh-btn-primary' : 'sh-btn-danger'}" data-act="ovOk">${esc(ok)}</button></div></div>`, onOk);
  }
  // leaving a screen with unsaved changes (a link, the browser's back button, signing out)
  const leaveDlg = (go) => confirmDlg({ title: 'Bài có thay đổi chưa lưu', body: 'Rời trang này thì mất các thay đổi chưa lưu.', ok: 'Rời trang', cancel: 'Ở lại' }, go);

  // ---------- header of a game: mark, name, web addresses, and its parts as tabs ----------
  let headTab = 'posts';
  function gameHeadHtml(g, tab) {
    headTab = tab;
    const hosts = g.sites.filter((s) => s.host && s.host.indexOf('/') !== 0 && !s.path);
    let right;
    if (isOwner()) {
      const ppl = work && work.accounts ? work.accounts.filter((u) => u.role === 'member' && !u.disabled && u.grants && Object.hasOwn(u.grants, g.id)).length : null;
      right = `${ppl != null ? `<span>${ppl} người có quyền</span>` : ''}<a class="sh-btn" href="#/nguoi-dung/${esc(g.id)}">${I.users} Phân quyền game này</a>`;
    } else {
      right = (me.grants || {})[g.id] === '*' ? '<span>Bạn quản lý cả game này</span>' : `<span>Bạn được làm: ${esc(g.parts.filter((p) => (g.perms[p.id] || []).length).map((p) => p.name).join(', '))}</span>`;
    }
    const tabs = g.menu.filter((m) => m[0] !== 'trash').map((m) => {
      const n = tabCount(g.id, m[0]);
      return `<a class="sh-tab" href="${esc(menuHref(g, m))}"${nav.part && PART_OF[m[0]] === PART_OF[tab] ? ' aria-current="page"' : ''}>${esc(menuLabel(g, m))}${n ? `<span class="sh-cnt" aria-label="${n} việc chờ">${n}</span>` : ''}</a>`;
    }).join('');
    return `<div class="sh-ghead" id="sh-ghead">${tile(g, 44)}<div><h1>${esc(g.name)}</h1><div class="sh-hosts">${hosts.map((s) => `<span><span class="ov-sdot off" role="img" aria-label="Đang kiểm tra" title="Đang kiểm tra" data-site="${esc(g.id + '/' + s.id)}"></span>${esc(s.name)}: <span class="sh-mono">${esc(s.host)}</span></span>`).join('')}</div></div><div class="sh-r">${right}</div></div>
<nav class="sh-tabs" id="sh-tabs" aria-label="Phần của ${esc(g.name)}">${tabs}</nav>`;
  }
  // the numbers on the tabs and the people count arrive after the screen is drawn
  function repaintHead() {
    const a = $('#sh-ghead'), b = $('#sh-tabs'), g = gameOf(curGame);
    if (!a || !b || !g) return;
    const t = document.createElement('div');
    t.innerHTML = gameHeadHtml(g, headTab);
    a.replaceWith(t.children[0]); b.replaceWith(t.children[0]);
    paintSites();
  }
  // colours the dots of the addresses; asks the server first when it has not been asked yet
  async function paintHead() {
    if (siteState) return paintSites();
    const r = await api('GET', '/trang-thai-trang');
    if (r.ok) { siteState = r.data.sites; paintSites(); }
  }

  // events of the frame are caught once on the document, so they survive every redraw of a screen
  function bindFrame() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const dact = t.closest('[data-act]');
      if (dact) {
        const a = dact.getAttribute('data-act');
        if (a === 'ovClose') { closeOverlay(); return; }
        if (a === 'ovOk') { const f = OV.onOk; closeOverlay(); if (f) f(); return; }
      }
      if (t.closest('[data-adm-theme]')) { toggleTheme(); return; }
      if (t.closest('#logout')) { doLogout(false); return; }
      if (t.closest('#sh-menu')) {
        const open = app.classList.toggle('sh-open');
        $('#sh-menu').setAttribute('aria-expanded', String(open));
        return;
      }
      if (t.closest('.sh-scrim') || t.closest('.sh-side a')) app.classList.remove('sh-open');
      if (t.closest('#sw-btn')) { if (SW.open) swClose(false); else swOpen(); return; }
      const opt = t.closest('[data-pick]');
      if (opt) { swPick(opt.getAttribute('data-pick')); return; }
      if (t.closest('.sh-sw-foot a')) { swClose(false); return; }
      if (SW.open && !t.closest('#sw')) swClose(false);
      const copy = t.closest('[data-copy]');
      if (copy) {
        const text = copy.getAttribute('data-copy');
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Đã sao chép'), () => toast('Không sao chép được: hãy bôi đen và chép tay.'));
        else toast('Trình duyệt không cho sao chép tự động.');
      }
      const pre = t.closest('[data-pre]');
      if (pre && preSetter) preSetter(pre.getAttribute('data-pre'));
    });
    document.addEventListener('input', (e) => { if (e.target && e.target.id === 'sw-input') swFill(e.target.value); });
    document.addEventListener('keydown', (e) => {
      if (OV.el) {
        if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); return; }
        if (e.key === 'Tab') {
          const f = $$('a[href],button,input,select,textarea', OV.el).filter((x) => !x.disabled && x.offsetParent !== null);
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      if (e.target && e.target.id === 'sw-input') {
        if (e.key === 'ArrowDown') { e.preventDefault(); SW.active = Math.min(SW.items.length - 1, SW.active + 1); swMark(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); SW.active = Math.max(0, SW.active - 1); swMark(); }
        else if (e.key === 'Home') { e.preventDefault(); SW.active = 0; swMark(); }
        else if (e.key === 'End') { e.preventDefault(); SW.active = Math.max(0, SW.items.length - 1); swMark(); }
        else if (e.key === 'Enter') { e.preventDefault(); const g = SW.items[SW.active]; if (g) swPick(g.id); }
        else if (e.key === 'Escape') { e.preventDefault(); swClose(true); }
        else if (e.key === 'Tab') swClose(false);
        return;
      }
      if (e.key === 'Escape') {
        if (SW.open) swClose(true);
        if (app.classList.contains('sh-open')) { app.classList.remove('sh-open'); const b = $('#sh-menu'); if (b) b.setAttribute('aria-expanded', 'false'); }
      }
    });
  }

  // ---------- sign in, register, set password, accept an invite (admin-auth-app.mjs) ----------
  const renderLogin = (notice) => AUTH.renderLogin(notice);
  const renderSetPassword = () => AUTH.renderSetPassword();
  const renderRegister = () => AUTH.renderRegister();
  const renderAcceptInvite = () => AUTH.renderAcceptInvite();

  // ---------- editor ----------
  function cleanupEditor() {
    screen++;
    crumbTail = '';
    if (leaving) { const f = leaving; leaving = null; f(); }
    dirty = () => false;
  }
  // ---------- overview of the games, and the pages that stand in for a missing part ----------
  const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function todayWords() {
    const d = new Date(Date.now() + 7 * 3600e3);
    const p = (n) => String(n).padStart(2, '0');
    return `${WEEKDAY[d.getUTCDay()]}, ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  }
  const shortTime = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}` : '');
  const LOG_WORDS = {
    'cap-quyen': 'cấp quyền cho', 'thu-quyen': 'thu quyền của', quyen: 'đổi quyền của', duyet: 'duyệt tài khoản', 'tu-choi': 'từ chối tài khoản',
    khoa: 'khoá tài khoản', 'mo-khoa': 'mở khoá tài khoản', 'tao-link-moi': 'tạo link mời', 'huy-link-moi': 'huỷ link mời', 'tao-ma': 'tạo mã Claude cho', 'thu-hoi-ma': 'thu hồi mã',
  };

  // What is waiting, per game, from the same calls the sections make (only for parts the account may use). A call that fails
  // is left out: the overview shows what it knows rather than an error.
  async function loadWork() {
    const byGame = {};
    let accounts = null;
    let log = null;
    const jobs = [];
    for (const g of GAMES) {
      const list = (byGame[g.id] = []);
      const has = (m) => g.parts.some((p) => p.id === m);
      const held = (m, p) => (g.perms[m] || []).includes(p);
      if (has('tin-tuc') && held('tin-tuc', 'viet')) {
        jobs.push(api('GET', `/g/${g.id}/bai`).then((r) => {
          if (!r.ok) return;
          const items = r.data.items || [];
          if (held('tin-tuc', 'duyet')) {
            const n = items.filter((p) => p.status === 'pending').length;
            if (n) list.push({ n, txt: 'bài chờ duyệt', tab: 'posts', pre: 'pending' });
          } else {
            const n = items.filter((p) => p.status === 'draft' && p.author === me.name).length;
            if (n) list.push({ n, txt: 'bài nháp của bạn', tab: 'posts', pre: 'draft', info: true });
          }
        }));
      }
      if (has('phieu-be-ngoan') && held('phieu-be-ngoan', 'duyet')) {
        jobs.push(api('GET', `/g/${g.id}/phieu-be-ngoan?ngay=hom-nay&st=cho`).then((r) => {
          if (r.ok && r.data.cho) list.push({ n: r.data.cho, txt: 'phiếu chờ trả quà (mọi ngày)', tab: 'phieu' });
        }));
      }
    }
    if (isOwner()) {
      jobs.push(api('GET', '/nguoi-dung').then((r) => { if (r.ok) accounts = r.data.users; }));
      jobs.push(api('GET', '/nhat-ky').then((r) => { if (r.ok) log = r.data.items || []; }));
    }
    await Promise.all(jobs);
    const order = ['posts', 'phieu'];
    for (const k of Object.keys(byGame)) byGame[k].sort((a, b) => order.indexOf(a.tab) - order.indexOf(b.tab));
    work = { at: Date.now(), byGame, accounts, log };
    const nav2 = $('#sh-nav');
    if (nav2) nav2.innerHTML = navHtml(headTab);
    repaintHead();
  }

  const siteHost = (g, s) => {
    if (s.host && s.host.indexOf('/') !== 0) return s.host;
    const main = g.sites.find((x) => x.host && x.host.indexOf('/') !== 0);
    return (main ? main.host : '') + (s.path || '');
  };
  const siteUrl = (g, s) => { const h = siteHost(g, s); return h && h.indexOf('/') !== 0 ? 'https://' + h : ''; };

  // Marks each web address with its state; the overview is drawn first and the dots follow when the server has asked.
  function paintSites() {
    if (!siteState) return;
    let up = 0, total = 0;
    for (const g of GAMES) {
      for (const s of g.sites) {
        total++;
        const st = siteState[g.id + '/' + s.id];
        const dot = document.querySelector(`[data-site="${CSS.escape(g.id + '/' + s.id)}"]`);
        if (st && st.ok) up++;
        if (!dot) continue;
        const word = !st ? 'Chưa kiểm tra được' : st.ok ? 'Đang chạy' : `Không trả lời${st.code ? ' (mã ' + st.code + ')' : ''}`;
        dot.className = 'ov-sdot ' + (!st ? 'off' : st.ok ? 'ok' : 'bad');
        dot.setAttribute('aria-label', word); dot.title = word;
      }
    }
    const upEl = $('#ov-up');
    if (upEl) upEl.textContent = total ? `${up} trang đang chạy` : 'Chưa có trang nào';
  }

  async function renderOverview() {
    cleanupEditor();
    const mine = screen;
    nav = { kind: 'overview', part: false };
    app.innerHTML = `${header()}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải tổng quan…</p></main>`;
    const sitesCall = api('GET', '/trang-thai-trang');
    await loadWork();
    if (mine !== screen || !me) return;
    const owner = isOwner();
    const jobsAll = GAMES.flatMap((g) => jobsOf(g.id).filter((a) => !a.info).map((a) => ({ ...a, g })));
    const waitingAcc = accountsWaiting();
    const total = jobsAll.reduce((s, a) => s + a.n, 0) + waitingAcc;
    const siteCount = GAMES.reduce((s, g) => s + g.sites.length, 0);
    const partNames = [...new Set(GAMES.flatMap((g) => g.parts.map((p) => p.name)))];
    const partCount = GAMES.reduce((s, g) => s + g.parts.length, 0);
    const partHref = (g, tab) => { const m = g.menu.find((x) => x[0] === tab); return m ? menuHref(g, m) : '#/g/' + g.id + '/'; };
    const peopleOf = (g) => (work.accounts || []).filter((u) => u.role === 'member' && !u.disabled && u.grants && Object.hasOwn(u.grants, g.id));
    const arrow = I.arrow;

    let h = `<div class="ov-head"><div><div class="ov-eyebrow">${esc(todayWords())}</div><h1>Tổng quan</h1>
<p>${owner ? 'Bạn là Quản lý tổng nên thấy mọi game. Chọn một game để làm việc.' : 'Chỉ hiện các game bạn được cấp quyền. Chọn một game để làm việc.'}</p></div>
${owner ? `<div class="ov-acts"><a class="sh-btn" href="#/nguoi-dung">${I.users} Phân quyền</a><a class="sh-btn sh-btn-primary" href="#/link-moi">${I.link} Tạo link mời</a></div>` : ''}</div>`;
    h += `<section class="ov-kpis" aria-label="Tóm tắt">
<div class="ov-kpi"><span>Game</span><b>${GAMES.length}</b><a class="ov-lnk" href="#ov-games" data-scroll="ov-games">Xem từng game ${arrow}</a></div>
<div class="ov-kpi"><span>Trang web đang quản lý</span><b>${siteCount}</b><span class="ov-sub" id="ov-up">Đang kiểm tra…</span></div>
<div class="ov-kpi"><span>Phần đang bật</span><b>${partCount}</b><span class="ov-sub">${partNames.length ? esc(partNames.join(', ')) : 'Chưa có phần nào'}</span></div>
<div class="ov-kpi"><span>Việc đang chờ</span><b class="${total ? 'hot' : ''}">${total}</b>${total ? `<a class="ov-lnk" href="#ov-queue" data-scroll="ov-queue">Xem việc chờ ${arrow}</a>` : '<span class="ov-sub">Không có gì chờ</span>'}</div>
</section>`;

    h += `<div class="ov-sec-h" id="ov-games"><h2>Các game</h2><span>${GAMES.length} game</span></div><div class="ov-games">`;
    for (const g of GAMES) {
      const jobs = jobsOf(g.id);
      const ppl = owner ? peopleOf(g) : [];
      const nParts = g.menu.length;
      h += `<article class="ov-gcard" aria-labelledby="gc-${esc(g.id)}">
<div class="ov-gcard-h">${tile(g, 36)}<div style="min-width:0"><h3 id="gc-${esc(g.id)}">${esc(g.name)}</h3><div class="ov-meta"><span class="ov-mono">${esc(g.id)}</span></div></div></div>
<div class="ov-gsec"><h4>Trang web</h4>${g.sites.length ? `<ul class="ov-sites">${g.sites.map((s) => {
    const url = siteUrl(g, s);
    const label = esc(siteHost(g, s) || s.id);
    return `<li><span class="ov-lb">${esc(s.name)}</span><span class="ov-host"><span class="ov-sdot off" role="img" aria-label="Đang kiểm tra" title="Đang kiểm tra" data-site="${esc(g.id + '/' + s.id)}"></span>${url ? `<a class="ov-mono" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>` : `<span class="ov-mono">${label}</span>`}</span></li>`;
  }).join('')}</ul>` : '<span class="ov-none">Chưa có trang web nào</span>'}</div>
<div class="ov-gsec"><h4>Phần đang bật</h4>${g.parts.length ? `<div class="ov-chips">${g.parts.map((p) => `<span class="ov-badge outline">${esc(p.name)}</span>`).join('')}</div>` : '<span class="ov-none">Chưa bật phần nào</span>'}</div>
<div class="ov-gsec"><h4>Việc đang chờ</h4>${jobs.length ? `<ul class="ov-wait">${jobs.map((a) => `<li class="${a.info ? 'info' : ''}"><a href="${esc(partHref(g, a.tab))}"${a.pre ? ` data-pre="${esc(a.pre)}"` : ''}><b>${a.n}</b><span>${esc(a.txt)}</span>${I.chevR}</a></li>`).join('')}</ul>` : '<span class="ov-none">Không có việc gì</span>'}</div>
<div class="ov-gcard-f">${owner
    ? (ppl.length ? `<div class="ov-av-stack">${ppl.slice(0, 4).map((u) => `<span class="sh-av" title="${esc(u.name)}" aria-hidden="true">${esc(initials(u.name))}</span>`).join('')}</div><small>${ppl.length} người có quyền</small>` : '<small>Chỉ có bạn</small>')
    : `<small>${nParts ? nParts + ' phần bạn được làm' : 'Chưa có phần để làm'}</small>`}
<a class="sh-btn sh-btn-sm" href="#/g/${esc(g.id)}/" aria-label="Vào ${esc(g.name)}">Vào game ${arrow}</a></div>
</article>`;
    }
    h += '</div>';

    const queue = [
      ...(owner && waitingAcc ? [{ where: `${I.users} Hệ thống`, txt: `<b>${waitingAcc}</b> tài khoản đăng ký đang chờ bạn duyệt`, href: '#/nguoi-dung' }] : []),
      ...jobsAll.map((a) => ({ where: `${tile(a.g, 14)} ${esc(a.g.name)}, ${esc((a.g.parts.find((p) => p.id === (a.tab === 'phieu' ? 'phieu-be-ngoan' : 'tin-tuc')) || { name: '' }).name)}`, txt: `<b>${a.n}</b> ${esc(a.txt)}`, href: partHref(a.g, a.tab), pre: a.pre })),
    ];
    h += `<div class="ov-below"><section class="ov-card" id="ov-queue" aria-labelledby="q-h"><div class="ov-card-h"><h2 id="q-h">Việc đang chờ, mọi game</h2><span class="ov-r">${queue.length} mục</span></div>
${queue.length ? `<ul class="ov-list ov-queue">${queue.map((x) => `<li><div><div class="ov-where">${x.where}</div><div>${x.txt}</div></div><a class="sh-btn sh-btn-sm" href="${esc(x.href)}"${x.pre ? ` data-pre="${esc(x.pre)}"` : ''}>Mở</a></li>`).join('')}</ul>` : '<div class="ov-card-b ov-none">Không có việc gì đang chờ.</div>'}</section>`;
    if (owner) {
      const log = (work.log || []).slice(0, 5);
      h += `<section class="ov-card" aria-labelledby="l-h"><div class="ov-card-h"><h2 id="l-h">Gần đây</h2><span class="ov-r">Thay đổi quyền</span></div>
${log.length ? `<ul class="ov-list ov-log">${log.map((l) => {
    const via = l.qua === 'claude';
    const who = String(l.ai || '').replace(/ \(Claude\)$/, '');
    return `<li><time>${esc(shortTime(l.luc))}</time><span><b>${esc(who)}</b> ${via ? '<span class="ov-badge info" title="Làm qua mã Claude">Claude</span> ' : ''}${esc(LOG_WORDS[l.viec] || l.viec || '')} <b>${esc(l.doiTuong || '')}</b></span></li>`;
  }).join('')}</ul>` : '<div class="ov-card-b ov-none">Chưa có thay đổi quyền nào được ghi.</div>'}</section>`;
    } else {
      h += `<section class="ov-card"><div class="ov-card-h"><h2>Quyền của bạn</h2></div><div class="ov-card-b ov-perm">${GAMES.map((g) => {
        if ((me.grants || {})[g.id] === '*') return `<div><b>${esc(g.name)}</b>: Quản lý cả game</div>`;
        const bits = g.parts.filter((p) => (g.perms[p.id] || []).length).map((p) => `${esc(p.name)}: ${g.perms[p.id].map((k) => esc(p.perms[k] || k)).join('; ')}`);
        return `<div><b>${esc(g.name)}</b>: ${bits.join(' · ') || 'chưa có quyền nào'}</div>`;
      }).join('')}</div></section>`;
    }
    h += '</div>';
    $('main').innerHTML = h;
    $$('[data-scroll]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const el = document.getElementById(a.getAttribute('data-scroll'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    // the dots: use the answer if it is already there, otherwise wait for it
    const rs = await sitesCall;
    if (mine !== screen) return;
    if (rs.ok) { siteState = rs.data.sites; paintSites(); } else if ($('#ov-up')) $('#ov-up').textContent = 'Chưa kiểm tra được';
  }

  // A page inside the frame for a game that has nothing to show yet, or that this account may not open.
  function framePage(inner) {
    cleanupEditor();
    app.innerHTML = `${header()}<main class="wrap">${inner}</main>`;
  }

  function renderEmptyGame(g) {
    nav = { kind: 'game', part: false };
    const people = isOwner() && work && work.accounts ? work.accounts.filter((u) => u.role === 'member' && !u.disabled && u.grants && Object.hasOwn(u.grants, g.id)) : null;
    const ask = `Bật phần Tin tức cho game ${g.id} trong scripts/lib/admin/games.mjs (mục modules của game đó), rồi khởi động lại máy chủ.`;
    framePage(`<div class="sh-empty"><div class="sh-empty-ic">${I.layers}</div><h2>${esc(g.name)} chưa bật phần nào</h2>
<p>Game đã có chỗ trong trang quản trị và có thư mục dữ liệu riêng <span class="ov-mono">data/games/${esc(g.id)}/</span>. Khi bật một phần (Tin tức, Phiếu…), dữ liệu của phần đó nằm riêng ở đó, không lẫn với game khác.</p>
<div class="sh-acts">${isOwner() ? `<button type="button" class="sh-btn" data-copy="${esc(ask)}">${I.copy} Chép lời nhờ Claude bật</button>` : ''}
${isOwner() ? '' : '<p>Chỉ Quản lý tổng bật được phần mới.</p>'}</div>
<div class="sh-empty-meta"><div>${I.users} ${people ? (people.length ? esc(people.map((u) => u.name).join(', ')) : 'Chưa ai ngoài Quản lý tổng') : 'Bạn có quyền ở game này'}</div>
${g.sites.length ? `<div>${I.layers} <span class="ov-mono">${esc(siteHost(g, g.sites[0]))}</span></div>` : '<div>Game chưa có trang web nào</div>'}</div></div>`);
  }

  function renderDenied(text) {
    nav = { kind: 'none', part: false };
    framePage(`<div class="sh-empty"><div class="sh-empty-ic">${I.lock}</div><h2>Không có quyền</h2><p>${esc(text)}</p>
<div class="sh-acts"><a class="sh-btn sh-btn-primary" href="${isSingle() || !GAMES.length ? '#/' : '#/tong-quan'}">${isSingle() ? 'Về trang việc của bạn' : GAMES.length ? 'Về tổng quan' : 'Tải lại'}</a></div></div>`);
  }

  // ---------- news screens (admin-news-app.mjs) ----------
  const NEWS = adminNews({
    $, $$, esc, api, toast, can, gh, header, app, I, svgIcon, initials, fmtTime, slugify, siteNowLocal, armDelete, disarm, gp,
    CATS, LIB, HOST, SITES, STATE, ACTION_WORDS, stateOf, siteOfPost, addrPrefix,
    screen: () => screen, me: () => me, isOwner, game: () => gameOf(curGame), gameId: () => curGame,
    cleanupEditor, setDirty: (f) => { dirty = f; }, setLeaving: (f) => { leaving = f; }, markHash: () => { lastHash = location.hash; },
    loginAgain: (msg) => { me = null; renderLogin(msg); }, setPreState: (f) => { preSetter = f; },
    gameHead: gameHeadHtml, paintHead, setCrumb: (t) => { crumbTail = t; }, dialogOpen,
  });

  // ---------- gift tickets, early sign-ups, background music (admin-parts-app.mjs) ----------
  const PARTS = adminParts({
    $, $$, esc, api, toast, can, gp, header, app, I, svgIcon, fmtTime, armDelete, disarm, confirmDlg,
    screen: () => screen, me: () => me, game: () => gameOf(curGame), cleanupEditor,
    loginAgain: (msg) => { me = null; renderLogin(msg); }, gameHead: gameHeadHtml, paintHead,
  });

  // ---------- the owner's screens (admin-access-app.mjs) and the pages before sign-in (admin-auth-app.mjs) ----------
  const ACCESS = adminAccess({
    $, $$, esc, api, toast, header, app, I, svgIcon, fmtTime, siteNowLocal, initials, tile, armDelete, LOG_WORDS,
    screen: () => screen, me: () => me, cleanupEditor, openOverlay, closeOverlay,
    setNav: (sys) => { nav = { kind: 'system', part: false, sys }; },
  });
  const AUTH = adminAuth({
    $, esc, api, app, I, svgIcon, fmtTime, siteNowLocal, tile, themeButton,
    cleanupEditor, loadMe, route: () => route(),
  });

  // ---------- routing ----------
  // Addresses: #/tong-quan · #/g/<game>/<section> · #/nguoi-dung. The older ones that name no game (#/sua/12, #/phieu-be-ngoan, …)
  // are game 3qdc's, so bookmarks keep working. A bare #/ is the account's home: the overview, or the one game it has.
  let lastHash = location.hash;
  const go = (hash) => { location.replace(hash); }; // changes the address without adding a history entry
  const firstHash = (g) => (g.menu.length ? menuHref(g, g.menu[0]) : '#/g/' + g.id + '/');

  // the sections of a game: the address they answer to, the part and permission they need, the tab they light up
  const SECTION_TABLE = [
    { test: (r) => r === '/viet-bai', mod: 'tin-tuc', perm: 'viet', tab: 'posts', draw: (r) => NEWS.renderEditor(null) },
    { test: (r) => /^\/sua\/\d+$/.test(r), mod: 'tin-tuc', perm: 'viet', tab: 'posts', draw: (r) => NEWS.renderEditor(+r.slice(5)) },
    { test: (r) => r === '/nhac', mod: 'nhac', perm: 'quan-ly', tab: 'music', draw: () => PARTS.renderMusic() },
    { test: (r) => r === '/dang-ky-som', mod: 'dang-ky-som', perm: 'quan-ly', tab: 'signup', draw: () => PARTS.renderSignups() },
    { test: (r) => r === '/phieu-be-ngoan', mod: 'phieu-be-ngoan', perm: 'duyet', tab: 'phieu', draw: () => PARTS.renderPhieu() },
    { test: (r) => r === '/thung-rac', mod: 'tin-tuc', perm: 'duyet', tab: 'trash', draw: () => NEWS.renderTrash() },
    { test: (r) => r === '/', mod: 'tin-tuc', perm: 'viet', tab: 'posts', draw: () => NEWS.renderList() },
  ];

  function route() {
    closeOverlay(); // a dialog belongs to the screen it was opened on
    if (!me) return renderLogin();
    app.classList.remove('sh-open');
    const raw = location.hash.replace(/^#/, '');
    const gm = raw.match(/^\/g\/([a-z0-9-]+)(\/.*)?$/);
    const rest = gm ? (gm[2] || '/') : (raw || '/');
    const shown = (section) => { curSection = section; lastHash = location.hash; window.scrollTo(0, 0); afterRoute(); refreshCounts(); };

    // places that belong to no game
    if (!gm && (rest === '/' || rest === '/tong-quan')) {
      if (!GAMES.length && !isOwner()) { renderDenied('Tài khoản này chưa được cấp quyền ở game nào. Hãy nhờ Quản lý tổng cấp quyền.'); return shown(''); }
      if (isSingle()) return go(firstHash(GAMES[0]));
      if (rest === '/') return go('#/tong-quan');
      renderOverview();
      return shown('#/tong-quan');
    }
    const sysm = !gm && rest.match(/^\/(nguoi-dung|link-moi|ma-claude|nhat-ky)(?:\/([a-z0-9-]+))?$/);
    if (sysm) {
      if (!isOwner()) { renderDenied('Chỉ Quản lý tổng xem và đổi được quyền, link mời, mã Claude và nhật ký.'); return shown(''); }
      nav = { kind: 'system', part: false, sys: 'perm' };
      if (sysm[1] === 'nguoi-dung') ACCESS.renderPerm(sysm[2]);
      else if (sysm[1] === 'link-moi') ACCESS.renderInvites(sysm[2]);
      else if (sysm[1] === 'ma-claude') ACCESS.renderCodes();
      else ACCESS.renderLog(1);
      return shown('#/' + sysm[1]);
    }

    // a game's sections
    const gid = gm ? gm[1] : DEFAULT_GAME;
    const g = gameOf(gid);
    if (!g) { renderDenied(`Tài khoản này không có quyền ở game “${gid}”.`); return shown(''); }
    curGame = gid;
    const hit = SECTION_TABLE.find((t) => t.test(rest));
    if (hit && g.parts.some((p) => p.id === hit.mod) && can(hit.mod, hit.perm)) {
      nav = { kind: 'game', part: true };
      hit.draw(rest);
      return shown(hit.tab === 'posts' ? '#/g/' + gid + '/' : '#/g/' + gid + rest);
    }
    if (hit && rest !== '/' && g.parts.some((p) => p.id === hit.mod)) { renderDenied(`Tài khoản này không có quyền ở phần này của ${g.name}.`); return shown(''); }
    // no section named, or one the game has not switched on: the first section the account may use, else the game's own page
    if (g.menu.length && firstHash(g) !== location.hash) return go(firstHash(g));
    renderEmptyGame(g);
    shown('');
  }

  // the numbers beside the side bar entries come from the same calls as the overview; fetch them when they are old
  function refreshCounts() {
    if (nav.kind === 'overview' || (work && Date.now() - work.at < 30000)) return;
    loadWork().catch(() => { /* the side bar just stays without counts */ });
  }

  // ---------- sideways swipe between the sections (touch screens only) ----------
  // The sections of the open game in menu order (the accounts page last for an owner); a swipe moves one step and stops at
  // either end rather than wrapping, so the menu stays the map of where you are. The editor is left out on purpose: a stray
  // swipe must never drop unsaved text.
  const sections = () => {
    const g = gameOf(curGame);
    return (g && nav.kind === 'game' ? g.menu.map((m) => menuHref(g, m)) : []).concat(isOwner() && nav.kind !== 'overview' ? ['#/nguoi-dung', '#/link-moi', '#/ma-claude', '#/nhat-ky'] : []);
  };
  let slideFrom = '';

  function afterRoute() {
    const main = $('main') || app;
    if (slideFrom) {
      main.classList.add(slideFrom === 'right' ? 'adm-in-right' : 'adm-in-left');
      slideFrom = '';
    }
  }

  function bindSwipe() {
    let x0 = 0, y0 = 0, t0 = 0, tracking = false;
    const swipeable = () => me && sections().length > 1
      && window.matchMedia('(max-width:860px)').matches
      && !$('.ed'); // the editor keeps its own gestures
    // a gesture that starts on one of these belongs to the control, not to the page
    const owned = (el) => !!(el && el.closest && el.closest('input,textarea,select,audio,video,[contenteditable="true"],.sh-side,.sh-top,.tb,.ce'));
    document.addEventListener('touchstart', (e) => {
      tracking = false;
      if (e.touches.length !== 1 || dialogOpen() || !swipeable() || owned(e.target)) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); tracking = true;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      // far enough sideways, clearly more sideways than down, and not a slow drag that was really a scroll
      if (Date.now() - t0 > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const list = sections();
      const here = list.indexOf(curSection);
      const next = here + (dx < 0 ? 1 : -1);
      if (here < 0 || next < 0 || next >= list.length) return;
      slideFrom = dx < 0 ? 'right' : 'left';
      location.hash = list[next];
    }, { passive: true });
  }
  window.addEventListener('hashchange', () => {
    // a new set-password link pasted into the same tab: show the form for that token
    if (location.pathname.indexOf('/quan-tri/dat-mat-khau') === 0) { if (location.hash.length > 1) renderSetPassword(); return; }
    if (location.pathname.indexOf('/quan-tri/moi') === 0) { if (location.hash.length > 1) renderAcceptInvite(); return; }
    if (dirty()) {
      // put the old address back and ask; "Rời trang" goes on to where the person was heading
      const target = location.hash;
      try { history.replaceState(null, '', lastHash || '#/'); } catch (e) { /* ignore */ }
      if (!dialogOpen()) leaveDlg(() => { dirty = () => false; location.hash = target; });
      return;
    }
    route();
  });
  window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('pagehide', () => { if (leaving) { const f = leaving; leaving = null; f(); } });

  (async function boot() {
    bindSwipe();
    bindFrame();
    if (location.pathname.replace(/\/+$/, '') === '/quan-tri/dat-mat-khau') return renderSetPassword();
    if (location.pathname.replace(/\/+$/, '') === '/quan-tri/dang-ky') return renderRegister();
    if (location.pathname.replace(/\/+$/, '') === '/quan-tri/moi') return renderAcceptInvite();
    const r = await loadMe();
    if (r.ok) route(); else if (r.status !== 401) renderLogin(r.data.error);
  })();
}
