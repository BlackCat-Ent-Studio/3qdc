// bang-xep-hang.mjs — Claude's tools for the leaderboards of Tiên Ma Vô Giới (part bang-xep-hang), for `cap-nhat`.
// The person's Claude reads the game's database itself and sends the whole set; it is checked and cleaned like on the web
// (bang-xep-hang/bxh-store.mjs) and shows on the home page at once. The set it replaces stays in the history, from which the
// owner brings it back on the editor page.
import { kiemBxh, thayBxh, docHienTai, dsLichSu, LOP, LIMITS, PART } from '../../bang-xep-hang/bxh-store.mjs';
import { text, fail, needs, audit, refuseWrite } from './common.mjs';
import { makeWriteLimiter } from './write-limit.mjs';

const ONLY = needs(PART, 'cap-nhat');
const annot = (extra) => ({ openWorldHint: false, ...extra });
// a set is rarely sent more than a few times a day; the cap also keeps a loop of mistakes from pushing the 50 saved sets out
const sendLimiter = makeWriteLimiter({ max: 12, what: 'cập nhật bảng xếp hạng' });

const lopName = (code) => (LOP.find((l) => l[0] === code) || [null, null])[1];
// the same shape cap_nhat_bxh takes (class by name)
const asSent = (d) => ({
  ...(d.mayChu ? { may_chu: d.mayChu } : {}),
  bang: d.bang.map((b) => ({ ten: b.ten, cot: b.cot, dong: b.dong.map((r) => ({ ten: r.ten, lop: lopName(r.lop), gt: r.gt })) })),
});
const when = (iso) => (iso ? `${String(iso).slice(11, 16)} ${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}/${String(iso).slice(0, 4)}` : '—');
const via = (boi, qua) => `${boi || '?'}${qua === 'claude' ? ' (Claude)' : ''}`;

const str32 = { type: 'string', minLength: 1, maxLength: LIMITS.tenDong };
const BANG_SCHEMA = {
  type: 'array', maxItems: LIMITS.bang,
  description: `Cả bộ bảng sẽ hiện trên trang chủ (thay toàn bộ bộ cũ). Tối đa ${LIMITS.bang} bảng; [] để xoá trắng.`,
  items: {
    type: 'object', additionalProperties: false, required: ['ten', 'cot', 'dong'],
    properties: {
      ten: { type: 'string', minLength: 1, maxLength: LIMITS.tenBang, description: 'Tên bảng (tab), không trùng bảng khác. Ví dụ "Cấp độ", "Lực chiến".' },
      cot: { type: 'array', minItems: 1, maxItems: LIMITS.cot, items: { type: 'string', minLength: 1, maxLength: LIMITS.tenCot }, description: 'Tên 1 đến 3 cột giá trị. Ví dụ ["Cấp"] hoặc ["Lực chiến", "Danh vọng"]. Cột đầu hiện to nhất.' },
      dong: {
        type: 'array', minItems: 1, maxItems: LIMITS.dong, description: `Các dòng, đã xếp đúng thứ hạng (dòng đầu = hạng 1), tối đa ${LIMITS.dong}.`,
        items: {
          type: 'object', additionalProperties: false, required: ['ten', 'gt'],
          properties: {
            ten: { ...str32, description: 'Tên nhân vật hoặc bang (công khai trong game). Không email, không ID tài khoản.' },
            lop: {
              anyOf: [{ type: 'integer', minimum: 0, maximum: 9 }, { type: 'string', maxLength: 16 }, { type: 'null' }],
              description: `Lớp nhân vật, tuỳ chọn: số 0-9 hoặc tên (${LOP.map((l, i) => `${i} ${l[1]}`).join(', ')}). Không khớp thì bỏ biểu tượng lớp.`,
            },
            gt: {
              type: 'array', minItems: 1, maxItems: LIMITS.cot, description: 'Giá trị theo đúng thứ tự và đúng số cột của bảng (số, hoặc chữ tối đa 24 ký tự).',
              items: { anyOf: [{ type: 'number' }, { type: 'string', maxLength: LIMITS.gtChuoi }] },
            },
          },
        },
      },
    },
  },
};

