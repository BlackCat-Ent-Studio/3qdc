// news-workflow.mjs — who may do what to an article, and what the article looks like afterwards. Pure functions: no
// files, no clock of their own (the caller passes `now`), so every role × status × action can be tested directly.
//
//  role     | may
//  editor   | create and edit drafts · send a draft for review · take a pending article back to draft
//  manager  | everything on every article: save, publish now, schedule, send back with a note, unpublish, pin, delete
import { SLUG_RE, SLUG_MAX, isCat, IMAGE_PATH_RE, TITLE_MAX, SUMMARY_MAX, CONTENT_MAX, SPLIT_SITES, isSite, siteOf } from './news-config.mjs';
import { cleanContent, textOf } from './news-sanitize.mjs';
import { PUBLISH_AT_RE, isValid } from './news-store.mjs';

// Labels the pages show for the three kinds of work (and "owner"). decide() and mayDelete() know only "manager" and
// "editor": the callers pass the news role an account holds in the game (grants.mjs newsRoleOf); any other gets refused.
export const ROLES = { owner: 'Chủ', manager: 'Quản lý', editor: 'Biên tập', phieu: 'Duyệt phiếu' };
export const ACTIONS = ['luu', 'gui-duyet', 'rut-ve', 'dang-ngay', 'hen-gio', 'tra-lai', 'go-bai'];

const fail = (status, error) => ({ status, error });

