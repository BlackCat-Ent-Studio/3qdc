---
phase: 1
title: "Mirror mobile route assets"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Mirror mobile route assets

## Overview
Capture the `#/m/fab` route's distinct chunk + images (currently missing) into `mirror/`, so the mobile layout can render fully offline like the PC one.

## Requirements
- Functional: mobile route chunk `p__web_m__Fab__Fab.{8e33ff58.async.js,c679e4ee.chunk.css}` + all 21 missing images (incl `static/bg.236b5068.png`, `static/footer_bg.21dfb16c.png`) + any interaction-lazy mobile assets present in `mirror/`; absolute URLs rewritten to local.
- Non-functional: additive to existing PC mirror (don't clobber PC assets); idempotent.

## Architecture
- Extend `capture.mjs` with a **mobile pass**: iPhone UA + 393×852 (isMobile, dsf 3), `goto` `https://sgzhx.lingxigames.com/#/m/fab`, same `load`+poll`#root`+scroll settle. App self-routes mobile under the mobile UA. Save responses to `mirror/<host>/<path>` (same path scheme → PC + mobile assets coexist; shared chunks already present, only-overwrite is harmless).
- Reuse `fill-css-assets.mjs` (mobile chunk CSS `url()` refs) and `fill-interaction-assets.mjs` (drive mobile accordion/tabs — mobile selectors may differ; detect).
- `rewrite-urls.mjs` already rewrites cdn hosts + publicPath globally → covers the new mobile chunk's URLs (re-run is idempotent for already-done files).

## Related Code Files
- Modify: `scripts/capture.mjs` (add mobile pass; parametrize UA/viewport/url/label)
- Modify (maybe): `scripts/fill-interaction-assets.mjs` (mobile accordion/tab selectors)
- Create (output): `mirror/.../p__web_m__Fab__Fab.*`, `mirror/.../static/bg.*`, `static/footer_bg.*`, 21 mobile images
- Run: `npm run rewrite` after

## Implementation Steps
1. Refactor `capture.mjs` so the capture routine takes `{label, url, ua, viewport}` and run it for BOTH pc and mobile passes (or add a `--route=m` arg). Keep PC pass intact.
2. Run mobile pass; confirm `#root` ~87KB, mobile chunk + images land in `mirror/`.
3. `node scripts/fill-css-assets.mjs` — backfill mobile chunk CSS `url()` refs.
4. `node scripts/fill-interaction-assets.mjs` against `#/m/fab` (mobile UA) — backfill interaction-lazy mobile images. Adjust selectors if mobile DOM differs.
5. `npm run rewrite` — rewrite new mobile files' absolute URLs.
6. Re-run `scripts/diag-mobile.mjs` → expect "mobile assets NOT in mirror: 0".

## Success Criteria
- [ ] `mirror/` contains the mobile chunk + all 21 images + interaction-lazy mobile assets
- [ ] `diag-mobile.mjs` reports 0 missing mobile assets
- [ ] PC mirror still intact (PC verify still passes)
- [ ] No absolute cdn URLs left in the mobile chunk

## Risk Assessment
- Mobile capture under mobile UA may itself only grab default-state assets → use the scroll + interaction fill (gotcha #4).
- Shared chunks overwrite with identical bytes → harmless; verify hashes unchanged.
- Mobile accordion/tab selectors differ from PC → inspect mobile DOM; generalize fill script.
