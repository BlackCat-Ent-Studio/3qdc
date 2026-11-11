// modules.mjs — the book of parts (modules) a game can switch on. One entry per part:
//   perms        the permissions of the part and their labels
//   implies      a permission that includes others: holding the key holds every permission listed for it
//   short        a few words for each permission, for lists and table headings (perms keeps the full sentence)
//   menu         [tab, hash, label, permission needed] — what the editor pages show
//   trash        the permission that opens the part's trash and brings items back (trash.mjs); deleting for good is for owners
//   paths        API address prefixes owned by the part (below /quan-tri/api/g/<game>/)
//   dataDir      where the part keeps its data for a game
//   api          (ctx, req, res, path, body) → true when it answered; ctx = { game, user, method, can(perm) }
//   upload       optional (req, res, path, game) → true when it took a raw-body POST (pictures, songs)
import { GAMES, GAME_ID_RE } from './games.mjs';
import { moduleDir } from './paths.mjs';
import * as tinTuc from './modules/tin-tuc-api.mjs';
import * as phieu from './modules/phieu-api.mjs';
import * as dangKySom from './modules/dang-ky-som-api.mjs';
import * as nhac from './modules/nhac-api.mjs';
import * as bangXepHang from './modules/bang-xep-hang-api.mjs';
import { TRASH_PERMS } from './trash.mjs';

const part = (id, name, def, impl) => ({ id, name, ...def, dataDir: (gameId) => moduleDir(gameId, id), api: impl.api, upload: impl.upload || null });

export const MODULES = {
  'tin-tuc': part('tin-tuc', 'Tin tức', {
    perms: { viet: 'Viết bài, gửi duyệt, đưa ảnh lên', duyet: 'Đăng, hẹn giờ, trả lại, gỡ, ghim, xoá bài, xem và khôi phục thùng rác' },
    implies: { duyet: ['viet'] },
    short: { viet: 'Viết bài', duyet: 'Duyệt đăng' },
    menu: [['posts', '#/', 'Bài viết', 'viet']],
    trash: TRASH_PERMS['tin-tuc'],
    paths: ['/anh', '/bai', '/thung-rac'],
  }, tinTuc),
  'phieu-be-ngoan': part('phieu-be-ngoan', 'Phiếu Bé Ngoan', {
    perms: { duyet: 'Xem phiếu (không email), trả quà hoặc từ chối', 'quan-ly': 'Xem email, tải CSV, xoá phiếu' },
    implies: { 'quan-ly': ['duyet'] },
    short: { duyet: 'Duyệt phiếu', 'quan-ly': 'Quản lý phiếu' },
    menu: [['phieu', '#/phieu-be-ngoan', 'Phiếu Bé Ngoan', 'duyet']],
    trash: TRASH_PERMS['phieu-be-ngoan'],
    paths: ['/phieu-be-ngoan'],
  }, phieu),
  'dang-ky-som': part('dang-ky-som', 'Đăng ký sớm', {
    perms: { 'quan-ly': 'Xem, tải, xoá danh sách đăng ký sớm và đặt mốc' },
    implies: {},
    short: { 'quan-ly': 'Quản lý' },
    menu: [['signup', '#/dang-ky-som', 'Đăng ký sớm', 'quan-ly']],
    trash: TRASH_PERMS['dang-ky-som'],
    paths: ['/dang-ky-som'],
  }, dangKySom),
  'nhac': part('nhac', 'Nhạc nền', {
    perms: { 'quan-ly': 'Thêm, xoá nhạc nền trang chủ' },
    implies: {},
    short: { 'quan-ly': 'Quản lý' },
    menu: [['music', '#/nhac', 'Nhạc nền', 'quan-ly']],
    trash: TRASH_PERMS.nhac,
    paths: ['/nhac'],
  }, nhac),
  'bang-xep-hang': part('bang-xep-hang', 'Bảng xếp hạng', {
    perms: { 'cap-nhat': 'Xem, cập nhật bảng xếp hạng, khôi phục bản cũ' },
    implies: {},
    short: { 'cap-nhat': 'Cập nhật' },
    menu: [['bxh', '#/bang-xep-hang', 'Bảng xếp hạng', 'cap-nhat']],
    trash: null, // replaced sets go to the part's own history, not to the shared trash
    paths: ['/bang-xep-hang'],
  }, bangXepHang),
};

// the part that owns an API address (below the game prefix), or null
export function moduleOfPath(sub) {
  for (const m of Object.values(MODULES)) if (m.paths.some((p) => sub === p || sub.startsWith(`${p}/`))) return m;
  return null;
}

// Tickets, early sign-ups and the music keep their data for 3qdc only (their stores take no game id): another game
// switching one of them on would read or write 3qdc's data, so the server refuses to start.
const ONLY_3QDC = ['phieu-be-ngoan', 'dang-ky-som', 'nhac'];
const HOST_RE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

// Refuses a wrong book of games when the server starts (the server does not come up and the log says why).
export function checkGames(games = GAMES, modules = MODULES) {
  const ids = new Set();
  const hostOwner = new Map();
  for (const g of games) {
    if (!g || !GAME_ID_RE.test(String(g.id))) throw new Error(`games: invalid game id ${JSON.stringify(g && g.id)}`);
    if (ids.has(g.id)) throw new Error(`games: duplicate game id "${g.id}"`);
    ids.add(g.id);
    if (!g.name || typeof g.name !== 'string') throw new Error(`games: game "${g.id}" has no name`);
    for (const mid of Object.keys(g.modules || {})) {
      if (!Object.hasOwn(modules, mid)) throw new Error(`games: game "${g.id}" uses unknown module "${mid}"`);
      if (ONLY_3QDC.includes(mid) && g.id !== '3qdc') throw new Error(`games: module "${mid}" is only for 3qdc (its data is not kept per game yet), game "${g.id}" cannot switch it on`);
    }
    const siteIds = new Set();
    for (const s of g.sites || []) {
      if (!s.id || siteIds.has(s.id)) throw new Error(`games: game "${g.id}" has a missing or duplicate site id "${s.id}"`);
      siteIds.add(s.id);
      if (s.module && !Object.hasOwn(g.modules || {}, s.module)) throw new Error(`games: site "${s.id}" of "${g.id}" belongs to module "${s.module}" which the game has not switched on`);
      for (const h of s.hosts || []) {
        if (!HOST_RE.test(h)) throw new Error(`games: bad host "${h}" in game "${g.id}"`);
        if (hostOwner.has(h)) throw new Error(`games: host "${h}" is used by both "${hostOwner.get(h)}" and "${g.id}"`);
        hostOwner.set(h, g.id);
      }
    }
  }
}
