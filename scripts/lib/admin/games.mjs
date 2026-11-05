// games.mjs — the book of games the editor pages can manage. Edited by hand (there is no "create game" button).
// Imports nothing, so config files can read it without import cycles.
//
// game.sites   every web address of the game's cluster. A site with `module` is managed by that module (today: the
//              news split of 3qdc); a site without one is only listed so the overview can show it — no admin part.
//              Either `hosts` (a whole host name) or `path` (a folder of the main host).
// game.modules the parts switched on for this game, each with its own settings ({} = nothing to set).
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
  { id: 'skystory', name: 'Thiên Không Kỳ Truyện', logo: '', sites: [], modules: {} },
];

export const gameById = (id) => GAMES.find((g) => g.id === id) || null;
