// Hide overlay for the /#/index route. Non-destructive: a tagged <style> that
// display:none's elements the operator wants gone. Reversible — remove the
// selector to restore. Injected into the served index.html.

const HIDE_SELECTORS = [
  '.star-site-index-ages_tips',   // 12+ CADPA age-rating badge (bottom-left)
];

export const HIDE_HTML =
  `<style data-mirror-hide="zh-clutter">${HIDE_SELECTORS.join(',')}{display:none !important;}</style>`;
