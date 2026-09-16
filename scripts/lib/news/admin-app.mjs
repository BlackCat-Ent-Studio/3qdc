// admin-app.mjs — the browser side of /quan-tri: sign-in, set password, article list and article editor.
// adminApp is serialised into the page (never run on the server). It talks only to /quan-tri/api/*; the server re-checks
// every permission and cleans every article, so nothing here is a security boundary — it only keeps the screens honest.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminApp() {
  const DATA = JSON.parse(document.getElementById('adm-data').textContent);
  const CATS = DATA.cats, LIB = DATA.library, HOST = DATA.host, LOGO = DATA.logo, ROLES = DATA.roles;
  const app = document.getElementById('app');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || '';
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

  function header() {
    return `<header class="adm-h"><div class="wrap"><a href="#/" class="adm-logo"><img src="${esc(LOGO)}" alt="3Q Đại Chiến"></a><span class="ttl">Quản trị tin tức</span>
<div class="who">${avatar(me.name)}<span><b>${esc(me.name)}</b> · ${esc(ROLES[me.role] || me.role)}</span>
<a class="btn btn-ghost btn-sm" href="/tin-tuc" target="_blank" rel="noopener">Xem trang tin</a><button type="button" class="btn btn-ghost btn-sm" id="logout">Đăng xuất</button></div></div></header>`;
  }
  function bindHeader() {
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
    app.innerHTML = `<main class="auth"><div class="auth-box"><img src="${esc(LOGO)}" alt="3Q Đại Chiến" class="auth-logo">${inner}</div></main>`;
  }

  function renderLogin(notice) {
    authShell(`<h1>Quản trị tin tức</h1><p class="meta">Đăng nhập để viết và đăng bài.</p>
<form id="login" novalidate>
<div class="field"><label for="l-user">Tên đăng nhập</label><input class="inp" id="l-user" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
<div class="field"><label for="l-pass">Mật khẩu</label><input class="inp" id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
<div class="err" id="l-err" role="alert"${notice ? '' : ' hidden'}>${esc(notice || '')}</div>
<button class="btn btn-fire auth-btn" type="submit">Đăng nhập</button>
<p class="meta small">Quên mật khẩu: nhờ người quản trị máy chủ cấp link đặt lại.</p>
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
      me = r.data.user;
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

  // ---------- article list ----------
  const listView = { state: 'all', cat: 'all' };

  async function renderList() {
    cleanupEditor();
    const mine = screen;
    app.innerHTML = `${header()}<main class="wrap"><p class="meta" style="padding:40px 0">Đang tải danh sách bài…</p></main>`;
    bindHeader();
    const r = await api('GET', '/bai');
    if (mine !== screen || !me) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="err" style="margin:40px 0">${esc(r.data.error)}</div>`; return; }
    const posts = r.data.items;
    const draw = () => {
      const rows = posts.filter((p) => (listView.state === 'all' || stateOf(p) === listView.state) && (listView.cat === 'all' || p.category === listView.cat))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      const n = (s) => posts.filter((p) => s === 'all' || stateOf(p) === s).length;
      const hint = me.role === 'manager'
        ? 'Bài Biên tập gửi lên nằm ở mục <b>Chờ duyệt</b>: mở bài, đăng hoặc trả lại kèm ghi chú.'
        : 'Viết xong bấm <b>Gửi duyệt</b> — Quản lý sẽ xem và đăng. Bài đã gửi thì rút về nháp mới sửa được.';
      $('main').innerHTML = `<div class="adm-top"><div><h1>Bài viết</h1><p>${hint}</p></div><a class="btn btn-fire" href="#/viet-bai">+ Viết bài mới</a></div>
<div class="filters">${['all', 'published', 'scheduled', 'pending', 'draft'].map((s) => `<button type="button" class="tab${listView.state === s ? ' on' : ''}" data-st="${s}">${s === 'all' ? 'Tất cả' : STATE[s]}<small>${n(s)}</small></button>`).join('')}
<select id="fcat" aria-label="Lọc theo mục"><option value="all">Mọi mục</option>${CATS.map((c) => `<option value="${c.id}"${listView.cat === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
<div class="tbl-wrap"><table class="posts"><thead><tr><th>Bài viết</th><th>Mục</th><th>Trạng thái</th><th>Người viết</th><th>Sửa lần cuối</th><th></th></tr></thead><tbody>
${rows.map((p) => {
    const st = stateOf(p);
    const canEdit = me.role === 'manager' || p.status === 'draft';
    return `<tr data-id="${p.id}">
<td><div class="p-title">${p.cover ? `<img class="cover" src="${esc(p.cover)}" alt="" loading="lazy">` : '<div class="cover"></div>'}<div><b>${esc(p.title)}</b><small>/tin-tuc/${esc(p.slug)}</small>${p.pinned ? ' <span class="pin">Ghim</span>' : ''}${p.lockedBy ? `<div class="lock">● ${esc(p.lockedBy)} đang sửa bài này</div>` : ''}${p.status === 'draft' && p.reviewNote ? `<div class="lock">↩ Trả lại: ${esc(p.reviewNote)}</div>` : ''}</div></div></td>
<td><span class="chip c-${esc(p.category)}">${esc(catName(p.category))}</span></td>
<td><span class="pill s-${st}">${STATE[st]}</span>${st === 'scheduled' || st === 'published' ? `<div class="meta" style="margin-top:4px">${fmtTime(p.publishAt)}</div>` : ''}</td>
<td><div class="person">${avatar(p.author)}${esc(p.author)}</div></td>
<td class="meta">${fmtTime(p.updatedAt)}<br>bởi ${esc(p.updatedBy)}</td>
<td><div class="acts"><a class="btn btn-ghost btn-sm" href="#/sua/${p.id}">${canEdit ? 'Sửa' : 'Mở'}</a><a class="btn btn-ghost btn-sm" href="/quan-tri/xem-truoc/${p.id}" target="_blank">Xem</a></div></td></tr>`;
  }).join('')}
${rows.length ? '' : `<tr><td colspan="6" class="meta" style="text-align:center;padding:30px">${posts.length ? 'Không có bài nào khớp bộ lọc.' : 'Chưa có bài nào. Bấm “Viết bài mới” để bắt đầu.'}</td></tr>`}
</tbody></table></div>`;
      $$('[data-st]').forEach((b) => b.addEventListener('click', () => { listView.state = b.getAttribute('data-st'); draw(); }));
      $('#fcat').addEventListener('change', (e) => { listView.cat = e.target.value; draw(); });
    };
    draw();
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
<div class="field" style="margin-top:-8px"><div class="slug"><span>${esc(HOST)}/tin-tuc/</span><input id="e-slug" value="${esc(p.slug)}" aria-label="Đường dẫn bài" placeholder="tu-dong-tao-tu-tieu-de" maxlength="80" spellcheck="false"></div></div>
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
<div class="box"><h3>Mục</h3><div class="cats">${CATS.map((c) => `<label class="c-${c.id}"><input type="radio" name="e-cat" value="${c.id}"${p.category === c.id ? ' checked' : ''}${editable ? '' : ' disabled'}><span>${esc(c.name)}</span></label>`).join('')}</div></div>
<div class="box"><h3>Ảnh bìa</h3>
<img class="cover" id="e-cover" src="${esc(p.cover)}" alt=""${p.cover ? '' : ' hidden'}>
${editable ? `<div class="lib">${LIB.map((src) => `<img src="${esc(src)}" data-cover="${esc(src)}" class="${p.cover === src ? 'on' : ''}" alt="Ảnh thư viện" tabindex="0" loading="lazy">`).join('')}</div>
<p class="meta small" style="margin:8px 0 0">Tải ảnh riêng lên: sắp có. Tạm thời chọn ảnh trong thư viện.</p>` : ''}
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
    const collect = () => ({
      title: title.value.trim(), slug: slug.value || slugify(title.value), summary: sum.value.trim(), content: body.innerHTML,
      category: cat(), cover: p.cover || '', pinned: !!($('#e-pin') && $('#e-pin').checked),
    });
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
          pop.innerHTML = `<div class="pop"><span class="meta">Bấm ảnh để chèn vào vị trí con trỏ:</span>${LIB.map((src) => `<img src="${esc(src)}" data-put="${esc(src)}" alt="" loading="lazy">`).join('')}</div>`;
          $$('[data-put]', pop).forEach((x) => {
            noSteal(x);
            x.addEventListener('click', () => { insertBlock(`<figure><img src="${esc(x.getAttribute('data-put'))}" alt=""><figcaption>Chú thích ảnh…</figcaption></figure>`); closePop(); });
          });
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
    // preview: the saved article on its real page; unsaved changes are saved first unless that would change the live site
    $('#e-prev').addEventListener('click', async () => {
      err.hidden = true;
      if (!title.value.trim()) return showErr('Nhập tiêu đề để xem trước.');
      const win = window.open('', '_blank');
      let target = post;
      if (!post || dirty()) {
        if (live || st === 'scheduled') {
          toast('Đang xem bản đã lưu — thay đổi chưa lưu không có trong bản xem trước');
        } else {
          target = await act('luu');
        }
      }
      if (!target) { if (win) win.close(); return; }
      if (win) win.location.href = '/quan-tri/xem-truoc/' + target.id; else location.href = '/quan-tri/xem-truoc/' + target.id;
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
    if (h === '/viet-bai') renderEditor(null);
    else if ((m = h.match(/^\/sua\/(\d+)$/))) renderEditor(+m[1]);
    else renderList();
    lastHash = location.hash;
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', () => {
    // a new set-password link pasted into the same tab: show the form for that token
    if (location.pathname.indexOf('/quan-tri/dat-mat-khau') === 0) { if (location.hash.length > 1) renderSetPassword(); return; }
    if (dirty() && !window.confirm('Bài đang có thay đổi chưa lưu. Rời trang này?')) {
      try { history.replaceState(null, '', lastHash || '#/'); } catch (e) { /* ignore */ }
      return;
    }
    route();
  });
  window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('pagehide', () => { if (leaving) { const f = leaving; leaving = null; f(); } });

  (async function boot() {
    if (location.pathname.replace(/\/+$/, '') === '/quan-tri/dat-mat-khau') return renderSetPassword();
    const r = await api('GET', '/toi');
    if (r.ok) { me = r.data.user; route(); } else if (r.status !== 401) renderLogin(r.data.error);
  })();
}
