// dang-ky-som-api.mjs — early sign-ups from /dang-ky-som (managers only: phone numbers are personal data): one page of
// the list with a number search, the whole list as CSV (gifts are sent by hand for now), and the milestones the page shows.
import { listSignups, signupsCsv, readMilestones, writeMilestones, cleanMilestones, deleteSignup, normalizePhone } from '../../signup/signup-store.mjs';
import { siteNow } from '../../news/news-files.mjs';
import { send, oops } from '../api-http.mjs';

// Returns true when it answered, false for an address it does not know.
export async function api(ctx, req, res, path, body) {
  const { user, method } = ctx;
  if (!ctx.can('quan-ly')) { oops(res, 403, 'Chỉ Quản lý mới xem được danh sách đăng ký sớm.'); return true; }
  if (method === 'GET' && path === '/dang-ky-som') {
    const q = new URL(req.url, 'http://x').searchParams;
    const list = await listSignups({ q: q.get('q') || '', page: parseInt(q.get('trang') || '1', 10) });
    send(res, 200, { ...list, milestones: await readMilestones() });
    return true;
  }
  if (method === 'GET' && path === '/dang-ky-som/csv') {
    const csv = await signupsCsv();
    const stamp = siteNow().slice(0, 16).replace(/-/g, '').replace('T', '-').replace(':', '');
    console.log(`[news] ${siteNow()} ${user.username} downloaded the early sign-up list (${csv.rows} numbers)`);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="dang-ky-som-${stamp}.csv"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow',
    });
    res.end(csv.text);
    return true;
  }
  if (method === 'POST' && path === '/dang-ky-som/moc') {
    const list = cleanMilestones(body.milestones);
    if (!list) { oops(res, 400, 'Mốc phải là 1 đến 8 số nguyên tăng dần, mỗi số từ 1 đến 10.000.000.'); return true; }
    await writeMilestones(list);
    console.log(`[news] ${siteNow()} ${user.username} set the early sign-up milestones to ${list.join(', ')}`);
    send(res, 200, { milestones: list });
    return true;
  }
  if (method === 'POST' && path === '/dang-ky-som/xoa') {
    const sdt = normalizePhone(body.sdt);
    if (!sdt) { oops(res, 400, 'Số điện thoại không hợp lệ.'); return true; }
    const r = await deleteSignup(sdt);
    if (!r) { oops(res, 404, 'Không tìm thấy số này trong danh sách.'); return true; }
    console.log(`[news] ${siteNow()} ${user.username} deleted early sign-up ${sdt} (${r.count} left)`);
    send(res, 200, r);
    return true;
  }
  return false;
}
