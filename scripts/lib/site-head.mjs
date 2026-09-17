// Vietnamese <head> for the build-B entry (mirror/index.html, the Chinese site's page): link previews (Zalo, Facebook)
// and search engines read the raw HTML without running scripts, so the Chinese title, description and keywords of the
// mirrored page are replaced on the server, and share tags (og:*) with a JPEG picture are added. The browser tab icon of
// the Chinese app is swapped for the 3Q Đại Chiến logo as well.
// The mirror file itself stays untouched.

export const SITE_NAME = '3Q Đại Chiến';
export const SITE_DESCRIPTION = '3Q Đại Chiến – game thẻ tướng Tam Quốc đồ hoạ đỉnh cao: hàng trăm danh tướng được vẽ tỉ mỉ, '
  + 'dàn lồng tiếng sống động tái hiện thời loạn thế. Lối chơi đa dạng, phá vỡ khuôn khổ thẻ tướng truyền thống. '
  + 'Tiểu tướng quân, cùng bước vào hành trình Tam Quốc vượt ngoài tưởng tượng!';
// the home key visual cropped to 1200x630 (link preview ratio); JPEG because Zalo shows no WEBP preview picture
export const SHARE_IMAGE = { path: '/3qdc-vi/home/chia-se-1200x630.jpg', width: 1200, height: 630 };
// tab icon: the header logo (logo-3qdc.webp, 203x152) trimmed and centred on a transparent 64x64 square
export const FAVICON = '/3qdc-vi/home/favicon-3qdc.png';
// the mirrored page's icon link (the Chinese app icon); spread over several lines in mirror/index.html
const FAVICON_LINK = /<link\s+rel="shortcut icon"\s+href="[^"]*"\s*\/?>/;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// the parts of the mirrored head that are replaced; if one is missing the page is served unchanged (with a warning)
// rather than broken
const PARTS = [
  ['html tag', /<html>/],
  ['lang meta', /[ \t]*<meta lang="zh" \/>\r?\n/],
  ['description', /[ \t]*<meta\s+name="description"\s+content="[^"]*"\s*\/>\r?\n/],
  ['keywords', /[ \t]*<meta\s+name="keyword"\s+content="[^"]*"\s*\/>\r?\n/],
  ['title', /<title>[^<]*<\/title>/],
];

// html: the mirrored entry page; title: the page title; origin: absolute site address; path: the page's clean path
let warned = false;
export function missingHeadParts(html) {
  return PARTS.filter(([, re]) => !re.test(html)).map(([name]) => name);
}
export function viHead(html, { title, origin, path }) {
  const missing = missingHeadParts(html);
  if (missing.length) {
    if (!warned) { warned = true; console.warn(`[site-head] entry page changed, Vietnamese head skipped (missing: ${missing.join(', ')})`); }
    return html;
  }
  const image = origin + SHARE_IMAGE.path;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(SITE_DESCRIPTION)}">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${esc(path === '/' ? SITE_NAME : title)}">`,
    `<meta property="og:description" content="${esc(SITE_DESCRIPTION)}">`,
    `<meta property="og:url" content="${esc(origin + path)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    `<meta property="og:image:width" content="${SHARE_IMAGE.width}">`,
    `<meta property="og:image:height" content="${SHARE_IMAGE.height}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ].join('\n    ');
  return html
    .replace(PARTS[0][1], '<html lang="vi">')
    .replace(PARTS[1][1], '')
    .replace(PARTS[2][1], '')
    .replace(PARTS[3][1], '')
    .replace(PARTS[4][1], () => tags)
    .replace(FAVICON_LINK, `<link rel="icon" type="image/png" sizes="64x64" href="${FAVICON}">`);
}
