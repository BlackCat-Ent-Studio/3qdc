---
phase: 1
title: "Skeleton + gate hash + header ngang + KV/thanh tải + sidebar"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Skeleton, header ngang, KV, sidebar

## Overview
Dựng khung layout-v2: bật/tắt theo hash, biến trang 1 màn thành trang cuộn, đưa logo + 10 mục menu lên header ngang cố định, gom thanh tải về giữa đáy KV, thêm sidebar phải. Chưa có khối nội dung (chỉ container rỗng + tiêu đề placeholder ẩn).

## Requirements
- Functional:
  - Gate: bật khi `location.hash` rỗng / `#` / `#/` / bắt đầu `#/index`; `hashchange` sang route khác → tắt (bỏ class, ẩn container, trả lại style gốc).
  - Header ngang fixed top (cao ~80px, nền tối mờ): `.star-site-index-logo` trái, `.star-site-index-navs` 10 mục xếp hàng ngang, giữ ảnh + hover + click hiện có.
  - KV: `.star-site-index` cao 100vh, rộng 100%; slogan giữ; `.star-site-index-download` (+ `-download-ul`, `-download-qrcode`, `-store`) gom thành thanh ngang giữa đáy KV.
  - Sidebar phải fixed: clone (cloneNode) QR + các nút tải hiện có + nút "Lên đầu trang"; clone giữ `href`.
  - Mount `<div id="home-v2" data-home-v2>` sau `#root` chứa 4 `<section>` rỗng (id: `hv2-news`, `hv2-heroes`, `hv2-features`, `hv2-treasure`) + footer placeholder.
  - `html`/`body` cho phép cuộn khi bật.
- Non-functional: không sửa bundle/mirror; không thư viện ngoài; script chịu React render muộn (MutationObserver/poll ~10s như overlay cũ); CSS scope dưới `html.hv2`.

## Architecture
- `layout-v2.mjs` export `LAYOUT_V2_HTML = <style data-home-v2>…</style><script data-home-v2>…</script>`.
- JS: `isHome()` → `apply()`/`teardown()`; `window.addEventListener('hashchange', sync)`; `window.__hv2 = { snap, local, el, lightbox, onMount(fn) }` để các section (phase 2–5) đăng ký renderer; section chỉ render 1 lần khi mount lần đầu.
- CSS: `html.hv2 .star-site-index{height:100vh!important}`, `html.hv2 .star-site-index-navs{position:fixed!important;top:0;left:…;display:flex;flex-direction:row;transform:none!important;animation:none!important}`, v.v. (đo lại rect thật trên Chrome MSI trước khi chốt số).
- `server.mjs`: `import { LAYOUT_V2_HTML } from './scripts/lib/home/layout-v2/layout-v2.mjs';` và trong `buildBEntry`: `const inject = RF(route) + … + BUILDB_NAV + LAYOUT_V2_HTML;` (inject cho mọi build-B entry; gate runtime quyết định).

## Related Code Files
- Create: `scripts/lib/home/layout-v2/layout-v2.mjs`
- Modify: `server.mjs` (1 import + nối vào `inject` của `buildBEntry`)
- Delete: none

## Implementation Steps
1. Trên Chrome MSI mở `https://3qdc.wanmeivn.com/home#/index`, đo rect/cấu trúc: logo, navs (10 `<a>`, ảnh normal/hover), download (ul, qrcode, store, nút nạp), slogan, decorate/mask; chụp lại làm "before".
2. Viết `layout-v2.mjs` (gate + CSS khung + header + KV + sidebar + container + helpers `__hv2`).
3. Sửa `server.mjs` như trên.
4. scp 2 file lên VPS; chạy import-check node.
5. Commit: `feat(home): layout-v2 skeleton with sticky header, kv download bar and sidebar`.
6. `nssm restart 3qdc-unified`; `curl` `/home` 200 + marker; `curl` `/main` 200.
7. Verify Chrome MSI: `/home#/index` (header ngang, KV, thanh tải, sidebar, cuộn được xuống container rỗng); bấm 1 mục menu (vd Tin tức) → điều hướng như cũ và layout v2 biến mất; `/tuong` không đổi; console sạch.
8. Báo user + screenshot → DỪNG.

## Success Criteria
- [ ] Header ngang cố định với logo + 10 ảnh menu, click đúng đích cũ.
- [ ] KV 100vh + thanh tải giữa đáy (ảnh/link cũ).
- [ ] Sidebar phải hiện, QR/nút tải/lên đầu trang chạy.
- [ ] Trang cuộn được; container `#home-v2` có mặt.
- [ ] `#/index` → `#/main/*` tắt layout sạch; `/main`, `/tin-tuc`, `/tuong` không đổi.
- [ ] 0 console error mới.

## Risk Assessment
- Animation class `star-site-slide-in-blurred-left` dùng transform → ép `transform/animation:none` khi hv2.
- React re-mount khi đổi hash nội bộ → teardown phải idempotent, apply lại khi quay về `#/index`.
- `neuter-links`/`nav-sync` bắt click capture-phase → clone node trong sidebar có thể mất handler React; chỉ clone `<a href>` thật, test click.
- Restart = gián đoạn vài giây; làm ngoài giờ cao điểm nếu có thể.
- Rollback: bỏ `LAYOUT_V2_HTML` khỏi `inject` → restart.
