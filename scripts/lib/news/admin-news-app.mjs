// admin-news-app.mjs — the browser side of the news part of /quan-tri: article list and the article editor.
// adminNews is serialised into the page next to adminApp (never run on the server) and receives the frame's helpers as K, so
// both share one set of sign-in, game and screen state. It talks only to /quan-tri/api/*; the server re-checks every
// permission and cleans every article, so nothing here is a security boundary — it only keeps the screens honest.
// No inline event attributes anywhere: the page's Content-Security-Policy would block them.

export function adminNews(K) {
  const { $, $$, esc, api, toast, can, gh, header, app, I, initials, fmtTime, slugify, siteNowLocal, armDelete, disarm, CATS, LIB, HOST, SITES, STATE, ACTION_WORDS, stateOf, siteOfPost, addrPrefix } = K;
  const avatar = (name) => `<span class="sh-av" title="${esc(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
  const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || '';
  const ic = K.svgIcon;
  const N = {
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    back: ic('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
    edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    undo: ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'),
    eye: ic('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeoff: ic('<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0112 6c5 0 9 6 9 6a16 16 0 01-2.6 3.2M6.6 6.6C4.3 8.2 3 12 3 12s4 6 9 6a8.6 8.6 0 004.3-1.2"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>'),
    upload: ic('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
    image: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    table: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M10 4v16"/>'),
    gift: ic('<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M2.5 9h19M12 9v11M12 9c-1.5-3-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3 5.5-4 5.5-1.5S14 9 12 9z"/>'),
    alert: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>'),
    ul: ic('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
    ol: ic('<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5a1.5 1.5 0 013 .5L3.5 19h3"/>'),
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    pin: ic('<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v7"/>'),
    send: ic('<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>'),
    history: ic('<path d="M3 12a9 9 0 103-6.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>'),
    link: ic('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
    refresh: ic('<path d="M20 11a8 8 0 00-14.5-4.5L4 8"/><path d="M4 3v5h5M4 13a8 8 0 0014.5 4.5L20 16"/><path d="M20 21v-5h-5"/>'),
    x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  };
  const STATE_CLS = { published: 'sh-b-ok', scheduled: 'sh-b-info', pending: 'sh-b-warn', draft: '' };
  // where a reader finds the article, short form for the list
  const addrShort = (site) => (SITES.length && site === 'phu' ? '3qdaichien/#tin/' : '/tin-tuc/');
  const siteLabel = (id) => (SITES.find((s) => s.id === id) || {}).name || '';
  const thumb = (src) => (src ? `<img class="nw-thumb" src="${esc(src)}" alt="" loading="lazy">` : '<span class="nw-thumb" aria-hidden="true"></span>');
  const emptyCell = (cols, icon, title, text) => `<tr class="sh-empty-tr"><td colspan="${cols}" class="sh-empty-cell"><div class="sh-empty-ic">${icon}</div><h3>${title}</h3><p>${text}</p></td></tr>`;

  // ---------- article list ----------
  const listView = { state: 'all', cat: 'all', site: 'all' };
  K.setPreState((s) => { listView.state = s; });

  async function renderList() {
    K.cleanupEditor();
    const mine = K.screen();
    const g = K.game();
    const duyet = can('tin-tuc', 'duyet');
    app.innerHTML = `${header()}<main class="wrap"><p class="sh-hint" style="padding:40px 0">Đang tải danh sách bài…</p></main>`;
    const [r, tr, us] = await Promise.all([
      api('GET', '/bai'),
      duyet ? api('GET', '/thung-rac') : null,
      K.isOwner() ? api('GET', '/nguoi-dung') : null,
    ]);
    if (mine !== K.screen() || !K.me()) return;
    if (!r.ok) { if (r.status !== 401) $('main').innerHTML = `<div class="sh-note danger" role="alert">${N.alert}<div>${esc(r.data.error)}</div></div>`; return; }
    const posts = r.data.items;
    const trashN = tr && tr.ok ? tr.data.items.length : null;
    const waiting = us && us.ok ? us.data.users.filter((x) => x.role === 'pending').length : 0;
    let listErr = null; // { msg, reload }

    const draw = () => {
      const all = posts;
      const rows = all.filter((p) => (listView.state === 'all' || stateOf(p) === listView.state) && (listView.cat === 'all' || p.category === listView.cat)
          && (listView.site === 'all' || siteOfPost(p) === listView.site))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      const n = (s) => all.filter((p) => s === 'all' || stateOf(p) === s).length;
      const hint = duyet
        ? 'Bài người viết gửi lên nằm ở mục <b>Chờ duyệt</b>: mở bài, đăng hoặc trả lại kèm ghi chú.'
        : 'Viết xong bấm <b>Gửi duyệt</b>, người duyệt sẽ xem và đăng. Bài đã gửi thì rút về nháp mới sửa được.';
      $('main').innerHTML = `${K.gameHead(g, 'posts')}
${waiting ? `<div class="sh-note warn" id="pending-users" style="margin-bottom:var(--s4)">${I.users}<div><b>${waiting}</b> tài khoản đăng ký đang chờ duyệt. <a href="#/nguoi-dung">Xem và duyệt</a></div></div>` : ''}
<p class="sh-hint">${hint}</p>
<div class="sh-toolbar"><div class="sh-seg" role="group" aria-label="Lọc theo trạng thái">${['all', 'published', 'scheduled', 'pending', 'draft'].map((s) => `<button type="button" aria-pressed="${listView.state === s}" data-st="${s}">${s === 'all' ? 'Tất cả' : STATE[s]}<span class="n sh-num">${n(s)}</span></button>`).join('')}</div>
<label class="sh-sr" for="fcat">Lọc theo mục</label><select id="fcat" class="sh-select"><option value="all">Mọi mục</option>${CATS.map((c) => `<option value="${c.id}"${listView.cat === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
${SITES.length ? `<label class="sh-sr" for="fsite">Lọc theo trang</label><select id="fsite" class="sh-select"><option value="all">Mọi trang</option>${SITES.map((s) => `<option value="${s.id}"${listView.site === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}
<div class="sh-r">${duyet ? `<a class="sh-btn sh-btn-ghost" href="${gh('/thung-rac/tin-tuc')}">${I.trash} Thùng rác${trashN != null ? ` <span class="sh-cnt-n sh-num">${trashN}</span>` : ''}</a>` : ''}<a class="sh-btn sh-btn-primary" href="${gh('/viet-bai')}">${N.plus} Viết bài mới</a></div></div>
<div id="listErr">${listErr ? `<div class="sh-note danger" role="alert" style="margin-bottom:var(--s3)">${N.alert}<div>${esc(listErr.msg)}${listErr.reload ? ` <button type="button" class="sh-btn sh-btn-sm" id="list-reload">${N.refresh} Tải lại danh sách</button>` : ''}</div></div>` : ''}</div>
<div class="sh-card sh-tbl-wrap"><table class="sh-table nw-table"><thead><tr><th>Bài viết</th><th>Mục, trang</th><th>Trạng thái</th><th class="nw-c-author">Người viết</th><th>Sửa lần cuối</th><th class="t-r"><span class="sh-sr">Thao tác</span></th></tr></thead><tbody>
${rows.map((p) => {
    const st = stateOf(p);
    const canEdit = duyet || p.status === 'draft';
    const site = siteOfPost(p);
    return `<tr data-id="${p.id}">
<td><div class="nw-ptitle">${thumb(p.cover)}<div style="min-width:0"><b>${esc(p.title)}</b><small class="sh-mono">${addrShort(site)}${esc(p.slug)}</small>
${p.pinned ? `<div class="nw-line">${N.pin}<span>Ghim đầu mục</span></div>` : ''}
${p.lockedBy ? `<div class="nw-line warn"><span class="nw-dot" aria-hidden="true"></span><span>${esc(p.lockedBy)} đang sửa bài này</span></div>` : ''}
${p.status === 'draft' && p.reviewNote ? `<div class="nw-line danger">${N.undo}<span>Trả lại: ${esc(p.reviewNote)}</span></div>` : ''}</div></div></td>
<td><span class="sh-badge outline">${esc(catName(p.category))}</span>${SITES.length ? `<span class="nw-subt">${esc(siteLabel(site))}</span>` : ''}</td>
<td><span class="sh-badge dot ${STATE_CLS[st]}">${STATE[st]}</span>${st === 'scheduled' || st === 'published' ? `<span class="nw-subt">${fmtTime(p.publishAt)}</span>` : ''}</td>
<td class="nw-c-author"><div class="sh-person">${avatar(p.author)}<span>${esc(p.author)}</span></div></td>
<td class="nowrap"><span class="sh-num sh-muted">${fmtTime(p.updatedAt)}</span><span class="nw-subt">bởi ${esc(p.updatedBy)}</span></td>
<td><div class="sh-acts"><a class="sh-btn sh-btn-sm ${canEdit ? '' : 'sh-btn-ghost'}" href="${gh('/sua/' + p.id)}">${canEdit ? `${N.edit} Sửa` : 'Mở'}</a><a class="sh-btn sh-btn-ghost sh-btn-sm" href="/quan-tri/xem-truoc/${p.id}?game=${esc(K.gameId())}">${N.eye} Xem</a>${duyet ? `<button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-danger" data-del="${p.id}">Xoá</button>` : ''}</div></td></tr>`;
  }).join('')}
${rows.length ? '' : emptyCell(6, I.news, all.length ? 'Không có bài nào khớp bộ lọc' : 'Chưa có bài nào', all.length ? 'Đổi trạng thái, mục hoặc trang để xem bài khác.' : 'Bấm Viết bài mới để bắt đầu. Bài mới lưu ở dạng Nháp.')}
</tbody></table></div>`;
      K.paintHead();
      $$('[data-st]').forEach((b) => b.addEventListener('click', () => { listView.state = b.getAttribute('data-st'); draw(); }));
      $('#fcat').addEventListener('change', (e) => { listView.cat = e.target.value; draw(); $('#fcat').focus(); });
      if ($('#fsite')) $('#fsite').addEventListener('change', (e) => { listView.site = e.target.value; draw(); $('#fsite').focus(); });
      const rl = $('#list-reload'); if (rl) rl.addEventListener('click', () => renderList());
      // people who may delete do it straight from the list: first click asks, second click (within 4 s) moves it to the trash
      $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
        if (!armDelete(b, 'Xoá', 'Bấm lần nữa')) return;
        const id = +b.getAttribute('data-del');
        const post = posts.find((x) => x.id === id);
        b.disabled = true;
        const res = await api('POST', `/bai/${id}/xoa`, { baseUpdatedAt: post.updatedAt });
        if (mine !== K.screen()) return;
        if (!res.ok) {
          if (res.status === 401) return;
          b.disabled = false; disarm(b);
          listErr = { msg: res.data.error || 'Không xoá được.', reload: res.status === 409 };
          $('#listErr').innerHTML = `<div class="sh-note danger" role="alert" style="margin-bottom:var(--s3)">${N.alert}<div>${esc(listErr.msg)}${listErr.reload ? ` <button type="button" class="sh-btn sh-btn-sm" id="list-reload">${N.refresh} Tải lại danh sách</button>` : ''}</div></div>`;
          const rl2 = $('#list-reload'); if (rl2) rl2.addEventListener('click', () => renderList());
          return;
        }
        posts.splice(posts.indexOf(post), 1);
        listErr = null;
        toast(`Đã chuyển “${post.title}” vào thùng rác`);
        draw();
      }));
    };
    draw();
  }

  // ---------- picture upload (cover, pictures in the text) ----------
  const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  // Sends one picture file; resolves its picture address, or null after showing why it failed.
  async function uploadPicture(file, say) {
    if (!file) return null;
    if (!UPLOAD_TYPES.includes(file.type)) { say('Chỉ nhận ảnh JPG, PNG hoặc WEBP.'); return null; }
    if (file.size > 5 * 1024 * 1024) { say(`Ảnh nặng ${(file.size / 1048576).toFixed(1)} MB, quá giới hạn 5 MB. Hãy giảm kích thước (khuyên dùng 1200×675) rồi tải lại.`); return null; }
    if (file.size > 2 * 1024 * 1024) toast(`Ảnh nặng ${(file.size / 1048576).toFixed(1)} MB, trang sẽ tải chậm hơn. Nên nén xuống dưới 1 MB nếu được.`);
    let res;
    try {
      res = await fetch('/quan-tri/api' + K.gp('/anh'), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type }, body: file });
    } catch (e) {
      say('Không tải được ảnh lên (mất kết nối). Thử lại.');
      return null;
    }
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'Máy chủ trả lời lạ (' + res.status + ').' }; }
    if (res.status === 401) { K.loginAgain(data.error); return null; }
    if (!res.ok) { say(data.error || 'Không tải được ảnh lên.'); return null; }
    return data.url;
  }

  // ---------- editor ----------
  async function renderEditor(id) {
    K.cleanupEditor();
    if (!id) return drawEditor(null, '', []);
    const mine = K.screen();
    app.innerHTML = `${header()}<main class="wrap"><p class="sh-hint" style="padding:40px 0">Đang mở bài…</p></main>`;
    const r = await api('GET', '/bai/' + id);
    if (mine !== K.screen() || !K.me()) return;
    if (!r.ok) {
      if (r.status !== 401) $('main').innerHTML = `<div class="sh-note danger" role="alert">${N.alert}<div>${esc(r.data.error)} <a href="${gh()}">Về danh sách</a></div></div>`;
      return;
    }
    drawEditor(r.data.post, r.data.lockedBy, r.data.history);
  }

  function drawEditor(post, lockedBy, versions) {
    K.cleanupEditor();
    const manager = can('tin-tuc', 'duyet');
    const p = post ? Object.assign({}, post) : { id: 0, slug: '', title: '', category: CATS[0].id, cover: '', pinned: false, status: 'draft', publishAt: null, summary: '', content: '', reviewNote: '' };
    const st = post ? stateOf(post) : 'draft';
    const live = !!post && st === 'published';
    const editable = manager || !post || post.status === 'draft';
    // a new article has no site until the writer picks one; an existing one shows where it is now
    const site0 = post ? siteOfPost(post) : '';
    let slugTouched = !!post;
    const mode0 = st === 'scheduled' ? 'scheduled' : st === 'published' ? 'now' : 'draft';
    const defaultWhen = post && st === 'scheduled' ? post.publishAt.slice(0, 16) : siteNowLocal(Date.now() + 86400e3).slice(0, 11) + '20:00';
    const first = !post || post.status === 'draft' ? ['Lưu nháp', 'Chỉ nhóm thấy'] : post.status === 'pending' ? ['Giữ ở chờ duyệt', 'Chưa hiện trên trang'] : ['Gỡ khỏi trang tin', 'Bài về Nháp, người chơi không thấy nữa'];
    const lastSave = post ? String(post.updatedAt || '').slice(11, 16) : '';
    K.setCrumb(post ? (editable ? 'Sửa bài' : 'Xem bài') : 'Viết bài mới');

    let publishBox;
    if (manager) {
      publishBox = `<div class="nw-opts" role="radiogroup" aria-label="Trạng thái khi lưu">
<label class="nw-opt"><input type="radio" name="e-mode" value="draft"${mode0 === 'draft' ? ' checked' : ''}><span><b>${first[0]}</b><small>${first[1]}</small></span></label>
<label class="nw-opt"><input type="radio" name="e-mode" value="now"${mode0 === 'now' ? ' checked' : ''}><span><b>${live ? 'Đang hiện trên trang tin' : 'Đăng ngay'}</b><small>${live ? 'Lưu là cập nhật bài đang hiện' : 'Hiện ngay trên trang tin'}</small></span></label>
<label class="nw-opt"><input type="radio" name="e-mode" value="scheduled"${mode0 === 'scheduled' ? ' checked' : ''}><span><b>Hẹn giờ đăng</b><small>Tự hiện vào giờ đã chọn</small></span></label></div>
<div class="nw-when" id="e-whenbox"${mode0 === 'scheduled' ? '' : ' hidden'}><label class="nw-lbl" for="e-when">Thời điểm đăng (giờ Việt Nam)</label><input type="datetime-local" id="e-when" class="sh-input" value="${esc(defaultWhen)}"></div>
<label class="nw-ckrow"><input type="checkbox" id="e-pin"${p.pinned ? ' checked' : ''}><span>Ghim lên đầu mục<small>Bỏ ghim bài đang ghim cùng mục</small></span></label>
<p class="nw-help">Nút ở thanh trên đổi chữ theo lựa chọn này.</p>`;
    } else if (editable) {
      publishBox = '<p class="sh-muted">Bài cần người có quyền <b>Duyệt đăng</b> xem trước khi hiện trên trang tin. Viết xong bấm <b>Gửi duyệt</b> ở thanh trên.</p>';
    } else if (post.status === 'pending') {
      publishBox = '<p>Bài đang <b>chờ duyệt</b>. Muốn sửa thì rút về nháp (bài sẽ không còn trong hàng chờ).</p>';
    } else {
      publishBox = `<p>Bài ${st === 'scheduled' ? 'đã hẹn giờ đăng' : 'đã đăng'}, chỉ người có quyền Duyệt đăng sửa được.</p>`;
    }

    const returnBox = manager && post && post.status === 'pending'
      ? `<section class="sh-card"><div class="sh-card-h"><h2>Trả lại cho người viết</h2></div><div class="sh-card-b">
<label class="sh-sr" for="e-note">Ghi chú cho người viết</label><textarea id="e-note" class="sh-input" rows="3" maxlength="300" placeholder="Cần sửa gì? Ví dụ: thiếu ảnh bìa, sai ngày sự kiện…"></textarea>
<div class="nw-err" id="e-noteerr" hidden>Ghi chú cho người viết biết cần sửa gì.</div>
<div style="margin-top:var(--s3)"><button type="button" class="sh-btn" id="e-return" data-ed="return">${N.undo} Trả lại</button></div></div></section>` : '';
    const siteBox = SITES.length ? `<section class="sh-card"><div class="sh-card-h"><h2>Đăng lên</h2></div><div class="sh-card-b">
<div class="nw-opts" role="radiogroup" aria-label="Đăng lên trang">${SITES.map((s) => `<label class="nw-opt"><input type="radio" name="e-site" value="${s.id}"${site0 === s.id ? ' checked' : ''}${editable ? '' : ' disabled'}><span><b>${esc(s.name)}</b><small class="sh-mono">${esc(s.hint)}</small></span></label>`).join('')}</div>
${site0 ? '' : '<p class="nw-help" id="e-sitehint">Chọn một trang, bài chỉ hiện ở trang đó.</p>'}</div></section>` : '';
    const catBox = `<section class="sh-card"><div class="sh-card-h"><h2>Mục</h2></div><div class="sh-card-b"><div class="nw-choice" role="radiogroup" aria-label="Mục">${CATS.map((c) => `<label><input type="radio" name="e-cat" value="${c.id}"${p.category === c.id ? ' checked' : ''}${editable ? '' : ' disabled'}>${esc(c.name)}</label>`).join('')}</div></div></section>`;
    const historyBox = post && versions.length
      ? `<section class="sh-card"><div class="sh-card-h"><h2>Lịch sử</h2><span class="sh-r sh-faint" style="font-size:var(--text-xs)">${versions.length} bản gần nhất</span></div><div class="sh-card-b" style="padding-block:var(--s1)"><ul class="nw-hist">${versions.map((h, i) => `<li>${avatar(h.actor)}<span class="nw-h-t">${esc(h.actor)} ${esc(ACTION_WORDS[h.action] || h.action)}<small>${fmtTime(h.savedAt)}${i === 0 ? ', bản hiện tại' : ''}</small></span>${i === 0 || !editable ? '' : `<button type="button" class="sh-btn sh-btn-ghost sh-btn-xs" data-rev="${esc(h.rev)}" title="Đưa bản này vào khung soạn, bấm Lưu mới giữ">${N.history} Nạp</button>`}</li>`).join('')}</ul></div></section>` : '';
    const dangerBox = manager && post
      ? `<section class="sh-card nw-danger-card"><div class="sh-card-h"><h2>Xoá bài</h2></div><div class="sh-card-b"><p class="sh-muted" style="margin:0 0 var(--s3)">Bài chuyển vào Thùng rác (khôi phục được khi cần).</p><button type="button" class="sh-btn sh-btn-ghost sh-danger" id="e-del" data-ed="del">${I.trash} Xoá bài</button></div></section>` : '';
    const pinBadge = post && post.pinned ? `<span class="sh-badge outline">${N.pin} Ghim</span>` : '';

    app.innerHTML = `${header()}<main class="wrap">
<div class="nw-edbar">
<div class="nw-edbar-l"><a class="sh-btn sh-btn-ghost sh-btn-icon" href="${gh()}" aria-label="Về danh sách bài" title="Về danh sách bài">${N.back}</a>
<div><h1>${post ? (editable ? 'Sửa bài' : 'Xem bài') : 'Viết bài mới'}</h1>
<div class="nw-edbar-meta">${post ? `<span class="sh-badge dot ${STATE_CLS[st]}">${STATE[st]}</span>${post.publishAt && (st === 'published' || st === 'scheduled') ? `<span>${st === 'scheduled' ? 'đăng lúc' : 'đăng'} ${fmtTime(post.publishAt)}</span>` : ''}${pinBadge}` : '<span>Bài mới lưu ở dạng Nháp, chưa hiện trên trang</span>'}</div></div></div>
<div class="nw-edbar-r"><span class="nw-save-st" id="e-savest" role="status" aria-live="polite"></span><span class="nw-acts" id="e-acts"></span></div>
</div>
<div class="sh-stack" id="e-banners"><div id="e-lockbar"></div>${p.status === 'draft' && p.reviewNote ? `<div class="sh-note warn">${N.undo}<div><b>Bài bị trả lại:</b> ${esc(p.reviewNote)}</div></div>` : ''}<div id="e-errbox"></div></div>
<div class="nw-ed">
<section class="sh-card nw-paper" aria-label="Nội dung bài">
<label class="sh-sr" for="e-title">Tiêu đề</label>
<textarea id="e-title" class="nw-title" rows="1" maxlength="150" placeholder="Tiêu đề bài, ví dụ: Khai mở máy chủ S2 Trường Bản">${esc(p.title)}</textarea>
<div class="nw-slug">${N.link}<span id="e-addr">${esc(addrPrefix(site0 || 'chinh'))}</span><input id="e-slug" value="${esc(p.slug)}" aria-label="Đường dẫn bài" placeholder="tu-dong-tao-tu-tieu-de" maxlength="80" spellcheck="false"></div>
<div class="nw-sum"><label for="e-sum">Tóm tắt <span>, hiện trên thẻ bài và khi chia sẻ</span></label>
<textarea id="e-sum" class="sh-input" rows="2" maxlength="220" placeholder="Một hai câu nói bài này có gì cho người chơi" aria-describedby="e-count">${esc(p.summary)}</textarea><span class="nw-count" id="e-count"></span></div>
<div class="nw-lbl" id="e-bodylbl">Nội dung</div>
<div class="nw-tb" role="toolbar" aria-label="Định dạng nội dung"${editable ? '' : ' hidden'}>
<button type="button" data-cmd="formatBlock" data-val="P">Đoạn văn</button><button type="button" data-cmd="formatBlock" data-val="H2">Tiêu đề lớn</button><button type="button" data-cmd="formatBlock" data-val="H3">Tiêu đề nhỏ</button>
<span class="sep" aria-hidden="true"></span>
<button type="button" data-cmd="bold" aria-label="In đậm" title="In đậm"><span class="bb" aria-hidden="true">B</span></button><button type="button" data-cmd="italic" aria-label="In nghiêng" title="In nghiêng"><span class="ii" aria-hidden="true">I</span></button>
<button type="button" data-cmd="insertUnorderedList" aria-label="Danh sách chấm" title="Danh sách chấm">${N.ul}</button><button type="button" data-cmd="insertOrderedList" aria-label="Danh sách số" title="Danh sách số">${N.ol}</button>
<span class="sep" aria-hidden="true"></span>
<button type="button" data-pop="link" aria-expanded="false" aria-label="Liên kết" title="Liên kết">${N.link}<span class="lb">Liên kết</span></button>
<button type="button" data-pop="image" aria-expanded="false" aria-label="Ảnh" title="Ảnh">${N.image}<span class="lb">Ảnh</span></button>
<button type="button" data-ins="table" aria-label="Chèn bảng" title="Chèn bảng">${N.table}<span class="lb">Bảng</span></button>
<button type="button" data-ins="gift" aria-label="Chèn ô giftcode" title="Chèn ô giftcode">${N.gift}<span class="lb">Ô giftcode</span></button>
<button type="button" data-ins="note" aria-label="Chèn ô lưu ý" title="Chèn ô lưu ý">${N.alert}<span class="lb">Lưu ý</span></button>
</div>
<div id="e-pop"></div>
<div class="nw-ce" id="e-body" contenteditable="${editable ? 'true' : 'false'}" role="textbox" aria-multiline="true" aria-labelledby="e-bodylbl" data-ph="Bắt đầu viết… Dùng “Tiêu đề lớn” để chia mục, mục lục bên cạnh bài sẽ tự tạo từ các tiêu đề này."></div>
</section>
<aside class="nw-rail" aria-label="Thiết lập bài">
<section class="sh-card"><div class="sh-card-h"><h2>Đăng bài</h2></div><div class="sh-card-b">${publishBox}</div></section>
${returnBox}${siteBox}${catBox}
<section class="sh-card"><div class="sh-card-h"><h2>Ảnh bìa</h2></div><div class="sh-card-b" id="e-coverbox"></div></section>
<section class="sh-card"><div class="sh-card-h"><h2>Khi chia sẻ lên Facebook</h2></div><div class="sh-card-b"><div class="nw-fb" id="e-fb"></div></div></section>
${historyBox}${dangerBox}
</aside>
</div></main>`;

    const title = $('#e-title'), slug = $('#e-slug'), sum = $('#e-sum'), body = $('#e-body');
    body.innerHTML = p.content;
    [title, slug, sum].forEach((el) => { el.disabled = !editable; });
    const mode = () => { const r = $('input[name="e-mode"]:checked'); return r ? r.value : 'draft'; };
    const cat = () => $('input[name="e-cat"]:checked').value;
    const siteVal = () => { const r = $('input[name="e-site"]:checked'); return r ? r.value : null; };
    const collect = () => ({
      title: title.value.trim(), slug: slug.value || slugify(title.value), summary: sum.value.trim(), content: body.innerHTML,
      category: cat(), site: siteVal(), cover: p.cover || '', pinned: !!($('#e-pin') && $('#e-pin').checked),
    });
    let saved = JSON.stringify(collect());
    const isDirty = () => editable && JSON.stringify(collect()) !== saved;
    K.setDirty(isDirty);

    // "Đã lưu lúc …" / "Có thay đổi chưa lưu"
    const saveSt = $('#e-savest');
    const syncSave = (state) => {
      if (!saveSt) return;
      if (state === 'saving') { saveSt.className = 'nw-save-st'; saveSt.textContent = 'Đang lưu…'; return; }
      if (!editable) { saveSt.className = 'nw-save-st'; saveSt.innerHTML = `${I.lock}<span>Chỉ xem</span>`; return; }
      if (isDirty()) { saveSt.className = 'nw-save-st dirty'; saveSt.innerHTML = '<span class="nw-dot warn" aria-hidden="true"></span><span>Có thay đổi chưa lưu</span>'; return; }
      saveSt.className = 'nw-save-st';
      saveSt.innerHTML = post ? `<span class="nw-dot ok" aria-hidden="true"></span><span><span class="long">Đã lưu lúc </span>${esc(lastSave)}</span>` : '<span class="sh-faint">Chưa lưu lần nào</span>';
    };
    const changed = () => syncSave();

    // error / conflict banner
    const errBox = $('#e-errbox');
    const clearErr = () => { errBox.innerHTML = ''; };
    const showErr = (msg, reload) => {
      errBox.innerHTML = `<div class="sh-note danger" role="alert">${N.alert}<div>${esc(msg)}${reload ? ` <button type="button" class="sh-btn sh-btn-sm" id="e-reload">${N.refresh} Tải lại bản mới</button>` : ''}</div></div>`;
      const b = $('#e-reload');
      if (b) b.addEventListener('click', () => { K.setDirty(() => false); renderEditor(post.id); });
      errBox.scrollIntoView({ block: 'nearest' });
    };

    // the buttons of the action bar follow the person and the choice in "Đăng bài"
    const renderActs = () => {
      let h = `<button type="button" class="sh-btn" id="e-prev" data-ed="preview">${N.eye} Xem trước</button>`;
      if (manager) {
        const lb = {
          draft: !post || post.status === 'draft' ? 'Lưu nháp' : post.status === 'pending' ? 'Lưu' : 'Gỡ bài',
          now: live ? 'Cập nhật bài' : 'Đăng bài',
          scheduled: st === 'scheduled' ? 'Cập nhật giờ hẹn' : 'Hẹn giờ đăng',
        }[mode()];
        h += `<button type="button" class="sh-btn ${lb === 'Gỡ bài' ? 'sh-btn-danger' : 'sh-btn-primary'}" id="e-save" data-ed="save">${lb === 'Gỡ bài' ? N.eyeoff : mode() === 'scheduled' ? N.clock : I.check} ${lb}</button>`;
      } else if (editable) {
        h += `<button type="button" class="sh-btn" id="e-draft" data-ed="draft">Lưu nháp</button><button type="button" class="sh-btn sh-btn-primary" id="e-send" data-ed="send">${N.send} Gửi duyệt</button>`;
      } else if (post.status === 'pending') {
        h += `<button type="button" class="sh-btn sh-btn-primary" id="e-back" data-ed="back">${N.undo} Rút về nháp để sửa</button>`;
      }
      $('#e-acts').innerHTML = h;
    };

    const syncFb = () => {
      $('#e-count').textContent = `${sum.value.length}/160`;
      $('#e-count').classList.toggle('over', sum.value.length > 160);
      $('#e-fb').innerHTML = `${p.cover ? `<img src="${esc(p.cover)}" alt="">` : '<div class="nw-fb-empty"></div>'}<div class="nw-fb-b"><small>${esc(HOST)}</small><b>${esc(title.value || 'Tiêu đề bài viết')}</b><p>${esc(sum.value || 'Tóm tắt sẽ hiện ở đây')}</p></div>`;
    };
    const grow = () => { title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px'; };

    // cover
    const drawCover = () => {
      $('#e-coverbox').innerHTML = `${p.cover ? `<img class="nw-cover-big" id="e-cover" src="${esc(p.cover)}" alt="Ảnh bìa đang chọn">` : '<div class="nw-cover-empty">Chưa có ảnh bìa. Cần có trước khi gửi duyệt hoặc đăng.</div>'}
${editable ? `<div class="nw-pics" role="group" aria-label="Ảnh có sẵn">${LIB.map((src) => `<button type="button" class="nw-pic${p.cover === src ? ' on' : ''}" data-cover="${esc(src)}" aria-label="Chọn ảnh ${esc(src.split('/').pop())}" aria-pressed="${p.cover === src}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>
<label class="sh-btn sh-btn-sm nw-upl">${N.upload} Tải ảnh bìa từ máy<input type="file" id="e-file" accept="image/jpeg,image/png,image/webp"></label>
<p class="nw-help" style="margin-top:var(--s2)!important">JPG, PNG, WEBP. Tối đa 5 MB, nên dùng 1200×675.</p>` : ''}`;
      $$('[data-cover]').forEach((x) => x.addEventListener('click', () => setCover(x.getAttribute('data-cover'))));
      const f = $('#e-file');
      if (f) {
        f.addEventListener('change', async (e) => {
          const input = e.target;
          clearErr();
          input.disabled = true;
          const mine = K.screen();
          const url = await uploadPicture(input.files[0], showErr);
          if (mine !== K.screen()) return;
          input.disabled = false; input.value = '';
          if (url) { setCover(url); toast('Đã tải ảnh bìa lên'); }
        });
      }
    };
    const setCover = (src) => { p.cover = src; drawCover(); syncFb(); changed(); };

    $$('input[name="e-mode"]').forEach((r) => r.addEventListener('change', () => { $('#e-whenbox').hidden = mode() !== 'scheduled'; renderActs(); }));
    title.addEventListener('input', () => { if (!slugTouched) slug.value = slugify(title.value); grow(); syncFb(); changed(); });
    slug.addEventListener('input', () => { slugTouched = true; changed(); });
    slug.addEventListener('change', () => { slug.value = slugify(slug.value); changed(); });
    sum.addEventListener('input', () => { syncFb(); changed(); });
    body.addEventListener('input', changed);
    $$('input[name="e-site"]').forEach((r) => r.addEventListener('change', () => {
      if ($('#e-addr')) $('#e-addr').textContent = addrPrefix(siteVal());
      const h = $('#e-sitehint'); if (h) h.remove();
      changed();
    }));
    $$('input[name="e-cat"]').forEach((r) => r.addEventListener('change', changed));
    if ($('#e-pin')) $('#e-pin').addEventListener('change', changed);

    // formatting: execCommand on the remembered selection
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* older browsers */ }
    let range = null;
    const keep = () => { const s = getSelection(); if (s.rangeCount && body.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
    ['keyup', 'mouseup', 'blur'].forEach((ev) => body.addEventListener(ev, keep));
    const restore = () => { body.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
    const run = (cmd, val) => { restore(); document.execCommand(cmd, false, val); keep(); changed(); };
    const noSteal = (b) => b.addEventListener('mousedown', (e) => e.preventDefault());
    $$('.nw-tb button').forEach(noSteal);
    $$('[data-cmd]').forEach((b) => b.addEventListener('click', () => run(b.getAttribute('data-cmd'), b.getAttribute('data-val') ? `<${b.getAttribute('data-val')}>` : null)));
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
      keep(); changed();
    };
    $$('[data-ins]').forEach((b) => b.addEventListener('click', () => insertBlock(SNIP[b.getAttribute('data-ins')])));
    const pop = $('#e-pop');
    const closePop = () => { pop.innerHTML = ''; pop.removeAttribute('data-kind'); $$('[data-pop]').forEach((b) => b.setAttribute('aria-expanded', 'false')); };
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
        keep(); changed();
      } else {
        insertBlock(`<figure><img src="${esc(src)}" alt=""><figcaption>Chú thích ảnh…</figcaption></figure>`);
      }
      closePop();
    };
    async function openPicturePop() {
      const inCell = !!caretCell();
      const draw = (uploads, note) => {
        const thumbs = (list) => `<div class="nw-pics">${list.map((src) => `<button type="button" class="nw-pic" data-put="${esc(src)}" aria-label="Chèn ${esc(src.split('/').pop())}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>`;
        pop.innerHTML = `<div class="nw-pop" role="group" aria-label="Chèn ảnh">
<div class="nw-pop-row"><span class="sh-muted" style="font-size:var(--text-sm);flex:1">${inCell ? 'Con trỏ đang ở <b>ô bảng</b>: ảnh chèn gọn trong ô (hợp cho icon vật phẩm).' : 'Bấm ảnh để chèn vào chỗ con trỏ.'}</span>
<label class="sh-btn sh-btn-sm nw-upl">${N.upload} Tải ảnh từ máy<input type="file" id="e-pic-file" accept="image/jpeg,image/png,image/webp"></label><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-btn-icon" data-ed="popX" aria-label="Đóng">${N.x}</button></div>
${note ? `<p>${esc(note)}</p>` : ''}
${uploads.length ? `<h4>Ảnh đã tải lên</h4>${thumbs(uploads)}` : ''}<h4>Ảnh trang chủ</h4>${thumbs(LIB)}</div>`;
        $$('[data-put]', pop).forEach((x) => { noSteal(x); x.addEventListener('click', () => putPicture(x.getAttribute('data-put'))); });
        $('#e-pic-file').addEventListener('change', async (e) => {
          const mine = K.screen();
          e.target.disabled = true;
          const url = await uploadPicture(e.target.files[0], (msg) => toast(msg));
          if (mine !== K.screen() || pop.getAttribute('data-kind') !== 'image') return;
          if (url) putPicture(url); else { e.target.disabled = false; e.target.value = ''; }
        });
      };
      draw([], 'Đang tải danh sách ảnh đã tải lên…');
      const mine = K.screen();
      const r = await api('GET', '/anh');
      if (mine !== K.screen() || pop.getAttribute('data-kind') !== 'image') return;
      draw(r.ok ? r.data.items.map((x) => x.url) : [], r.ok ? '' : (r.data.error || ''));
    }
    $$('[data-pop]').forEach((b) => {
      noSteal(b);
      b.addEventListener('click', () => {
        const kind = b.getAttribute('data-pop');
        if (pop.getAttribute('data-kind') === kind) return closePop();
        closePop();
        pop.setAttribute('data-kind', kind);
        b.setAttribute('aria-expanded', 'true');
        if (kind === 'link') {
          pop.innerHTML = `<div class="nw-pop" role="group" aria-label="Chèn liên kết"><div class="nw-pop-row"><label class="sh-sr" for="e-url">Địa chỉ liên kết</label><input class="sh-input" id="e-url" placeholder="https://… (bôi đen chữ trước khi chèn)"><button type="button" class="sh-btn sh-btn-primary sh-btn-sm" id="e-url-ok">Chèn liên kết</button><button type="button" class="sh-btn sh-btn-ghost sh-btn-sm sh-btn-icon" data-ed="popX" aria-label="Đóng">${N.x}</button></div></div>`;
          noSteal($('#e-url-ok'));
          $('#e-url-ok').addEventListener('click', () => {
            const u = $('#e-url').value.trim();
            if (/^https:\/\/\S+$/.test(u)) { run('createLink', u); closePop(); } else toast('Liên kết cần bắt đầu bằng https://');
          });
          $('#e-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#e-url-ok').click(); } });
          $('#e-url').focus();
        } else {
          openPicturePop();
        }
      });
    });
    const onKey = (e) => { if (e.key === 'Escape' && pop.getAttribute('data-kind') && !K.dialogOpen()) closePop(); };
    document.addEventListener('keydown', onKey);

    // saving
    const busy = (on) => $$('#e-acts button, .nw-rail button').forEach((b) => { b.disabled = on; });
    async function act(action, extra) {
      clearErr();
      const bodyData = Object.assign(collect(), { action, baseUpdatedAt: post ? post.updatedAt : undefined }, extra || {});
      busy(true); syncSave('saving');
      const mine = K.screen();
      const r = await api('POST', post ? '/bai/' + post.id : '/bai', bodyData);
      if (mine !== K.screen()) { if (r.ok) toast('Đã lưu bài “' + r.data.post.title + '”'); return r.ok ? r.data.post : null; }
      busy(false);
      if (!r.ok) { syncSave(); if (r.status !== 401) showErr(r.data.error || 'Không lưu được.', r.status === 409); return null; }
      const newPost = r.data.post;
      if (!post) { try { history.replaceState(null, '', gh('/sua/' + newPost.id)); K.markHash(); } catch (e) { /* ignore */ } }
      const s2 = stateOf(newPost);
      toast({ luu: 'Đã lưu', 'gui-duyet': 'Đã gửi duyệt. Người duyệt sẽ xem bài', 'rut-ve': 'Đã rút bài về nháp', 'dang-ngay': live ? 'Đã cập nhật bài trên trang tin' : 'Đã đăng, bài hiện trên trang Tin tức', 'hen-gio': `Đã hẹn đăng lúc ${fmtTime(newPost.publishAt)}`, 'tra-lai': 'Đã trả lại bài cho người viết', 'go-bai': 'Đã gỡ bài khỏi trang tin' }[action] || STATE[s2]);
      drawEditor(newPost, '', r.data.history || []);
      return newPost;
    }
    const saveClick = () => {
      const m = mode();
      if (m === 'now') return act('dang-ngay');
      if (m === 'scheduled') {
        const when = $('#e-when').value;
        if (!when) return showErr('Chọn ngày giờ đăng.');
        return act('hen-gio', { publishAt: when });
      }
      return act(live || st === 'scheduled' ? 'go-bai' : 'luu');
    };
    // preview: the saved article on its real page, opened in this tab (its "Về trang sửa bài" link comes back here).
    // Unsaved changes are saved first — except on a published or scheduled article, where saving would change the live
    // site and leaving would lose them: the editor stays and asks for a save first.
    const preview = async () => {
      clearErr();
      if (!title.value.trim()) return showErr('Nhập tiêu đề để xem trước.');
      let target = post;
      if (!post || isDirty()) {
        if (live || st === 'scheduled') return showErr('Bài có thay đổi chưa lưu. Lưu thay đổi trước rồi mới bấm Xem trước (bài đã đăng hoặc hẹn giờ nên không tự lưu).');
        target = await act('luu');
      }
      if (!target) return;
      location.href = '/quan-tri/xem-truoc/' + target.id + '?game=' + encodeURIComponent(K.gameId());
    };
    $('main').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-ed]');
      if (!el || el.disabled) return;
      const k = el.getAttribute('data-ed');
      if (k === 'preview') return preview();
      if (k === 'save') return saveClick();
      if (k === 'draft') return act('luu');
      if (k === 'send') return act('gui-duyet');
      if (k === 'back') return act('rut-ve');
      if (k === 'popX') return closePop();
      if (k === 'return') {
        const note = $('#e-note').value.trim();
        $('#e-noteerr').hidden = !!note;
        if (!note) { $('#e-note').setAttribute('aria-invalid', 'true'); $('#e-note').focus(); return; }
        return act('tra-lai', { note });
      }
      if (k === 'del') {
        if (!armDelete(el, 'Xoá bài', 'Bấm lần nữa để xoá')) return;
        busy(true);
        const r = await api('POST', `/bai/${post.id}/xoa`, { baseUpdatedAt: post.updatedAt });
        busy(false);
        if (!r.ok) { disarm(el); if (r.status !== 401) showErr(r.data.error || 'Không xoá được.', r.status === 409); return; }
        K.setDirty(() => false);
        if (timer) { clearInterval(timer); timer = null; } // the article is gone: nothing left to release
        toast('Đã xoá bài, bài nằm trong Thùng rác');
        location.hash = gh();
      }
    });
    // bring back an older version into the form (saved only when the user saves)
    $$('[data-rev]').forEach((b) => b.addEventListener('click', async () => {
      const mine = K.screen();
      const r = await api('GET', `/bai/${post.id}/lich-su/${b.getAttribute('data-rev')}`);
      if (mine !== K.screen()) return;
      if (!r.ok) { if (r.status !== 401) showErr(r.data.error); return; }
      const old = r.data.revision.post;
      title.value = old.title; slug.value = old.slug; sum.value = old.summary || ''; body.innerHTML = old.content;
      const c = $(`input[name="e-cat"][value="${old.category}"]`); if (c) c.checked = true;
      const s = $(`input[name="e-site"][value="${siteOfPost(old)}"]`); if (s) s.checked = true;
      if (old.cover) setCover(old.cover);
      grow(); syncFb(); changed();
      toast(`Đã nạp bản lúc ${fmtTime(r.data.revision.savedAt)}. Bấm Lưu để giữ bản này.`);
    }));

    // "someone else is editing" — heartbeat while the editor is open
    let timer = null;
    const lockGame = K.gameId(); // the release must go to the game the article was opened in, even after the address moved on
    if (post && editable) {
      const lockbar = $('#e-lockbar');
      const showLock = (name) => { lockbar.innerHTML = name ? `<div class="sh-note warn" role="status">${I.users}<div><b>${esc(name)}</b> đang mở bài này. Nếu cả hai cùng sửa, người lưu sau sẽ được báo để tải lại. Hãy báo ${esc(name)} trước khi sửa.</div></div>` : ''; };
      showLock(lockedBy);
      const beat = async () => { const r = await api('POST', `/bai/${post.id}/khoa`, {}); if (r.ok) showLock(r.data.lockedBy); };
      beat();
      timer = setInterval(beat, 30000);
    }
    K.setLeaving(() => {
      document.removeEventListener('keydown', onKey);
      if (!timer) return;
      clearInterval(timer);
      try { fetch(`/quan-tri/api/g/${lockGame}/bai/${post.id}/khoa`, { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{"release":true}' }); } catch (e) { /* page closing */ }
    });
    renderActs(); drawCover(); syncFb(); grow(); syncSave();
    if (!post) title.focus();
  }

  return { renderList, renderEditor };
}
