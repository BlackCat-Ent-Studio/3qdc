# Brainstorm Summary — Unify PC + Mobile into one responsive link

**Date:** 2026-05-23
**Builds on:** `plans/260523-1637-clone-sgzhx-fab-pc-1to1/` (PC 1:1 clone, done)
**Goal:** One single local link that auto-switches between the PC layout (`#/fab`) and the mobile layout (`#/m/fab`) by viewport width — true responsive, using the `dual-view-mirror` skill pattern.

## Problem statement
Current mirror serves only the PC route. The target SPA also ships a **complete, separate mobile layout** at hash route `#/m/fab` (distinct route chunk + assets). User wants a single URL that shows the right layout responsively (by viewport width), not two links.

## Decisive findings (probed live)
| Finding | Evidence |
|---|---|
| `#/m/fab` is a real distinct mobile route, same SPA | `#root` renders 87KB, distinct chunk `p__web_m__Fab__Fab.{8e33ff58.async.js, c679e4ee.chunk.css}` |
| Shared shell/bundle already mirrored | same `index.html` + `umi.ca75703e.js` + vendor chunks |
| Mobile route assets NOT mirrored | 21 missing images incl. `static/bg.236b5068.png`, `static/footer_bg.21dfb16c.png` + mobile character art |
| **App hard-routes by UA, ignores hash** | force `#/m/fab` + desktop UA → redirected to `#/fab`; force `#/fab` + mobile UA → redirected to `#/m/fab` (both 500w & 1920w → UA wins, not width) |

**Consequence:** a naive iframe pointed at `#/m/fab` won't hold under a desktop UA → must spoof UA per internal entry.

## Chosen approach — L2: iframe shell + UA-spoof shim (dual-view-mirror pattern)
```
/  → shell.html (iframe; switch on window width, breakpoint 768px, debounced resize)
   ├ width ≥ 768 → /__internal/pc/ → index.html (normal) → desktop UA → app self-routes #/fab  (PC)
   └ width < 768 → /__internal/m/  → index.html + <script data-mirror-shim> spoofing MOBILE UA
                    (runs BEFORE umi.js) → app self-routes #/m/fab (mobile); narrow iframe → rem renders correctly
```
- **Non-destructive:** never edit `umi.js`/legacy CSS. UA-spoof is a tagged `data-mirror-shim` injected into the served HTML only.
- **Prerequisite:** mirror the mobile route first (chunk + 21 images + interaction-lazy assets).

## Evaluated alternatives
- **L1 — mirror mobile assets only (no shell):** single link auto-switches by *device UA* (phone→mobile, PC→PC). Simpler, but desktop window resize does NOT switch → fails the "responsive by width" requirement. Rejected as primary (kept as fallback).
- **L2 — iframe shell + UA-spoof:** true width-based responsive single link. CHOSEN.
- **Single-document width-redirect (no iframe):** would need full-page reload on breakpoint cross + fight the app's own UA routing in the same document. Messy. Rejected (iframe isolates each route's document).

## Risks / unknowns (resolve during implementation)
- UA-spoof may need more than `navigator.userAgent` — possibly `ontouchstart`, `maxTouchPoints`, `platform`. Must inspect the bundle's device-detect logic and override all signals it reads.
- Mobile route likely has its own interaction-lazy assets (tabs/accordion) → backfill like PC (gotcha #4).
- Two entries share `index.html` but differ by injected shim → server must serve distinct variants (e.g. inject shim at request time for `/__internal/m/`, or store a second html).
- CJK content: NEVER edit mirrored HTML with PowerShell `Set-Content`/`Out-File` (mojibake+BOM) — use Edit/Write or .NET UTF8-no-BOM (dual-view-mirror gotcha #11).
- rem-scaling at exact 768px boundary — confirm mobile renders right just below breakpoint.

## Success criteria
- One link `http://localhost:8080/` → desktop window shows PC 1:1; narrow/<768 (or DevTools mobile emulation) shows mobile 1:1.
- Resize across 768px swaps layout without breakage.
- Both routes: zero asset 404s (tracker beacons excepted), interactions work (accordion/tabs/swipers).
- Bundle never edited; all additions are tagged reversible blocks.

## Next steps
- `/ck:plan` → phased plan (mirror mobile route → UA-spoof shim → iframe shell + serve routes → verify both views + resize).
