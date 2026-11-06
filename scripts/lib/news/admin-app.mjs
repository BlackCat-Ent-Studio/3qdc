// admin-app.mjs — the browser side of /quan-tri: the frame (side bar, top bar, game switcher, overview, dialogs), sign-in,
// set password, accounts, and the older screens that are not redrawn yet. The news screens live in admin-news-app.mjs and are
// handed in as adminNews (both are serialised into the page; neither runs on the server).
// It talks only to /quan-tri/api/*; the server re-checks every permission and cleans every article, so nothing here is a
// security boundary — it only keeps the screens honest.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminApp(adminNews) {
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
  const isOwner = () => !!me && me.role === 'owner';
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
    if (r.ok) { me = r.data.user; GAMES = r.data.games || []; work = null; siteState = null; }
    return r;
  }

  // The accounts page still sets rights by presets (Biên tập / Duyệt phiếu / Quản lý) on game 3qdc.
  const PRESET_GRANTS = { manager: { '3qdc': '*' }, editor: { '3qdc': { 'tin-tuc': ['viet'] } }, phieu: { '3qdc': { 'phieu-be-ngoan': ['duyet'] } } };
  function presetOf(grants) {
    const s = JSON.stringify(grants || {});
    return Object.keys(PRESET_GRANTS).find((k) => JSON.stringify(PRESET_GRANTS[k]) === s) || 'custom';
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
    if (m.img) return `<img class="sh-tile" src="${esc(m.img)}" width="${size}" height="${size}" alt="" aria-hidden="true">`;
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
      h += '<div class="sh-label">Hệ thống</div>';
      h += navLink('Phân quyền', '#/nguoi-dung', nav.kind === 'system', I.users, accountsWaiting());
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

  // the round button of the sign-in pages (the news theme's own look)
  function authThemeButton() {
    return `<button type="button" class="theme-btn" data-adm-theme aria-pressed="${isDark()}" aria-label="Đổi giao diện sáng / tối" title="Đổi giao diện sáng / tối">${I.sun}${I.moon}</button>`;
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
      c.push('<li><span class="sh-plain">Hệ thống</span></li>', here('Phân quyền'));
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
    me = null; GAMES = []; work = null; siteState = null;
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
      right = `${ppl != null ? `<span>${ppl} người có quyền</span>` : ''}<a class="sh-btn" href="#/nguoi-dung">${I.users} Phân quyền game này</a>`;
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

  // ---------- sign in / set password ----------
  function authShell(inner) {
    cleanupEditor();
    app.innerHTML = `<main class="auth"><div class="theme-float">${authThemeButton()}</div><div class="auth-box"><img src="${esc(LOGO)}" alt="3Q Đại Chiến" class="auth-logo">${inner}</div></main>`;
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
      const t = await loadMe();
      if (!t.ok) { if (t.status !== 401) { err.textContent = t.data.error || 'Không đăng nhập được.'; err.hidden = false; } return; }
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
      // an account from an invite link comes with the invite's rights already chosen. When they match none of the kinds
      // (a "custom" link), there is nothing to choose: the button sends no rights and the server uses the link's own
      const fromLink = Object.keys(u.wantGrants || {}).length > 0 && presetOf(u.wantGrants) === 'custom';
      acts = `${fromLink ? '<span class="meta">Quyền theo link mời</span>' : roleSelect(presetOf(u.wantGrants) === 'custom' ? 'editor' : presetOf(u.wantGrants), u.username, 'role-' + esc(u.username))}<button type="button" class="btn btn-fire btn-sm" data-act="duyet" data-user="${esc(u.username)}">Duyệt</button><button type="button" class="btn btn-danger btn-sm" data-act="tu-choi" data-user="${esc(u.username)}">Từ chối</button>`;
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
    $('#inv-new').addEventListener('click', (e) => accessCall('/loi-moi', { grants: PRESET_GRANTS.phieu }, e.target,
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
      // approving without a choice box = the rights of the invite link, sent as no rights at all
      const byLink = action === 'duyet' && !sel;
      // "Tuỳ chỉnh" has no preset to send: such an account keeps its rights unless another kind is chosen
      if ((action === 'duyet' || action === 'vai-tro') && !byLink && !PRESET_GRANTS[role]) {
        const e = $('#u-err'); e.textContent = 'Chọn Biên tập, Duyệt phiếu hoặc Quản lý.'; e.hidden = false;
        return;
      }
      $$('[data-act]').forEach((x) => { x.disabled = true; });
      const mine = screen;
      const r = await api('POST', '/nguoi-dung/' + encodeURIComponent(username), { action: action === 'vai-tro' ? 'quyen' : action, grants: byLink ? undefined : PRESET_GRANTS[role] });
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

  // ---------- background music of the home page (managers) ----------
  // The songs are plain files in one folder on the server, so this page is that folder: upload adds a file, delete
  // removes it, and the player on the home page follows at once (it reads the same folder on every visit).
  const MUSIC_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/x-wav'];
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

  async function renderMusic() {
    cleanupEditor();
    const mine = screen;
    app.innerHTML = `${header('music')}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải danh sách nhạc…</p></main>`;
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
            res = await fetch('/quan-tri/api' + gp('/nhac'), {
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

    const load = async () => {
      const r = await api('GET', `/dang-ky-som?q=${encodeURIComponent(view.q)}&trang=${view.page}`);
      if (mine !== screen || !me) return null;
      if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return null; }
      return r.data;
    };

    const draw = (d) => {
      $('main').innerHTML = `<div class="adm-top"><div><h1>Đăng ký sớm</h1>
<p>Số điện thoại khách để lại ở trang <a href="/dang-ky-som" target="_blank" rel="noopener">/dang-ky-som</a>. Quà chưa phát tự động — tải CSV để gửi tay.</p></div>
<a class="btn btn-fire" href="/quan-tri/api${gp('/dang-ky-som/csv')}" download>Tải CSV (${fmtNum(d.total)} số)</a></div>
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
    const qs = () => `ngay=${phieuView.ngay}&st=${phieuView.st}`;

    const load = async () => {
      const r = await api('GET', `/phieu-be-ngoan?${qs()}`);
      if (mine !== screen || !me) return null;
      if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return null; }
      return r.data;
    };

    // "Duyệt phiếu" accounts see no email addresses, no CSV and no delete button (the server refuses those anyway)
    const full = can('phieu-be-ngoan', 'quan-ly');
    const draw = (d) => {
      const c = d.counts;
      $('main').innerHTML = `<div class="adm-top"><div><h1>Phiếu Bé Ngoan</h1>
<p>Người chơi gửi phiếu ở <a href="https://phieubengoan.3qdc.wanmeivn.com/" target="_blank" rel="noopener">phieubengoan.3qdc.wanmeivn.com</a>. Trả quà trong game xong thì bấm <b>Đã trả</b>, người chơi sẽ thấy trong lịch sử.</p></div>
${full ? `<a class="btn btn-fire" href="/quan-tri/api${gp('/phieu-be-ngoan/csv')}?${qs()}" download>Xuất CSV</a>` : ''}</div>
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
    if (nav2) nav2.innerHTML = navHtml();
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
${owner ? `<div><a class="sh-btn" href="#/nguoi-dung">${I.users} Phân quyền</a></div>` : ''}</div>`;
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
    { test: (r) => r === '/nhac', mod: 'nhac', perm: 'quan-ly', tab: 'music', draw: () => renderMusic() },
    { test: (r) => r === '/dang-ky-som', mod: 'dang-ky-som', perm: 'quan-ly', tab: 'signup', draw: () => renderSignups() },
    { test: (r) => r === '/phieu-be-ngoan', mod: 'phieu-be-ngoan', perm: 'duyet', tab: 'phieu', draw: () => renderPhieu() },
    { test: (r) => r === '/thung-rac', mod: 'tin-tuc', perm: 'duyet', tab: 'trash', draw: () => NEWS.renderTrash() },
    { test: (r) => r === '/', mod: 'tin-tuc', perm: 'viet', tab: 'posts', draw: () => NEWS.renderList() },
  ];

  function route() {
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
    if (!gm && rest === '/nguoi-dung') {
      if (!isOwner()) { renderDenied('Chỉ Quản lý tổng xem và đổi được quyền của người khác.'); return shown(''); }
      nav = { kind: 'system', part: false };
      renderUsers();
      return shown('#/nguoi-dung');
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
    return (g && nav.kind === 'game' ? g.menu.map((m) => menuHref(g, m)) : []).concat(isOwner() && nav.kind !== 'overview' ? ['#/nguoi-dung'] : []);
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
