// signup.mjs — Claude's tools for the early sign-ups (dang-ky-som, a part of 3qdc only), for `quan-ly`. Phone numbers are
// personal data: every time Claude shows them or exports the list, the record of work (audit-log.mjs) gets a line.
import { listSignups, signupsCsv, readMilestones, writeMilestones, cleanMilestones, normalizePhone, DEFAULT_MILESTONES } from '../../signup/signup-store.mjs';
import { siteNow } from '../../news/news-files.mjs';
import { moveToTrash } from '../trash.mjs';
import { maskPhone } from '../audit-log.mjs';
import { text, fail, needs, audit, refuseWrite } from './common.mjs';

const PART = 'dang-ky-som';
const CSV_PAGE = 300; // numbers per answer of xuat_csv_dang_ky
const ONLY = needs(PART, 'quan-ly');
const annot = (extra) => ({ openWorldHint: false, ...extra });

const timeOf = (iso) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso || '') ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}` : String(iso || ''));

export const SIGNUP_TOOLS = [
  {
    name: 'thong_ke_dang_ky', games: ONLY, takesGame: true,
    def: {
      title: 'Thống kê đăng ký sớm',
      description: 'Tổng số đã đăng ký sớm, các mốc đang đặt trên trang đăng ký và mốc kế tiếp, lần đăng ký mới nhất. Không hiện số điện thoại.',
      properties: {}, annotations: annot({ readOnlyHint: true }),
    },
    async run() {
      const list = await listSignups({ page: 1 });
      const milestones = await readMilestones();
      const next = milestones.find((m) => m > list.total);
      const last = list.items[0];
      return text([
        `Đã đăng ký sớm: ${list.total} số.`,
        `Mốc đang đặt: ${milestones.join(', ')}${next ? ` · mốc kế tiếp: ${next} (còn ${next - list.total})` : ' · đã qua mọi mốc'}.`,
        last ? `Đăng ký mới nhất lúc ${timeOf(last.luc)} (nguồn: ${last.nguon || '?'}).` : 'Chưa có ai đăng ký.',
      ].join('\n'), { structuredContent: { tong: list.total, moc: milestones, mocKeTiep: next || null, macDinh: DEFAULT_MILESTONES } });
    },
  },
  {
    name: 'ds_dang_ky', games: ONLY, takesGame: true,
    def: {
      title: 'Danh sách đăng ký sớm (có số điện thoại)',
      description: 'Danh sách số điện thoại đã đăng ký sớm, mới nhất trước, 50 số mỗi trang; có thể tìm theo một phần số. Đây là dữ liệu cá nhân: chỉ xem khi người dùng cần, không gửi đi nơi khác. Mỗi lần xem được ghi nhật ký.',
      properties: {
        tim: { type: 'string', description: 'Một phần số điện thoại cần tìm (chỉ lấy chữ số).' },
        trang: { type: 'integer', minimum: 1, description: 'Trang, mặc định 1.' },
      },
      annotations: annot({ readOnlyHint: true }),
    },
    async run(ctx, args) {
      const list = await listSignups({ q: typeof args.tim === 'string' ? args.tim : '', page: Number.isInteger(args.trang) ? args.trang : 1 });
      const rows = list.items.map((r) => `• #${r.stt} ${r.sdt} · ${timeOf(r.luc)} · ${r.nguon || '?'}`);
      await audit(ctx, 'xem-sdt-dang-ky', `${list.items.length} số`, { phan: PART, chiTiet: `trang ${list.page}/${list.pages}${args.tim ? ', có tìm kiếm' : ''}` });
      return text(`Tổng ${list.total} số${args.tim ? `, khớp ${list.count}` : ''} · trang ${list.page}/${list.pages}.\n${rows.join('\n') || '(không có số nào)'}`,
        { structuredContent: { tong: list.total, khop: list.count, trang: list.page, soTrang: list.pages, items: list.items.map((r) => ({ stt: r.stt, sdt: r.sdt, luc: r.luc, nguon: r.nguon })) } });
    },
  },
  {
    name: 'xuat_csv_dang_ky', games: ONLY, takesGame: true,
    def: {
      title: 'Xuất đăng ký sớm ra CSV (có số điện thoại)',
      description: `Xuất danh sách đăng ký sớm thành chữ CSV (số điện thoại, thời gian, IP, nguồn), cũ nhất trước, ${CSV_PAGE} số mỗi lần; dùng trang để lấy tiếp. Đây là dữ liệu cá nhân: chỉ xuất khi người dùng yêu cầu rõ, không gửi đi nơi khác. Mỗi lần xuất được ghi nhật ký.`,
      properties: { trang: { type: 'integer', minimum: 1, description: `Trang của kết quả, ${CSV_PAGE} số mỗi trang. Mặc định 1.` } },
      annotations: annot({ readOnlyHint: true }),
    },
    async run(ctx, args) {
      const total = (await signupsCsv({ offset: 0, limit: 1 })).rows;
      const pages = Math.max(1, Math.ceil(total / CSV_PAGE));
      const page = Number.isInteger(args.trang) && args.trang >= 1 ? Math.min(args.trang, pages) : 1;
      const csv = await signupsCsv({ offset: (page - 1) * CSV_PAGE, limit: CSV_PAGE });
      await audit(ctx, 'xuat-csv-dang-ky', `${total} số`, { phan: PART, chiTiet: `trang ${page}/${pages}` });
      return text(`CSV đăng ký sớm · tổng ${total} số · trang ${page}/${pages}${page < pages ? ` (gọi lại với trang ${page + 1} để lấy tiếp)` : ''}:\n\n${csv.text.slice(1)}`, { structuredContent: { tong: total, trang: page, soTrang: pages } });
    },
  },
  {
    name: 'sua_moc', games: ONLY, takesGame: true, write: true,
    def: {
      title: 'Đặt mốc đăng ký trên trang',
      description: 'Đặt lại các mốc số lượng đăng ký mà trang đăng ký sớm hiển thị: 1 đến 8 số nguyên tăng dần, mỗi số từ 1 đến 10.000.000.',
      properties: { moc: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 10000000 }, minItems: 1, maxItems: 8, description: 'Danh sách mốc tăng dần, ví dụ [1000, 3000, 5000, 10000].' } },
      required: ['moc'], annotations: annot({ readOnlyHint: false, destructiveHint: false, idempotentHint: true }),
    },
    async run(ctx, args) {
      const list = cleanMilestones(args.moc);
      if (!list) return fail('Mốc phải là 1 đến 8 số nguyên tăng dần, mỗi số từ 1 đến 10.000.000.');
      const limited = refuseWrite(ctx);
      if (limited) return limited;
      const before = await readMilestones();
      await writeMilestones(list);
      console.log(`[phieu-mcp] ${siteNow()} ${ctx.who} set the early sign-up milestones to ${list.join(', ')}`);
      await audit(ctx, 'dang-ky-sua-moc', `mốc ${list.join(', ')}`, { phan: PART, chiTiet: `trước: ${before.join(', ')}` });
      return text(`Đã đặt mốc đăng ký: ${list.join(', ')}.`, { structuredContent: { moc: list } });
    },
  },
  {
    name: 'xoa_dang_ky', games: ONLY, takesGame: true, write: true,
    def: {
      title: 'Xoá một số đăng ký (chuyển vào Thùng rác)',
      description: 'Xoá một số điện thoại khỏi danh sách đăng ký sớm: số được chuyển vào Thùng rác, không mất; số đếm trên trang đăng ký giảm một. Khôi phục bằng khoi_phuc. Xoá hẳn khỏi Thùng rác chỉ chủ làm được trên trang quản trị.',
      properties: { sdt: { type: 'string', description: 'Số điện thoại cần xoá (lấy từ ds_dang_ky).' } }, required: ['sdt'],
      annotations: annot({ readOnlyHint: false, destructiveHint: true, idempotentHint: false }),
    },
    async run(ctx, args) {
      const sdt = normalizePhone(args.sdt);
      if (!sdt) return fail('Số điện thoại không hợp lệ.');
      const limited = refuseWrite(ctx);
      if (limited) return limited;
      const r = await moveToTrash(ctx.gameId, PART, sdt, { actor: ctx.user.username, via: 'claude' });
      if (r.error) return fail(r.error);
      return text(`Đã chuyển số ${maskPhone(sdt)} vào Thùng rác (còn ${r.count} số). Khôi phục bằng khoi_phuc (phan "dang-ky-som", key là số điện thoại) nếu cần.`);
    },
  },
];
