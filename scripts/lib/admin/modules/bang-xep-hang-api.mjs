// bang-xep-hang-api.mjs — the leaderboards in /quan-tri (for `cap-nhat`): see the set on show and the history, read an older set,
// bring it back. There is no form to type a set by hand: a member's Claude sends it (admin/mcp/bang-xep-hang.mjs).
import { send, oops } from '../api-http.mjs';
import { appendAudit } from '../audit-log.mjs';
import { docHienTai, dsLichSu, docLichSu, khoiPhuc, isKey, PART } from '../../bang-xep-hang/bxh-store.mjs';

const forWeb = (d) => (d ? { capNhat: d.capNhat || null, boi: d.boi || '', qua: d.qua || '', mayChu: d.mayChu || '', bang: Array.isArray(d.bang) ? d.bang : [] } : null);

// Returns true when it answered, false for an address it does not know.
export async function api(ctx, req, res, path) {
  const { user, method, game } = ctx;
  if (!ctx.can('cap-nhat')) { oops(res, 403, 'Không có quyền cập nhật bảng xếp hạng.'); return true; }

  if (method === 'GET' && path === '/bang-xep-hang') {
    send(res, 200, { hienTai: forWeb(await docHienTai(game.id)), lichSu: await dsLichSu(game.id) });
    return true;
  }
  let m = path.match(/^\/bang-xep-hang\/lich-su\/([^/]+)$/);
  if (method === 'GET' && m) {
    const d = isKey(m[1]) ? await docLichSu(game.id, m[1]) : null;
    if (!d) { oops(res, 404, 'Không có bản này trong lịch sử.'); return true; }
    send(res, 200, { key: m[1], thayLuc: d.thayLuc || null, thayBoi: d.thayBoi || '', ...forWeb(d) });
    return true;
  }
  m = path.match(/^\/bang-xep-hang\/khoi-phuc\/([^/]+)$/);
  if (method === 'POST' && m) {
    const r = await khoiPhuc(game.id, m[1], { ai: user.username, qua: 'web' });
    if (r.error) { oops(res, r.status, r.error); return true; }
    await appendAudit({ ai: user.username, qua: 'web', viec: 'bxh-khoi-phuc', doiTuong: `${r.soBang} bảng, ${r.soDong} dòng (bản ${m[1]})`, game: game.id, phan: PART });
    send(res, 200, { hienTai: forWeb(await docHienTai(game.id)), lichSu: await dsLichSu(game.id) });
    return true;
  }
  return false;
}