export const BXH_TOOLS = [
  {
    name: 'xem_bxh', games: ONLY, takesGame: true,
    def: {
      title: 'Xem bảng xếp hạng đang hiện trên trang chủ',
      description: 'Cho biết bộ bảng xếp hạng đang hiện công khai trên trang chủ Tiên Ma Vô Giới: số bảng, số dòng mỗi bảng, ai cập nhật lúc nào; structuredContent là đúng bộ đó theo dạng cap_nhat_bxh nhận. lich_su=true thêm 10 bản gần nhất đã bị thay.',
      properties: { lich_su: { type: 'boolean', description: 'Thêm 10 bản gần nhất trong lịch sử (key, lúc thay, người gửi).' } },
      annotations: annot({ readOnlyHint: true }),
    },
    async run(ctx, args) {
      const d = await docHienTai(ctx.gameId);
      const lines = [];
      if (!d || !Array.isArray(d.bang) || !d.bang.length) lines.push('Chưa có bảng xếp hạng nào (trang chủ hiện “sẽ cập nhật khi mở máy chủ”).');
      else {
        lines.push(`Đang hiện ${d.bang.length} bảng${d.mayChu ? `, máy chủ ${d.mayChu}` : ''}; cập nhật lúc ${when(d.capNhat)} bởi ${via(d.boi, d.qua)}.`);
        for (const b of d.bang) lines.push(`• ${b.ten} — ${b.dong.length} dòng, cột: ${b.cot.join(' / ')}; hạng 1: ${b.dong[0].ten}`);
      }
      if (args.lich_su === true) {
        const h = await dsLichSu(ctx.gameId, 10);
        lines.push(h.length ? 'Lịch sử (mới nhất trước):' : 'Lịch sử trống.');
        for (const x of h) lines.push(`- ${x.key}: thay lúc ${when(x.thayLuc)} bởi ${x.thayBoi || '?'}; bản đó ${x.soBang} bảng, ${x.soDong} dòng`);
      }
      return text(lines.join('\n'), { structuredContent: d && Array.isArray(d.bang) ? asSent(d) : { bang: [] } });
    },
  },
  {
    name: 'cap_nhat_bxh', games: ONLY, takesGame: true, write: true,
    def: {
      title: 'Cập nhật bảng xếp hạng trang chủ',
      description: `Thay TOÀN BỘ bảng xếp hạng trên trang chủ Tiên Ma Vô Giới bằng bộ gửi lên; hiện công khai ngay. Chỉ gửi số đọc từ dữ liệu game, không bịa hay ước lượng. Tối đa ${LIMITS.bang} bảng, ${LIMITS.dong} dòng mỗi bảng, ${LIMITS.cot} cột; tên ≤ ${LIMITS.tenDong} ký tự; dòng xếp sẵn đúng thứ hạng. Không gửi email, ID tài khoản, IP. Bộ cũ được giữ ở lịch sử (50 bản) để chủ khôi phục trên trang quản trị. Tối đa 12 lần mỗi giờ. Dữ liệu sai thì bị từ chối kèm lý do, bảng cũ vẫn giữ nguyên.`,
      properties: {
        may_chu: { type: 'string', maxLength: LIMITS.mayChu, description: 'Tên máy chủ game, tuỳ chọn (hiện cạnh dòng “cập nhật lúc”).' },
        bang: BANG_SCHEMA,
      },
      required: ['bang'], annotations: annot({ readOnlyHint: false, destructiveHint: true, idempotentHint: false }),
    },
    async run(ctx, args) {
      const limited = refuseWrite(ctx);
      if (limited) return limited;
      const r = kiemBxh({ may_chu: args.may_chu, bang: args.bang });
      if (r.error) return fail(`Không cập nhật: ${r.error} Bảng đang hiện không đổi.`);
      const slow = sendLimiter.take(ctx.user.username);
      if (slow) return fail(slow);
      let done;
      try {
        done = await thayBxh(ctx.gameId, r.data, { ai: ctx.user.username, qua: 'claude' });
      } catch (e) {
        console.error('[mcp] leaderboard save failed:', e && e.message ? e.message : e);
        return fail('Không lưu được bảng xếp hạng (lỗi máy chủ). Bảng đang hiện không đổi; thử lại sau.');
      }
      await audit(ctx, 'bxh-cap-nhat', `${done.soBang} bảng, ${done.soDong} dòng`, { phan: PART });
      const names = r.data.bang.map((b) => `${b.ten} (${b.dong.length})`).join(', ') || 'đã xoá trắng';
      const out = [`Đã cập nhật ${done.soBang} bảng, ${done.soDong} dòng: ${names}. Trang chủ hiện ngay.`];
      out.push(done.keyCu ? `Bản trước lưu ở lịch sử (key ${done.keyCu}); chủ khôi phục được trên trang quản trị.` : 'Đây là bộ đầu tiên, chưa có bản trước.');
      if (r.canhBao.length) out.push('Lưu ý:', ...r.canhBao.map((w) => `- ${w}`));
      return text(out.join('\n'), { structuredContent: { soBang: done.soBang, soDong: done.soDong, capNhat: done.capNhat, keyBanTruoc: done.keyCu, canhBao: r.canhBao } });
    },
  },
];
