---
title: "Unify PC + Mobile into one responsive link (dual-view shell)"
status: completed
source: skill
created: 2026-05-23
completed: 2026-05-23
scope: project
blockedBy: []
blocks: []
relatedTo: [260523-1637-clone-sgzhx-fab-pc-1to1]
---

# Unify PC + Mobile — one responsive link

One local link `http://localhost:8080/` that auto-switches PC (`#/fab`) ↔ mobile (`#/m/fab`) by viewport width (breakpoint 768px), via the `dual-view-mirror` iframe-shell pattern + a UA-spoof shim.

Brainstorm: `brainstorm-summary.md`. Builds on the completed PC 1:1 clone (`../260523-1637-clone-sgzhx-fab-pc-1to1/`).

## Decisive finding (drives the whole design)
The umi bundle **hard-routes by UA, ignores the hash** (proven: `#/m/fab` under desktop UA → redirected to `#/fab`; `#/fab` under mobile UA → `#/m/fab`). So an iframe pointed at a hash won't hold — each internal entry must **spoof the matching UA** before `umi.js` runs.

## Non-negotiable constraints
- **Non-destructive:** never edit `umi.js` / legacy CSS. All additions = tagged `data-mirror-*` blocks (dual-view-mirror philosophy).
- **CJK-safe writes:** never PowerShell `Set-Content`/`Out-File` on mirrored HTML (mojibake+BOM). Use Edit/Write or .NET UTF8-no-BOM.
- **Scope:** `/fab` + `/m/fab` only.

## Phases
| # | Phase | Status | Output |
|---|-------|--------|--------|
| 1 | Mirror mobile route assets | ✅ completed | mobile chunk `p__web_m__Fab__Fab.*` + images + interaction art in `mirror/`, rewritten; diag-mobile 0 missing |
| 2 | UA-spoof shim (force mobile route) | ✅ completed | `scripts/lib/ua-spoof-shim.mjs` — proven to force `#/m/fab` under desktop UA (`diag-shim-proof.mjs`) |
| 3 | iframe shell + server routing | ✅ completed | `server.mjs`: `/`→shell (768px switch), `/__internal/pc/`, `/__internal/m/`+shim |
| 4 | Verify both views + resize swap | ✅ completed | `verify-out/report-dual.md` PASS: PC #/fab @1366/1920, mobile #/m/fab @393, resize swap, 0 real 404s |

## Result
**Responsive single link works.** `http://localhost:8080/` → desktop shows PC 1:1, phone/narrow (<768) shows mobile 1:1, resize across 768px swaps cleanly. App hard-routes by UA → mobile iframe entry injects a UA-spoof `data-mirror-shim` (non-destructive; `umi.js` untouched). `verify-dual.mjs`: all PASS, 0 real 404s, accordion works both views.

## Key dependencies
- Phase 2 needs Phase 1 (mobile route must load before shim can be validated).
- Phase 3 needs Phase 2 (shell points at the shimmed mobile entry).
- Phase 4 needs Phase 3.

## Success criteria (whole plan)
- `http://localhost:8080/`: desktop window → PC 1:1; width <768 / mobile emulation → mobile 1:1.
- Resize across 768px swaps layout cleanly.
- Both routes: 0 asset 404s (tracker beacons excepted), interactions (accordion/tabs/swipers) work.
- `umi.js`/legacy CSS untouched; all additions reversible.
