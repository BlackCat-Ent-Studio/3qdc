# zgshx-fab-mirror

Self-hosted **1:1 clone** of `https://sgzhx.lingxigames.com/` (三国志幻想大陆 fab page).
UmiJS 3.5.43 React SPA, no sourcemap → cloned by capturing the live runtime asset graph, not decompiling.

**Responsive single link:** one URL `http://localhost:8080/` shows the PC layout on desktop and the mobile layout on phones / narrow windows, switching at a 768px breakpoint — via a viewport-switching iframe shell (dual-view-mirror pattern). The target ships two separate hash routes in one SPA (`#/fab` PC, `#/m/fab` mobile) and hard-routes by **UA**; the mobile iframe entry injects a UA-spoof shim so the app honors the mobile route regardless of the real browser UA.

## Quick start

```powershell
npm install
npx playwright install chromium   # first time only
npm run serve                     # → http://localhost:8080/   (responsive: resize across 768px)
```

## Rebuild the mirror from the live site

```powershell
# PC route
npm run capture                          # capture #/fab @1920 → mirror/ + audit-out/manifest.json
# Mobile route (iPhone UA + 393px → app self-routes to #/m/fab)
node scripts/capture.mjs m               # capture #/m/fab → mobile chunk + assets
node scripts/fill-css-assets.mjs         # backfill CSS-referenced images (both routes)
node scripts/fill-interaction-assets.mjs    # PC accordion interaction-lazy images
node scripts/fill-interaction-assets.mjs m  # mobile accordion interaction-lazy images
npm run rewrite                          # absolute CDN URLs → local; stub trackers; fetch favicon
node scripts/verify-dual.mjs             # PC + mobile + resize-swap parity → verify-out/report-dual.md
```

## How it works

| Script | Role |
|---|---|
| `scripts/capture.mjs` | Headless Chromium loads `#/fab` @1920, saves every 2xx response to `mirror/<host>/<path>`; snapshots the `/api/ages/fetch` JSON; skips trackers. Wait = `load` + poll `#root` (never `networkidle` — beacons keep it open). |
| `scripts/fill-css-assets.mjs` | Resolves every relative `url()` in mirrored CSS; downloads any asset not requested during the visit (hover/modal backgrounds). |
| `scripts/fill-interaction-assets.mjs` | Drives the live page (scroll + click/hover every 版本内容 accordion bar) and downloads interaction-lazy images JS loads on activation (e.g. the per-panel character art) that the static visit never requested. |
| `scripts/diag-load.mjs` / `diag-hover.mjs` | Dev diagnostics: measure load timing / detect 404s during accordion interaction (run against the live server on :8080). |
| `scripts/rewrite-urls.mjs` | Rewrites only 3 asset/API host prefixes (`cdn-cn.lingxigames.com`, `cdn.aligames.com`, `game-ages-fx…`) to local paths. Stubs `grey.js` + ARMS `bl.js`. Leaves outbound links & SVG namespaces untouched. |
| `scripts/lib/ua-spoof-shim.mjs` | Single source of the `data-mirror-shim` UA-spoof block (forces the umi router onto `#/m/fab` under any UA). Used by `server.mjs` (mobile entry) + the proof script. |
| `server.mjs` | Static server for `mirror/`; query-strip; age-API snapshot at `/api/ages/fetch`; tracker 204. **Dual-view:** `/` → iframe shell (width-switch @768px), `/__internal/pc/` → `index.html`, `/__internal/m/` → `index.html` + UA-spoof shim injected (UTF-8 safe). |
| `scripts/verify.mjs` / `verify-dual.mjs` | PC-only parity / full dual-view check (PC + mobile views via shell + resize-swap + per-view 404s) → `verify-out/report*.md`. |
| `scripts/diag-*.mjs` | Dev diagnostics: load timing, accordion 404s, mobile-route gap, route auto-detect, force-route under UA, shim proof. |

## What's local vs live

- **Local (self-contained):** all JS/CSS/images/fonts, the age-rating API snapshot, and analytics beacons (ARMS `r.png` + 9game `beacon` rewritten to same-origin and absorbed by the server as instant `204` — without this the live beacons hang and spin the browser load indicator forever).
- **Intentionally live:** outbound links only (official site, shop, wiki, tmall, taptap, socials, ICP/beian footer links).

Static assets are served with `Cache-Control: public, max-age=86400` (hashed filenames make this safe); `index.html` is `no-cache`.

## Plan / decisions

- PC 1:1 clone: `plans/260523-1637-clone-sgzhx-fab-pc-1to1/`
- Responsive single link (dual-view shell): `plans/260523-1754-unify-pc-mobile-responsive-shell/`
