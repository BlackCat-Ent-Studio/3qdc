// Single source of the hide overlay. Non-destructive: a tagged <style> that
// display:none's elements the operator wants gone (Chinese QR/social block,
// legal text, logo). Reversible — remove this block to restore. Injected into
// the served entry HTML alongside the i18n + ua-spoof shims.

const HIDE_SELECTORS = [
  '.star-site-fab-main-qrcode',   // QR + Weibo/WeChat/QQ/Tieba + 12+ badge + feature link
  '[class*="tel___"]',            // legal text spans (app name / developer / company / address)
  '.star-site-fab-kv-logo',       // game logo (Chinese title art)
  '.star-site-fsb-kv-ages_tips',  // 12+ CADPA age-rating badge (hero overlay)
  '.container___1rGy1',           // [PC] ENTIRE footer block (privacy links + © + ICP + 防沉迷 + license)
  '.FooterWrapper___1nkDt',       // [mobile] ENTIRE footer block (legal text + ICP/license links)
  '.m-star-site-ages-tips',       // [mobile] 12+ CADPA age-rating badge
  '.gameLogo___2T4RH',            // [mobile] game logo (Chinese title art, top-left)
  '.logo___2mJo1',                // [mobile] 5周年 anniversary badge icon (top-left)
  '.subTitle___kay_Y',            // [mobile] header subtitle line (rebrand: hidden)
];

export const HIDE_HTML =
  `<style data-mirror-hide="zh-clutter">${HIDE_SELECTORS.join(',')}{display:none !important;}</style>`;
