// phieu-api.mjs — gift tickets from Phiếu Bé Ngoan: the list for one day and state, marking a ticket given / refused /
// waiting again with a reply the player sees (`duyet`), the list as CSV and deleting a ticket into the trash
// (`quan-ly` only: the CSV and the trash carry players' email addresses, which accounts with only `duyet` never see).
import { listPhieu, setStatus, phieuCsv, withoutEmail } from '../../phieu/phieu-store.mjs';
import { STATES, REPLY_MAX } from '../../phieu/phieu-config.mjs';
import { siteNow } from '../../news/news-files.mjs';
import { send, oops } from '../api-http.mjs';
import { moveToTrash } from '../trash.mjs';
import { trashRoutes, webActor } from '../trash-api.mjs';

// Returns true when it answered, false for an address it does not know.
export async function api(ctx, req, res, path, body) {
  const { user, method } = ctx;
  if (!ctx.can('duyet')) { oops(res, 403, 'Chỉ Quản lý hoặc người Duyệt phiếu mới xem được Phiếu Bé Ngoan.'); return true; }
  const onlyManager = (what) => { oops(res, 403, `Chỉ Quản lý mới ${what}.`); return true; };
  const seesEmail = ctx.can('quan-ly');
  if (path === '/phieu-be-ngoan/thung-rac' || path.startsWith('/phieu-be-ngoan/thung-rac/')) return trashRoutes(ctx, res, 'phieu-be-ngoan', path);
  const q = new URL(req.url, 'http://x').searchParams;
  const filter = { ngay: ['hom-nay', 'hom-qua', 'tat-ca'].includes(q.get('ngay')) ? q.get('ngay') : 'hom-nay', st: Object.hasOwn(STATES, q.get('st') || '') ? q.get('st') : 'all' };
  if (method === 'GET' && path === '/phieu-be-ngoan') {
    const list = await listPhieu(filter);
    send(res, 200, seesEmail ? list : { ...list, items: list.items.map(withoutEmail) });
    return true;
  }
  if (method === 'GET' && path === '/phieu-be-ngoan/csv') {
    if (!seesEmail) return onlyManager('tải được danh sách phiếu');
    const csv = await phieuCsv(filter);
    const stamp = siteNow().slice(0, 16).replace(/-/g, '').replace('T', '-').replace(':', '');
    console.log(`[news] ${siteNow()} ${user.username} downloaded the gift tickets (${csv.rows})`);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="phieu-be-ngoan-${stamp}.csv"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow',
    });
    res.end(csv.text);
    return true;
  }
  const pm = path.match(/^\/phieu-be-ngoan\/([a-z0-9]{6,20})$/);
  if (method === 'POST' && pm) {
    const st = String(body.st || '');
    if (!Object.hasOwn(STATES, st)) { oops(res, 400, 'Trạng thái không hợp lệ.'); return true; }
    const phanHoi = String(body.phanHoi || '').trim();
    if (phanHoi.length > REPLY_MAX) { oops(res, 400, `Phản hồi tối đa ${REPLY_MAX} ký tự.`); return true; }
    const t = await setStatus(pm[1], st, phanHoi, user.username);
    if (!t) { oops(res, 404, 'Không tìm thấy phiếu này.'); return true; }
    console.log(`[news] ${siteNow()} ${user.username} set ticket ${t.id} to ${st}`);
    send(res, 200, { item: seesEmail ? t : withoutEmail(t) });
    return true;
  }
  const dm = path.match(/^\/phieu-be-ngoan\/([a-z0-9]{6,20})\/xoa$/);
  if (method === 'POST' && dm) {
    if (!seesEmail) return onlyManager('xoá được phiếu');
    const t = await moveToTrash(ctx.game.id, 'phieu-be-ngoan', dm[1], { actor: webActor('phieu-be-ngoan', user), via: 'web' });
    if (t.error) { oops(res, t.status, t.error); return true; }
    console.log(`[news] ${siteNow()} ${user.username} moved ticket ${t.id} to the trash (${t.email}, ${t.label})`);
    send(res, 200, { id: t.id });
    return true;
  }
  return false;
}
