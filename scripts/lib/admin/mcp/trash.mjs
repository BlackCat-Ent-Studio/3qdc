// trash.mjs — Claude's tools for the Thùng rác: see what was deleted in the parts the account may open the trash of, and bring
// an item back. There is NO tool that deletes for good or empties the trash: that is for owners, on the web page only.
// Who may open a part's trash is TRASH_PERMS (admin/trash.mjs), the same list the web uses.
import { GAMES, gameById } from '../games.mjs';
import { can } from '../grants.mjs';
import { TRASH_PERMS, TRASH_PARTS, listTrash, restoreFromTrash } from '../trash.mjs';
import { text, fail, str, fmt, shorten, audit, refuseWrite } from './common.mjs';

const SHOW_MAX = 50;
const PART_NAME = { 'tin-tuc': 'Tin tức', 'phieu-be-ngoan': 'Phiếu Bé Ngoan', 'dang-ky-som': 'Đăng ký sớm', nhac: 'Nhạc nền' };
const annot = (extra) => ({ openWorldHint: false, ...extra });

// the parts of one game whose trash this account may open
const partsIn = (user, gameId) => TRASH_PARTS.filter((p) => gameById(gameId) && Object.hasOwn(gameById(gameId).modules, p) && can(user, gameId, p, TRASH_PERMS[p]));
const gamesWithTrash = (user) => GAMES.filter((g) => partsIn(user, g.id).length > 0).map((g) => g.id);

const via = (v) => (v === 'claude' ? 'qua Claude' : 'trên web');
const what = (part, it) => (part === 'dang-ky-som' ? it.label : shorten(it.label, 80));

export const TRASH_TOOLS = [
  {
    name: 'thung_rac', games: gamesWithTrash, takesGame: true,
    def: {
      title: 'Xem Thùng rác',
      description: 'Xem các mục đã xoá (mới xoá trước) trong những phần mà tài khoản được mở Thùng rác: Tin tức, Phiếu Bé Ngoan, Đăng ký sớm, Nhạc nền. Mỗi mục có key để khôi phục bằng khoi_phuc, người xoá, lúc xoá, xoá trên web hay qua Claude. Danh sách Đăng ký sớm có số điện thoại (ghi nhật ký). Không có công cụ xoá hẳn: việc đó chỉ chủ làm trên trang quản trị.',
      properties: { phan: { type: 'string', enum: TRASH_PARTS, description: 'Chỉ xem một phần. Bỏ trống để xem mọi phần được phép.' } },
      annotations: annot({ readOnlyHint: true }),
    },
    async run(ctx, args) {
      const allowed = partsIn(ctx.user, ctx.gameId);
      const want = str(args.phan);
      if (want && !TRASH_PARTS.includes(want)) return fail(`phan phải là một trong: ${TRASH_PARTS.join(', ')}.`);
      if (want && !allowed.includes(want)) return fail(`Tài khoản này không được mở Thùng rác của phần ${want} (game ${ctx.gameId}).`);
      const out = [];
      const structured = {};
      let phones = 0;
      for (const part of want ? [want] : allowed) {
        const r = await listTrash(ctx.gameId, part);
        if (r.error) { out.push(`${PART_NAME[part]}: ${r.error}`); continue; }
        const shown = r.items.slice(0, SHOW_MAX);
        if (part === 'dang-ky-som') phones += shown.length;
        out.push(`${PART_NAME[part]} (phan "${part}") — ${r.items.length} mục${r.items.length > shown.length ? `, hiện ${shown.length} mới nhất` : ''}:`);
        for (const it of shown) out.push(`  • key ${it.key} — ${what(part, it)} · xoá bởi ${it.deletedBy || '?'} ${via(it.deletedVia)} lúc ${fmt(it.deletedAt)}`);
        if (!shown.length) out.push('  (trống)');
        structured[part] = shown.map((it) => ({ key: it.key, ten: it.label, xoaBoi: it.deletedBy, xoaLuc: it.deletedAt, xoaQua: it.deletedVia }));
      }
      if (phones) await audit(ctx, 'xem-sdt-thung-rac', `${phones} số`, { phan: 'dang-ky-som' });
      return text(out.join('\n') || 'Không có phần nào để xem.', { structuredContent: structured });
    },
  },
  {
    name: 'khoi_phuc', games: gamesWithTrash, takesGame: true, write: true,
    def: {
      title: 'Khôi phục một mục từ Thùng rác',
      description: 'Đưa một mục từ Thùng rác về lại: bài tin tức về Nháp; phiếu về chỗ cũ; số đăng ký về đúng thứ tự; bài hát về nhạc nền. Bị từ chối (409) nếu chỗ cũ đã bị chiếm (ví dụ người chơi đã gửi phiếu khác cùng ngày, số đã đăng ký lại, đã có bài trùng tên).',
      properties: {
        phan: { type: 'string', enum: TRASH_PARTS, description: 'Phần của mục cần khôi phục.' },
        key: { type: 'string', description: 'key của mục, lấy từ thung_rac.' },
      },
      required: ['phan', 'key'], annotations: annot({ readOnlyHint: false, destructiveHint: false, idempotentHint: false }),
    },
    async run(ctx, args) {
      const part = str(args.phan);
      const key = str(args.key);
      if (!TRASH_PARTS.includes(part)) return fail(`phan phải là một trong: ${TRASH_PARTS.join(', ')}.`);
      if (!key) return fail('Cần key của mục (xem thung_rac).');
      if (!partsIn(ctx.user, ctx.gameId).includes(part)) return fail(`Tài khoản này không được khôi phục mục của phần ${part} (game ${ctx.gameId}).`);
      const limited = refuseWrite(ctx);
      if (limited) return limited;
      const r = await restoreFromTrash(ctx.gameId, part, key, { actor: ctx.user.username, actorName: ctx.user.name, via: 'claude' });
      if (r.error) return fail(r.error);
      return text(`Đã khôi phục ${PART_NAME[part]}: ${part === 'dang-ky-som' ? 'một số điện thoại' : shorten(r.label, 80)}.${part === 'tin-tuc' ? ' Bài quay về trạng thái Nháp.' : ''}`);
    },
  },
];
