---
phase: 4
title: "Verify dual-view + resize swap"
status: pending
priority: P1
effort: "2h"
dependencies: [3]
---

# Phase 4: Verify dual-view + resize swap

## Overview
Prove the single link works responsively: PC view 1:1 at desktop width, mobile view 1:1 below the breakpoint, clean swap on resize, zero asset 404s, and interactions working in both.

## Requirements
- Functional: automated verify covering both views via the shell URL + a resize-crossing-768 swap check.
- Non-functional: reuse Playwright; report to `verify-out/`.

## Architecture
- Extend `verify.mjs` (or add `verify-dual.mjs`):
  - **PC:** load `/` at 1366 & 1920 → assert PC layout (iframe shows `#/fab`), screenshot vs live PC, 0 real 404s.
  - **Mobile:** load `/` at 393 (mobile emulation) → assert mobile layout (iframe `#/m/fab`), screenshot vs live `#/m/fab`, 0 real 404s.
  - **Resize swap:** load `/` at 1200, then set viewport to 500 → assert iframe src switched pc→m; resize back → m→pc.
  - **Interactions:** in each view, exercise accordion/tabs/swipers → 0 new 404s, 0 console errors (tracker beacons excepted).
- Capture live mobile reference with iPhone UA (live ref fetch resilient to flakiness — retry, non-fatal).

## Related Code Files
- Modify/Create: `scripts/verify.mjs` or `scripts/verify-dual.mjs`
- Output: `verify-out/report.md`, `clone-pc-*.png`, `clone-m-*.png`, `live-*` refs

## Implementation Steps
1. Add mobile + shell-aware cases to the verifier (drive `/`, read iframe content frame for hash + DOM).
2. Add the resize-swap assertion (viewport change → iframe.src changes across breakpoint).
3. Run; review screenshots + report. Loop back: missing asset → Phase 1 fill; route not forced → Phase 2 shim; swap broken → Phase 3 shell.
4. Final: update README (dual-view usage + pipeline incl. mobile pass + shim), set plan completed.

## Success Criteria
- [ ] PC view 1:1 @ 1366 & 1920; mobile view 1:1 @ 393
- [ ] Resize across 768 swaps layout (pc↔m) without breakage
- [ ] Both views: 0 asset 404s (tracker beacons excepted), 0 fatal console errors
- [ ] Interactions (accordion/tabs/swipers) work in both views
- [ ] `verify-out/report.md` verdict PASS

## Risk Assessment
- Reading inside the iframe: use Playwright `frameLocator`/`page.frames()` to access the iframe document for hash/DOM assertions.
- Live mobile reference flakiness → retry + treat live-fetch failure as skipped reference (as in PC verify).
- Font/anti-alias pixel diffs → judge on layout/sections/assets, not strict pixel %.
