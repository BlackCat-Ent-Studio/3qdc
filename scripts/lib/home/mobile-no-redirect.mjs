// mobile-no-redirect.mjs — keep phones and tablets on the site's own pages.
// Every route of the umi bundle (build A fab and build B home / section pages) is wrapped by module "auzN" of
// views/wrappers.ff230cb3.async.js. That wrapper tests the user agent and, on a phone or tablet, redirects any path
// without "/m/" to "/m" + path (e.g. #/index -> #/m/index). The mirror has no chunk for those mobile pages except
// /m/fab, so phones got a blank page. The server sends this file with that redirect kept only for /fab (the old mobile
// landing at /__internal/m still reaches #/m/fab): any other path without "/m/" renders as it is on every device, and the
// other branches stay as they were (a desktop opening a /m/ path is still sent to its desktop path).
// The file in mirror/ is not edited; the text is replaced when it is served.

export const WRAPPERS_PATH = '/cdn-cn.lingxigames.com/wukongbuild/star-gw/1.0.0/prod/views/wrappers.ff230cb3.async.js';

// the wrapper's return: `mobile !== true || path has /m/ ? (desktop on /m/ ? to desktop path : children) : to "/m" + path`
const REDIRECT_TEST = 'return!0!==r()||o.includes("/m/")?';
const FAB_ONLY_REDIRECT_TEST = 'return!0!==r()||"/fab"!==o||o.includes("/m/")?';

// the served text, or null when the file is not the expected build (the test must appear exactly once)
export function patchWrappers(source) {
  const parts = source.split(REDIRECT_TEST);
  return parts.length === 2 ? parts.join(FAB_ONLY_REDIRECT_TEST) : null;
}
