---
phase: 3
title: "Hệ Thống Tướng"
status: pending
priority: P2
dependencies: [1]
---

# Phase 3: Hệ Thống Tướng

## Overview
Render `#hv2-heroes`: tiêu đề "Hệ Thống Tướng", cột tab 4 phe trái, ảnh lập hoạ lớn giữa (fade khi đổi), tên tướng, dải 13 avatar dưới; nút "Xem chi tiết" → `/tuong`.

## Requirements
- Functional:
  - Tab phe (thứ tự omg3q-like): Ngụy `endpoint.json__b2412ba824b4fd564`, Thục `__b0f7c9532ef86b683`, Ngô `__beff936f54393802f`, Quần Hùng `__bd6ddfa18119474ba`. Nhãn tab = chữ CSS (魏/蜀/吴/群 → overlay i18n hoặc viết thẳng tiếng Việt).
  - Data `result.items[]`: tên `priVal`; ảnh lớn = `details` key `新官网PC立绘`; avatar = `新官网Icon`, hover/active = `新官网hoverIcon`.
  - Mặc định: phe đầu, tướng đầu. Click avatar → đổi ảnh lớn + tên (fade 300ms). Đổi phe → fetch (cache) + chọn tướng đầu.
  - Preload ảnh lớn của phe đang xem (tránh nháy).
- Non-functional: mọi URL qua `__hv2.local()` → same-origin `/cloud.lingxigames.com/...` (52/52 có trong mirror); KHÔNG dùng `PC立绘`/`移动*`/`首页Icon` (image.aligames, phần lớn không có).

## Architecture
`section-heroes.mjs` export `HEROES_CSS`, `HEROES_JS` (đăng ký `__hv2.onMount`). Layout: grid [tabs 160px | stage | (tên dọc)] + strip avatar ngang cuộn được.

## Related Code Files
- Create: `scripts/lib/home/layout-v2/section-heroes.mjs`
- Modify: `scripts/lib/home/layout-v2/layout-v2.mjs`

## Implementation Steps
1. Kiểm kích thước thật 1 ảnh `新官网PC立绘` + icon (natural size) để chọn tỉ lệ stage.
2. Viết section (CSS + JS), nối vào layout-v2; scp; import-check.
3. Commit `feat(home): heroes section with faction tabs and portrait stage`; restart; curl.
4. Verify Chrome MSI: 4 phe × chọn vài tướng; ảnh load từ `/cloud.lingxigames.com` (network không có `image.aligames.com` mới); tên hiển thị Hán-Việt; `/tuong` không đổi.
5. Báo user → DỪNG.

## Success Criteria
- [ ] 4 phe, mỗi phe 13 avatar, click đổi lập hoạ + tên.
- [ ] 0 ảnh vỡ; 0 request CDN TQ mới.
- [ ] Tên tướng tiếng Việt (codex dict).
- [ ] `/tuong` không đổi, console sạch.

## Risk Assessment
- Ảnh `新官网PC立绘` có thể là PNG lớn → tải chậm: preload theo phe, `loading="lazy"` cho avatar.
- Tên tướng render sau i18n sweep → dựa MutationObserver của overlay i18n; nếu còn Hán, dịch bằng tra dict ngay khi render (không thêm dict mới).
