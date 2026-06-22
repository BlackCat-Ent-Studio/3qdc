# 3Q Đại Chiến: Offline Mirror + Vietnamese Localization Complete

**Date**: 2026-06-02  
**Severity**: Medium  
**Component**: zgshx → 3Q Đại Chiến offline mirror, UA routing, additive localization overlays  
**Status**: Deployed (production live, 79 uncommitted localization files)

## What Happened

Built a 1:1 offline static mirror of `sgzhx.lingxigames.com` (UmiJS 3.5.43 React SPA, no sourcemap) via Playwright asset capture + URL rewriting, unified PC/mobile behind one responsive shell URL (768px breakpoint), then Vietnamese-localized the entire experience with three additive overlays (never editing the umi bundle). Live at https://3qdc.wanmeivn.com.

## The Brutal Truth

This session was grunt work with razor-sharp discipline. Every "it's not changing" required forensic verification: MD5 hashing, byte counts, DOM probes. Browser cache lies constantly (F5 ≠ Ctrl+Shift+R). Mobile and PC use *entirely different* files and CSS classes for the same visual element—swap one, the other stays broken. The app hard-routes by User-Agent and ignores hash routing, which meant the mobile iframe needed a UA-spoof shim to force `#/m/fab` instead of `#/fab`. Without understanding that routing decision, the entire responsive shell would have failed silently.

## Technical Details

**Architecture:**
- `mirror/` = static clone (HTML/JS/CSS/images) served by Node `server.mjs`
- Route `/` → `shell.html` (viewport-switching iframe, 768px breakpoint)
- Route `/__internal/pc/` → PC route + i18n overlay + hide overlay
- Route `/__internal/m/` → mobile route + UA-spoof shim + i18n overlay + hide overlay
- Assets: `Cache-Control: no-store` (rapid iteration on images)
- Service: NSSM `3qdc-mirror` on port 3300, reverse-proxied by Caddy with auto-HTTPS

**Localization (3 additive overlays, zero bundle modification):**
1. `ua-spoof-shim.mjs` — injects `navigator.userAgent` override to force mobile route (app doesn't respect hash, only UA)
2. `i18n-overlay.mjs` — DOM zh→vi text dictionary + rebrand game title `三国志幻想大陆` → `"3Q Đại Chiến"` site-wide + override mainTitle element
3. `hide-overlay.mjs` — `display:none` QR/social, logo, 12+ badge, legal footer, icon 5周年, subtitle

**Image localization (3 mechanisms):**
- File-level (hero/bars/banners): JPG→PNG conversion + direct overwrite (preserves filename)
- CSS data-URI (nav buttons): base64-encode → replace data-URI in chunk CSS
- JS data-URI (mobile title + nav): base64-encode → replace data-URI in async chunk

All edits backup to `image-backup/<group>/` before overwrite.

## What We Tried

1. **Initial responsive shell:** iframe side-by-side at 768px, but mobile route never loaded until discovering hard UA-routing — added shim.
2. **Image format blindness:** JPEG destroyed transparency on floating UI (neon buttons, logos) → white boxes. Force PNG color-type 6 (RGBA).
3. **CDN image header confusion:** cdn.aligames "*.png" files are actually webp bytes → decoder failed silently. Solution: convert via System.Drawing instead of trusting MIME type.
4. **CJK text corruption:** PowerShell `Set-Content` mangles UTF-8 HTML/JS with Chinese/Vietnamese → mojibake + BOM. Switched to Edit tool and Node string ops.
5. **Mobile/PC parallel elements:** discovered bars/banners/titles exist in *separate* files and JS chunks for mobile vs PC. Thawing one side broke parity until both were updated.

## Root Cause Analysis

Three design surprises in the original app compounded the difficulty:

1. **Hard UA routing, not hash-based.** App inspects `navigator.userAgent` at boot, ignores the hash. Without the shim, iframe+hash trick fails. Lesson: inspect the app's routing strategy *before* attempting shell patterns.

2. **Transparency gotcha in JPEG pipeline.** JPEG cannot encode alpha. Any floating UI in the game (buttons, logos, overlays) *must* be PNG with explicit alpha channel. The site author used PNG for these, but image converters and CDN optimizers silently downgrade transparent PNGs to JPEG bytes → white halos on transparency.

3. **CSS and JS both embed images as base64.** Not obvious from visual inspection. Two separate nav buttons exist: one in CSS (PC), one in inline JS (mobile). Replacing one leaves the other broken. No central asset registry — had to grep + manually locate both sources.

## Lessons Learned

- **Diagnostic-first discipline beats guessing.** Cache, byte counts, MD5 hashing before claiming a fix works.
- **Additive overlays preserve reversibility.** The bundle stays untouched. Every change can be rolled back by editing `scripts/lib/*` and restarting the service. Compare this to editing the umi build — would've required decompiling, modifying, re-bundling (nightmare without sourcemap).
- **Browser cache is a silent killer.** `Cache-Control: no-store` on the server side doesn't prevent stale client cache. Users must hard-refresh (Ctrl+Shift+R) once. Document this.
- **Multi-route apps demand reverse-engineering first.** Before building a shell pattern, trace how the app decides which route to load (hash? UA? localStorage? query param?). The answer determines the shim strategy.
- **Image format metadata matters.** Always verify actual image type, not filename. A ".png" from a CDN can be webp or JPEG bytes. Use System.Drawing or file hex inspection.

## Next Steps

1. **Clean up 79 uncommitted files** — localization overlays, scripts, image-backup/ — then commit and push to `BlackCat-Ent-Studio/3qdc` private repo.
2. **Resolve remaining text-in-image inconsistencies** — Mobile bar 1 red/purple state character art has typo/mismatch (THẦN UY THIÊN TUNG vs THIÊN TÀI, should be THIÊN TÚNG per Hán-Việt). Requires new graphics from user.
3. **Audit mobile bar 2/3/4/5 state variants** — verify all red/purple accordion panels align on character art text.
4. **Verify app store promo block** — below hero on mobile still carries Mandarin text.

Once user supplies corrected bar graphics, image swaps take 10 min (backup + convert + verify + screenshot). Service is otherwise stable.
