---
phase: 2
title: "Asset capture (runtime graph → mirror/)"
status: pending
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Asset capture

## Overview
Extend `capture.mjs` to persist every intercepted response into `mirror/` preserving the original host+path tree, snapshot dynamic JSON, and emit a manifest. This produces a raw (not-yet-rewritten) faithful copy.

## Requirements
- Functional: every 2xx response (HTML/JS/CSS/img/font/JSON/XHR) written to disk under a deterministic path derived from its URL; Umi lazy route chunks for `/fab` captured; manifest of url→localpath + content-type + whether-dynamic.
- Non-functional: idempotent re-runs (overwrite); skip tracker beacon noise from disk (record in manifest only).

## Architecture
- Path mapping: `https://<host>/<path>` → `mirror/<host>/<path>` (query strings → hashed suffix or stripped if asset is deterministic). `index.html` → `mirror/index.html`.
- Capture via `page.on('response')` → `await res.body()` → write file. Guard binary vs text.
- Trigger lazy chunks: after initial load, ensure route is `#/fab` (goto already hash-routes); optionally interact/scroll to force any viewport-lazy assets.
- Dynamic detection: responses to XHR/fetch with `application/json` (or to API-looking hosts) flagged `dynamic:true` in manifest → these are the snapshot set. Flag any with `Set-Cookie`/`Authorization`/token-shaped fields for review.

## Related Code Files
- Create: `mirror/**` (output), `audit-out/manifest.json`
- Modify: `scripts/capture.mjs`
- Delete: none

## Implementation Steps
1. Add `urlToLocalPath(url)` helper (host+pathname tree; handle `/` → `index.html`, query → stable hash).
2. In `response` handler: read body, `mkdir -p` dir, write file; push manifest entry `{url, local, type, status, dynamic}`.
3. Classify dynamic: `resourceType==='xhr'||'fetch'` or `content-type` includes `json`. Write JSON snapshots same as assets (they're path-mapped too).
4. After load: wait settle, take `audit-out/fab-1920.png`, write `audit-out/manifest.json`.
5. Run; eyeball `mirror/` tree + manifest. Confirm `umi.ca75703e.js`, `umi.cc7a93ef.css`, fonts, sprites, and any `/fab` data JSON are present.
6. Note token-gated/dynamic endpoints in manifest summary (decide live-vs-snapshot per the locked default: snapshot).

## Success Criteria
- [ ] `mirror/` contains entry JS+CSS, all images/fonts, and `/fab` JSON data
- [ ] `audit-out/manifest.json` lists every asset with correct local path + dynamic flag
- [ ] Re-running capture is idempotent (no dupes, clean overwrite)
- [ ] Any token-gated endpoint explicitly flagged in manifest

## Risk Assessment
- Query-string assets collide on disk → hash query into filename, keep mapping in manifest for Phase 3 rewrite.
- Some assets loaded only after interaction → add a scroll/settle pass; if a section still misses, log it for manual trigger.
- `res.body()` throws on redirects/204 → wrap try/catch, skip non-body responses.
