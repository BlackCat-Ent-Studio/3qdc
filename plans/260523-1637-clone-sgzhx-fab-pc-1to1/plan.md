---
title: "Clone 1:1 PC — sgzhx /#/fab (static asset-mirror)"
status: completed
source: skill
created: 2026-05-23
completed: 2026-05-23
scope: project
blockedBy: []
blocks: []
---

# Clone 1:1 PC — `sgzhx /#/fab`

1:1 self-hosted PC clone of `https://sgzhx.lingxigames.com/#/fab` (UmiJS 3.5.43 React SPA, no sourcemap).
Approach: Playwright captures the live runtime asset graph → rewrite absolute CDN URLs to local → serve static → verify pixel/DOM parity. **No decompilation. Responsive deferred.**

Brainstorm: `brainstorm-summary.md`

## Decisions (locked)
- Scope: `/fab` route ONLY.
- Dynamic data: snapshot offline (flag token-gated endpoints).
- Hosting: local static server.
- Responsive: OUT OF SCOPE.

## Phases
| # | Phase | Status | Output |
|---|-------|--------|--------|
| 1 | Project scaffold & capture tooling | ✅ completed | `package.json`, Playwright, `scripts/capture.mjs` |
| 2 | Asset capture (runtime graph → `mirror/`) | ✅ completed | `mirror/` (40 assets) + `audit-out/manifest.json` + JSON snapshot |
| 3 | URL rewrite & tracker neutralization | ✅ completed | self-contained `mirror/` (63 rewrites, trackers stubbed, +5 CSS lazy assets, +favicon) |
| 4 | Serve & verify 1:1 parity | ✅ completed | `server.mjs`, `verify-out/report.md` — PASS @ 1366 & 1920 |

## Result
**1:1 PC clone verified.** `npm run serve` → `http://localhost:8080/#/fab` renders pixel-identical to live at 1366 & 1920. `#root` 56916 vs live 57078 (99.7%), zero asset 404s (tracker beacons excepted). Age-rating API served from local snapshot. Outbound links (shop/wiki/tmall/taptap/social) intentionally left live.

### Pipeline (reproducible)
`npm run capture` → `node scripts/fill-css-assets.mjs` → `npm run rewrite` → `npm run serve` / `npm run verify`

## Target stack (verified)
- UmiJS 3.5.43, hash router, `#root` SPA
- Entry: `umi.ca75703e.js` (591KB, NO `.map`) + `umi.cc7a93ef.css` on `cdn-cn.lingxigames.com`
- rem scaling: `data-dw=750`, `fontSize=clientWidth/7.5`
- Trackers: ARMS `bl.js`, `grey.js`
- Env: Windows, Node v24.15.0, npm 11.12.1, Playwright not yet installed

## Key dependencies
- Playwright + Chromium (Phase 1)
- Phase 2 → 1; Phase 3 → 2; Phase 4 → 3 (strictly sequential)

## Success criteria (whole plan)
- Local `mirror/` serves `/fab` visually 1:1 vs live PC view @ 1366 & 1920
- Zero asset 404s in console (tracker beacons excepted)
- Runs without live CDN (offline-capable via snapshots)
