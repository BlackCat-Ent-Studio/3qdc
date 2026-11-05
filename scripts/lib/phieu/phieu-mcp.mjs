// phieu-mcp.mjs — /mcp: a small MCP server (Streamable HTTP, stateless, JSON answers only) through which a person's own
// Claude does what that person's rights allow over HTTPS, with no browser and no access to the machine.
//   auth    Authorization: Bearer <Claude code> (admin-access.mjs: made by an owner, revocable, dead as soon as its
//           account is locked or loses every right that has tools). Requests from a web page (an Origin header) must be the
//           site's own.
//   tools   each tool group needs a right, checked on every request and again on every call:
//           tickets (`duyet` of Phiếu Bé Ngoan in 3qdc): xem_phieu (list), tra_qua (gifts given), tu_choi (refused). Both
//             answers only touch a ticket that is still waiting, never show players' email addresses, and record
//             "<username> (Claude)" as the handler.
//           owner's tools (owner-mcp.mjs): only for a code made with scope 'owner'.
//   limits  64 KB per request; 120 requests a minute per code; 30 refused codes per address per 15 minutes.
import { ALLOWED_ORIGINS } from '../news/news-config.mjs';
import { clientIp } from '../news/admin-auth.mjs';
import { siteNow } from '../news/news-files.mjs';
import { userOfCode, hasMcpTools } from '../news/admin-access.mjs';
import { OWNER_TOOLS, OWNER_TOOL_NAMES, OWNER_INSTRUCTIONS, callOwnerTool } from '../admin/owner-mcp.mjs';
import { listPhieu, answerPhieu, withoutEmail } from './phieu-store.mjs';
import { STATES, REPLY_MAX, serverName } from './phieu-config.mjs';

export const MCP_PATH = '/mcp';
const BODY_MAX = 64 * 1024;
const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const LIST_MAX = 100;
const ID_RE = /^[a-z0-9]{6,20}$/;

const PHIEU_INSTRUCTIONS = [
  'Máy chủ Phiếu Bé Ngoan của 3Q Đại Chiến. Người chơi gửi phiếu xin quà (mỗi Gmail một phiếu một ngày); người duyệt trả quà',
  'trong game bằng tay rồi đánh dấu phiếu ở đây. xem_phieu liệt kê phiếu; tra_qua đánh dấu Đã trả; tu_choi đánh dấu Từ chối kèm lý do.',
  'Chỉ gọi tra_qua sau khi người dùng xác nhận đã trả quà trong game. Phản hồi người chơi đọc được, viết tiếng Việt lịch sự, ngắn gọn.',
].join(' ');

const PHIEU_TOOLS = [
  {
    name: 'xem_phieu',
    title: 'Xem phiếu Bé Ngoan',
    description: 'Liệt kê phiếu xin quà theo ngày gửi và trạng thái (mặc định: phiếu đang chờ của hôm nay). Mỗi phiếu có mã (id), nhân vật, server, các món quà muốn nhận, ghi chú, trạng thái, phản hồi và người xử lý.',
    inputSchema: {
      type: 'object',
      properties: {
        ngay: { type: 'string', enum: ['hom-nay', 'hom-qua', 'tat-ca'], description: 'Ngày gửi: hôm nay, hôm qua, hoặc mọi ngày. Mặc định hom-nay.' },
        trang_thai: { type: 'string', enum: ['cho', 'tra', 'tu', 'tat-ca'], description: 'cho = đang chờ, tra = đã trả, tu = từ chối, tat-ca = mọi trạng thái. Mặc định cho.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'tra_qua',
    title: 'Đánh dấu đã trả quà',
    description: 'Đánh dấu một phiếu đang chờ là Đã trả, sau khi quà đã được trả trong game. Người chơi thấy trạng thái và phản hồi trong lịch sử phiếu. Phiếu đã xử lý rồi thì không đổi được.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9]{6,20}$', description: 'Mã phiếu (id) lấy từ xem_phieu.' },
        phan_hoi: { type: 'string', maxLength: REPLY_MAX, description: `Lời nhắn cho người chơi (không bắt buộc, tối đa ${REPLY_MAX} ký tự).` },
      },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'tu_choi',
    title: 'Từ chối phiếu',
    description: 'Đánh dấu một phiếu đang chờ là Từ chối, kèm lý do người chơi đọc được. Phiếu đã xử lý rồi thì không đổi được.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9]{6,20}$', description: 'Mã phiếu (id) lấy từ xem_phieu.' },
        phan_hoi: { type: 'string', minLength: 1, maxLength: REPLY_MAX, description: `Lý do từ chối cho người chơi (bắt buộc, tối đa ${REPLY_MAX} ký tự).` },
      },
      required: ['id', 'phan_hoi'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
];

const PHIEU_TOOL_NAMES = new Set(PHIEU_TOOLS.map((t) => t.name));
// the tool groups this account may use right now (rights are read from the account on every request)
const mayTickets = (user) => hasMcpTools(user);
const mayOwner = (user) => user.scope === 'owner' && user.role === 'owner';
const toolsFor = (user) => [...(mayTickets(user) ? PHIEU_TOOLS : []), ...(mayOwner(user) ? OWNER_TOOLS : [])];
const instructionsFor = (user) => [mayTickets(user) ? PHIEU_INSTRUCTIONS : '', mayOwner(user) ? OWNER_INSTRUCTIONS : ''].filter(Boolean).join('\n\n');

// ---------- limits ----------
const refused = new Map(); // address → { count, first }
const perCode = new Map(); // code id → { count, first }
const REFUSE_MAX = 30, REFUSE_MS = 15 * 60e3, CODE_MAX = 120, CODE_MS = 60e3;
function tooManyRefused(ip) {
  const e = refused.get(ip);
  if (!e) return false;
  if (Date.now() - e.first > REFUSE_MS) { refused.delete(ip); return false; }
  return e.count >= REFUSE_MAX;
}
function noteRefused(ip) {
  const now = Date.now();
  let e = refused.get(ip);
  if (!e || now - e.first > REFUSE_MS) e = { count: 0, first: now };
  e.count++;
  refused.set(ip, e);
  if (refused.size > 5000) for (const [k, v] of refused) if (now - v.first > REFUSE_MS) refused.delete(k);
}
function overCodeLimit(id) {
  const now = Date.now();
  let e = perCode.get(id);
  if (!e || now - e.first > CODE_MS) e = { count: 0, first: now };
  e.count++;
  perCode.set(id, e);
  return e.count > CODE_MAX;
}

// ---------- HTTP ----------
function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(data === undefined ? undefined : JSON.stringify(data));
}
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

