// safe-fetch.mjs — downloads a file from a link a person gave Claude (a picture or a song), for the tools that take a link.
// The link is untrusted, so:
//   - https only, port 443 only, no user name / password in the link
//   - the address the name resolves to is checked when the connection is made (the very address connected to), so a name
//     that points to this machine or a private network is refused, also after every redirect and against DNS tricks;
//     a link written as an IP number is checked the same way
//   - at most 3 redirects, each one checked from the start; at most `maxBytes` bytes; one overall time limit
//   - no cookies are sent and nothing is read from a redirect except where it leads
// Resolves { body, headers } or { error }. `body` is a readable stream with a `headers` object ({ 'content-type',
// 'content-length' }) so it can be given to the same save functions the web uploads use. Call `close()` when done.
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { Transform } from 'node:stream';

const MAX_REDIRECTS = 3;
const URL_MAX = 2000;

// ---------- which addresses are refused ----------
const v4 = new net.BlockList();
for (const [net4, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
]) v4.addSubnet(net4, bits, 'ipv4');

// the 16 bytes of an IPv6 address (null when it is not one)
function v6Bytes(text) {
  let s = String(text).toLowerCase().split('%')[0];
  if (net.isIP(s) !== 6) return null;
  const tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const p = tail[1].split('.').map(Number);
    s = s.slice(0, -tail[1].length) + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16);
  }
  const [head, rest] = s.split('::');
  const a = head ? head.split(':') : [];
  const b = rest === undefined ? [] : rest ? rest.split(':') : [];
  const groups = rest === undefined ? a : [...a, ...Array(8 - a.length - b.length).fill('0'), ...b];
  if (groups.length !== 8) return null;
  const out = Buffer.alloc(16);
  groups.forEach((g, i) => out.writeUInt16BE(parseInt(g, 16) || 0, i * 2));
  return out;
}
const dotted = (b, at) => `${b[at]}.${b[at + 1]}.${b[at + 2]}.${b[at + 3]}`;

/** Is this IP number one a download must never connect to (this machine, private, link-local, reserved, multicast)? */
export function isBlockedIp(ip) {
  const kind = net.isIP(ip);
  if (kind === 4) return v4.check(ip, 'ipv4');
  if (kind !== 6) return true; // not an IP number at all: refuse
  const b = v6Bytes(ip);
  if (!b) return true;
  const zeros = (n) => b.subarray(0, n).every((x) => x === 0);
  if (zeros(16) || (zeros(15) && b[15] === 1)) return true; // :: and ::1
  if (zeros(10) && b[10] === 0xff && b[11] === 0xff) return v4.check(dotted(b, 12), 'ipv4'); // ::ffff:a.b.c.d
  if (zeros(12)) return v4.check(dotted(b, 12), 'ipv4'); // old "IPv4-compatible" form
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && b.subarray(4, 12).every((x) => x === 0)) return v4.check(dotted(b, 12), 'ipv4'); // 64:ff9b::/96 (NAT64)
  if (b[0] === 0x20 && b[1] === 0x02) return v4.check(dotted(b, 2), 'ipv4'); // 6to4 carries an IPv4 address
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0xc0) return true; // fec0::/10 site-local (retired)
  if (b[0] === 0xff) return true; // multicast
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // documentation
  if (b[0] === 0x01 && b.subarray(1, 8).every((x) => x === 0)) return true; // 100::/64 discard
  return false;
}

// Checks a link as written. → { url: URL } or { error }
export function checkLink(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { error: 'Thiếu link.' };
  if (text.length > URL_MAX) return { error: 'Link quá dài.' };
  let u;
  try { u = new URL(text); } catch { return { error: 'Link không hợp lệ.' }; }
  if (u.protocol !== 'https:') return { error: 'Chỉ nhận link https.' };
  if (u.username || u.password) return { error: 'Link không được kèm tên đăng nhập hoặc mật khẩu.' };
  if (u.port && u.port !== '443') return { error: 'Chỉ nhận link https cổng 443 (cổng mặc định).' };
  const host = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!host) return { error: 'Link không hợp lệ.' };
  if (net.isIP(host)) {
    if (isBlockedIp(host)) return { error: 'Link trỏ tới địa chỉ nội bộ hoặc không công khai, không tải được.' };
  } else if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) {
    return { error: 'Link trỏ tới địa chỉ nội bộ hoặc không công khai, không tải được.' };
  }
  return { url: u, host };
}

