# Brainstorm Summary — Clone 1:1 PC `sgzhx /#/fab`

**Date:** 2026-05-23
**Target:** `https://sgzhx.lingxigames.com/#/fab` (三国志幻想大陆 game landing, route `/fab`)
**Working dir:** `C:\web\web1\zgshx` (greenfield — empty except `.claude`/`ClaudeKit`)
**Status:** Approved approach. Responsive deferred (await next instruction).

## Problem statement
Self-host a **byte-faithful 1:1 PC clone** of the `/fab` route. Responsive work is a later, separate phase — do NOT touch it now.

## Target recon (verified)
| Fact | Detail |
|---|---|
| Framework | UmiJS 3.5.43 (React), `#root` SPA, hash router |
| Entry bundle | `cdn-cn.lingxigames.com/wukongbuild/star-gw/1.0.0/prod/views/umi.ca75703e.js` (591 KB min) + `umi.cc7a93ef.css` |
| Other scripts | `grey.js`, ARMS retcode `bl.js` (Aliyun tracker) |
| Sourcemap | ❌ `.js.map` + `.css.map` → 404 (Umi prod `devtool:false`) |
| Scaling | rem-based, `data-dw=750`, `fontSize=clientWidth/7.5` (mobile-first root) |
| Tooling | Node v24.15.0 ✅, npm 11.12.1 ✅, Playwright ⛔ (installable) |

**Key insight:** 1:1 clone needs NO decompilation. Original bundle already renders 1:1; missing sourcemap is irrelevant until logic edits are needed. Job = capture assets → rewrite URLs → self-host.

## Evaluated approaches
- **A — Static asset-mirror (Playwright capture + URL rewrite)** ⭐ CHOSEN. True 1:1 (serves original bundle), self-contained, offline-capable, clean foundation for later responsive. Cost: must run headless browser to enumerate runtime assets; handle dynamic data + CDN hotlink/referer.
- **B — Hybrid/thin proxy** (load CDN bundle directly). Rejected: not a real clone, 100% live-CDN dependency, no offline.
- **C — wget/httrack static crawl.** Rejected: SPA is JS-rendered, crawler misses runtime assets → broken clone.

## Decisions
- **Scope:** `/fab` route only (+ assets it loads). KISS.
- **Dynamic data:** snapshot API/JSON responses for offline 1:1 (default). Revisit per-endpoint only if a captured response carries a short-lived token / time-sensitive payload.
- **Hosting:** local static server for now ("tạm thời").
- **Responsive:** OUT OF SCOPE. Await next instruction.

## Implementation outline (for plan phase)
1. `npm i -D playwright` + install Chromium.
2. Capture script: load `#/fab` @ 1920×1080 (PC), intercept all network, save every response into `mirror/` preserving original path tree (incl. lazy route chunks — must navigate to `/fab`). Spoof Referer/UA to dodge hotlink blocks.
3. Rewrite absolute URLs (`cdn-cn.lingxigames.com`, `cdn.aligames.com`, `arms-retcode.aliyuncs.com`) → local relative paths across HTML/CSS/JS/JSON. Decide whether to neuter ARMS tracker (likely yes — useless + noisy when self-hosted).
4. Snapshot dynamic JSON responses alongside assets.
5. Serve `mirror/` via static server; open at PC viewport.
6. Verify: side-by-side pixel/DOM diff vs live target at 1366 & 1920. Same sections, fonts, sprites, no missing assets.

## Risks
- CDN hotlink/referer blocking → header spoof on fetch.
- Umi lazy-loads route chunks → must trigger `/fab` nav to capture.
- Dynamic API may need live calls if token-gated → flag at capture.
- Tracker scripts (ARMS/grey) → strip or stub to avoid console errors / failed beacons.

## Success criteria
- Local `mirror/` serves `/fab` visually 1:1 with live PC view (1366 & 1920).
- No 404s in console for assets (tracker beacons excepted).
- Runs without the live CDN (offline-capable, given snapshotted data).

## Next steps
- Create implementation plan via `/ck:plan`.
- Responsive layer = future separate brainstorm/plan once 1:1 PC is locked.
