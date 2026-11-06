// phieu.mjs — Claude's tools for the gift tickets of Phiếu Bé Ngoan (a part of 3qdc only).
//   duyet     xem_phieu, tra_qua, tu_choi — exactly the three tools (names, wording, parameters) the ticket reviewers have always
//             had; a reviewer never sees players' email addresses. They only touch a ticket that is still waiting.
//   quan-ly   also dua_ve_cho, xuat_csv_phieu, xoa_phieu, and xem_phieu shows the email address. Every time Claude shows email
//             addresses or exports the CSV, the record of work (audit-log.mjs) gets a line.
import { listPhieu, answerPhieu, setStatus, phieuCsv, withoutEmail } from '../../phieu/phieu-store.mjs';
import { STATES, REPLY_MAX, serverName } from '../../phieu/phieu-config.mjs';
import { siteNow } from '../../news/news-files.mjs';
import { can } from '../grants.mjs';
import { moveToTrash } from '../trash.mjs';
import { text, fail, fmt, needs, audit, refuseWrite } from './common.mjs';

const GAME = '3qdc';
const PART = 'phieu-be-ngoan';
const LIST_MAX = 100;
const CSV_PAGE = 100; // tickets per answer of xuat_csv_phieu (a ticket is several lines of text)
const ID_RE = /^[a-z0-9]{6,20}$/;
const seesEmail = (user) => can(user, GAME, PART, 'quan-ly');
const annot = (extra) => ({ openWorldHint: false, ...extra });

function describe(t, email = false) {
  const lines = [
    `• Mã ${t.id} · gửi ${fmt(t.luc)} · ${STATES[t.st] || t.st}`,
    `  Nhân vật: ${t.acc} · Server: ${serverName(t.server)}`,
    `  Quà: ${t.qua.join('; ')}`,
  ];
  if (email) lines.push(`  Email: ${t.email || '(không có)'}`);
  if (t.ghiChu) lines.push(`  Ghi chú: ${t.ghiChu}`);
  if (t.st !== 'cho') lines.push(`  Xử lý: ${t.xuLyBoi || '?'} lúc ${fmt(t.xuLyLuc)}${t.phanHoi ? ` · Phản hồi: ${t.phanHoi}` : ''}`);
  return lines.join('\n');
}

const FILTER_PROPS = {
  ngay: { type: 'string', enum: ['hom-nay', 'hom-qua', 'tat-ca'], description: 'Ngày gửi: hôm nay, hôm qua, hoặc mọi ngày. Mặc định hom-nay.' },
  trang_thai: { type: 'string', enum: ['cho', 'tra', 'tu', 'tat-ca'], description: 'cho = đang chờ, tra = đã trả, tu = từ chối, tat-ca = mọi trạng thái. Mặc định cho.' },
};
const filterOf = (args) => ({
  ngay: ['hom-nay', 'hom-qua', 'tat-ca'].includes(args.ngay) ? args.ngay : 'hom-nay',
  st: args.trang_thai === 'tat-ca' ? 'all' : Object.hasOwn(STATES, args.trang_thai || '') ? args.trang_thai : 'cho',
});

// tra_qua / tu_choi: the same code for both
async function answer(ctx, args, name) {
  const id = String(args.id || '');
  if (!ID_RE.test(id)) return fail('Mã phiếu không hợp lệ. Lấy mã (id) từ xem_phieu.');
  const phanHoi = String(args.phan_hoi || '').replace(/\s+/g, ' ').trim();
  if (phanHoi.length > REPLY_MAX) return fail(`Phản hồi tối đa ${REPLY_MAX} ký tự.`);
  if (name === 'tu_choi' && !phanHoi) return fail('Từ chối cần ghi lý do cho người chơi (phan_hoi).');
  const limited = refuseWrite(ctx);
  if (limited) return limited;
  const st = name === 'tra_qua' ? 'tra' : 'tu';
  const r = await answerPhieu(id, st, phanHoi, ctx.who);
  if (r.notFound) return fail(`Không tìm thấy phiếu ${id} (có thể đã bị xoá).`);
  if (r.already) return fail(`Phiếu ${id} đã được xử lý trước đó (${STATES[r.already.st] || r.already.st} bởi ${r.already.xuLyBoi || '?'}), không đổi nữa.`);
  console.log(`[phieu-mcp] ${siteNow()} ${ctx.who} set ticket ${id} to ${st}`);
  await audit(ctx, name === 'tra_qua' ? 'phieu-tra-qua' : 'phieu-tu-choi', `phiếu ${id}`, { phan: PART, chiTiet: STATES[st] });
  return text(`Đã đánh dấu phiếu ${id}: ${STATES[st]}.\n${describe(withoutEmail(r.item))}`);
}

