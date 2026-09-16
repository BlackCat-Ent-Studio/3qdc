// compact.mjs — when the home page uses its compact layout: phones (upright or turned), windows up to COMPACT_MAX wide,
// and touch tablets up to COMPACT_TOUCH_MAX wide in either orientation (an iPad turned sideways is 1024–1366px wide, where
// the desktop layout's hover menu, floating bars and embedded hero page do not suit a finger).
// Shared by layout-v2.mjs and the section files so every compact rule uses the same media query. Windows wider than
// COMPACT_MAX with a mouse or trackpad as main pointer keep the desktop layout exactly as it is.
export const COMPACT_MAX = 1023;
export const COMPACT_TOUCH_MAX = 1366;
export const COMPACT_MQ = `(max-width:${COMPACT_MAX}px), (pointer:coarse) and (max-width:${COMPACT_TOUCH_MAX}px)`;
// height of the compact header bar (logo + menu button)
export const COMPACT_HEADER_H = 56;
