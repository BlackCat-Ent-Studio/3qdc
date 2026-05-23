---
phase: 3
title: "iframe shell + server routing"
status: pending
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 3: iframe shell + server routing

## Overview
Add the single-link responsive front: `shell.html` at `/` with an iframe that swaps between the PC and mobile internal entries on a debounced resize at the 768px breakpoint; extend `server.mjs` to serve the two internal entries (mobile one carries the Phase-2 shim).

## Requirements
- Functional: `GET /` → shell; `GET /__internal/pc/` → PC HTML (no shim → `#/fab`); `GET /__internal/m/` → mobile HTML (with shim → `#/m/fab`). Iframe picks by `window.innerWidth < 768`, swaps on resize crossing the breakpoint.
- Non-functional: server stays Node built-ins only; existing asset/API/tracker routes untouched; shell is tiny + dependency-free.

## Architecture
- `shell.html` (per dual-view-mirror `serve-routing.md`): full-viewport iframe; `pick()=innerWidth<768?'/__internal/m/':'/__internal/pc/'`; debounced resize (150ms) swaps `iframe.src` only when crossing the breakpoint (avoid reload thrash).
- `server.mjs` new routes (before the static fallback):
  - `/` → `shell.html`
  - `/__internal/pc/` → `mirror/index.html` as-is
  - `/__internal/m/` → `mirror/index.html` with the Phase-2 shim injected into `<head>` at request time (string insert before the first existing `<script>`), served with correct charset. (Keeps one source `index.html`; mobile variant is the same + shim.)
- Asset requests from BOTH iframes resolve to the same `/cdn-cn.../`, `/cdn.aligames.../`, `/api/ages/fetch`, `/r.png` routes already in place (shared).
- Note: the app's hash route lives inside each iframe; the shell only chooses which internal entry document loads.

## Related Code Files
- Create: `mirror/shell.html` (or serve from a string in server.mjs)
- Modify: `server.mjs` (routes `/`, `/__internal/pc/`, `/__internal/m/`; inject shim for the mobile entry)
- Read: Phase-2 shim block

## Implementation Steps
1. Move current `/`→index.html behavior: `/` now serves `shell.html`; keep `/__internal/pc/` → `mirror/index.html`.
2. Implement `/__internal/m/`: read `mirror/index.html`, insert the shim `<script>` as the first child of `<head>`, serve (charset utf-8, no BOM — string ops in Node are UTF-8 safe).
3. Write `shell.html` width-switch iframe (breakpoint 768, debounced resize, one-way swap on cross).
4. Restart the background server; smoke-test all three routes return 200 with expected content.

## Success Criteria
- [ ] `/` serves shell; `/__internal/pc/` → PC; `/__internal/m/` → mobile (shim present)
- [ ] Opening `/` wide → PC iframe; narrow/<768 → mobile iframe; resize across 768 swaps
- [ ] Existing asset/API/tracker routes still work for both iframes
- [ ] CJK intact (no mojibake) in the shim-injected mobile HTML

## Risk Assessment
- Injecting shim must not corrupt CJK — operate on the string in Node (UTF-8) only, never PowerShell `Set-Content`.
- iframe sandbox/origin: same-origin localhost → no CORS issues; hash routing inside iframe works.
- Breakpoint mismatch with the app's own UA gate is now irrelevant (shim forces the route) — but confirm mobile renders correctly at the iframe's actual narrow width.