function readBody(req) {
  if (Number(req.headers['content-length']) > BODY_MAX) return Promise.resolve({ tooBig: true });
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0, done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on('data', (c) => { size += c.length; if (size > BODY_MAX) { chunks.length = 0; finish({ tooBig: true }); return; } chunks.push(c); });
    req.on('end', () => finish({ text: Buffer.concat(chunks).toString('utf8') }));
    req.on('error', () => finish({ tooBig: true }));
  });
}

// Answers /mcp; returns false for every other path.
export async function handleMcp(req, res, cleanPath) {
  if (cleanPath !== MCP_PATH) return false;
  try {
    await serve(req, res);
  } catch (e) {
    console.error('[phieu-mcp] error', e && e.stack ? e.stack : e);
    if (!res.headersSent) sendJson(res, 500, rpcError(null, -32603, 'Máy chủ gặp lỗi khi xử lý. Thử lại sau ít phút.'));
    else res.destroy();
  }
  return true;
}

async function serve(req, res) {
  // stateless: no event stream to open (GET) and no session to end (DELETE)
  if (req.method !== 'POST') return sendJson(res, 405, rpcError(null, -32000, 'Chỉ nhận POST.'), { Allow: 'POST' });
  const origin = String(req.headers.origin || '').replace(/\/+$/, '');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return sendJson(res, 403, rpcError(null, -32000, 'Nguồn gọi không được phép.'));

  const ip = clientIp(req);
  if (tooManyRefused(ip)) return sendJson(res, 429, rpcError(null, -32000, 'Sai mã quá nhiều lần. Thử lại sau 15 phút.'));
  const m = String(req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i);
  const user = m ? await userOfCode(m[1]) : null;
  if (!user) {
    noteRefused(ip);
    console.warn(`[phieu-mcp] ${siteNow()} refused code ip=${ip}`);
    return sendJson(res, 401, rpcError(null, -32001, 'Thiếu mã hoặc mã không còn hiệu lực. Xin Quản lý mã mới.'), { 'WWW-Authenticate': 'Bearer realm="3qdc-phieu"' });
  }
  if (overCodeLimit(user.codeId)) return sendJson(res, 429, rpcError(null, -32000, 'Gọi quá nhiều lần trong một phút. Chờ chút rồi thử lại.'));

  if (!/^application\/json(\s*;|$)/i.test(String(req.headers['content-type'] || ''))) return sendJson(res, 415, rpcError(null, -32700, 'Chỉ nhận JSON.'));
  const got = await readBody(req);
  if (got.tooBig) return sendJson(res, 413, rpcError(null, -32600, 'Yêu cầu quá lớn.'), { Connection: 'close' });
  let msg;
  try { msg = JSON.parse(got.text || ''); } catch { return sendJson(res, 400, rpcError(null, -32700, 'JSON không đọc được.')); }

  // a batch (older protocol versions) is answered as an array; notifications get no answer
  const batch = Array.isArray(msg);
  const answers = [];
  for (const one of batch ? msg.slice(0, 20) : [msg]) {
    const a = await answer(one, user);
    if (a) answers.push(a);
  }
  if (!answers.length) return sendJson(res, 202, undefined);
  return sendJson(res, 200, batch ? answers : answers[0]);
}

