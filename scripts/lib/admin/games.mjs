// games.mjs — the book of games the editor pages can manage. Edited by hand (there is no "create game" button).
// Imports nothing, so config files can read it without import cycles.
//
// game.sites   every web address of the game's cluster. A site with `module` is managed by that module (today: the
//              news split of 3qdc); a site without one is only listed so the overview can show it — no admin part.
//              Either `hosts` (a whole host name) or `path` (a folder of the main host).
// game.modules the parts switched on for this game, each with its own settings ({} = nothing to set).
//              'tin-tuc' may list `cats`: the sections this game's articles use (default: all of news-config CATS).
// Game ids: lowercase letters, digits and dashes, 2-24 characters, never digits only (so an id can never be mistaken for a
// year such as 2026 in an address).
export const GAME_ID_RE = /^(?![0-9]+$)[a-z0-9][a-z0-9-]{1,23}$/;

export const GAMES = [
  {
    id: '3qdc',
    name: '3Q Đại Chiến',
    logo: '/3qdc-vi/home/logo-3qdc.webp',
    sites: [
      { id: 'chinh', name: 'Trang chính', hint: '3qdc.wanmeivn.com — trang chủ, /tin-tuc', hosts: ['3qdc.wanmeivn.com'], module: 'tin-tuc' },
      { id: 'phu', name: 'Trang phụ', hint: '3qdaichien.wanmeivn.com', hosts: ['3qdaichien.wanmeivn.com'], module: 'tin-tuc' },
      { id: 'phieu', name: 'Trang phiếu', hint: 'phieubengoan.3qdc.wanmeivn.com — người chơi gửi phiếu', hosts: ['phieubengoan.3qdc.wanmeivn.com'], module: null },
      { id: 'wiki', name: 'Wiki hướng dẫn', hint: '/wiki/', path: '/wiki/', module: null },
      { id: 'hoi-dap', name: 'Hỏi đáp', hint: '/hoi-dap/', path: '/hoi-dap/', module: null },
      { id: 'duyet', name: 'Duyệt thẻ (nội bộ)', hint: '/duyet/', path: '/duyet/', module: null },
      { id: 'privacy', name: 'Chính sách bảo mật', hint: '/privacy', path: '/privacy', module: null },
    ],
    modules: {
      'tin-tuc': {
        // artwork the article editor offers for covers and pictures
        imageLibrary: [
          '/3qdc-vi/home/anh-nen-slogan-vi.webp',
          '/3qdc-vi/home/tin-tuc-banner-1-vi.webp',
          '/3qdc-vi/home/tinh-nang-1-vi.webp',
          '/3qdc-vi/home/tinh-nang-2-vi.png',
          '/3qdc-vi/home/tinh-nang-3-vi.webp',
          '/3qdc-vi/home/tinh-nang-4-vi.png',
          '/3qdc-vi/home/tinh-nang-5-vi.png',
        ],
        uploadUrl: '/tin-tuc-anh',
      },
      // background music: the files stay in overrides/home/nhac (the home page reads that folder directly)
      'nhac': {},
      'dang-ky-som': {},
      'phieu-be-ngoan': {},
    },
  },
  {
    id: 'skystory',
    name: 'Thiên Không Kỳ Truyện',
    logo: '',
    // trang chủ tĩnh /srv/tkkt/site (Caddy chuyển /api/tin-tuc, /tin-tuc/*, /tin-tuc-anh/* về đây); game chơi web ở web.skystory.wanmeivn.com (VPS .23)
    sites: [
      { id: 'chinh', name: 'Trang chủ', hint: 'skystory.wanmeivn.com — trang chủ, tin tức', hosts: ['skystory.wanmeivn.com'], module: 'tin-tuc' },
      { id: 'game', name: 'Chơi trên web', hint: 'web.skystory.wanmeivn.com (VPS .23)', hosts: ['web.skystory.wanmeivn.com'], module: null },
    ],
    modules: {
      'tin-tuc': { imageLibrary: [], uploadUrl: '/tin-tuc-anh' },
    },
  },
  {
    id: 'hoanmythegioi',
    name: 'Hoàn Mỹ Thế Giới',
    logo: '',
    // trang chủ tĩnh /srv/hmtg/site; khối Sự kiện đọc /api/tin-tuc?muc=su-kien (Caddy chuyển /api/tin-tuc, /tin-tuc-anh/* về
    // đây). Không có trang tin: sự kiện mở đọc ngay trên trang chủ. Bảng xếp hạng: Claude của một thành viên gửi lên qua MCP,
    // trang chủ đọc /api/bang-xep-hang (cũng Caddy chuyển về đây).
    sites: [
      { id: 'chinh', name: 'Trang chủ', hint: 'hoanmythegioi.wanmeivn.com — bảng Sự kiện, Bảng xếp hạng', hosts: ['hoanmythegioi.wanmeivn.com'], module: 'tin-tuc' },
    ],
    modules: {
      'tin-tuc': { imageLibrary: [], uploadUrl: '/tin-tuc-anh', cats: ['su-kien'] },
      'bang-xep-hang': {},
    },
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id) || null;
// the game a request belongs to, from its Host header; an unknown host is the main site of 3qdc (as it always was)
export function gameOfHost(host) {
  const h = String(host || '').toLowerCase().replace(/:\d+$/, '');
  return GAMES.find((g) => (g.sites || []).some((s) => (s.hosts || []).includes(h))) || gameById('3qdc');
}
