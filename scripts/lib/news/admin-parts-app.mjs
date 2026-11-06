// admin-parts-app.mjs — the browser side of three parts of /quan-tri: gift tickets (Phiếu Bé Ngoan), early sign-ups and the
// background music of the home page. Like adminNews it is serialised into the page next to adminApp (never run on the
// server) and receives the frame's helpers as K, so all of them share one set of sign-in, game and screen state.
// It talks only to /quan-tri/api/*; the server re-checks every permission, so nothing here is a security boundary — it only
// keeps the screens honest (a button shows only when the open game grants it).
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminParts(K) {
  const { $, $$, esc, api, toast, can, gp, header, app, I, fmtTime, armDelete, disarm } = K;
  const ic = K.svgIcon;
  const P = {
    download: ic('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
    upload: ic('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
    mail: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    undo: ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'),
    alert: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>'),
    back: ic('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
  };
  const fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN');
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  const emptyCell = (cols, icon, title, text) => `<tr class="sh-empty-tr"><td colspan="${cols}" class="sh-empty-cell"><div class="sh-empty-ic">${icon}</div><h3>${title}</h3><p>${text}</p></td></tr>`;
  const loading = (txt) => `<main class="wrap"><p class="sh-hint" style="padding:40px 0">${txt}</p></main>`;
  const failBox = (msg) => `<div class="sh-note danger" role="alert">${P.alert}<div>${esc(msg)}</div></div>`;

  // ---------- gift tickets ----------
  // Players ask for gifts on the ticket site, one ticket a day. Give the gifts in the game, then mark the ticket given (or
  // refused) here with an optional reply: the player sees both in their history.
  const PHIEU_ST = { cho: ['Đang chờ', 'sh-b-warn'], tra: ['Đã trả', 'sh-b-ok'], tu: ['Từ chối', 'sh-b-danger'] };
  const phieuView = { ngay: 'hom-nay', st: 'all' };

  async function renderPhieu() {
    K.cleanupEditor();
    const mine = K.screen();
    const g = K.game();
    app.innerHTML = header('phieu') + loading('Đang tải phiếu…');
    const qs = () => `ngay=${phieuView.ngay}&st=${phieuView.st}`;

    const load = async () => {
      const r = await api('GET', `/phieu-be-ngoan?${qs()}`);
      if (mine !== K.screen() || !K.me()) return null;
      if (!r.ok) { if (r.status !== 401) $('main').innerHTML = failBox(r.data.error); return null; }
      return r.data;
    };

    // "Duyệt phiếu" accounts see no email addresses, no CSV and no delete button (the server refuses those anyway)
    const full = can('phieu-be-ngoan', 'quan-ly');
    const ticketSite = ((g.sites || []).find((s) => s.id === 'phieu') || {}).host || 'phieubengoan.3qdc.wanmeivn.com';
    const draw = (d) => {
      const c = d.counts;
      $('main').innerHTML = `${K.gameHead(g, 'phieu')}
<div class="sh-toolbar pt-toolbar"><p class="pt-intro">Người chơi gửi phiếu ở <a href="https://${esc(ticketSite)}/" target="_blank" rel="noopener">${esc(ticketSite)}</a>. Trả quà trong game xong thì bấm <b>Đã trả</b>, người chơi sẽ thấy trong lịch sử.</p>
${full ? `<div class="sh-r"><a class="sh-btn" href="/quan-tri/api${gp('/phieu-be-ngoan/csv')}?${qs()}" download>${P.download} Xuất CSV</a></div>` : ''}</div>
<div class="sh-toolbar"><div class="sh-seg" role="group" aria-label="Lọc theo trạng thái">${['all', 'cho', 'tra', 'tu'].map((s) => `<button type="button" aria-pressed="${phieuView.st === s}" data-pst="${s}">${s === 'all' ? 'Tất cả' : PHIEU_ST[s][0]}<span class="n sh-num">${fmtNum(c[s])}</span></button>`).join('')}</div>
<label class="sh-sr" for="fngay">Ngày gửi</label><select id="fngay" class="sh-select">${[['hom-nay', 'Hôm nay'], ['hom-qua', 'Hôm qua'], ['tat-ca', 'Mọi ngày']].map(([v, l]) => `<option value="${v}"${phieuView.ngay === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
<span class="sh-faint" style="font-size:var(--text-sm)"><b class="sh-num pt-warn">${fmtNum(d.cho)}</b> phiếu đang chờ (mọi ngày)</span></div>
<div class="sh-card sh-tbl-wrap"><table class="sh-table pt-table pt-ph"><thead><tr><th>Người chơi</th><th>Quà muốn nhận</th><th>Ghi chú</th><th>Trạng thái</th><th>Xử lý</th></tr></thead><tbody>
${d.items.map((t) => {
    const st = PHIEU_ST[t.st] || [esc(t.st), ''];
    return `<tr data-id="${esc(t.id)}">
<td class="pt-who"><b>${esc(t.acc)}</b><small>Máy chủ ${esc(t.serverTen || t.server)}</small>
${full ? `<small class="pt-mail">${P.mail}<span>${esc(t.email)}</span></small>` : `<small class="sh-mono">Mã ${esc(t.id)}</small>`}<small class="sh-num">Gửi ${fmtTime(t.luc)}</small></td>
<td><ul class="pt-gifts">${t.qua.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></td>
<td><div class="pt-note">${t.ghiChu ? esc(t.ghiChu) : '<span class="sh-faint">Không có</span>'}</div></td>
<td><span class="sh-badge dot ${st[1]}">${st[0]}</span>${t.xuLyBoi ? `<span class="pt-by">${esc(t.xuLyBoi)}<br>${fmtTime(t.xuLyLuc)}</span>` : ''}</td>
<td><div class="pt-handle">${t.st === 'cho'
    ? `<label class="sh-sr" for="rep-${esc(t.id)}">Phản hồi cho ${esc(t.acc)}</label><input class="sh-input" id="rep-${esc(t.id)}" maxlength="160" placeholder="Phản hồi cho người chơi (không bắt buộc)" data-reply="${esc(t.id)}">
<div class="pt-acts"><button type="button" class="sh-btn sh-btn-primary sh-btn-sm" data-set="tra" data-id="${esc(t.id)}">${I.check} Đã trả</button><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-set="tu" data-id="${esc(t.id)}">Từ chối</button></div>`
    : `<div class="pt-reply${t.phanHoi ? '' : ' none'}">${t.phanHoi ? esc(t.phanHoi) : 'Không có phản hồi.'}</div><div class="pt-acts"><button type="button" class="sh-btn sh-btn-ghost sh-btn-xs" data-set="cho" data-id="${esc(t.id)}">${P.undo} Đưa về Đang chờ</button></div>`}
${full ? `<div class="pt-acts"><button type="button" class="sh-btn sh-btn-ghost sh-btn-xs sh-danger" data-del-phieu="${esc(t.id)}">${I.trash} Xoá phiếu</button></div>` : ''}</div></td></tr>`;
  }).join('')}
${d.items.length ? '' : (c.all ? emptyCell(5, I.ticket, 'Không có phiếu nào khớp bộ lọc', 'Đổi trạng thái hoặc ngày gửi.') : emptyCell(5, I.ticket, 'Chưa có phiếu nào trong ngày này', 'Chọn Hôm qua hoặc Mọi ngày để xem phiếu cũ.'))}
</tbody></table></div>
${full ? '' : '<p class="pt-help">Bạn có quyền Duyệt phiếu: không thấy email người chơi, không xuất CSV, không xoá phiếu.</p>'}`;
      K.paintHead();

      const again = async () => { const nd = await load(); if (nd) draw(nd); };
      $$('[data-pst]').forEach((b) => b.addEventListener('click', () => { phieuView.st = b.getAttribute('data-pst'); again(); }));
      $('#fngay').addEventListener('change', async (e) => { phieuView.ngay = e.target.value; await again(); const f = $('#fngay'); if (f) f.focus(); });
      $$('[data-set]').forEach((b) => b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        const st = b.getAttribute('data-set');
        const box = $(`[data-reply="${id}"]`);
        const row = b.closest('tr');
        b.disabled = true; row.classList.add('pt-busy');
        const r = await api('POST', `/phieu-be-ngoan/${id}`, { st, phanHoi: box ? box.value : '' });
        if (mine !== K.screen()) return;
        if (!r.ok) { b.disabled = false; row.classList.remove('pt-busy'); if (r.status !== 401) toast(r.data.error || 'Không đổi được trạng thái.'); return; }
        toast(st === 'cho' ? 'Đã đưa phiếu về Đang chờ' : `Đã đánh dấu: ${PHIEU_ST[st][0]}`);
        again();
      }));
      $$('[data-del-phieu]').forEach((b) => b.addEventListener('click', async () => {
        if (!armDelete(b, 'Xoá phiếu')) return;
        b.disabled = true;
        const r = await api('POST', `/phieu-be-ngoan/${b.getAttribute('data-del-phieu')}/xoa`, {});
        if (mine !== K.screen()) return;
        if (!r.ok) { b.disabled = false; disarm(b); if (r.status !== 401) toast(r.data.error || 'Không xoá được phiếu.'); return; }
        toast('Đã xoá phiếu');
        again();
      }));
    };

    const d = await load();
    if (d) draw(d);
  }

  // ---------- early sign-ups ----------
  // Phone numbers left on the sign-up page, newest first: search by digits, page through, download everything as CSV (the
  // gifts are sent by hand for now), and set the milestones the page shows.
  async function renderSignups() {
    K.cleanupEditor();
    const mine = K.screen();
    const g = K.game();
    const view = { q: '', page: 1 };
    app.innerHTML = header('signup') + loading('Đang tải danh sách đăng ký…');

    const load = async () => {
      const r = await api('GET', `/dang-ky-som?q=${encodeURIComponent(view.q)}&trang=${view.page}`);
      if (mine !== K.screen() || !K.me()) return null;
      if (!r.ok) { if (r.status !== 401) $('main').innerHTML = failBox(r.data.error); return null; }
      return r.data;
    };

    const manage = can('dang-ky-som', 'quan-ly');
    const hl = (s) => (view.q ? esc(s).replace(view.q, `<mark>${view.q}</mark>`) : esc(s));
    const draw = (d, focusId) => {
      const total = d.total;
      const latest = d.page === 1 && !view.q && d.items[0] ? d.items[0].luc : '';
      $('main').innerHTML = `${K.gameHead(g, 'signup')}
<div class="sh-toolbar pt-toolbar"><p class="pt-intro">Số điện thoại khách để lại ở trang <a href="/dang-ky-som" target="_blank" rel="noopener">/dang-ky-som</a>. Quà chưa phát tự động, tải CSV để gửi tay.</p>
${manage ? `<div class="sh-r"><a class="sh-btn sh-btn-primary" href="/quan-tri/api${gp('/dang-ky-som/csv')}" download>${P.download} Tải CSV (${fmtNum(total)} số)</a></div>` : ''}</div>
<div class="pt-dk"><section class="sh-card" aria-labelledby="dkH">
<form class="pt-find" id="s-find" role="search"><h2 id="dkH" class="sh-sr">Danh sách số đăng ký</h2>
<label class="pt-sbox">${I.search}<span class="sh-sr">Tìm theo số điện thoại</span><input id="s-q" type="search" inputmode="numeric" placeholder="Tìm theo số, ví dụ 0912" value="${esc(view.q)}"></label>
<button class="sh-btn" type="submit">Tìm</button>${view.q ? '<button class="sh-btn sh-btn-ghost" type="button" id="s-clear">Bỏ lọc</button>' : ''}
<span class="pt-r sh-num">${view.q ? `<b>${fmtNum(d.count)}</b> / ${fmtNum(total)} số khớp` : `Tổng <b>${fmtNum(total)}</b> số`}</span></form>
<div class="sh-tbl-wrap"><table class="sh-table pt-table"><thead><tr><th>Số điện thoại</th><th>STT</th><th>Thời gian</th><th>Nguồn</th><th>IP</th><th class="t-r"><span class="sh-sr">Thao tác</span></th></tr></thead><tbody>
${d.items.map((s) => `<tr><td class="pt-phone">${hl(s.sdt)}</td><td class="sh-num sh-muted">#${fmtNum(s.stt)}</td><td class="sh-num sh-muted nowrap">${fmtTime(s.luc)}</td><td class="sh-muted">${s.nguon ? esc(s.nguon) : '<span class="sh-faint">Không rõ</span>'}</td><td class="sh-mono sh-muted">${esc(s.ip || '—')}</td>
<td><div class="sh-acts">${manage ? `<button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-del-sdt="${esc(s.sdt)}" aria-label="Xoá số ${esc(s.sdt)}">Xoá</button>` : ''}</div></td></tr>`).join('')}
${d.items.length ? '' : (view.q ? emptyCell(6, I.search, 'Không có số nào khớp', 'Thử ít chữ số hơn, ví dụ 4 số cuối.') : emptyCell(6, I.search, 'Chưa có ai đăng ký', 'Số khách để lại ở trang /dang-ky-som sẽ hiện ở đây.'))}
</tbody></table></div>
${d.pages > 1 ? `<div class="pt-pager"><button type="button" class="sh-btn sh-btn-sm" id="s-prev"${d.page <= 1 ? ' disabled' : ''}>${P.back} Mới hơn</button><span class="sh-num">Trang ${fmtNum(d.page)} / ${fmtNum(d.pages)}</span><button type="button" class="sh-btn sh-btn-sm" id="s-next"${d.page >= d.pages ? ' disabled' : ''}>Cũ hơn ${I.arrow}</button></div>` : ''}
</section>
<div class="pt-side"><section class="sh-card"><div class="sh-card-b"><p>Tổng số đăng ký</p><div class="pt-big sh-num">${fmtNum(total)}</div>${latest ? `<p class="sh-faint" style="font-size:var(--text-xs)">Mới nhất lúc ${fmtTime(latest)}</p>` : ''}</div></section>
<section class="sh-card" aria-labelledby="mocH"><div class="sh-card-h"><h2 id="mocH">Mốc hiện trên trang đăng ký</h2></div><div class="sh-card-b">
<p>Các số người đăng ký, tăng dần, cách nhau bằng dấu phẩy (tối đa 8 mốc). Trang đăng ký đổi theo ngay.</p>
<div class="pt-chips" id="s-chips" aria-label="Mốc đang dùng">${chips(d.milestones, total)}</div>
${manage ? `<form class="pt-moc-row" id="s-moc-form"><label class="sh-sr" for="s-moc">Các mốc</label><input class="sh-input" id="s-moc" value="${esc(d.milestones.join(', '))}" aria-describedby="s-moc-err"><button type="submit" class="sh-btn">Lưu mốc</button></form>
<div class="pt-err" id="s-moc-err" role="alert" hidden></div>
<p class="pt-help">Dấu chấm là phân cách nghìn: 10.000 là mười nghìn. Mốc đã đạt có dấu tích.</p>` : ''}</div></section></div></div>`;
      K.paintHead();

      const again = async (focus) => { const nd = await load(); if (nd) draw(nd, focus); };
      $('#s-find').addEventListener('submit', (e) => { e.preventDefault(); view.q = $('#s-q').value.replace(/\D/g, ''); view.page = 1; again('s-q'); });
      if ($('#s-clear')) $('#s-clear').addEventListener('click', () => { view.q = ''; view.page = 1; again('s-q'); });
      if ($('#s-prev')) $('#s-prev').addEventListener('click', () => { view.page = d.page - 1; again('s-prev'); });
      if ($('#s-next')) $('#s-next').addEventListener('click', () => { view.page = d.page + 1; again('s-next'); });
      if (focusId) { const f = document.getElementById(focusId); if (f) f.focus(); }
      $$('[data-del-sdt]').forEach((b) => b.addEventListener('click', async () => {
        if (!armDelete(b, 'Xoá')) return;
        const sdt = b.getAttribute('data-del-sdt');
        b.disabled = true;
        const res = await api('POST', '/dang-ky-som/xoa', { sdt });
        if (mine !== K.screen()) return;
        if (!res.ok) { b.disabled = false; disarm(b); if (res.status !== 401) toast(res.data.error || 'Không xoá được.'); return; }
        toast(`Đã xoá ${sdt}, còn ${fmtNum(res.data.count)} số`);
        again();
      }));
      const mocForm = $('#s-moc-form');
      if (mocForm) mocForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#s-moc-err');
        // "10.000" is ten thousand here: dots are thousand separators, commas/semicolons/spaces separate milestones
        const list = $('#s-moc').value.replace(/\./g, '').split(/[,;\s]+/).filter(Boolean).map(Number);
        const res = await api('POST', '/dang-ky-som/moc', { milestones: list });
        if (mine !== K.screen()) return;
        if (!res.ok) { if (res.status !== 401) { err.textContent = res.data.error || 'Không lưu được mốc.'; err.hidden = false; $('#s-moc').focus(); } return; }
        err.hidden = true;
        $('#s-moc').value = res.data.milestones.join(', ');
        $('#s-chips').innerHTML = chips(res.data.milestones, total);
        toast('Đã lưu mốc: ' + res.data.milestones.map(fmtNum).join(' · '));
      });
    };
    const chips = (list, total) => list.map((n) => `<span class="sh-badge ${total >= n ? 'sh-b-ok' : 'outline'}">${total >= n ? I.check : ''}${fmtNum(n)}</span>`).join('');

    const d = await load();
    if (d) draw(d);
  }

  // ---------- background music of the home page ----------
  // The songs are plain files in one folder on the server, so this page is that folder: upload adds a file, delete
  // removes it, and the player on the home page follows at once (it reads the same folder on every visit).
  const MUSIC_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/x-wav'];

  async function renderMusic() {
    K.cleanupEditor();
    const mine = K.screen();
    const g = K.game();
    app.innerHTML = header('music') + loading('Đang tải danh sách nhạc…');
    const r = await api('GET', '/nhac');
    if (mine !== K.screen() || !K.me()) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = failBox(r.data.error); return; }
    const max = r.data.max || 15728640;
    const total = r.data.total || 314572800;
    const manage = can('nhac', 'quan-ly');

    const draw = (items, notice, fresh) => {
      const used = items.reduce((n, s) => n + (s.bytes || 0), 0);
      const pct = Math.min(100, used / total * 100);
      $('main').innerHTML = `${K.gameHead(g, 'music')}
<div class="sh-toolbar pt-toolbar"><p class="pt-intro">Những bài này phát ở bàn nhạc góc dưới phải <b>trang chủ</b>. Thêm hoặc xoá là có hiệu lực ngay, không cần khởi động lại web.</p>
${manage ? `<div class="sh-r"><label class="sh-btn sh-btn-primary pt-upl">${P.upload} Thêm bài hát<input type="file" id="m-file" accept="audio/*" multiple aria-label="Thêm bài hát"></label></div>` : ''}</div>
<div id="m-err">${notice ? `<div class="sh-note danger" role="alert" style="margin-bottom:var(--s4)">${P.alert}<div>${esc(notice)}</div></div>` : ''}</div>
<section class="sh-card" aria-labelledby="mH"><h2 id="mH" class="sh-sr">Danh sách nhạc nền</h2>
<div class="pt-usage"><span id="m-used" role="status">Đang dùng <b class="sh-num">${mb(used)}</b> / ${mb(total)}, ${items.length} bài</span>
<div class="pt-meter${pct > 85 ? ' hot' : ''}" role="img" aria-label="Đã dùng ${Math.round(pct)}% dung lượng"><i style="width:${pct}%"></i></div>
<span class="sh-faint" style="font-size:var(--text-xs)">Mỗi bài tối đa ${mb(max)}</span></div>
<div class="sh-tbl-wrap"><table class="sh-table pt-table"><thead><tr><th>Bài hát</th><th>Ca sĩ</th><th>Dung lượng</th><th>Nghe thử</th><th class="t-r"><span class="sh-sr">Thao tác</span></th></tr></thead><tbody>
${items.map((s) => `<tr data-name="${esc(s.name)}"${fresh === s.name ? ' class="pt-up"' : ''}><td><div class="pt-song"><span class="pt-song-ic">${I.music}</span><div><b>${esc(s.title)}</b><small>${esc(s.name)}</small></div></div></td>
<td>${s.artist ? esc(s.artist) : '<span class="sh-faint">Không ghi</span>'}</td><td class="sh-num sh-muted nowrap">${mb(s.bytes || 0)}</td>
<td><audio class="pt-audio" controls preload="none" src="${esc(s.file)}" aria-label="Nghe thử ${esc(s.title)}"></audio></td>
<td><div class="sh-acts">${manage ? `<button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-del-song="${esc(s.name)}">${I.trash} Xoá</button>` : ''}</div></td></tr>`).join('')}
${items.length ? '' : emptyCell(5, I.music, 'Chưa có bài hát nào', manage ? 'Bấm Thêm bài hát để tải lên.' : 'Chưa ai tải bài hát lên.')}
</tbody></table></div>
<div class="pt-tip">${P.info}<span>Đặt tên file kiểu <code>Tên bài - Ca sĩ.mp3</code> để bàn nhạc hiện đúng tên và ca sĩ. Nhận MP3, M4A, OGG, WAV. Mỗi bài tối đa ${mb(max)}, tất cả cộng lại tối đa ${mb(total)}.</span></div>
</section>`;
      K.paintHead();

      const err = (msg) => { $('#m-err').innerHTML = msg ? `<div class="sh-note danger" role="alert" style="margin-bottom:var(--s4)">${P.alert}<div>${esc(msg)}</div></div>` : ''; };
      const file = $('#m-file');
      if (file) file.addEventListener('change', async () => {
        const files = [...file.files];
        file.value = '';
        if (!files.length) return;
        let list = items, last = '', msg = '';
        for (const f of files) {
          if (!MUSIC_TYPES.includes(f.type)) { msg = `“${f.name}”: chỉ nhận MP3, M4A, OGG hoặc WAV.`; continue; }
          if (f.size > max) { msg = `“${f.name}” nặng ${mb(f.size)}, quá giới hạn ${mb(max)} mỗi bài.`; continue; }
          $('#m-used').textContent = `Đang tải lên “${f.name}” (${mb(f.size)})…`;
          let res;
          try {
            res = await fetch('/quan-tri/api' + gp('/nhac'), {
              method: 'POST', credentials: 'same-origin', body: f,
              headers: { 'Content-Type': f.type, 'X-Ten-File': encodeURIComponent(f.name) },
            });
          } catch (e2) { msg = 'Mất kết nối khi tải bài hát lên. Thử lại.'; break; }
          let data = {};
          try { data = await res.json(); } catch (e2) { data = { error: 'Máy chủ trả lời lạ (' + res.status + ').' }; }
          if (res.status === 401) { K.loginAgain(data.error); return; }
          if (mine !== K.screen()) return;
          if (!res.ok) { msg = data.error || `Không tải lên được “${f.name}”.`; continue; }
          list = data.items; last = data.name;
          toast(`Đã thêm “${data.name}”`);
        }
        draw(list, msg, last);
      });
      $$('[data-del-song]').forEach((b) => b.addEventListener('click', () => {
        const name = b.getAttribute('data-del-song');
        K.confirmDlg({ title: `Xoá “${name}” khỏi nhạc nền?`, body: 'Người chơi sẽ không nghe bài này nữa. File bị xoá khỏi máy chủ, muốn dùng lại phải tải lên lại.', ok: 'Xoá bài hát' }, async () => {
          const res = await api('POST', `/nhac/${encodeURIComponent(name)}/xoa`, {});
          if (mine !== K.screen()) return;
          if (!res.ok) { if (res.status !== 401) err(res.data.error || 'Không xoá được bài này.'); return; }
          toast(`Đã xoá “${name}”`);
          draw(res.data.items, '', '');
        });
      }));
    };
    draw(r.data.items, '', '');
  }

  return { renderPhieu, renderSignups, renderMusic };
}
