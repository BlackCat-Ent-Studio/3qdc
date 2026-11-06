// admin-trash-app.mjs — the browser side of the game's "Thùng rác" screen: one place per game where deleted articles, gift
// tickets, early sign-ups and songs wait. Like adminNews it is serialised into the page next to adminApp (never run on the
// server) and receives the frame's helpers as K. The server decides who sees which part and who may delete for good (only an
// owner); the screen only shows what the account may use.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminTrash(K) {
  const { $, $$, esc, api, toast, header, app, I, fmtTime, armDelete } = K;
  const ic = K.svgIcon;
  const T = {
    undo: ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'),
    alert: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  };
  // the order of the parts on the screen, and what each one says about its trash
  const PARTS = [
    { id: 'tin-tuc', path: '/thung-rac', what: 'bài', cols: ['Bài viết', 'Mục', 'Người viết'], back: 'Khôi phục đưa bài về <b>Nháp</b>, người chơi chưa thấy cho tới khi đăng lại.', empty: 'Bài bị xoá ở danh sách hoặc trang sửa bài sẽ nằm ở đây.' },
    { id: 'phieu-be-ngoan', path: '/phieu-be-ngoan/thung-rac', what: 'phiếu', cols: ['Người chơi', 'Quà muốn nhận', 'Trạng thái lúc xoá'], back: 'Khôi phục đưa phiếu về lại danh sách phiếu, giữ nguyên trạng thái và phản hồi cũ.', empty: 'Phiếu bị xoá ở trang Phiếu Bé Ngoan sẽ nằm ở đây. Người chơi không thấy phiếu đã xoá.' },
    { id: 'dang-ky-som', path: '/dang-ky-som/thung-rac', what: 'số', cols: ['Số điện thoại', 'Đăng ký lúc', 'Nguồn'], back: 'Khôi phục đưa số về danh sách đăng ký sớm, đúng chỗ theo giờ đăng ký. Số trong thùng rác không được tính vào tổng và các mốc.', empty: 'Số bị xoá ở trang Đăng ký sớm sẽ nằm ở đây.' },
    { id: 'nhac', path: '/nhac/thung-rac', what: 'bài hát', cols: ['Bài hát', 'Dung lượng', ''], back: 'Khôi phục đưa bài về lại danh sách nhạc nền của trang chủ. Bài trong thùng rác không phát trên trang chủ.', empty: 'Bài hát bị xoá ở trang Nhạc nền sẽ nằm ở đây.' },
  ];
  const PHIEU_ST = { cho: ['Đang chờ', 'sh-b-warn'], tra: ['Đã trả', 'sh-b-ok'], tu: ['Từ chối', 'sh-b-danger'] };
  const STATE = { published: 'Đã đăng', pending: 'Chờ duyệt', draft: 'Nháp' };
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  const emptyCell = (cols, title, text) => `<tr class="sh-empty-tr"><td colspan="${cols}" class="sh-empty-cell"><div class="sh-empty-ic">${I.trash}</div><h3>${title}</h3><p>${text}</p></td></tr>`;
  const failBox = (msg) => `<div class="sh-note danger" role="alert">${T.alert}<div>${esc(msg)}</div></div>`;
  const catName = (id) => ((K.CATS || []).find((c) => c.id === id) || {}).name || '';

  // the three middle cells of a row, by part
  function cells(part, t) {
    if (part === 'tin-tuc') {
      return `<td><div class="nw-ptitle">${t.cover ? `<img class="nw-thumb" src="${esc(t.cover)}" alt="" loading="lazy">` : '<span class="nw-thumb" aria-hidden="true"></span>'}<div style="min-width:0"><b>${esc(t.title)}</b><small class="sh-mono">/tin-tuc/${esc(t.slug)}</small><span class="nw-subt">Trước khi xoá: ${esc(STATE[t.status] || t.status)}</span></div></div></td>
<td><span class="sh-badge outline">${esc(catName(t.category))}</span></td><td>${esc(t.author || '—')}</td>`;
    }
    if (part === 'phieu-be-ngoan') {
      const st = PHIEU_ST[t.st] || [esc(t.st), ''];
      return `<td><div class="tr-who"><b>${esc(t.acc)}</b><small>${esc(t.serverTen || t.server)}${t.email ? `, ${esc(t.email)}` : ''}</small><small>Gửi ngày ${esc(String(t.ngay).split('-').reverse().join('/'))}</small></div></td>
<td><ul class="tr-gifts">${(t.qua || []).map((q) => `<li>${esc(q)}</li>`).join('')}</ul></td>
<td><span class="sh-badge dot ${st[1]}">${st[0]}</span>${t.phanHoi ? `<span class="nw-subt">${esc(t.phanHoi)}</span>` : ''}</td>`;
    }
    if (part === 'dang-ky-som') {
      return `<td><span class="tr-phone">${esc(t.sdt)}</span></td><td class="sh-num sh-muted nowrap">${fmtTime(t.luc)}</td><td class="sh-muted">${esc(t.nguon || '—')}${t.ip ? `<span class="nw-subt sh-mono">${esc(t.ip)}</span>` : ''}</td>`;
    }
    return `<td><b>${esc(t.title)}</b>${t.artist ? `<span class="nw-subt">${esc(t.artist)}</span>` : ''}<span class="nw-subt sh-mono">${esc(t.name)}</span></td><td class="sh-num sh-muted">${mb(t.bytes)}</td><td></td>`;
  }

  async function renderTrash(only) {
    K.cleanupEditor();
    const mine = K.screen();
    const g = K.game();
    const owner = K.isOwner();
    const parts = PARTS.filter((p) => (g.trash || []).includes(p.id));
    const partName = (id) => ((g.parts.find((p) => p.id === id) || {}).name) || id;
    app.innerHTML = `${header('trash')}<main class="wrap"><p class="sh-hint" style="padding:40px 0">Đang tải thùng rác…</p></main>`;
    // every part's list at once: the counts beside the section names come from the same answers
    const got = await Promise.all(parts.map((p) => api('GET', p.path)));
    if (mine !== K.screen() || !K.me()) return;
    const data = {};
    parts.forEach((p, i) => { data[p.id] = got[i].ok ? { items: got[i].data.items } : { error: got[i].data.error || 'Không tải được.' }; });
    let cur = parts.find((p) => p.id === only) || parts.find((p) => (data[p.id].items || []).length) || parts[0];

    const draw = (notice) => {
      const d = data[cur.id];
      const items = d.items || [];
      const n = items.length;
      $('main').innerHTML = `<div class="sh-page-h"><div><div class="sh-eyebrow">${esc(g.name)}</div><h1>Thùng rác</h1>
<p>Mọi thứ bị xoá ở trang quản trị nằm ở đây, kèm người xoá và lúc xoá. Mục trong thùng rác không hiện ở trang của người chơi và không nằm trong file CSV. ${cur.back} ${owner ? '<b>Xoá vĩnh viễn</b> thì mất hẳn, không lấy lại được.' : 'Chỉ chủ mới xoá vĩnh viễn được.'}</p></div>
${owner && n ? `<div class="sh-r"><button type="button" class="sh-btn sh-btn-ghost sh-danger" id="t-empty">${I.trash} Dọn sạch ${esc(partName(cur.id).toLowerCase())} (${n})</button></div>` : ''}</div>
<div class="sh-toolbar"><nav class="sh-seg tr-seg" aria-label="Phần của thùng rác">${parts.map((p) => `<a href="#/g/${esc(g.id)}/thung-rac/${p.id}" class="tr-tab" aria-pressed="${p.id === cur.id}"${p.id === cur.id ? ' aria-current="page"' : ''}>${esc(partName(p.id))}<span class="n sh-num">${(data[p.id].items || []).length}</span></a>`).join('')}</nav></div>
${notice ? `<div class="sh-note danger" id="t-err" role="alert" style="margin-bottom:var(--s4)">${T.alert}<div>${esc(notice)}</div></div>` : ''}
${d.error ? failBox(d.error) : `<div class="sh-card sh-tbl-wrap"><table class="sh-table nw-table tr-table"><thead><tr>${cur.cols.map((c) => `<th>${c ? esc(c) : '<span class="sh-sr">Chi tiết</span>'}</th>`).join('')}<th>Lúc xoá</th><th>Xoá bởi</th><th class="t-r"><span class="sh-sr">Thao tác</span></th></tr></thead><tbody>
${items.map((t) => `<tr data-key="${esc(t.key)}">${cells(cur.id, t)}
<td class="sh-num sh-muted nowrap">${fmtTime(t.deletedAt)}</td>
<td class="sh-muted">${esc(t.deletedBy || '—')}<span class="nw-subt">${t.deletedVia === 'claude' ? 'qua Claude' : 'trên web'}</span></td>
<td><div class="sh-acts"><button type="button" class="sh-btn sh-btn-sm" data-restore="${esc(t.key)}">${T.undo} Khôi phục</button>${owner ? `<button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-purge="${esc(t.key)}">Xoá vĩnh viễn</button>` : ''}</div></td></tr>`).join('')}
${n ? '' : emptyCell(cur.cols.length + 3, 'Thùng rác trống', cur.empty)}
</tbody></table></div>`}`;

      const lock = () => $$('[data-purge],[data-restore],#t-empty').forEach((x) => { x.disabled = true; });
      // runs a change, then redraws with the part's new list (or the reason it failed)
      const act = async (path, label, after) => {
        lock();
        const mine2 = K.screen();
        const res = await api('POST', path, {});
        if (mine2 !== K.screen()) return;
        if (!res.ok) { if (res.status !== 401) draw(res.data.error || label); return; }
        data[cur.id] = { items: res.data.items };
        toast(after(res.data));
        draw('');
      };
      $$('[data-restore]').forEach((b) => b.addEventListener('click', () => {
        act(`${cur.path}/${encodeURIComponent(b.getAttribute('data-restore'))}/khoi-phuc`, 'Không khôi phục được.', (r) => `Đã khôi phục ${cur.what} “${r.label}”`);
      }));
      $$('[data-purge]').forEach((b) => b.addEventListener('click', () => {
        if (!armDelete(b, 'Xoá vĩnh viễn')) return;
        act(`${cur.path}/${encodeURIComponent(b.getAttribute('data-purge'))}/xoa-han`, 'Không xoá được.', (r) => `Đã xoá vĩnh viễn ${cur.what} “${r.label}”`);
      }));
      const empty = $('#t-empty');
      if (empty) empty.addEventListener('click', () => {
        if (!armDelete(empty, 'Dọn sạch', `Bấm lần nữa để xoá hẳn ${n} ${cur.what}`)) return;
        act(`${cur.path}/don-sach`, 'Không dọn được thùng rác.', (r) => `Đã xoá vĩnh viễn ${r.deleted} ${cur.what}`);
      });
    };
    draw('');
  }

  return { renderTrash };
}