async function answer(msg, user) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(msg && msg.id, -32600, 'Yêu cầu JSON-RPC không hợp lệ.');
  const isNote = !('id' in msg);
  const ok = (result) => (isNote ? null : { jsonrpc: '2.0', id: msg.id, result });
  const p = msg.params && typeof msg.params === 'object' ? msg.params : {};
  switch (msg.method) {
    case 'initialize':
      return ok({
        protocolVersion: VERSIONS.includes(p.protocolVersion) ? p.protocolVersion : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: '3qdc-phieu-be-ngoan', title: 'Phiếu Bé Ngoan — 3Q Đại Chiến', version: '1.0.0' },
        instructions: instructionsFor(user),
      });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: toolsFor(user) });
    case 'tools/call':
      return ok(await callTool(String(p.name || ''), p.arguments && typeof p.arguments === 'object' ? p.arguments : {}, user));
    default:
      if (isNote) return null; // notifications/initialized, notifications/cancelled, …
      return rpcError(msg.id, -32601, `Không có phương thức ${msg.method}.`);
  }
}

// ---------- tools ----------
const text = (s, extra = {}) => ({ content: [{ type: 'text', text: s }], ...extra });
const fail = (s) => text(s, { isError: true });
const fmt = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}` : '');

function describe(t) {
  const lines = [
    `• Mã ${t.id} · gửi ${fmt(t.luc)} · ${STATES[t.st] || t.st}`,
    `  Nhân vật: ${t.acc} · Server: ${serverName(t.server)}`,
    `  Quà: ${t.qua.join('; ')}`,
  ];
  if (t.ghiChu) lines.push(`  Ghi chú: ${t.ghiChu}`);
  if (t.st !== 'cho') lines.push(`  Xử lý: ${t.xuLyBoi || '?'} lúc ${fmt(t.xuLyLuc)}${t.phanHoi ? ` · Phản hồi: ${t.phanHoi}` : ''}`);
  return lines.join('\n');
}

async function callTool(name, args, user) {
  if (OWNER_TOOL_NAMES.has(name)) return mayOwner(user) ? callOwnerTool(name, args, user) : fail(`Không có công cụ ${name}.`);
  if (PHIEU_TOOL_NAMES.has(name) && !mayTickets(user)) return fail(`Không có công cụ ${name}.`);
  if (name === 'xem_phieu') {
    const ngay = ['hom-nay', 'hom-qua', 'tat-ca'].includes(args.ngay) ? args.ngay : 'hom-nay';
    const st = args.trang_thai === 'tat-ca' ? 'all' : Object.hasOwn(STATES, args.trang_thai || '') ? args.trang_thai : 'cho';
    const d = await listPhieu({ ngay, st });
    const items = d.items.slice(0, LIST_MAX).map(withoutEmail);
    const head = `Ngày: ${{ 'hom-nay': 'hôm nay', 'hom-qua': 'hôm qua', 'tat-ca': 'mọi ngày' }[ngay]} · lọc: ${st === 'all' ? 'mọi trạng thái' : STATES[st]}. `
      + `Trong ngày đã chọn: ${d.counts.all} phiếu (đang chờ ${d.counts.cho}, đã trả ${d.counts.tra}, từ chối ${d.counts.tu}). Tổng phiếu đang chờ mọi ngày: ${d.cho}.`;
    const more = d.items.length > LIST_MAX ? `\n(Còn ${d.items.length - LIST_MAX} phiếu nữa không hiện; thu hẹp bộ lọc.)` : '';
    const body = items.length ? items.map(describe).join('\n') : 'Không có phiếu nào khớp.';
    const structured = items.map((t) => ({ id: t.id, luc: t.luc, nhanVat: t.acc, server: serverName(t.server), qua: t.qua, ghiChu: t.ghiChu, trangThai: t.st, phanHoi: t.phanHoi, xuLyBoi: t.xuLyBoi }));
    return text(`${head}\n\n${body}${more}`, { structuredContent: { counts: d.counts, choMoiNgay: d.cho, items: structured } });
  }
  if (name === 'tra_qua' || name === 'tu_choi') {
    const id = String(args.id || '');
    if (!ID_RE.test(id)) return fail('Mã phiếu không hợp lệ. Lấy mã (id) từ xem_phieu.');
    const phanHoi = String(args.phan_hoi || '').replace(/\s+/g, ' ').trim();
    if (phanHoi.length > REPLY_MAX) return fail(`Phản hồi tối đa ${REPLY_MAX} ký tự.`);
    if (name === 'tu_choi' && !phanHoi) return fail('Từ chối cần ghi lý do cho người chơi (phan_hoi).');
    const st = name === 'tra_qua' ? 'tra' : 'tu';
    const r = await answerPhieu(id, st, phanHoi, `${user.username} (Claude)`);
    if (r.notFound) return fail(`Không tìm thấy phiếu ${id} (có thể đã bị xoá).`);
    if (r.already) return fail(`Phiếu ${id} đã được xử lý trước đó (${STATES[r.already.st] || r.already.st} bởi ${r.already.xuLyBoi || '?'}), không đổi nữa.`);
    console.log(`[phieu-mcp] ${siteNow()} ${user.username} (Claude) set ticket ${id} to ${st}`);
    return text(`Đã đánh dấu phiếu ${id}: ${STATES[st]}.\n${describe(withoutEmail(r.item))}`);
  }
  return fail(`Không có công cụ ${name}.`);
}
