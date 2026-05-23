---
phase: 2
title: "UA-spoof shim (force mobile route)"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: UA-spoof shim

## Overview
Build a tagged `data-mirror-shim` that makes the umi app self-route to `#/m/fab` (mobile layout) regardless of the real browser UA — needed because the bundle hard-routes by UA and ignores the hash. Injected ONLY into the mobile internal entry's HTML.

## Requirements
- Functional: when the shim is active, loading the served HTML on a desktop-UA browser still ends on `#/m/fab` with the mobile layout rendered. Without the shim, the same HTML routes to `#/fab` (PC).
- Non-functional: shim runs BEFORE `umi.js`; non-destructive (separate `<script data-mirror-shim>`, original bundle untouched); reversible.

## Architecture
- **Inspect device-detect logic first:** grep the mirrored `umi.ca75703e.js` + vendor chunks for the signals the router reads — likely `navigator.userAgent`, plus possibly `ontouchstart`, `navigator.maxTouchPoints`, `navigator.platform`, screen width, or a UA-regex (`/iphone|android|mobile/i`). Identify the exact predicate.
- **Shim:** define non-configurable getters BEFORE bundle parse that report a mobile device:
  - `Object.defineProperty(navigator, 'userAgent', { get: () => '<iPhone UA>' })` (+ `appVersion`/`platform` if read)
  - `window.ontouchstart = null` present; `navigator.maxTouchPoints = 5`
  - only override what the bundle actually checks (minimize surface).
- Place as the FIRST `<script data-mirror-shim>` in `<head>` of the mobile HTML variant, before the existing rem-script and before the `umi.js` tag.
- **Delivery:** server injects this shim into `index.html` at request time for `/__internal/m/` (Phase 3), OR a generated `mirror/__m-index.html`. Decide in Phase 3; this phase produces the shim block + proves it works.

## Related Code Files
- Create: `mirror/__shim/ua-mobile.html` snippet OR a shim string module `scripts/lib/ua-spoof-shim.mjs` (single source of the shim block)
- Read: `mirror/.../umi.ca75703e.js`, vendor chunks (device-detect grep)

## Implementation Steps
1. Grep bundle for `userAgent`, `ontouchstart`, `maxTouchPoints`, `platform`, `isMobile`, mobile UA regex → pin the predicate.
2. Draft the shim overriding exactly those signals (start with `userAgent`; add others only if the predicate reads them).
3. Prove via Playwright: load `mirror/index.html` (desktop UA) with the shim injected → assert `location.hash === '#/m/fab'` and mobile DOM present. Without shim → `#/fab`.
4. Lock the shim as a single reusable block (so Phase 3 + any re-snapshot reuse it — port-into-pipeline per dual-view-mirror).

## Success Criteria
- [ ] Identified the exact device-detect predicate in the bundle
- [ ] Shim forces `#/m/fab` under desktop UA (Playwright-proven)
- [ ] Shim is a single tagged reversible block; `umi.js` untouched
- [ ] PC entry (no shim) still routes `#/fab`

## Risk Assessment
- Detection may read multiple signals or run before our shim → ensure shim is the first executed script; override all read signals.
- Bundle may re-check UA on resize/navigation → shim getters are permanent (not one-shot), so they hold.
- Overriding `navigator` props can throw if non-configurable → use `Object.defineProperty` with try/catch; test in target Chromium.
