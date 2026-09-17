// Stand-in for live2d-widgets 1.0.1 waifu-tips.js (GPL-3.0-or-later, https://github.com/stevenjoezhang/live2d-widget).
// The home page draws its own mascot box, bubble and buttons (scripts/lib/home/layout-v2/section-mascot.mjs), so only the
// two model loaders of that package are used: chunk/index.js (Cubism 2) and chunk/index2.js (Cubism 3/4/5). Both import
// nothing from the widget bundle except its logger, exported as `l`; this file provides that logger alone.
const noop = () => {};
export const l = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: (...args) => console.warn('[hv2 mascot]', ...args),
  error: (...args) => console.error('[hv2 mascot]', ...args),
};