export const PHIEU_TOOLS = [
  {
    name: 'xem_phieu', games: needs(PART, 'duyet'), takesGame: false,
    def: {
      title: 'Xem phiếu Bé Ngoan',
      description: 'Liệt kê phiếu xin quà theo ngày gửi và trạng thái (mặc định: phiếu đang chờ của hôm nay). Mỗi phiếu có mã (id), nhân vật, server, các món quà muốn nhận, ghi chú, trạng thái, phản hồi và người xử lý.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    schema: { type: 'object', properties: { ...FILTER_PROPS }, additionalProperties: false },
    async run(ctx, args) {
      const ngay = filterOf(args).ngay;
      const st = filterOf(args).st;
      const d = await listPhieu({ ngay, st });
      const withEmail = seesEmail(ctx.user);
      const shown = d.items.slice(0, LIST_MAX);
      const items = withEmail ? shown : shown.map(withoutEmail);
      const head = `Ngày: ${{ 'hom-nay': 'hôm nay', 'hom-qua': 'hôm qua', 'tat-ca': 'mọi ngày' }[ngay]} · lọc: ${st === 'all' ? 'mọi trạng thái' : STATES[st]}. `
        + `Trong ngày đã chọn: ${d.counts.all} phiếu (đang chờ ${d.counts.cho}, đã trả ${d.counts.tra}, từ chối ${d.counts.tu}). Tổng phiếu đang chờ mọi ngày: ${d.cho}.`;
      const more = d.items.length > LIST_MAX ? `\n(Còn ${d.items.length - LIST_MAX} phiếu nữa không hiện; thu hẹp bộ lọc.)` : '';
      const body = items.length ? items.map((t) => describe(t, withEmail)).join('\n') : 'Không có phiếu nào khớp.';
      const structured = items.map((t) => ({
        id: t.id, luc: t.luc, nhanVat: t.acc, server: serverName(t.server), qua: t.qua, ghiChu: t.ghiChu, trangThai: t.st, phanHoi: t.phanHoi, xuLyBoi: t.xuLyBoi,
        ...(withEmail ? { email: t.email } : {}),
      }));
      if (withEmail && items.length) await audit(ctx, 'xem-email-phieu', `${items.length} phiếu`, { phan: PART, chiTiet: `ngày ${ngay}, ${st}` });
      return text(`${head}\n\n${body}${more}`, { structuredContent: { counts: d.counts, choMoiNgay: d.cho, items: structured } });
    },
  },
  {
    name: 'tra_qua', games: needs(PART, 'duyet'), takesGame: false, write: true,
    def: {
      title: 'Đánh dấu đã trả quà',
      description: 'Đánh dấu một phiếu đang chờ là Đã trả, sau khi quà đã được trả trong game. Người chơi thấy trạng thái và phản hồi trong lịch sử phiếu. Phiếu đã xử lý rồi thì không đổi được.',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9]{6,20}$', description: 'Mã phiếu (id) lấy từ xem_phieu.' },
        phan_hoi: { type: 'string', maxLength: REPLY_MAX, description: `Lời nhắn cho người chơi (không bắt buộc, tối đa ${REPLY_MAX} ký tự).` },
      },
      required: ['id'],
      additionalProperties: false,
    },
    run: (ctx, args) => answer(ctx, args, 'tra_qua'),
  },
  {
    name: 'tu_choi', games: needs(PART, 'duyet'), takesGame: false, write: true,
    def: {
      title: 'Từ chối phiếu',
      description: 'Đánh dấu một phiếu đang chờ là Từ chối, kèm lý do người chơi đọc được. Phiếu đã xử lý rồi thì không đổi được.',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9]{6,20}$', description: 'Mã phiếu (id) lấy từ xem_phieu.' },
        phan_hoi: { type: 'string', minLength: 1, maxLength: REPLY_MAX, description: `Lý do từ chối cho người chơi (bắt buộc, tối đa ${REPLY_MAX} ký tự).` },
      },
      required: ['id', 'phan_hoi'],
      additionalProperties: false,
    },
    run: (ctx, args) => answer(ctx, args, 'tu_choi'),
  },
  {
    name: 'dua_ve_cho', games: needs(PART, 'quan-ly'), takesGame: true, write: true,
    def: {
      title: 'Đưa phiếu về trạng thái chờ',
      description: 'Đưa một phiếu đã xử lý (Đã trả hoặc Từ chối) về Đang chờ, xoá phản hồi và người xử lý cũ. Dùng khi đánh dấu nhầm.',
      properties: { id: { type: 'string', pattern: '^[a-z0-9]{6,20}$', description: 'Mã phiếu (id) lấy từ xem_phieu.' } }, required: ['id'],
      annotations: annot({ readOnlyHint: false, destructiveHint: false, idempotentHint: true }),
    },
    async run(ctx, args) {
      const id = String(args.id || '');
      if (!ID_RE.test(id)) return fail('Mã phiếu không hợp lệ. Lấy mã (id) từ xem_phieu.');
      const limited = refuseWrite(ctx);
      if (limited) return limited;
      const t = await setStatus(id, 'cho', '', ctx.who);
      if (!t) return fail(`Không tìm thấy phiếu ${id} (có thể đã bị xoá).`);
      await audit(ctx, 'phieu-dua-ve-cho', `phiếu ${id}`, { phan: PART });
      return text(`Đã đưa phiếu ${id} về Đang chờ.\n${describe(withoutEmail(t))}`);
    },
  },
  {
    name: 'xuat_csv_phieu', games: needs(PART, 'quan-ly'), takesGame: true,
    def: {
      title: 'Xuất phiếu ra CSV (có email)',
      description: `Xuất phiếu theo ngày và trạng thái thành chữ CSV (có cột Gmail của người chơi), ${CSV_PAGE} phiếu mỗi lần; dùng trang để lấy tiếp. Đây là dữ liệu cá nhân: chỉ xuất khi người dùng yêu cầu rõ, không gửi đi nơi khác. Mỗi lần xuất được ghi nhật ký.`,
      properties: { ...FILTER_PROPS, trang: { type: 'integer', minimum: 1, description: `Trang của kết quả, ${CSV_PAGE} phiếu mỗi trang. Mặc định 1.` } },
      annotations: annot({ readOnlyHint: true }),
    },
    async run(ctx, args) {
      const f = filterOf(args);
      const total = (await listPhieu(f)).items.length;
      const pages = Math.max(1, Math.ceil(total / CSV_PAGE));
      const page = Number.isInteger(args.trang) && args.trang >= 1 ? Math.min(args.trang, pages) : 1;
      const csv = await phieuCsv(f, Date.now(), { offset: (page - 1) * CSV_PAGE, limit: CSV_PAGE });
      const out = csv.text.slice(1);
      await audit(ctx, 'xuat-csv-phieu', `${csv.rows} phiếu`, { phan: PART, chiTiet: `ngày ${f.ngay}, ${f.st}, trang ${page}/${pages}` });
      return text(`CSV phiếu · tổng ${csv.rows} phiếu · trang ${page}/${pages}${page < pages ? ` (gọi lại với trang ${page + 1} để lấy tiếp)` : ''}:\n\n${out}`, { structuredContent: { tong: csv.rows, trang: page, soTrang: pages } });
    },
  },
  {
    name: 'xoa_phieu', games: needs(PART, 'quan-ly'), takesGame: true, write: true,
    def: {
      title: 'Xoá phiếu (chuyển vào Thùng rác)',
      description: 'Xoá một phiếu: phiếu được chuyển vào Thùng rác, không mất; người chơi không còn thấy phiếu trong lịch sử (và được gửi phiếu mới trong ngày). Khôi phục bằng khoi_phuc. Xoá hẳn khỏi Thùng rác chỉ chủ làm được trên trang quản trị.',
      properties: { id: { type: 'string', pattern: '^[a-z0-9]{6,20}$', description: 'Mã phiếu (id) lấy từ xem_phieu.' } }, required: ['id'],
      annotations: annot({ readOnlyHint: false, destructiveHint: true, idempotentHint: false }),
    },
    async run(ctx, args) {
      const id = String(args.id || '');
      if (!ID_RE.test(id)) return fail('Mã phiếu không hợp lệ. Lấy mã (id) từ xem_phieu.');
      const limited = refuseWrite(ctx);
      if (limited) return limited;
      const r = await moveToTrash(GAME, PART, id, { actor: ctx.user.username, via: 'claude' });
      if (r.error) return fail(r.error);
      return text(`Đã chuyển phiếu ${id} (${r.label}) vào Thùng rác. Khôi phục bằng khoi_phuc (phan "phieu-be-ngoan") nếu cần.`);
    },
  },
];
