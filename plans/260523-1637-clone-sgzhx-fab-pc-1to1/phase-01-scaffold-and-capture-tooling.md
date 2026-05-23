---
phase: 1
title: "Project scaffold & capture tooling"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Project scaffold & capture tooling

## Overview
Stand up the greenfield project: `package.json` (ESM), install Playwright + Chromium, and write the capture script skeleton that will drive the headless mirror.

## Requirements
- Functional: reproducible `npm install`; Chromium downloaded; `scripts/capture.mjs` runnable skeleton that opens the target and logs intercepted requests (no persistence yet).
- Non-functional: ESM (`"type":"module"`), Node 24 compatible, all scripts < 200 lines, kebab-case filenames.

## Architecture
```
zgshx/
├── package.json            # type:module, scripts: capture/rewrite/serve/verify
├── scripts/
│   └── capture.mjs         # Playwright driver (skeleton this phase)
├── mirror/                 # (created Phase 2) cloned site root
├── audit-out/              # capture logs + screenshots
└── verify-out/             # (Phase 4) parity artifacts
```
Deps: `playwright` (dev). Static server chosen in Phase 4 (likely a ~30-line custom `server.mjs`, no extra dep — KISS).

## Related Code Files
- Create: `package.json`, `scripts/capture.mjs`, `.gitignore` (ignore `node_modules/`, keep `mirror/`)
- Modify: none
- Delete: none

## Implementation Steps
1. `npm init -y`; edit `package.json` → `"type":"module"`, add scripts: `capture`, `rewrite`, `serve`, `verify`.
2. `npm i -D playwright` then `npx playwright install chromium`.
3. Write `scripts/capture.mjs` skeleton:
   - launch headless Chromium, viewport 1920×1080, desktop UA
   - `page.on('request')` / `page.on('response')` → console-log method+url+status+content-type
   - `page.goto('https://sgzhx.lingxigames.com/#/fab', { waitUntil:'networkidle' })`
   - screenshot → `audit-out/fab-1920.png`; print request manifest count
4. Run once; confirm `/fab` loads and requests stream (validates UA/referer access before building persistence).

## Success Criteria
- [ ] `npm install` clean; Chromium present
- [ ] `npm run capture` opens `/fab`, logs request manifest, saves `audit-out/fab-1920.png` showing real content (not blank `#root`)
- [ ] No hotlink/403 wall on entry bundle (if 403 → note required headers for Phase 2)

## Risk Assessment
- CDN referer/UA gating → set `Referer: https://sgzhx.lingxigames.com/` and a real desktop UA on context; record findings.
- `networkidle` may hang on long-poll/beacon → add 15s cap + fallback to `domcontentloaded` + fixed settle delay.
