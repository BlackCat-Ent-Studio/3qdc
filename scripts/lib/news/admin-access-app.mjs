// admin-access-app.mjs — the browser side of the owner's "Hệ thống" screens: Phân quyền (who may do what in which game and
// part), Link mời, Mã cho Claude and Nhật ký. Like adminParts it is serialised into the page next to adminApp (never run on the
// server) and receives the frame's helpers as K, so all of them share one set of sign-in and screen state.
// It talks only to /quan-tri/api/*; the server re-checks every call (owners only, no call makes an owner, the last active
// owner cannot be locked), so nothing here is a security boundary — it only keeps the screens honest.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminAccess(K) {
  const { $, $$, esc, api, toast, header, app, I, fmtTime, siteNowLocal, tile, armDelete, LOG_WORDS } = K;
  const ic = K.svgIcon;
  const A = {
    link: ic('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
    key: ic('<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>'),
    warn: ic('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  };
  const ROLE_WORDS = 'Quản lý tổng';
  const OWNER_CONFIRM = 'TOI HIEU';

  // everything the screens know, loaded together when a screen opens
  const S = { users: [], me: '', invites: [], codes: [], cat: [], mcpUsers: [], mode: 'game', game: '', addSel: '', logFilter: 'all', notice: '' };
  let fresh = null; // a link or code just made: shown once and gone when the screen is left or hidden
  let redraw = () => {};

  // ---------- the books: games, parts, permissions ----------
  const catGame = (gid) => S.cat.find((g) => g.id === gid) || null;
  const catPart = (gid, pid) => { const g = catGame(gid); return (g && g.parts.find((p) => p.id === pid)) || null; };
  const short = (part, k) => (part.short && part.short[k]) || part.perms[k] || k;
  // a permission list with what the others already include added
  function closure(part, list) {
    const s = new Set(list || []);
    for (const h of list || []) for (const x of (part.implies && part.implies[h]) || []) s.add(x);
    return s;
  }
  // the permissions to show for a stored list: those no other held permission already includes
  function minimal(part, list) {
    const inc = new Set();
    for (const h of list || []) for (const x of (part.implies && part.implies[h]) || []) inc.add(x);
    return Object.keys(part.perms).filter((k) => (list || []).includes(k) && !inc.has(k));
  }
  // [{ id, name, text }] for a grants object: "Quản lý game" or "Tin tức: Viết bài; Phiếu Bé Ngoan: Duyệt phiếu"
  function grantItems(grants) {
    const out = [];
    for (const g of S.cat) {
      const v = grants && grants[g.id];
      if (!v) continue;
      if (v === '*') { out.push({ id: g.id, name: g.name, text: 'Quản lý game' }); continue; }
      const bits = g.parts.filter((p) => Array.isArray(v[p.id]) && v[p.id].length).map((p) => `${p.name}: ${minimal(p, v[p.id]).map((k) => short(p, k)).join(', ')}`);
      if (bits.length) out.push({ id: g.id, name: g.name, text: bits.join('; ') });
    }
    return out;
  }
  const grantHtml = (grants) => grantItems(grants).map((x) => `<div><b>${esc(x.name)}</b>: ${esc(x.text)}</div>`).join('');
  const grantPlain = (grants) => grantItems(grants).map((x) => `${x.name}: ${x.text}`).join('; ');
  const hasGrants = (g) => !!g && typeof g === 'object' && Object.keys(g).length > 0;

  const userOf = (un) => S.users.find((u) => u.username === un) || null;
  const cloneGrants = (g) => JSON.parse(JSON.stringify(g || {}));
  const av = (u) => `<span class="sh-av" aria-hidden="true">${esc(K.initials(u.name))}</span>`;
  const person = (u, extra) => `<div class="sh-person">${av(u)}<div class="ac-who"><b>${esc(u.name)}</b><small class="sh-mono">${esc(u.username)}</small>${extra || ''}</div></div>`;
  const statusBadge = (u) => (u.disabled ? '<span class="sh-badge dot sh-b-danger">Đã khoá</span>'
    : u.role === 'owner' ? `<span class="sh-badge sh-b-info">${ROLE_WORDS}</span>`
    : u.role === 'pending' ? '<span class="sh-badge dot sh-b-warn">Chờ duyệt</span>' : '<span class="sh-badge dot sh-b-ok">Đang dùng</span>');
  const failBox = (msg) => `<div class="sh-note danger" role="alert">${A.warn}<div>${esc(msg)}</div></div>`;
  const pageHead = (eyebrow, title, text, right) => `<div class="sh-page-h"><div><div class="sh-eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${text}</p></div>${right ? `<div class="sh-r">${right}</div>` : ''}</div>`;
  const notes = () => `<div class="sh-stack" id="ac-notes" aria-live="polite">${S.notice ? failBox(S.notice) : ''}</div>`;
  const showErr = (msg) => { S.notice = msg; const n = $('#ac-notes'); if (n) n.innerHTML = failBox(msg); };
  const codesOf = (un) => S.codes.filter((c) => c.username === un);
  const when = (iso) => (iso ? fmtTime(iso) : '—');

  // ---------- opening a screen ----------
  async function load(extra) {
    const calls = [api('GET', '/nguoi-dung'), api('GET', '/danh-muc-quyen')];
    if (extra) calls.push(extra);
    const [u, c, x] = await Promise.all(calls);
    for (const r of [u, c, x]) if (r && !r.ok) return r;
    S.users = u.data.users || []; S.me = u.data.me || ''; S.invites = u.data.invites || []; S.codes = u.data.codes || [];
    S.cat = c.data.games || []; S.mcpUsers = c.data.mcpUsers || [];
    return { ok: true, extra: x ? x.data : null };
  }

  async function open(sys, draw, extra) {
    K.cleanupEditor();
    const mine = K.screen();
    K.setNav(sys);
    S.notice = '';
    app.innerHTML = `${header('users')}<main class="wrap"><p class="sh-hint" style="padding:40px 0">Đang tải…</p></main>`;
    const r = await load(extra);
    if (mine !== K.screen() || !K.me()) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = failBox(r.data.error || 'Không tải được.'); return; }
    redraw = () => { draw(r.extra); };
    draw(r.extra);
  }

  const busy = (on) => { const m = $('main'); if (m) m.classList.toggle('ac-busy', on); };
  const refocus = (id) => { const el = id && document.getElementById(id); if (el) el.focus(); };

  // one decision about one account; the answer carries the new account list
  async function manage(username, body, okMsg, focusId) {
    const mine = K.screen();
    busy(true);
    const r = await api('POST', '/nguoi-dung/' + encodeURIComponent(username), body);
    if (mine !== K.screen()) return r;
    busy(false);
    if (!r.ok) {
      if (r.status !== 401) { S.notice = r.data.error || 'Không thực hiện được.'; redraw(); refocus(focusId); }
      return r;
    }
    S.notice = '';
    S.users = r.data.users;
    if (okMsg) toast(okMsg);
    redraw();
    refocus(focusId);
    return r;
  }

  // ---------- picking rights: one block per game, used by the person sheet and by the invite form ----------
  // cur = the game's stored value: '*' (whole game), { part: [perms] } or nothing
  function blockHtml(g, cur, ns, withLegend) {
    const all = cur === '*';
    const held = (pid) => (cur && cur !== '*' && Array.isArray(cur[pid]) ? cur[pid] : []);
    const parts = g.parts.map((p) => `<div class="ac-pgroup"><h4>${esc(p.name)}</h4>${Object.keys(p.perms).map((k) => {
      const id = `${ns}-${g.id}-${p.id}-${k}`;
      return `<label for="${esc(id)}"><input type="checkbox" class="ac-cbx" id="${esc(id)}" data-p="${esc(p.id)}" data-k="${esc(k)}"${all || held(p.id).includes(k) ? ' checked' : ''}><span>${esc(p.perms[k])}</span></label>`;
    }).join('')}</div>`).join('');
    const none = g.parts.length ? '' : `<div class="sh-note ac-gap">${A.info}<div>${esc(g.name)} chưa bật phần nào, nên chỉ cấp được “Quản lý game”. Ai có quyền này sẽ có mọi quyền khi phần mới được bật.</div></div>`;
    return `<fieldset class="ac-gblock" data-g="${esc(g.id)}">${withLegend ? `<legend>${tile(g, 20)}<span>${esc(g.name)}</span></legend>` : ''}${none}${parts}
<label class="ac-allgame" for="${esc(ns + '-' + g.id + '-all')}"><input type="checkbox" class="ac-cbx" id="${esc(ns + '-' + g.id + '-all')}" data-all${all ? ' checked' : ''}><span><b>Quản lý game</b><small>Mọi quyền trong ${esc(g.name)}, kể cả phần bật sau. Không gồm quyền cấp quyền cho người khác.</small></span></label></fieldset>`;
  }

  // "Quản lý game" switches every box on; a permission that another ticked one already includes shows ticked and locked
  function syncBlock(fs) {
    const all = fs.querySelector('[data-all]');
    const boxes = $$('input[data-k]', fs);
    boxes.forEach((b) => { b.disabled = false; });
    if (all && all.checked) { boxes.forEach((b) => { b.checked = true; b.disabled = true; }); return; }
    const g = catGame(fs.getAttribute('data-g'));
    if (!g) return;
    for (const part of g.parts) {
      const mine = boxes.filter((b) => b.getAttribute('data-p') === part.id);
      const ticked = mine.filter((b) => b.checked).map((b) => b.getAttribute('data-k'));
      mine.forEach((b) => {
        const k = b.getAttribute('data-k');
        if (ticked.some((h) => h !== k && ((part.implies && part.implies[h]) || []).includes(k))) { b.checked = true; b.disabled = true; }
      });
    }
  }

  // '*', { part: [perms] } or null when nothing is ticked
  function collectBlock(fs) {
    if (fs.querySelector('[data-all]').checked) return '*';
    const parts = {};
    $$('input[data-k]', fs).forEach((b) => { if (b.checked && !b.disabled) (parts[b.getAttribute('data-p')] = parts[b.getAttribute('data-p')] || []).push(b.getAttribute('data-k')); });
    return Object.keys(parts).length ? parts : null;
  }

  // ---------- Phân quyền ----------
  const sortUsers = (list) => list.slice().sort((a, b) => (a.role === 'owner' ? 0 : 1) - (b.role === 'owner' ? 0 : 1) || String(a.name).localeCompare(String(b.name), 'vi'));

  function pendingCard() {
    const pend = S.users.filter((u) => u.role === 'pending');
    if (!pend.length) return '';
    return `<section class="sh-card ac-pending" aria-labelledby="pd-h"><div class="sh-card-h">${A.warn}<h2 id="pd-h">Tài khoản chờ duyệt</h2><span class="sh-badge sh-b-warn">${pend.length}</span></div><div class="sh-tbl-wrap"><table class="sh-table"><tbody>
${pend.map((u) => {
    const asked = hasGrants(u.wantGrants) ? grantItems(u.wantGrants) : [];
    const via = u.invitedBy ? `Vào bằng link mời của <b>${esc(u.invitedBy)}</b>` : 'Tự đăng ký';
    const ask = asked.length ? `<div class="ac-ask"><small>${u.invitedBy ? 'Link mời cho' : 'Xin'} quyền</small>${grantHtml(u.wantGrants)}</div>` : '<div class="ac-ask"><small>Chưa chọn quyền nào</small>Hãy chọn quyền khi duyệt.</div>';
    return `<tr><td>${person(u)}</td><td class="sh-muted">${via}<div class="sh-faint">${when(u.createdAt)}</div></td><td>${ask}</td>
<td><div class="sh-acts">${asked.length ? `<button type="button" class="sh-btn sh-btn-primary sh-btn-sm" data-ac="approve" data-u="${esc(u.username)}">Duyệt</button><button type="button" class="sh-btn sh-btn-sm" data-ac="sheet" data-u="${esc(u.username)}">Sửa quyền rồi duyệt</button>`
      : `<button type="button" class="sh-btn sh-btn-primary sh-btn-sm" data-ac="sheet" data-u="${esc(u.username)}">Chọn quyền và duyệt</button>`}<button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-ac="reject" data-u="${esc(u.username)}">Từ chối</button></div></td></tr>`;
  }).join('')}</tbody></table></div></section>`;
  }

  function viewPerm() {
    const right = `<div class="sh-seg" role="group" aria-label="Cách xem"><button type="button" aria-pressed="${S.mode === 'game'}" data-ac="mode" data-v="game">Theo game</button><button type="button" aria-pressed="${S.mode === 'person'}" data-ac="mode" data-v="person">Theo người</button></div>`;
    return pageHead('Chỉ Quản lý tổng', 'Phân quyền', 'Quyền đi theo game, rồi theo từng phần trong game. Ai không có quyền ở game nào thì không thấy game đó. Máy chủ cũng chặn, không chỉ ẩn nút.', right)
      + notes() + pendingCard() + (S.mode === 'game' ? permByGame() : permByPerson());
  }

  function permByGame() {
    const g = catGame(S.game) || S.cat[0];
    if (!g) return '<div class="sh-note">Chưa có game nào.</div>';
    S.game = g.id;
    const inGame = (u) => u.role === 'member' && u.grants && Object.hasOwn(u.grants, g.id);
    const ppl = S.users.filter((u) => u.role === 'owner').concat(sortUsers(S.users.filter(inGame)));
    const count = (x) => S.users.filter((u) => u.role === 'member' && u.grants && Object.hasOwn(u.grants, x.id)).length;
    const pick = `<div class="ac-gtabs" role="group" aria-label="Chọn game">${S.cat.map((x) => `<button type="button" class="ac-gtab" aria-pressed="${x.id === g.id}" data-ac="game" data-g="${esc(x.id)}">${tile(x, 28)}<span><b>${esc(x.name)}</b><small>${count(x)} người, ${x.parts.length ? x.parts.length + ' phần' : 'chưa bật phần nào'}</small></span></button>`).join('')}</div>`;
    const cols = g.parts.flatMap((p) => Object.keys(p.perms).map((k) => ({ p, k })));
    let t = `<table class="sh-table ac-matrix"><thead><tr><th rowspan="2" class="ac-vb">Người</th>${g.parts.map((p) => `<th class="ac-grp" colspan="${Object.keys(p.perms).length}">${esc(p.name)}</th>`).join('')}<th class="ac-grp ac-all ac-vb" rowspan="2">Quản lý<br>game</th><th rowspan="2"><span class="sh-sr">Thao tác</span></th></tr>
<tr>${cols.map((c) => `<th class="ac-sub" title="${esc(c.p.perms[c.k])}">${esc(short(c.p, c.k))}</th>`).join('')}</tr></thead><tbody>`;
    for (const u of ppl) {
      if (u.role === 'owner') {
        const mine = u.username === S.me;
        t += `<tr><td>${person(u, `<small class="sh-faint">${ROLE_WORDS}${mine ? ' (bạn)' : ''}</small>`)}</td>${cols.map(() => '<td class="ac-ck"><span class="ac-lock" title="Quản lý tổng luôn có mọi quyền">' + A.lock + '<span class="sh-sr">Luôn có</span></span></td>').join('')}<td class="ac-ck ac-all"><span class="ac-lock">${A.lock} Luôn có</span></td><td class="sh-faint ac-note">Khoá, không đổi được</td></tr>`;
        continue;
      }
      const gr = u.grants[g.id];
      const all = gr === '*';
      t += `<tr><td>${person(u, u.disabled ? '<small class="ac-warn">Đã khoá, không đăng nhập được</small>' : '')}</td>
${cols.map((c) => {
    const id = `pm-${u.username}-${c.p.id}-${c.k}`;
    const list = all ? Object.keys(c.p.perms) : closure(c.p, (gr && gr[c.p.id]) || []);
    const on = all || list.has(c.k);
    const stored = (gr && gr[c.p.id]) || [];
    // a permission another ticked one includes shows ticked and locked (untick the other one to change it)
    const implied = !all && on && stored.some((h) => h !== c.k && ((c.p.implies && c.p.implies[h]) || []).includes(c.k));
    return `<td class="ac-ck"><label class="ac-hit" for="${esc(id)}"><span class="sh-sr">${esc(short(c.p, c.k))}, ${esc(c.p.name)}, cho ${esc(u.name)}</span><input type="checkbox" class="ac-cbx" id="${esc(id)}" data-ac="tick" data-u="${esc(u.username)}" data-p="${esc(c.p.id)}" data-k="${esc(c.k)}"${on ? ' checked' : ''}${all || implied ? ' disabled' : ''}></label></td>`;
  }).join('')}
<td class="ac-ck ac-all"><label class="ac-hit" for="pm-${esc(u.username)}-all"><span class="sh-sr">Quản lý game cho ${esc(u.name)}</span><input type="checkbox" class="ac-cbx" id="pm-${esc(u.username)}-all" data-ac="allg" data-u="${esc(u.username)}"${all ? ' checked' : ''}></label></td>
<td><div class="sh-acts"><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm" data-ac="sheet" data-u="${esc(u.username)}">Sửa chi tiết</button><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-ac="bye" data-u="${esc(u.username)}">Bỏ khỏi game</button></div></td></tr>`;
    }
    t += '</tbody></table>';
    const others = sortUsers(S.users.filter((u) => u.role === 'member' && !(u.grants && Object.hasOwn(u.grants, g.id))));
    const add = `<div class="ac-addrow"><label for="addSel">Thêm người vào ${esc(g.name)}</label>
<select id="addSel" class="sh-select" data-ac="addSel"><option value="">Chọn tài khoản</option>${others.map((u) => `<option value="${esc(u.username)}"${S.addSel === u.username ? ' selected' : ''}>${esc(u.name)} (${esc(u.username)})</option>`).join('')}</select>
<button type="button" class="sh-btn" data-ac="addUser"${S.addSel ? '' : ' disabled'}>${A.plus} Thêm</button>
<span class="ac-sp sh-faint">Người chưa có tài khoản thì dùng</span><a class="sh-btn sh-btn-sm" href="#/link-moi/${esc(g.id)}">${A.link} Link mời</a></div>`;
    const empty = g.parts.length ? '' : `<div class="sh-note ac-gap" style="margin:var(--s4) var(--s5) 0">${A.info}<div>${esc(g.name)} chưa bật phần nào nên chỉ có cột <b>Quản lý game</b>. Ai được tick sẽ tự có mọi quyền khi bật phần mới.</div></div>`;
    return `${pick}<section class="sh-card" aria-labelledby="mx-h"><div class="sh-card-h">${tile(g, 24)}<h2 id="mx-h">${esc(g.name)}: ai được làm gì</h2><span class="sh-r sh-faint">Tick là lưu ngay, có ghi nhật ký</span></div>${empty}<div class="sh-tbl-wrap">${t}</div>${add}</section>
<p class="sh-hint ac-help">“Quản lý game” là mọi quyền trong game đó, <b>không</b> gồm cấp quyền cho người khác. Chỉ Quản lý tổng cấp quyền. Người cần ít nhất một quyền ở một game nào đó; muốn dừng hẳn thì dùng Khoá tài khoản.</p>`;
  }

  function permByPerson() {
    const rows = S.users.filter((u) => u.role !== 'pending').sort((a, b) => (a.role === 'owner' ? 0 : 1) - (b.role === 'owner' ? 0 : 1) || String(a.name).localeCompare(String(b.name), 'vi'));
    const cell = (u, g) => {
      if (u.role === 'owner') return `<span class="ac-lock">${A.lock} Mọi quyền</span>`;
      const v = u.grants && u.grants[g.id];
      if (!v) return '<span class="sh-faint">Không có</span>';
      if (v === '*') return '<span class="sh-badge sh-b-info">Quản lý game</span>';
      const it = grantItems({ [g.id]: v })[0];
      return it ? `<span class="ac-line">${esc(it.text)}</span>` : '<span class="sh-faint">Không có</span>';
    };
    const codeCell = (u) => {
      const cs = codesOf(u.username);
      if (!cs.length) return '<span class="sh-faint">Chưa có</span>';
      return cs.map((c) => `<div><span class="sh-mono">…${esc(c.hint)}</span>${c.scope === 'owner' ? ' <span class="sh-badge sh-b-danger">Mã chủ</span>' : ''}</div>`).join('');
    };
    return `<section class="sh-card"><div class="sh-tbl-wrap"><table class="sh-table ac-people"><thead><tr><th>Người</th>${S.cat.map((g) => `<th>${esc(g.name)}</th>`).join('')}<th>Mã cho Claude</th><th>Trạng thái</th><th class="t-r">Thao tác</th></tr></thead><tbody>
${rows.map((u) => {
    const self = u.username === S.me;
    const acts = self ? '<span class="ac-lock">' + A.lock + ' Tài khoản của bạn</span>'
      : `${u.role === 'owner' ? '' : `<button type="button" class="sh-btn sh-btn-sm" data-ac="sheet" data-u="${esc(u.username)}">Sửa quyền</button>`}${u.disabled
        ? `<button type="button" class="sh-btn sh-btn-sm" data-ac="unlock" data-u="${esc(u.username)}">Mở khoá</button>`
        : `<button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-ac="lock" data-u="${esc(u.username)}">Khoá</button>`}`;
    return `<tr data-u="${esc(u.username)}"><td>${person(u, u.invitedBy ? `<small class="sh-faint">qua link mời của ${esc(u.invitedBy)}</small>` : '')}</td>${S.cat.map((g) => `<td>${cell(u, g)}</td>`).join('')}<td>${codeCell(u)}</td><td>${statusBadge(u)}</td><td><div class="sh-acts">${acts}</div></td></tr>`;
  }).join('')}
</tbody></table></div></section>
<p class="sh-hint ac-help">Bấm “Sửa quyền” để mở từng game của một người. Khoá tài khoản thì người đó không đăng nhập được và mã Claude của họ ngừng chạy.</p>`;
  }

  // the sheet that opens one person: every game with its parts and permissions; for a waiting account it also approves
  function openSheet(username, focusGame) {
    const u = userOf(username);
    if (!u || u.role === 'owner') return;
    const pending = u.role === 'pending';
    const cur = pending ? (u.wantGrants || {}) : (u.grants || {});
    const asked = pending && hasGrants(u.wantGrants) ? `<div class="sh-note ac-gap">${A.info}<div><b>${u.invitedBy ? 'Link mời mang theo' : 'Quyền xin'}:</b>${grantHtml(u.wantGrants)}Đã tick sẵn bên dưới, bạn sửa được trước khi duyệt.</div></div>` : '';
    K.openOverlay(`<div class="ac-sheet" role="dialog" aria-modal="true" aria-labelledby="shT"><div class="ac-sheet-h"><div><h2 id="shT">${pending ? 'Duyệt ' : 'Quyền của '}${esc(u.name)}</h2><p><span class="sh-mono">${esc(u.username)}</span>${u.invitedBy ? ` · qua link mời của ${esc(u.invitedBy)}` : ''}</p></div><button type="button" class="sh-btn sh-btn-ghost sh-btn-icon" data-act="ovClose" aria-label="Đóng">${I.x}</button></div>
<form class="ac-sheet-b" id="ac-form" novalidate>${asked}${S.cat.map((g) => blockHtml(g, cur[g.id], 'sh', true)).join('')}<div class="sh-note danger" id="ac-err" role="alert" hidden>${A.warn}<div></div></div></form>
<div class="ac-sheet-f"><button type="button" class="sh-btn" data-act="ovClose">Hủy</button><button type="button" class="sh-btn sh-btn-primary" id="ac-save">${pending ? 'Duyệt và cấp quyền' : 'Lưu quyền'}</button></div></div>`);
    const el = $('#overlay').querySelector('[role="dialog"]');
    $$('fieldset[data-g]', el).forEach(syncBlock);
    el.addEventListener('change', (e) => { const fs = e.target.closest && e.target.closest('fieldset[data-g]'); if (fs) syncBlock(fs); });
    const first = el.querySelector(`fieldset[data-g="${focusGame || ''}"] input`);
    if (first) { first.scrollIntoView({ block: 'center' }); first.focus(); }
    $('#ac-save').addEventListener('click', async (e) => {
      const grants = {};
      $$('fieldset[data-g]', el).forEach((fs) => { const v = collectBlock(fs); if (v) grants[fs.getAttribute('data-g')] = v; });
      const err = $('#ac-err');
      if (!Object.keys(grants).length) { err.querySelector('div').textContent = 'Chọn ít nhất một quyền. Muốn dừng hẳn một tài khoản, hãy dùng Khoá.'; err.hidden = false; return; }
      err.hidden = true;
      e.target.disabled = true;
      const mine = K.screen();
      const r = await api('POST', '/nguoi-dung/' + encodeURIComponent(username), { action: pending ? 'duyet' : 'quyen', grants });
      if (mine !== K.screen()) return;
      if (!r.ok) { e.target.disabled = false; if (r.status !== 401) { err.querySelector('div').textContent = r.data.error || 'Không lưu được.'; err.hidden = false; } return; }
      K.closeOverlay();
      S.users = r.data.users; S.notice = '';
      toast(pending ? `Đã duyệt ${u.name}: ${grantPlain(grants)}` : `Đã lưu quyền của ${u.name}`);
      redraw();
    });
  }

  // ticking a box in the table saves at once
  async function tick(el) {
    const u = userOf(el.getAttribute('data-u'));
    const g = catGame(S.game);
    if (!u || !g) return;
    const next = cloneGrants(u.grants);
    if (el.hasAttribute('data-all') || el.getAttribute('data-ac') === 'allg') {
      if (el.checked) next[g.id] = '*';
      else {
        // "Quản lý game" off: every permission stays ticked one by one, so nobody loses anything by a stray click
        const obj = {};
        for (const p of g.parts) obj[p.id] = Object.keys(p.perms);
        if (Object.keys(obj).length) next[g.id] = obj; else delete next[g.id];
      }
    } else {
      const part = catPart(g.id, el.getAttribute('data-p'));
      const k = el.getAttribute('data-k');
      if (!part) return;
      const stored = next[g.id] && next[g.id] !== '*' ? (next[g.id][part.id] || []) : [];
      const eff = closure(part, stored);
      if (el.checked) eff.add(k); else eff.delete(k);
      const list = Object.keys(part.perms).filter((x) => eff.has(x));
      if (!next[g.id] || next[g.id] === '*') next[g.id] = {};
      if (list.length) next[g.id][part.id] = list; else delete next[g.id][part.id];
      if (!Object.keys(next[g.id]).length) delete next[g.id];
    }
    if (!Object.keys(next).length) {
      S.notice = `${u.name} sẽ không còn quyền nào. Muốn dừng hẳn một tài khoản, hãy dùng Khoá (ở “Theo người”).`;
      redraw();
      refocus(el.id);
      return;
    }
    await manage(u.username, { action: 'quyen', grants: next }, `Đã lưu quyền của ${u.name}`, el.id);
  }

  // ---------- Link mời ----------
  const INV = { game: '', cur: null };

  function inviteWords(gid, v) {
    const it = grantItems({ [gid]: v })[0];
    return it ? `<b>${esc(it.name)}</b>: ${esc(it.text)}` : '';
  }

  function viewInvite() {
    const g = catGame(INV.game) || S.cat[0];
    if (!g) return '<div class="sh-note">Chưa có game nào.</div>';
    INV.game = g.id;
    const form = `<section class="sh-card" aria-labelledby="iv-h"><div class="sh-card-h"><h2 id="iv-h">Tạo link mời</h2></div><div class="sh-card-b">
<fieldset class="ac-field"><legend class="ac-lbl">Game</legend><div class="ac-choice">${S.cat.map((x) => `<label><input type="radio" name="invg" value="${esc(x.id)}" data-ac="invGame"${x.id === g.id ? ' checked' : ''}>${tile(x, 22)}<span>${esc(x.name)}</span></label>`).join('')}</div></fieldset>
<fieldset class="ac-field"><legend class="ac-lbl">Phần và quyền</legend><div id="inv-block">${blockHtml(g, INV.cur, 'iv', false)}</div></fieldset>
<div class="ac-summary" id="inv-sum" aria-live="polite"></div>
<div class="ac-btnrow"><button type="button" class="sh-btn sh-btn-primary" id="inv-make" data-ac="mkInvite">Tạo link mời</button><span class="sh-faint">Dùng 1 lần, hết hạn sau 7 ngày</span></div></div></section>`;
    let right = '';
    if (fresh && fresh.kind === 'link') {
      right += `<section class="sh-card ac-fresh" aria-labelledby="ivr-h"><div class="sh-card-h"><h2 id="ivr-h">Link đã tạo</h2><span class="sh-r"><span class="sh-badge dot sh-b-ok">Chưa dùng</span></span></div><div class="sh-card-b">
<div class="ac-once"><p>${A.warn} Link chỉ hiện một lần này. Chép và gửi riêng cho người nhận.</p>
<div class="ac-linkbox"><code class="ac-secret" id="inv-link">${esc(fresh.url)}</code><button type="button" class="sh-btn" data-copy="${esc(fresh.url)}">${I.copy} Chép</button></div></div>
<dl class="ac-kv"><dt>Quyền</dt><dd>${fresh.words}</dd><dt>Dùng</dt><dd>1 lần</dd><dt>Hết hạn</dt><dd>${esc(fresh.exp)}</dd></dl>
<div class="sh-note warn" style="margin-top:var(--s4)">${A.warn}<div>Người nhận mở link, đặt tên và mật khẩu xong vẫn ở trạng thái <b>Chờ duyệt</b>. Họ chỉ vào được sau khi bạn bấm Duyệt ở <a href="#/nguoi-dung">Phân quyền</a>.</div></div></div></section>`;
    }
    right += `<section class="sh-card" aria-labelledby="ivl-h"><div class="sh-card-h"><h2 id="ivl-h">Link đang mở</h2><span class="sh-r sh-faint">${S.invites.length} link</span></div>${S.invites.length ? `<div class="sh-tbl-wrap"><table class="sh-table"><thead><tr><th>Quyền</th><th>Tạo bởi</th><th>Hết hạn</th><th><span class="sh-sr">Thao tác</span></th></tr></thead><tbody>
${S.invites.map((i) => `<tr><td class="ac-plain">${grantHtml(i.grants) || '<span class="sh-faint">Quyền cũ (Duyệt phiếu)</span>'}</td><td class="sh-muted">${esc(i.createdBy)}<div class="sh-faint">${when(i.createdAt)}</div></td><td class="sh-num sh-muted">${fmtTime(siteNowLocal(i.exp))}</td>
<td><div class="sh-acts"><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-ac="revokeInv" data-id="${esc(i.id)}">Huỷ link</button></div></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="sh-card-b sh-faint">Không có link mời nào đang chờ dùng.</div>'}</section>`;
    return `${pageHead('Chỉ Quản lý tổng', 'Link mời', 'Chọn game, phần và quyền. Link mang sẵn đúng quyền đó. Không mời được Quản lý tổng.')}${notes()}<div class="ac-two">${form}<div class="ac-stack">${right}</div></div>`;
  }

  function invSync() {
    const fs = $('#inv-block fieldset');
    if (!fs) return;
    syncBlock(fs);
    INV.cur = collectBlock(fs);
    const words = INV.cur ? inviteWords(INV.game, INV.cur) : '';
    $('#inv-sum').innerHTML = `${A.info}<div>${words ? `Người nhận sẽ có: ${words}.` : 'Chọn ít nhất một quyền.'}</div>`;
    $('#inv-make').disabled = !words;
  }

  // ---------- Mã cho Claude ----------
  const OWNER_CODE_MAX = 3;

  function onceBox(f) {
    return `<div class="ac-once"><p>${A.warn} ${esc(f.title)}. Chép và cất kỹ, rời khỏi trang là không xem lại được.</p><code class="ac-secret" id="fresh-code">${esc(f.value)}</code>
<div class="ac-btnrow"><button type="button" class="sh-btn sh-btn-primary" data-copy="${esc(f.value)}">${I.copy} Chép mã</button><button type="button" class="sh-btn" data-ac="hideFresh">Tôi đã chép, ẩn mã</button></div></div>`;
  }

  function viewCodes() {
    const mineOwner = S.codes.filter((c) => c.scope === 'owner' && c.username === S.me);
    const plain = S.codes.filter((c) => c.scope !== 'owner');
    const showOwnerOnce = fresh && fresh.kind === 'owner';
    const showCodeOnce = fresh && fresh.kind === 'code';
    const ownerRows = mineOwner.length ? `<div class="sh-tbl-wrap"><table class="sh-table ac-small"><thead><tr><th>Ghi chú</th><th>Mã</th><th>Tạo lúc</th><th>Dùng gần nhất</th><th><span class="sh-sr">Thao tác</span></th></tr></thead><tbody>
${mineOwner.map((c) => `<tr><td><b>${esc(c.label)}</b> <span class="sh-badge sh-b-danger">Mã chủ</span></td><td class="sh-mono">…${esc(c.hint)}</td><td class="sh-num sh-muted">${when(c.createdAt)}</td><td class="sh-num sh-muted">${c.lastUsedAt ? fmtTime(c.lastUsedAt) : 'Chưa dùng'}</td><td><div class="sh-acts"><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-ac="revokeCode" data-id="${esc(c.id)}">Thu hồi</button></div></td></tr>`).join('')}</tbody></table></div>` : '<p class="sh-faint" style="margin:var(--s4) 0">Chưa có mã Quản lý tổng nào đang dùng.</p>';
    const ownerCard = `<section class="sh-card ac-ownerkey" aria-labelledby="ok-h"><div class="sh-card-h">${A.key}<h2 id="ok-h">Mã Quản lý tổng</h2><span class="sh-badge sh-b-danger">Quyền mạnh nhất</span><span class="sh-r"><span class="sh-badge dot ${mineOwner.length ? 'sh-b-ok' : ''}">${mineOwner.length ? mineOwner.length + ' mã đang dùng' : 'Không có mã'}</span></span></div>
<div class="ac-okbody"><div><ul class="ac-rules">
<li>${A.warn}<span>Đây là <b>chìa khoá mạnh nhất</b>. Ai có mã này thì qua Claude cấp và thu quyền được cho mọi người, mọi game.</span></li>
<li>${A.warn}<span>Mã <b>chỉ hiện 1 lần</b> lúc tạo. Mất thì tạo mã mới và thu hồi mã cũ.</span></li>
<li>${A.warn}<span><b>Thu hồi được</b> bất cứ lúc nào, có tác dụng ngay. Mã chỉ chạy khi tài khoản của bạn còn là Quản lý tổng đang hoạt động.</span></li>
<li>${A.warn}<span><b>Không cấp được Quản lý tổng</b>. Claude không tự nâng ai, kể cả chính nó, lên bằng bạn.</span></li>
<li>${A.warn}<span>Mọi thao tác ghi vào nhật ký là <b>“${esc(S.me)} (Claude)”</b>; tối đa 20 thao tác ghi mỗi giờ cho mỗi mã.</span></li></ul></div>
<div><div class="ac-lbl">Claude làm được với mã này</div><div class="ac-chips"><span class="sh-badge outline">Xem danh sách game</span><span class="sh-badge outline">Xem quyền của mọi người</span><span class="sh-badge outline">Cấp quyền theo game, phần</span><span class="sh-badge outline">Thu quyền</span><span class="sh-badge outline">Tạo link mời</span></div>
<p class="ac-cannot">Không làm được: cấp Quản lý tổng, khoá hoặc xoá tài khoản, đổi mật khẩu.</p>
${showOwnerOnce ? onceBox(fresh) : ownerRows}
${showOwnerOnce ? '' : `<button type="button" class="sh-btn ${mineOwner.length ? '' : 'sh-btn-primary'}" data-ac="mkOwner"${mineOwner.length >= OWNER_CODE_MAX ? ' disabled' : ''}>Tạo mã Quản lý tổng</button>${mineOwner.length >= OWNER_CODE_MAX ? `<span class="sh-faint"> Đã đủ ${OWNER_CODE_MAX} mã, hãy thu hồi bớt.</span>` : ''}`}</div></div></section>`;
    const eligible = S.users.filter((u) => S.mcpUsers.includes(u.username) && !u.disabled);
    const make = eligible.length ? `<div class="ac-codemake"><label for="code-user" class="sh-sr">Tài khoản</label><select class="sh-select" id="code-user" aria-label="Tạo mã cho">${eligible.map((u) => `<option value="${esc(u.username)}">${esc(u.name)} (${esc(u.username)})</option>`).join('')}</select>
<label for="code-label" class="sh-sr">Ghi chú</label><input class="sh-input" id="code-label" maxlength="40" placeholder="Ghi chú, ví dụ: Claude máy nhà" autocomplete="off"><button type="button" class="sh-btn sh-btn-primary" data-ac="mkCode">Tạo mã</button></div>` : '<p class="sh-faint" style="padding:var(--s4) var(--s5);margin:0">Chưa có tài khoản nào đủ quyền dùng mã (Duyệt phiếu hoặc Quản lý tổng).</p>';
    const nameOf = (un) => (userOf(un) || { name: un }).name;
    const codesCard = `<section class="sh-card" aria-labelledby="cd-h"><div class="sh-card-h"><h2 id="cd-h">Mã của từng người</h2><span class="sh-r sh-faint">${plain.length} mã</span></div>${make}${showCodeOnce ? `<div style="padding:0 var(--s5)">${onceBox(fresh)}</div>` : ''}
<div class="sh-tbl-wrap"><table class="sh-table"><thead><tr><th>Người</th><th>Ghi chú</th><th>Mã</th><th>Làm được</th><th>Tạo lúc</th><th>Dùng gần nhất</th><th><span class="sh-sr">Thao tác</span></th></tr></thead><tbody>
${plain.map((c) => `<tr><td><b>${esc(nameOf(c.username))}</b><div class="sh-faint sh-mono">${esc(c.username)}</div></td><td>${esc(c.label)}</td><td class="sh-mono">…${esc(c.hint)}</td><td class="ac-plain">Xem phiếu, trả quà, từ chối phiếu<div class="sh-faint">Phiếu Bé Ngoan, 3Q Đại Chiến</div></td><td class="sh-num sh-muted">${when(c.createdAt)}</td><td class="sh-num sh-muted">${c.lastUsedAt ? fmtTime(c.lastUsedAt) : 'Chưa dùng'}</td>
<td><div class="sh-acts"><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-ac="revokeCode" data-id="${esc(c.id)}">Thu hồi</button></div></td></tr>`).join('') || '<tr class="sh-empty-tr"><td colspan="7" class="sh-empty-cell"><h3>Chưa có mã nào</h3><p>Tạo mã cho người Duyệt phiếu để Claude của họ xem và xử lý phiếu.</p></td></tr>'}
</tbody></table></div></section>`;
    return `${pageHead('Hệ thống', 'Mã cho Claude', 'Mỗi mã chỉ làm được đúng những gì tài khoản đó được làm. Khoá tài khoản hoặc thu quyền của người nào thì mã của họ mất tác dụng ngay.')}${notes()}${ownerCard}${codesCard}`;
  }

  // the owner code asks to be confirmed in words, because it is the strongest key there is
  function ownerDialog() {
    K.openOverlay(`<div class="sh-dlg" role="dialog" aria-modal="true" aria-labelledby="oc-t" aria-describedby="oc-b"><div class="sh-dlg-b"><h2 id="oc-t">Tạo mã Quản lý tổng?</h2>
<p id="oc-b">Ai giữ mã này thì qua Claude cấp và thu quyền được cho mọi người, mọi game, như chính bạn. Chỉ tạo khi bạn tự dùng nó và sẽ cất kỹ.</p>
<div class="ac-field" style="margin:var(--s4) 0 0"><label class="ac-lbl" for="oc-label">Ghi chú (để nhận ra mã)</label><input class="sh-input ac-wide" id="oc-label" maxlength="40" placeholder="Ví dụ: Claude máy nhà" autocomplete="off"></div>
<div class="ac-field" style="margin:var(--s3) 0 0"><label class="ac-lbl" for="oc-in">Gõ <b>${OWNER_CONFIRM}</b> để xác nhận</label><input class="sh-input ac-wide" id="oc-in" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
<div class="sh-note danger" id="oc-err" role="alert" hidden style="margin-top:var(--s3)">${A.warn}<div></div></div></div>
<div class="sh-dlg-f"><button type="button" class="sh-btn" data-act="ovClose">Thôi</button><button type="button" class="sh-btn sh-btn-danger" id="oc-ok" disabled>Tạo mã Quản lý tổng</button></div></div>`);
    const input = $('#oc-in'), ok = $('#oc-ok');
    input.focus();
    input.addEventListener('input', () => { ok.disabled = input.value.trim().toUpperCase() !== OWNER_CONFIRM; });
    ok.addEventListener('click', async () => {
      if (input.value.trim().toUpperCase() !== OWNER_CONFIRM) return;
      ok.disabled = true;
      const label = $('#oc-label').value;
      const r = await api('POST', '/ma-claude', { username: S.me, label, scope: 'owner' });
      if (!r.ok) { ok.disabled = false; if (r.status !== 401) { const e = $('#oc-err'); e.querySelector('div').textContent = r.data.error || 'Không tạo được mã.'; e.hidden = false; } return; }
      K.closeOverlay();
      S.invites = r.data.invites || []; S.codes = r.data.codes || [];
      fresh = { kind: 'owner', title: 'Mã Quản lý tổng, chỉ hiện một lần này', value: r.data.code };
      redraw();
    });
  }

  // ---------- Nhật ký ----------
  const logWho = (l) => String(l.ai || '').replace(/ \(Claude\)$/, '');
  function logWhat(l) {
    const word = LOG_WORDS[l.viec] || l.viec || '';
    const obj = l.doiTuong ? ` <b>${esc(l.doiTuong)}</b>` : '';
    let more = '';
    if (l.viec === 'tao-ma' && l.sau && l.sau.scope === 'owner') more = ' <span class="sh-badge sh-b-danger">Mã chủ</span>';
    const after = l.sau && typeof l.sau === 'object' && !Array.isArray(l.sau) && l.sau.scope === undefined ? grantPlain(l.sau) : '';
    const before = l.truoc && typeof l.truoc === 'object' ? grantPlain(l.truoc) : '';
    const detail = after || before ? `<div class="ac-logd">${before ? `Trước: ${esc(before)}. ` : ''}${after ? `Sau: ${esc(after)}.` : ''}</div>` : '';
    return `${esc(word)}${obj}${more}${detail}`;
  }

  function viewLog(data) {
    const items = data.items || [];
    const rows = items.filter((l) => S.logFilter === 'all' || l.qua === 'claude');
    const nClaude = items.filter((l) => l.qua === 'claude').length;
    const right = `<div class="sh-seg" role="group" aria-label="Lọc nhật ký"><button type="button" aria-pressed="${S.logFilter === 'all'}" data-ac="logF" data-v="all">Tất cả<span class="n sh-num">${items.length}</span></button><button type="button" aria-pressed="${S.logFilter === 'claude'}" data-ac="logF" data-v="claude">Qua Claude<span class="n sh-num">${nClaude}</span></button></div>`;
    return `${pageHead('Hệ thống', 'Nhật ký', 'Mọi thay đổi quyền, duyệt hay từ chối tài khoản, link mời và mã Claude. Dòng có nhãn <span class="sh-badge sh-b-info">Claude</span> là làm qua mã Claude. 50 dòng mỗi trang, mới nhất ở trên.', right)}${notes()}
<section class="sh-card"><div class="sh-tbl-wrap"><table class="sh-table ac-log"><thead><tr><th>Lúc</th><th>Ai</th><th>Qua</th><th>Việc</th></tr></thead><tbody>
${rows.map((l) => `<tr><td class="sh-num sh-muted nowrap">${fmtTime(l.luc)}</td><td><b>${esc(logWho(l))}</b></td><td>${l.qua === 'claude' ? '<span class="sh-badge sh-b-info" title="Làm qua mã Claude">Claude</span>' : '<span class="sh-badge outline">Web</span>'}</td><td>${logWhat(l)}</td></tr>`).join('')
    || `<tr class="sh-empty-tr"><td colspan="4" class="sh-empty-cell"><h3>${items.length ? 'Không có dòng nào qua Claude trong trang này' : 'Chưa có thay đổi nào được ghi'}</h3><p>${items.length ? 'Chọn “Tất cả” để xem lại.' : 'Mỗi lần cấp, thu hay đổi quyền sẽ hiện ở đây.'}</p></td></tr>`}
</tbody></table></div>
<div class="pt-pager ac-pager"><span>Trang ${data.page}</span><span class="sh-acts"><button type="button" class="sh-btn sh-btn-sm" data-ac="logPage" data-p="${data.page - 1}"${data.page > 1 ? '' : ' disabled'}>Mới hơn</button><button type="button" class="sh-btn sh-btn-sm" data-ac="logPage" data-p="${data.page + 1}"${data.more ? '' : ' disabled'}>Cũ hơn</button></span></div></section>`;
  }

  // ---------- events: one handler per kind, caught on <main> so a redraw loses none ----------
  async function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-ac]');
    if (!b || b.tagName === 'SELECT' || b.type === 'checkbox' || b.type === 'radio') return;
    const ac = b.getAttribute('data-ac');
    const un = b.getAttribute('data-u');
    const u = un ? userOf(un) : null;
    switch (ac) {
      case 'mode': S.mode = b.getAttribute('data-v'); S.notice = ''; redraw(); break;
      case 'game': S.game = b.getAttribute('data-g'); S.addSel = ''; S.notice = ''; redraw(); break;
      case 'sheet': openSheet(un, S.mode === 'game' ? S.game : ''); break;
      case 'addUser': if (S.addSel) { const who = S.addSel; S.addSel = ''; openSheet(who, S.game); } break;
      case 'approve': if (u) manage(un, { action: 'duyet' }, `Đã duyệt ${u.name}: ${grantPlain(u.wantGrants)}`); break;
      case 'reject': if (u && armDelete(b, null, 'Bấm lần nữa để từ chối')) manage(un, { action: 'tu-choi' }, `Đã từ chối ${u.name}`); break;
      case 'lock': if (u && armDelete(b, null, 'Bấm lần nữa để khoá')) manage(un, { action: 'khoa' }, `Đã khoá ${u.name}`); break;
      case 'unlock': if (u) manage(un, { action: 'mo-khoa' }, `Đã mở khoá ${u.name}`); break;
      case 'bye': {
        if (!u || !armDelete(b, null, 'Bấm lần nữa để bỏ')) break;
        const next = cloneGrants(u.grants);
        delete next[S.game];
        if (!Object.keys(next).length) { S.notice = `${u.name} chỉ còn quyền ở game này. Muốn dừng hẳn một tài khoản, hãy dùng Khoá (ở “Theo người”).`; redraw(); break; }
        manage(un, { action: 'quyen', grants: next }, `Đã bỏ ${u.name} khỏi ${(catGame(S.game) || {}).name}`);
        break;
      }
      case 'mkInvite': {
        if (!INV.cur) break;
        b.disabled = true;
        const r = await api('POST', '/loi-moi', { grants: { [INV.game]: INV.cur } });
        if (!r.ok) { b.disabled = false; if (r.status !== 401) { S.notice = r.data.error || 'Không tạo được link.'; redraw(); } break; }
        S.invites = r.data.invites || []; S.codes = r.data.codes || []; S.notice = '';
        const mine = S.invites[S.invites.length - 1];
        fresh = { kind: 'link', url: `${location.origin}/quan-tri/moi#${r.data.token}`, words: inviteWords(INV.game, INV.cur), exp: mine ? fmtTime(siteNowLocal(mine.exp)) : '7 ngày' };
        redraw();
        break;
      }
      case 'revokeInv': {
        if (!armDelete(b, null, 'Bấm lần nữa để huỷ')) break;
        const r = await api('POST', `/loi-moi/${b.getAttribute('data-id')}/huy`, {});
        if (!r.ok) { if (r.status !== 401) { S.notice = r.data.error || 'Không huỷ được.'; redraw(); } break; }
        S.invites = r.data.invites || []; S.codes = r.data.codes || []; S.notice = '';
        toast('Đã huỷ link mời');
        redraw();
        break;
      }
      case 'mkCode': {
        b.disabled = true;
        const r = await api('POST', '/ma-claude', { username: $('#code-user').value, label: $('#code-label').value });
        if (!r.ok) { b.disabled = false; if (r.status !== 401) { S.notice = r.data.error || 'Không tạo được mã.'; redraw(); } break; }
        S.invites = r.data.invites || []; S.codes = r.data.codes || []; S.notice = '';
        fresh = { kind: 'code', title: `Mã cho ${(userOf($('#code-user') ? $('#code-user').value : '') || { name: 'người này' }).name}, chỉ hiện một lần này`, value: r.data.code };
        redraw();
        break;
      }
      case 'revokeCode': {
        if (!armDelete(b, null, 'Bấm lần nữa để thu hồi')) break;
        const r = await api('POST', `/ma-claude/${b.getAttribute('data-id')}/thu-hoi`, {});
        if (!r.ok) { if (r.status !== 401) { S.notice = r.data.error || 'Không thu hồi được.'; redraw(); } break; }
        S.invites = r.data.invites || []; S.codes = r.data.codes || []; S.notice = '';
        toast('Đã thu hồi mã');
        redraw();
        break;
      }
      case 'hideFresh': fresh = null; redraw(); break;
      case 'mkOwner': ownerDialog(); break;
      case 'logF': S.logFilter = b.getAttribute('data-v'); redraw(); break;
      case 'logPage': renderLog(Number(b.getAttribute('data-p'))); break;
      default:
    }
  }

  function onChange(e) {
    const t = e.target;
    const ac = t.getAttribute && t.getAttribute('data-ac');
    if (ac === 'tick' || ac === 'allg') tick(t);
    else if (ac === 'addSel') { S.addSel = t.value; redraw(); refocus('addSel'); }
    else if (ac === 'invGame') { INV.game = t.value; INV.cur = null; redraw(); }
    else if (t.closest && t.closest('#inv-block')) invSync();
  }

  function bind() {
    const m = $('main');
    m.onclick = onClick;
    m.onchange = onChange;
  }

  // ---------- the screens ----------
  const paint = (html, after) => { $('main').innerHTML = html; bind(); if (after) after(); };

  function renderPerm(gid) {
    fresh = null;
    if (gid) { S.mode = 'game'; S.game = gid; }
    open('perm', () => paint(viewPerm()));
  }

  function renderInvites(gid) {
    fresh = null;
    if (gid) INV.game = gid;
    open('invite', () => paint(viewInvite(), invSync));
  }

  function renderCodes() {
    fresh = null;
    open('codes', () => paint(viewCodes()));
  }

  function renderLog(page) {
    fresh = null;
    const p = Number.isInteger(page) && page >= 1 ? page : 1;
    S.logFilter = 'all';
    open('log', (data) => paint(viewLog(data)), api('GET', '/nhat-ky?trang=' + p));
  }

  return { renderPerm, renderInvites, renderCodes, renderLog };
}
