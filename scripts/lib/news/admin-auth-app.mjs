// admin-auth-app.mjs — the browser side of the pages for people who are not signed in: sign in, register, set a password
// (one-time link) and accept an invite (/quan-tri/moi). Like adminParts it is serialised into the page next to adminApp (never
// run on the server) and receives the frame's helpers as K. The look is the neutral "Quản trị" one, no game's logo.
// It talks only to /quan-tri/api/*; the server decides everything (limits, who may sign in), so nothing here is a security
// boundary — it only checks what it can before sending.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminAuth(K) {
  const { $, esc, api, app, I, fmtTime, siteNowLocal, tile } = K;
  const ic = K.svgIcon;
  const A = {
    warn: ic('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  };
  const USER_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
  const USER_MSG = 'Tên đăng nhập 3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới; bắt đầu bằng chữ hoặc số.';
  const USER_HINT = '3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang, gạch dưới.';
  const PASS_HINT = 'Ít nhất 10 ký tự — nên là một câu dễ nhớ.';

  // the page of every screen here: brand at the top left, the light / dark button at the right, the box in the middle
  function shell(inner) {
    K.cleanupEditor();
    app.innerHTML = `<div class="au"><header class="au-top"><span class="au-brand"><span class="au-mark" aria-hidden="true">W</span><span><b>Quản trị</b><small>wanmeivn.com</small></span></span>${K.themeButton()}</header>
<main class="au-mid">${inner}</main><p class="au-foot">Trang dành cho người được cấp quyền quản trị.</p></div>`;
  }

  const field = (id, label, o = {}) => `<div class="au-field"><label for="${id}">${label}</label><input class="au-input" id="${id}"${o.type ? ` type="${o.type}"` : ''}${o.ac ? ` autocomplete="${o.ac}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.user ? ' autocapitalize="none" spellcheck="false"' : ''}${o.min ? ` minlength="${o.min}"` : ''}${o.hint ? ` aria-describedby="${id}-h"` : ''} required>${o.hint ? `<div class="au-hint" id="${id}-h">${o.hint}</div>` : ''}</div>`;
  const alertBox = (id, msg) => `<div class="au-alert" id="${id}" role="alert"${msg ? '' : ' hidden'}>${A.warn}<span>${esc(msg || '')}</span></div>`;
  function say(errId, msg, focusId) {
    const b = $('#' + errId);
    b.querySelector('span').textContent = msg;
    b.hidden = false;
    document.querySelectorAll('.au-input').forEach((x) => x.removeAttribute('aria-invalid'));
    if (focusId) { const f = $('#' + focusId); f.setAttribute('aria-invalid', 'true'); f.focus(); }
  }
  const done = (wait, title, body, btn) => `<div class="au-box au-done" role="status"><div class="au-doneic${wait ? ' wait' : ''}">${wait ? A.clock : A.check}</div><h1>${title}</h1>${body}<a class="au-btn au-go" href="/quan-tri">${btn}</a></div>`;

  // a new account's fields are checked here first so most slips never cost a round trip
  function checkNew(username, name, a, b, errId, ids) {
    if (!USER_RE.test(username)) return say(errId, USER_MSG, ids[0]), false;
    if (!name) return say(errId, 'Nhập tên hiển thị.', ids[1]), false;
    if (a.length < 10) return say(errId, 'Mật khẩu cần ít nhất 10 ký tự.', ids[2]), false;
    if (a !== b) return say(errId, 'Hai lần nhập mật khẩu không giống nhau.', ids[3]), false;
    return true;
  }

  function renderLogin(notice) {
    shell(`<div class="au-box"><h1>Đăng nhập</h1><p class="au-lead">Đăng nhập để làm việc với các game và phần bạn được cấp quyền.</p>
<form id="login" novalidate>${field('l-user', 'Tên đăng nhập', { ac: 'username', user: true })}${field('l-pass', 'Mật khẩu', { type: 'password', ac: 'current-password' })}
${alertBox('l-err', notice)}<button class="au-btn au-go" type="submit">Đăng nhập</button></form>
<p class="au-alt">Chưa có tài khoản? <a href="/quan-tri/dang-ky">Đăng ký</a></p><p class="au-small">Quên mật khẩu: liên hệ Quản lý tổng để được cấp link đặt lại.</p></div>`);
    $('#l-user').focus();
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      $('#l-err').hidden = true;
      btn.disabled = true; btn.textContent = 'Đang đăng nhập…';
      const r = await api('POST', '/dang-nhap', { username: $('#l-user').value, password: $('#l-pass').value });
      btn.disabled = false; btn.textContent = 'Đăng nhập';
      if (!r.ok) { say('l-err', r.data.error || 'Không đăng nhập được.', 'l-pass'); $('#l-pass').select(); return; }
      const t = await K.loadMe();
      if (!t.ok) { if (t.status !== 401) say('l-err', t.data.error || 'Không đăng nhập được.'); return; }
      K.route();
    });
  }

  function renderSetPassword() {
    // the one-time token is in the # part of the link; take it and clear it from the address bar and history
    const token = location.hash.replace(/^#/, '');
    try { history.replaceState(null, '', '/quan-tri/dat-mat-khau'); } catch (e) { /* keep going */ }
    shell(`<div class="au-box"><h1>Đặt mật khẩu</h1><p class="au-lead">Link này dùng được một lần trong 30 phút. Mật khẩu ít nhất 10 ký tự — nên là một câu dễ nhớ.</p>
<form id="setpw" novalidate>${field('s-pass', 'Mật khẩu mới', { type: 'password', ac: 'new-password', min: 10 })}${field('s-pass2', 'Nhập lại mật khẩu', { type: 'password', ac: 'new-password', min: 10 })}
${alertBox('s-err')}<button class="au-btn au-go" type="submit">Lưu mật khẩu</button></form></div>`);
    if (!token) say('s-err', 'Link thiếu mã. Hãy mở đúng link được gửi cho bạn.');
    $('#s-pass').focus();
    $('#setpw').addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = $('#s-pass').value, b = $('#s-pass2').value;
      $('#s-err').hidden = true;
      if (a.length < 10) return say('s-err', 'Mật khẩu cần ít nhất 10 ký tự.', 's-pass');
      if (a !== b) return say('s-err', 'Hai lần nhập không giống nhau.', 's-pass2');
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      const r = await api('POST', '/dat-mat-khau', { token, password: a });
      btn.disabled = false;
      if (!r.ok) return say('s-err', r.data.error || 'Không đặt được mật khẩu.');
      shell(done(false, 'Đã đặt mật khẩu', `<p>Tài khoản <b>${esc(r.data.user.username)}</b> (${esc(r.data.user.name)}) đã sẵn sàng.</p>`, 'Đăng nhập'));
      $('.au-go').focus();
    });
  }

  // Registration: the account waits for an owner's approval before it can sign in.
  function renderRegister() {
    shell(`<div class="au-box"><h1>Đăng ký</h1><p class="au-lead">Tài khoản mới cần <b>Quản lý tổng duyệt</b> trước khi đăng nhập được.</p>
<form id="reg" novalidate>${field('r-user', 'Tên đăng nhập', { ac: 'username', user: true, max: 32, hint: USER_HINT })}${field('r-name', 'Tên hiển thị', { ac: 'name', max: 60, hint: 'Hiện dưới bài viết: “Đăng bởi …”.' })}
${field('r-pass', 'Mật khẩu', { type: 'password', ac: 'new-password', min: 10, hint: PASS_HINT })}${field('r-pass2', 'Nhập lại mật khẩu', { type: 'password', ac: 'new-password', min: 10 })}
${alertBox('r-err')}<button class="au-btn au-go" type="submit">Đăng ký</button></form>
<p class="au-alt">Đã có tài khoản? <a href="/quan-tri">Đăng nhập</a></p></div>`);
    $('#r-user').focus();
    $('#r-user').addEventListener('change', (e) => { e.target.value = e.target.value.trim().toLowerCase(); });
    $('#reg').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $('#r-user').value.trim().toLowerCase();
      const name = $('#r-name').value.trim();
      $('#r-err').hidden = true;
      if (!checkNew(username, name, $('#r-pass').value, $('#r-pass2').value, 'r-err', ['r-user', 'r-name', 'r-pass', 'r-pass2'])) return;
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Đang gửi…';
      const r = await api('POST', '/dang-ky', { username, name, password: $('#r-pass').value });
      btn.disabled = false; btn.textContent = 'Đăng ký';
      if (!r.ok) return say('r-err', r.data.error || 'Không đăng ký được.');
      shell(done(true, 'Đã gửi đăng ký', `<p>Tài khoản <b>${esc(r.data.user.username)}</b> (${esc(r.data.user.name)}) đang <b>chờ Quản lý tổng duyệt</b>.</p>
<p>Khi được duyệt, bạn đăng nhập bằng tên đăng nhập và mật khẩu vừa tạo. Hãy báo Quản lý tổng tên đăng nhập của bạn để được duyệt nhanh.</p>`, 'Về trang đăng nhập'));
      $('.au-go').focus();
    });
  }

  // "Tin tức: Viết bài; Phiếu Bé Ngoan: Duyệt phiếu", or "Quản lý game"
  const gameText = (g) => (g.all ? 'Quản lý game' : g.parts.map((p) => `${p.name}: ${p.perms.join(', ')}`).join('; '));

  // A manager's invite link (/quan-tri/moi#<token>): the page first shows what the link carries (game and rights), then the
  // person picks a name and password; the account then waits for an owner's approval with those rights preselected.
  // The token is taken from the # part and cleared from the address bar.
  function renderAcceptInvite() {
    const token = location.hash.replace(/^#/, '');
    try { history.replaceState(null, '', '/quan-tri/moi'); } catch (e) { /* keep going */ }
    shell(`<div class="au-box"><h1>Nhận lời mời</h1><p class="au-lead">Tạo tài khoản rồi chờ <b>Quản lý tổng duyệt</b> là đăng nhập được. Link chỉ dùng được một lần.</p>
<div id="i-card"></div>
<form id="inv" novalidate>${field('i-user', 'Tên đăng nhập', { ac: 'username', user: true, max: 32, hint: USER_HINT })}${field('i-name', 'Tên hiển thị', { ac: 'name', max: 60 })}
${field('i-pass', 'Mật khẩu', { type: 'password', ac: 'new-password', min: 10, hint: PASS_HINT })}${field('i-pass2', 'Nhập lại mật khẩu', { type: 'password', ac: 'new-password', min: 10 })}
${alertBox('i-err')}<button class="au-btn au-go" type="submit">Tạo tài khoản</button></form></div>`);
    let carried = ''; // the rights of the link in words, for the screen after sign-up
    const noToken = 'Link thiếu mã. Hãy mở đúng link Quản lý tổng gửi cho bạn.';
    if (!token) say('i-err', noToken);
    else {
      api('POST', '/xem-loi-moi', { token }).then((r) => {
        if (!$('#i-card')) return;
        if (!r.ok) { say('i-err', r.data.error || 'Link mời không hợp lệ.'); return; }
        const games = r.data.games || [];
        carried = games.map((g) => `${g.name}, ${gameText(g)}`).join('; ');
        $('#i-card').innerHTML = `<div class="au-invite">${games.map((g) => `<div class="au-ginv">${tile(g, 36)}<div><b>${esc(g.name)}</b><div class="au-perm">${esc(gameText(g))}</div></div></div>`).join('')}<small>Link hết hạn lúc ${esc(fmtTime(siteNowLocal(r.data.exp)))}</small></div>`;
      });
    }
    $('#i-user').focus();
    $('#i-user').addEventListener('change', (e) => { e.target.value = e.target.value.trim().toLowerCase(); });
    $('#inv').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $('#i-user').value.trim().toLowerCase();
      const name = $('#i-name').value.trim();
      $('#i-err').hidden = true;
      if (!token) return say('i-err', noToken);
      if (!checkNew(username, name, $('#i-pass').value, $('#i-pass2').value, 'i-err', ['i-user', 'i-name', 'i-pass', 'i-pass2'])) return;
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Đang tạo…';
      const r = await api('POST', '/nhan-loi-moi', { token, username, name, password: $('#i-pass').value });
      btn.disabled = false; btn.textContent = 'Tạo tài khoản';
      if (!r.ok) return say('i-err', r.data.error || 'Không tạo được tài khoản.');
      shell(done(true, 'Đã tạo tài khoản', `<p>Tài khoản <b>${esc(r.data.user.username)}</b> (${esc(r.data.user.name)}) đang <b>chờ Quản lý tổng duyệt</b>${carried ? ` với quyền <b>${esc(carried)}</b>` : ''}.</p>
<p>Khi được duyệt, bạn đăng nhập bằng tên đăng nhập và mật khẩu vừa tạo. Hãy báo Quản lý tổng tên đăng nhập của bạn để được duyệt nhanh.</p>`, 'Về trang đăng nhập'));
      $('.au-go').focus();
    });
  }

  return { renderLogin, renderSetPassword, renderRegister, renderAcceptInvite };
}
