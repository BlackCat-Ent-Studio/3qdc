---
phase: 3
title: "URL rewrite & tracker neutralization"
status: pending
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 3: URL rewrite & tracker neutralization

## Overview
Turn the raw `mirror/` into a self-contained site: rewrite absolute CDN URLs to local relative paths across HTML/CSS/JS/JSON, and stub/remove tracker scripts so the clone loads clean and offline.

## Requirements
- Functional: no absolute `https://cdn-cn.lingxigames.com` / `cdn.aligames.com` / `arms-retcode.aliyuncs.com` references remain in served files; trackers neutralized; Umi `routerBase`/`publicPath` resolve locally.
- Non-functional: rewrite driven by Phase 2 manifest (DRY — single source of truth url→local); reversible (operate on copies, keep raw capture if feasible).

## Architecture
- `scripts/rewrite-urls.mjs`: load `audit-out/manifest.json`, build replacement map (absolute URL → relative path from `mirror/` root). String-replace across text assets (`.html .css .js .json`). Binary untouched.
- Inline HTML script handling: the `index.html` inline `document.write` injects `bl.js` (ARMS) and uses `cdn.aligames.com` favicon. Replace tracker injection with a no-op stub; repoint favicon to local copy.
- `grey.js` + `bl.js`: replace file contents with empty/no-op stub (keep the path so requests 200 instead of 404) OR strip the `<script>` tags. Prefer stub-file to avoid touching bundle expectations.
- Umi specifics: `window.routerBase="/"` stays; ensure `publicPath` (often `/` or CDN) inside `umi.js` is rewritten to relative/`./` so chunk + asset URLs resolve under the static server root.

## Related Code Files
- Create: `scripts/rewrite-urls.mjs`, stubbed `mirror/.../grey.js`, `mirror/.../bl.js`
- Modify: `mirror/index.html`, `mirror/**/*.{css,js,json}` (absolute→relative)
- Delete: none

## Implementation Steps
1. Write `rewrite-urls.mjs`: read manifest, compute relative replacements, regex/string-replace each text file. Log replacement counts per file.
2. Handle `publicPath` in `umi.ca75703e.js`: find the CDN base string the bundle prepends to chunk/asset URLs; rewrite to relative. Verify lazy chunks then resolve locally.
3. Stub trackers: overwrite `bl.js` + `grey.js` with `/* stubbed */`; neutralize the inline ARMS `document.write` injector in `index.html` (comment out or point to local stub).
4. Repoint favicon + any `cdn.aligames.com` static refs to local mirror copies (capture them if missed in Phase 2).
5. Grep served tree for leftover `https://cdn` / `aliyuncs` → expect zero (tracker beacons aside).

## Success Criteria
- [ ] `grep -r "cdn-cn.lingxigames.com" mirror/` over text assets → no served references (or only intentionally-live ones, documented)
- [ ] Trackers stubbed → no ARMS/grey network calls, no related console errors
- [ ] Umi chunk/asset `publicPath` resolves to local paths
- [ ] favicon + sprites load locally

## Risk Assessment
- Minified `umi.js` `publicPath` may be a runtime-computed var, not a literal → if so, set it via a small pre-bundle inline script (`window.publicPath='./'`) instead of string-patching. Test before assuming literal.
- Over-broad string replace could corrupt JSON data values that legitimately contain the CDN URL → scope replacements to asset-reference contexts; validate JSON parses after rewrite.
- Stubbing a tracker the app awaits could throw → stub must export the same global shape as a no-op (e.g. `window.__bl={ ... }`), not just empty.
