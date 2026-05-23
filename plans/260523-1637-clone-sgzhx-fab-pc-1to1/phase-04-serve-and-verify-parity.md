---
phase: 4
title: "Serve & verify 1:1 parity"
status: pending
priority: P1
effort: "2h"
dependencies: [3]
---

# Phase 4: Serve & verify 1:1 parity

## Overview
Serve `mirror/` via a minimal static server and prove 1:1 PC parity against the live target with side-by-side screenshots + DOM/asset checks at 1366 and 1920.

## Requirements
- Functional: static server serving `mirror/` (correct MIME, SPA hash routing works); `verify.mjs` produces clone-vs-live screenshots + a parity report.
- Non-functional: server ~30 lines, zero extra deps if practical (Node `http` + manual MIME, or `npx serve`); verify reuses Playwright from Phase 1.

## Architecture
- `server.mjs`: Node `http` static file server rooted at `mirror/`, default `index.html`, common MIME map. Port 8080.
- `scripts/verify.mjs`: for each viewport [1366×768, 1920×1080]:
  - screenshot live `https://sgzhx.lingxigames.com/#/fab` → `verify-out/live-<w>.png`
  - screenshot clone `http://localhost:8080/#/fab` → `verify-out/clone-<w>.png`
  - capture console errors + failed requests on clone
  - DOM checks: same key sections present, same asset count loaded, fonts/sprites resolved
  - optional pixel diff (e.g. `pixelmatch`) → `verify-out/diff-<w>.png` + % mismatch
- `verify-out/report.md`: PC-parity verdict first, per-viewport pass/fail, console-error list, leftover-absolute-URL check.

## Related Code Files
- Create: `server.mjs`, `scripts/verify.mjs`, `verify-out/report.md`
- Modify: `package.json` (wire `serve`/`verify` scripts; add `pixelmatch`+`pngjs` only if diffing)
- Delete: none

## Implementation Steps
1. Write `server.mjs` (http static, MIME map, fallback to `index.html` only for non-file routes since routing is hash-based — files resolve directly).
2. `npm run serve`; manually open `http://localhost:8080/#/fab` → eyeball vs live.
3. Write `verify.mjs` dual-screenshot + console/request capture; optionally add pixel diff.
4. Run `npm run verify`; review `verify-out/report.md` + diff images.
5. Fix gaps by looping back: missing asset → re-capture (Ph2); leftover absolute URL or broken chunk → rewrite fix (Ph3). Repeat until parity passes.

## Success Criteria
- [ ] `npm run serve` serves `/fab` rendering full content (not blank `#root`)
- [ ] Clone vs live visually 1:1 @ 1366 & 1920 (pixel mismatch within agreed tolerance, layout/sections/fonts identical)
- [ ] Clone console: zero asset 404s (tracker beacons excepted), zero fatal JS errors
- [ ] `verify-out/report.md` records PASS for PC parity
- [ ] Clone renders with live CDN blocked (offline check) — confirms self-contained

## Risk Assessment
- Live target may change between capture and verify → note capture timestamp; minor live drift ≠ clone failure.
- Hash routing + static server: ensure `#/fab` works (hash is client-side, server only serves `index.html` + assets) — no SPA history fallback needed.
- Anti-aliasing/font-render diffs inflate pixel mismatch → judge on layout/structure parity, use diff % as guide not gate.
