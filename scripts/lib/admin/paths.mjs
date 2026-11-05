// paths.mjs — the one place that decides where each part keeps its data.
//   data/he-thong/                        what belongs to no game: accounts, invites, Claude codes
//   data/games/<game>/<part>/             one folder per game and part (tin-tuc, phieu-be-ngoan, dang-ky-som)
// DATA_ROOT moves the whole tree (the draft servers set it). The older per-part variables (NEWS_DATA_DIR and the like) are
// gone: data-layout.mjs refuses to start a server that still sets one. Background music is not data of this tree:
// it stays in overrides/home/nhac, which the home page reads directly.
import { join } from 'node:path';
import { GAME_ID_RE } from './games.mjs';

export const DATA_ROOT = process.env.DATA_ROOT || join(process.cwd(), 'data');

const PART_DIRS = new Set(['tin-tuc', 'phieu-be-ngoan', 'dang-ky-som']);

// accounts, invites and Claude codes (shared by all games)
export const systemDir = () => join(DATA_ROOT, 'he-thong');

export function moduleDir(gameId, moduleId) {
  if (!GAME_ID_RE.test(String(gameId))) throw new Error(`invalid game id ${JSON.stringify(gameId)}`);
  if (!PART_DIRS.has(moduleId)) throw new Error(`module "${moduleId}" keeps no data folder`);
  return join(DATA_ROOT, 'games', gameId, moduleId);
}