// Text fields: no control characters, surrounding spaces trimmed.
const plain = (v) => Array.from(String(v ?? ''), (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('').trim();

// Checks and normalises what the editor sent. Returns { fields } or { status, error }.
export function readFields(input, { posts, id }) {
  const title = plain(input.title);
  if (!title) return fail(400, 'Bài cần có tiêu đề.');
  if (title.length > TITLE_MAX) return fail(400, `Tiêu đề dài quá ${TITLE_MAX} ký tự.`);
  const slug = String(input.slug ?? '').trim();
  if (!slug || slug.length > SLUG_MAX || !SLUG_RE.test(slug)) {
    return fail(400, 'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang (tối đa 80 ký tự).');
  }
  const clash = posts.find((p) => p.slug === slug && p.id !== id);
  if (clash) return fail(400, `Đường dẫn “${slug}” đã dùng cho bài “${clash.title}”. Hãy đổi đường dẫn.`);
  const summary = plain(input.summary);
  if (summary.length > SUMMARY_MAX) return fail(400, `Tóm tắt dài quá ${SUMMARY_MAX} ký tự.`);
  if (!isCat(input.category)) return fail(400, 'Chọn mục cho bài.');
  if (SPLIT_SITES && !isSite(input.site)) return fail(400, 'Chọn trang đăng bài: Trang chính hoặc Trang phụ.');
  const cover = String(input.cover ?? '');
  if (cover && !IMAGE_PATH_RE.test(cover)) return fail(400, 'Ảnh bìa không hợp lệ.');
  const content = cleanContent(input.content);
  if (content.length > CONTENT_MAX) return fail(413, 'Nội dung quá dài.');
  const fields = { title, slug, summary, category: input.category, cover, content };
  // with the split switched off an article keeps whatever site it had
  if (SPLIT_SITES) fields.site = input.site;
  return { fields };
}

// What a visitor-facing article must have before it is sent for review or published.
function missingForPublishing(p) {
  const miss = [];
  if (!p.cover) miss.push('ảnh bìa');
  if (!p.summary) miss.push('tóm tắt');
  if (!textOf(p.content) && !/<img\s/.test(p.content)) miss.push('nội dung');
  return miss.length ? fail(400, `Cần có ${miss.join(', ')} trước khi gửi duyệt hoặc đăng — thiếu những phần này bài sẽ hiện trống trên trang tin và khi chia sẻ.`) : null;
}

// Turns a "YYYY-MM-DDTHH:mm" from the date picker (site time, +07:00) into the stored form; null if it is not a real date.
export function scheduleTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const stored = value + ':00+07:00';
  const t = Date.parse(stored);
  if (!Number.isFinite(t)) return null;
  // reject dates the parser rolled over (31 February → 3 March)
  const back = new Date(t + 7 * 3600e3).toISOString().slice(0, 16);
  return back === value && PUBLISH_AT_RE.test(stored) ? stored : null;
}

/**
 * Decides one save.
 *   user  { username, name, role }      cur  the stored article, or null when creating
 *   input { title, slug, summary, category, cover, content, pinned, publishAt, note, action }
 *   ctx   { posts, now (ms), nowText (site time with ms), nowPublish (site time, seconds), newId }
 * Returns { post, unpin: [ids] } or { status, error }.
 */
export function decide(user, cur, input, ctx) {
  const action = input.action;
  if (!ACTIONS.includes(action)) return fail(400, 'Thao tác không hợp lệ.');
  const manager = user.role === 'manager';
  const editor = user.role === 'editor';
  if (!manager && !editor) return fail(403, 'Tài khoản không có quyền.');
  const status = cur ? cur.status : null;
  const live = cur && status === 'published';

  // which actions each role may take from each state (null = a new article)
  const allowed = manager
    ? { luu: true, 'dang-ngay': true, 'hen-gio': true, 'rut-ve': status === 'pending', 'tra-lai': status === 'pending', 'go-bai': live, 'gui-duyet': false }
    : { luu: status === null || status === 'draft', 'gui-duyet': status === null || status === 'draft', 'rut-ve': status === 'pending' };
  if (!allowed[action]) {
    if (editor && (action === 'dang-ngay' || action === 'hen-gio')) return fail(403, 'Biên tập không đăng bài trực tiếp — hãy gửi duyệt để Quản lý đăng.');
    if (editor && status === 'pending') return fail(403, 'Bài đang chờ duyệt. Rút bài về nháp nếu cần sửa.');
    if (editor && status === 'published') return fail(403, 'Bài đã đăng — chỉ Quản lý sửa được.');
    if (manager && action === 'gui-duyet') return fail(400, 'Quản lý đăng bài trực tiếp, không cần gửi duyệt.');
    return fail(403, 'Không thực hiện được thao tác này với trạng thái hiện tại của bài.');
  }

  // taking an article back (editor or manager) changes only its state, never the text
  if (action === 'rut-ve') {
    return { post: { ...cur, status: 'draft', publishAt: null, reviewNote: '', updatedBy: user.name, updatedAt: ctx.nowText }, unpin: [] };
  }

  const read = readFields(input, { posts: ctx.posts, id: cur ? cur.id : ctx.newId });
  if (read.error) return read;
  const base = cur || { id: ctx.newId, author: user.name, authorUser: user.username, createdAt: ctx.nowText, status: 'draft', publishAt: null, pinned: false, reviewNote: '' };
  const post = { ...base, ...read.fields, updatedBy: user.name, updatedAt: ctx.nowText };
  // only a manager pins; one pinned article per section of each site
  post.pinned = manager && input.pinned === true;

  switch (action) {
    case 'luu':
      break; // state unchanged (a new article is a draft)
    case 'gui-duyet':
      post.status = 'pending'; post.reviewNote = '';
      break;
    case 'dang-ngay': {
      post.status = 'published'; post.reviewNote = '';
      // an article already visible keeps its date; anything else (draft, pending, scheduled for later) goes out now
      post.publishAt = live && Date.parse(cur.publishAt) <= ctx.now ? cur.publishAt : ctx.nowPublish;
      break;
    }
    case 'hen-gio': {
      const at = scheduleTime(input.publishAt);
      if (!at) return fail(400, 'Chọn ngày giờ đăng hợp lệ.');
      if (Date.parse(at) <= ctx.now) return fail(400, 'Giờ hẹn phải ở tương lai. Muốn đăng luôn thì chọn “Đăng ngay”.');
      post.status = 'published'; post.publishAt = at; post.reviewNote = '';
      break;
    }
    case 'tra-lai':
      post.status = 'draft'; post.publishAt = null; post.pinned = false;
      post.reviewNote = plain(input.note).slice(0, 300);
      if (!post.reviewNote) return fail(400, 'Ghi chú cho người viết biết cần sửa gì.');
      break;
    case 'go-bai':
      post.status = 'draft'; post.publishAt = null; post.pinned = false;
      break;
  }
  if (post.status !== 'published') post.pinned = false;
  if (post.status !== 'draft') {
    const missing = missingForPublishing(post);
    if (missing) return missing;
  }
  if (!isValid(post)) return fail(400, 'Dữ liệu bài không hợp lệ.');
  const unpin = post.pinned
    ? ctx.posts.filter((p) => p.pinned && p.id !== post.id && p.category === post.category && siteOf(p) === siteOf(post)).map((p) => p.id)
    : [];
  return { post, unpin };
}

// Deleting: managers only.
export const mayDelete = (user) => user.role === 'manager';

// The list the editor pages show (no article bodies).
export function summaryOf(p) {
  return {
    id: p.id, slug: p.slug, title: p.title, category: p.category, site: siteOf(p), cover: p.cover || '', status: p.status,
    publishAt: p.publishAt || null, pinned: !!p.pinned, author: p.author || '', updatedBy: p.updatedBy || '',
    updatedAt: p.updatedAt || '', reviewNote: p.reviewNote || '',
  };
}