// dns.lookup that refuses any answer containing a refused address; the connection then uses the answer checked here
function guardedLookup(hostname, options, cb) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, list) => {
    if (err) return cb(err);
    if (!list.length || list.some((a) => isBlockedIp(a.address))) {
      const e = new Error('blocked address');
      e.code = 'E_BLOCKED';
      return cb(e);
    }
    if (options && options.all) return cb(null, list);
    return cb(null, list[0].address, list[0].family);
  });
}

// counts the bytes and stops the stream when there are too many
function limiter(maxBytes) {
  let size = 0;
  return new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (size > maxBytes) { const e = new Error('too big'); e.code = 'E_TOO_BIG'; return cb(e); }
      cb(null, chunk);
    },
  });
}

/**
 * Opens the link. opts.maxBytes (required), opts.timeoutMs (whole download, default 30 s).
 * → { body, headers, close } | { error } — the error is a sentence for the person.
 */
export async function openLink(raw, { maxBytes, timeoutMs = 30e3 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let current = raw;
  let live = null; // the request / response being read, so close() can stop it
  const closeAll = () => { if (live) { live.req.destroy(); if (live.res) live.res.destroy(); live = null; } };
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const c = checkLink(current);
    if (c.error) return { error: hop ? `Link chuyển hướng không hợp lệ: ${c.error}` : c.error };
    const left = deadline - Date.now();
    if (left <= 0) return { error: 'Tải quá lâu, đã dừng.' };
    let res;
    try {
      res = await new Promise((resolve, reject) => {
        const req = https.request({
          protocol: 'https:', hostname: c.host, port: 443, path: c.url.pathname + c.url.search, method: 'GET', lookup: guardedLookup,
          headers: { 'User-Agent': '3qdc-quan-tri/1.0', Accept: '*/*', 'Accept-Encoding': 'identity' }, timeout: left,
        }, resolve);
        live = { req, res: null };
        req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })));
        req.on('error', reject);
        req.end();
      });
    } catch (e) {
      closeAll();
      if (e.code === 'E_BLOCKED') return { error: 'Link trỏ tới địa chỉ nội bộ hoặc không công khai, không tải được.' };
      if (e.code === 'E_TIMEOUT') return { error: 'Máy chủ của link không trả lời kịp, đã dừng.' };
      return { error: 'Không kết nối được tới link (kiểm tra link còn mở công khai và dùng https hợp lệ).' };
    }
    live.res = res;
    const status = res.statusCode || 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      closeAll();
      try { current = new URL(res.headers.location, c.url).toString(); } catch { return { error: 'Link chuyển hướng không hợp lệ.' }; }
      continue;
    }
    if (status !== 200) { closeAll(); return { error: `Link trả về mã ${status}, không tải được.` }; }
    const len = Number(res.headers['content-length']);
    if (Number.isFinite(len) && len > maxBytes) { closeAll(); return { error: tooBig(maxBytes) }; }
    const body = res.pipe(limiter(maxBytes));
    res.on('error', (e) => body.destroy(e));
    // a stalled body ends at the overall deadline
    const timer = setTimeout(() => body.destroy(Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })), Math.max(1, deadline - Date.now()));
    body.on('close', () => clearTimeout(timer));
    body.headers = {
      'content-type': String(res.headers['content-type'] || ''),
      ...(Number.isFinite(len) ? { 'content-length': String(len) } : {}),
    };
    return { body, headers: body.headers, close: () => { clearTimeout(timer); body.destroy(); closeAll(); }, url: c.url };
  }
  return { error: 'Link chuyển hướng quá nhiều lần.' };
}

const tooBig = (max) => `File lớn hơn ${Math.round(max / 1048576)} MB.`;

/** Words for a failure while the body was being read. */
export function readError(e) {
  if (e && e.code === 'E_TOO_BIG') return 'File lớn hơn giới hạn cho phép.';
  if (e && e.code === 'E_TIMEOUT') return 'Tải quá lâu, đã dừng.';
  return 'Tải file bị ngắt giữa chừng.';
}

// what the link's type is called, by the end of its address, for servers that answer with a vague type
export function kindFromName(pathname, table) {
  const m = String(pathname).toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return m && Object.hasOwn(table, m[1]) ? table[m[1]] : '';
}

/** Gives the stream the content type to save with: the answered one if it is one of `accepted`, else a vague answer + the address's ending, else ''. */
export function pickType(link, accepted, byExt) {
  const given = (link.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (accepted.includes(given)) return given;
  if (!given || given === 'application/octet-stream' || given === 'binary/octet-stream' || given === 'application/binary') return kindFromName(link.url.pathname, byExt);
  return '';
}
