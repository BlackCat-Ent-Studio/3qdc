// link-hosts.mjs — the servers the tools that take a link (tai_anh_tu_link, tai_nhac_tu_link) may download from. This is the
// one place to edit. A link to any other server is refused, so a note a player typed into a ticket can never make Claude
// send anything to a server of the attacker's choice.
//   "name.example"      exactly that host
//   "*.example"         any host below example (a.example, a.b.example), never "example" itself and never "evilexample"
//   "scontent*.cdn.net" a host that starts with "scontent" and ends with ".cdn.net"
// Match is on the whole host name (lowercase, no port); an IP number never matches.
export const ALLOWED_LINK_HOSTS = [
  'wanmeivn.com', '*.wanmeivn.com',              // this system's own addresses
  'i.imgur.com',
  'lh3.googleusercontent.com',
  'drive.usercontent.google.com',
  'cdn.discordapp.com', 'media.discordapp.net',
  'scontent*.fbcdn.net',                         // Facebook pictures (scontent.fsgn2-1.fna.fbcdn.net, scontent-sin6-1.xx.fbcdn.net ...)
];

// host names only hold letters, digits, dots and dashes, so a pattern is written out piece by piece (dots become literal dots)
const dots = (s) => s.split('.').join('[.]');
function compile(pattern) {
  const p = pattern.toLowerCase();
  if (p.startsWith('*.')) return new RegExp('^(?:[a-z0-9-]+[.])+' + dots(p.slice(2)) + '$');
  return new RegExp('^' + p.split('*').map(dots).join('[a-z0-9.-]*') + '$');
}

/** Is this host name on the list? `list` is for tests. */
export function isAllowedHost(host, list = ALLOWED_LINK_HOSTS) {
  const h = String(host || '').toLowerCase();
  return list.some((p) => compile(p).test(h));
}

export const ALLOWED_HINT = 'Chỉ tải được từ các máy chủ trong danh sách cho phép (chính hệ thống *.wanmeivn.com, imgur, Google, Discord, Facebook). Hãy tải ảnh lên web quản trị rồi dùng ds_anh (nhạc: tải trên trang quản trị Nhạc nền).';
