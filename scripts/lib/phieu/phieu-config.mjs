// phieu-config.mjs — settings for "Phiếu Bé Ngoan", the page where players ask for gifts (phieubengoan.3qdc.wanmeivn.com).
// The page is served by this same server: Caddy passes that host name here and the routes pick it by the Host header.
import { join } from 'node:path';

// Tickets live outside git (data/phieu-be-ngoan/phieu.json); the draft server points this at a test folder.
export const DATA_DIR = process.env.PHIEU_DATA_DIR || join(process.cwd(), 'data', 'phieu-be-ngoan');

// Host names that show the ticket page. The draft server adds its own address (127.0.0.1:13398) through the env list.
const extra = String(process.env.PHIEU_EXTRA_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export const HOSTS = ['phieubengoan.3qdc.wanmeivn.com', ...extra];
// Pages allowed to send tickets (the Origin header of every POST).
export const ORIGINS = ['https://phieubengoan.3qdc.wanmeivn.com', ...extra.map((h) => `http://${h}`)];

// Google sign-in: the OAuth client id from Google Cloud (public, not a secret). Empty = the Google button is hidden.
export const GOOGLE_CLIENT_ID = String(process.env.PHIEU_GOOGLE_CLIENT_ID || '').trim();
// Test sign-in by typing an email, for the plain-http draft server only: it also needs NEWS_INSECURE_COOKIE=1, which
// the live HTTPS service never has, so a stray PHIEU_DEV_LOGIN there does nothing.
export const DEV_LOGIN = process.env.PHIEU_DEV_LOGIN === '1' && process.env.NEWS_INSECURE_COOKIE === '1';
// The session cookie is Secure (HTTPS); only the plain-http draft server switches that off (same switch as /quan-tri).
export const SECURE_COOKIE = process.env.NEWS_INSECURE_COOKIE !== '1';

// Game servers a player can pick; one for now.
export const SERVERS = [{ id: 'S1', name: 'S1 Trương Liêu' }];
// Tickets keep the id (S1); pages and the CSV show the name.
export const serverName = (id) => SERVERS.find((s) => s.id === id)?.name || id;

export const ACC_RE = /^[A-Za-z0-9._-]{1,32}$/;
export const GIFTS_MAX = 10;
export const GIFT_MAX = 80;
export const NOTE_MAX = 300;
export const REPLY_MAX = 160;

// Ticket states, in the order the admin filters show them.
export const STATES = { cho: 'Đang chờ', tra: 'Đã trả', tu: 'Từ chối' };

export function isPhieuHost(host) {
  return HOSTS.includes(String(host || '').toLowerCase());
}
