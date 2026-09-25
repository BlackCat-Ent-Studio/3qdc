// news-pages.mjs — HTML for /tin-tuc (list), /tin-tuc/<slug> (article) and the not-found page.
// The article page is rendered completely on the server so Facebook reads its share tags (og:*).
// The list page ships the visible articles as JSON and draws tabs / search / "Xem thêm bài" in the browser.
import { SITE_ORIGIN, CATS, DEFAULT_COVER, catName } from './news-config.mjs';
import { esc, pageShell } from './news-theme.mjs';

const KV = '/3qdc-vi/home/anh-nen-slogan-vi.webp';

// dd/mm/yyyy straight from the stored ISO text (always +07:00, checked by the store); digits and slashes only
export const dmy = (iso) => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
// covers must be same-site paths ("/..."): not protocol-relative ("//", "/\"), no spaces, quotes, angle brackets or backslashes
const coverOf = (p) => (typeof p.cover === 'string' && /^\/(?![/\\])[^\s\\"'<>]*$/.test(p.cover) ? p.cover : DEFAULT_COVER);
const abs = (path) => SITE_ORIGIN + path;
const readMinutes = (html) => Math.max(1, Math.round(html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 220));

export function shareTags({ title, description, url, image, type }) {
  return [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="3Q Đại Chiến">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('\n');
}

// Numbers the article's h2 headings (muc-1, muc-2…, replacing any attributes) and returns the table of contents.
// Contents text = heading text without tags; leftover angle brackets are encoded (entities are kept as they are).
function withHeadingIds(content) {
  const toc = [];
  const html = content.replace(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/g, (m, inner) => {
    const id = 'muc-' + (toc.length + 1);
    toc.push({ id, text: inner.replace(/<[^>]*>/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim() });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html, toc };
}

const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

// Browser side of the list page. Serialised into the page, never run on the server.
function listApp() {
  var DATA = JSON.parse(document.getElementById('news-data').textContent);
  var CATS = DATA.cats, POSTS = DATA.posts, ICON = DATA.icon;
  var view = { tab: DATA.muc, q: '', shown: 6 };
  var app = document.getElementById('news-app');
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function catName(id) { for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i].name; return ''; }
  function inTab(id) { return POSTS.filter(function (p) { return p.category === id; }); }
  function card(p) {
    return '<a class="card" href="/tin-tuc/' + esc(p.slug) + '"><img class="cover" loading="lazy" src="' + esc(p.cover) + '" alt="">'
      + '<div class="row"><span class="chip c-' + esc(p.category) + '">' + esc(catName(p.category)) + '</span><span class="meta">' + esc(p.date) + '</span></div>'
      + '<h3>' + esc(p.title) + '</h3><p>' + esc(p.summary) + '</p></a>';
  }
  function renderShell() {
    app.innerHTML = '<div class="toolbar"><div class="tabs" role="tablist" aria-label="Mục tin">'
      + CATS.map(function (c) {
        var on = c.id === view.tab;
        return '<button type="button" class="tab' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-tab="' + c.id + '">' + esc(c.name) + '<small>' + inTab(c.id).length + '</small></button>';
      }).join('')
      + '</div><label class="search">' + ICON + '<input id="news-q" type="search" autocomplete="off" aria-label="Tìm bài viết" placeholder="Tìm trong ' + esc(catName(view.tab).toLowerCase()) + '…"></label></div>'
      + '<div id="news-results"></div>';
    Array.prototype.forEach.call(app.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () {
        view.tab = b.getAttribute('data-tab'); view.q = ''; view.shown = 6;
        try { history.replaceState(null, '', '/tin-tuc?muc=' + view.tab); } catch (_) {}
        renderShell();
      });
    });
    // only the results redraw while typing, so Vietnamese input methods keep their composition
    document.getElementById('news-q').addEventListener('input', function (e) { view.q = e.target.value; view.shown = 6; renderResults(); });
    renderResults();
  }
  function renderResults() {
    var q = view.q.trim().toLowerCase();
    var list = inTab(view.tab);
    var found = q ? list.filter(function (p) { return (p.title + ' ' + p.summary).toLowerCase().indexOf(q) !== -1; }) : list;
    var feat = q ? null : (found.filter(function (p) { return p.pinned; })[0] || found[0] || null);
    var rest = found.filter(function (p) { return p !== feat; });
    var html = '';
    if (feat) {
      html += '<a class="feat" href="/tin-tuc/' + esc(feat.slug) + '"><img class="cover" src="' + esc(feat.cover) + '" alt="">'
        + '<div class="feat-body"><div class="feat-top">' + (feat.pinned ? '<span class="pin">Ghim</span>' : '')
        + '<span class="chip c-' + esc(feat.category) + '">' + esc(catName(feat.category)) + '</span><span class="meta">' + esc(feat.date) + '</span></div>'
        + '<h2>' + esc(feat.title) + '</h2><p>' + esc(feat.summary) + '</p><span class="read">Đọc bài →</span></div></a>';
    }
    if (!found.length) {
      html += '<div class="empty">' + (q
        ? 'Không tìm thấy bài nào có “' + esc(view.q) + '” trong mục ' + esc(catName(view.tab)) + '.'
        : 'Chưa có bài trong mục ' + esc(catName(view.tab)) + '. Bài mới sẽ hiện ở đây ngay khi được đăng.') + '</div>';
    }
    var visible = rest.slice(0, view.shown);
    if (visible.length) html += '<div class="grid">' + visible.map(card).join('') + '</div>';
    if (rest.length > view.shown) html += '<div class="more"><button type="button" class="btn btn-ghost" id="news-more">Xem thêm bài</button></div>';
    var box = document.getElementById('news-results');
    box.innerHTML = html;
    var more = document.getElementById('news-more');
    if (more) more.addEventListener('click', function () { view.shown += 6; renderResults(); });
  }
  renderShell();
}

export function renderListPage(visible, muc) {
  const data = {
    muc, cats: CATS, icon: SEARCH_ICON,
    posts: visible.map((p) => ({ slug: p.slug, title: p.title, category: p.category, summary: p.summary || '', cover: coverOf(p), date: dmy(p.publishAt), pinned: !!p.pinned })),
  };
  const title = 'Tin tức | 3Q Đại Chiến';
  const description = 'Thông báo, sự kiện và cẩm nang chính thức của 3Q Đại Chiến.';
  const main = `<section class="band" style="background-image:url('${KV}')"><div class="wrap">
<nav class="crumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">›</span><span>Tin tức</span></nav>
<h1>Tin tức</h1><p>${esc(description)}</p>
</div><div class="band-fade" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div></section>
<main class="wrap" id="news-app">
<noscript><div class="empty">${visible.length ? visible.map((p) => `<p><a href="/tin-tuc/${esc(p.slug)}">${esc(p.title)}</a> — ${dmy(p.publishAt)}</p>`).join('') : 'Chưa có bài viết.'}</div></noscript>
</main>`;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return pageShell({
    title, description, main,
    head: shareTags({ title, description, url: abs('/tin-tuc'), image: abs(KV), type: 'website' }),
    scripts: `<script type="application/json" id="news-data">${json}</script><script>(${listApp.toString()})();</script>`,
  });
}

const mini = (x) => `<a class="mini" href="/tin-tuc/${esc(x.slug)}"><img class="cover" loading="lazy" src="${esc(coverOf(x))}" alt=""><span><b>${esc(x.title)}</b><span class="meta">${dmy(x.publishAt)}</span></span></a>`;
const card = (x) => `<a class="card" href="/tin-tuc/${esc(x.slug)}"><img class="cover" loading="lazy" src="${esc(coverOf(x))}" alt="">
<div class="row"><span class="chip c-${esc(x.category)}">${esc(catName(x.category))}</span><span class="meta">${dmy(x.publishAt)}</span></div>
<h3>${esc(x.title)}</h3><p>${esc(x.summary || '')}</p></a>`;

// Adds a "Sao chép mã" button to every gift code box; the button is not part of the stored content.
function giftButtons() {
  Array.prototype.forEach.call(document.querySelectorAll('.prose .gift'), function (g) {
    var code = g.querySelector('code');
    if (!code) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Sao chép mã';
    b.setAttribute('data-copy', code.textContent.trim());
    g.appendChild(b);
  });
}

// visible = every article a visitor may see now, newest first (the article itself included)
export function renderDetailPage(post, visible) {
  const url = abs('/tin-tuc/' + post.slug);
  const cover = coverOf(post);
  const { html, toc } = withHeadingIds(post.content);
  const sameCat = visible.filter((x) => x.category === post.category);
  const i = sameCat.indexOf(post);
  const newer = i > 0 ? sameCat[i - 1] : null;
  const older = i >= 0 && i < sameCat.length - 1 ? sameCat[i + 1] : null;
  const related = sameCat.filter((x) => x !== post).slice(0, 4);
  const others = visible.filter((x) => x.category !== post.category).slice(0, 3);
  const description = post.summary || post.title;
  const shareFb = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);

  const main = `<main class="wrap">
<div class="d-head">
<nav class="crumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">›</span><a href="/tin-tuc?muc=${post.category}">Tin tức</a><span aria-hidden="true">›</span><span>${esc(catName(post.category))}</span></nav>
<h1>${esc(post.title)}</h1>
<div class="d-meta"><span class="chip c-${post.category}">${esc(catName(post.category))}</span><span>${dmy(post.publishAt)}</span>${post.author ? `<span>Đăng bởi ${esc(post.author)}</span>` : ''}<span>${readMinutes(post.content)} phút đọc</span></div>
</div>
<div class="d-cover"><img class="cover" src="${esc(cover)}" alt=""></div>
<div class="d-grid">
<div>
<article class="prose">${html}</article>
<div class="share"><span>Chia sẻ</span>
<a class="btn btn-ghost btn-sm" href="${esc(shareFb)}" target="_blank" rel="noopener">Facebook</a>
<button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(url)}">Sao chép link</button>
</div>
${newer || older ? `<nav class="pn" aria-label="Bài trước và sau">${older ? `<a href="/tin-tuc/${esc(older.slug)}"><small>← Bài trước</small><b>${esc(older.title)}</b></a>` : ''}${newer ? `<a class="nx" href="/tin-tuc/${esc(newer.slug)}"><small>Bài sau →</small><b>${esc(newer.title)}</b></a>` : ''}</nav>` : ''}
</div>
<aside class="aside">
${toc.length > 1 ? `<nav aria-label="Mục lục"><h2>Trong bài này</h2><ul class="toc">${toc.map((t) => `<li><a href="#${t.id}">${t.text}</a></li>`).join('')}</ul></nav>` : ''}
${related.length ? `<div><h2>Cùng mục ${esc(catName(post.category).toLowerCase())}</h2>${related.map(mini).join('')}</div>` : ''}
</aside>
</div>
${others.length ? `<h2 class="sec-title">Tin khác</h2><div class="grid">${others.map(card).join('')}</div>` : ''}
</main>`;

  return pageShell({
    title: `${post.title} | 3Q Đại Chiến`, description, main,
    head: shareTags({ title: post.title, description, url, image: abs(cover), type: 'article' }),
    scripts: `<script>(${giftButtons.toString()})();</script>`,
  });
}

export function renderNotFound() {
  const main = `<main class="wrap"><div class="empty" style="margin-top:60px">Bài viết này không tồn tại hoặc chưa được đăng.<br><br><a class="btn btn-ghost" href="/tin-tuc">Về trang Tin tức</a></div></main>`;
  return pageShell({ title: 'Không tìm thấy bài viết | 3Q Đại Chiến', description: 'Bài viết không tồn tại hoặc chưa được đăng.', head: '<meta name="robots" content="noindex">', main });
}
