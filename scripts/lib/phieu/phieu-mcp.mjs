// phieu-mcp.mjs — /mcp: a small MCP server (Streamable HTTP, stateless, JSON answers only) through which a person's own
// Claude does what that person's rights allow over HTTPS, with no browser and no access to the machine. (The file keeps the
// name it had when the tickets were its only tools.)
//   auth    Authorization: Bearer <Claude code> (admin-access.mjs: made by an owner, revocable, dead as soon as its
//           account is locked or loses every right). Requests from a web page (an Origin header) must be the site's own.
//   tools   admin/mcp/index.mjs: tools for every part the account has a right in (news, tickets, early sign-ups, music, trash),
//           listed and checked again on every request; the owner's rights tools (owner-mcp.mjs) only for a code made with
//           scope 'owner'. Deleting is only ever "into the trash".
//   limits  64 KB per request; 120 requests a minute per code; 30 refused codes per address per 15 minutes.
import { ALLOWED_ORIGINS } from '../news/news-config.mjs';
import { clientIp } from '../news/admin-auth.mjs';
import { siteNow } from '../news/news-files.mjs';
import { userOfCode } from '../news/admin-access.mjs';
import { toolsFor, callTool, instructionsFor } from '../admin/mcp/index.mjs';

export const MCP_PATH = '/mcp';
const BODY_MAX = 64 * 1024;
const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

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
        serverInfo: { name: '3qdc-quan-tri', title: 'Quản trị 3Q Đại Chiến', version: '2.0.0' },
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
