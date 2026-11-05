// paths.mjs — the one place that decides where each part keeps its data.
// Today every part keeps its folder under data/ exactly where it always was (the draft and live servers may still
// point each one elsewhere with an environment variable); the game id is accepted already so the layout can change here only.
import { join } from 'node:path';

export const DATA_ROOT = process.env.DATA_ROOT || join(process.cwd(), 'data');

const OLD = {
  'tin-tuc': { env: 'NEWS_DATA_DIR', dir: 'news' },
  'phieu-be-ngoan': { env: 'PHIEU_DATA_DIR', dir: 'phieu-be-ngoan' },
  'dang-ky-som': { env: 'SIGNUP_DATA_DIR', dir: 'dang-ky-som' },
};

// accounts, invites and Claude codes (shared by all games)
export const systemDir = () => DATA_ROOT;

export function moduleDir(_gameId, moduleId) {
  const o = OLD[moduleId];
  if (!o) throw new Error(`module "${moduleId}" keeps no data folder`);
  return process.env[o.env] || join(DATA_ROOT, o.dir);
}
