---
phase: 4
title: "Tính Năng Đặc Sắc"
status: pending
priority: P3
dependencies: [1]
---

# Phase 4: Tính Năng Đặc Sắc

## Overview
Render `#hv2-features`: tiêu đề "Tính Năng Đặc Sắc", carousel kiểu coverflow nhẹ (slide giữa to, 2 bên nhỏ/mờ) với 5 ảnh lớn của trang Đặc sắc; autoplay + nút trái/phải + chấm.

## Requirements
- Functional:
  - Ảnh: `/cdn-cn.lingxigames.com/wukongbuild/star-gw/1.0.0/prod/views/static/01.9e9c0403.png`, `02.ae90e11f.png`, `03.4ae55bc1.png`, `04.ed24f05f.png`, `05.71117ca4.png` (bộ lớn ~440KB; xác nhận lại trên VPS là bộ đúng của trang Đặc sắc, không phải bộ nhỏ `01.ca746fba…`).
  - Autoplay 5s, loop, pause khi hover; prev/next; click ảnh giữa → `/dac-sac`.
- Non-functional: CSS transform + JS thuần (không Swiper); `prefers-reduced-motion` → tắt autoplay/transition.

## Architecture
`section-features.mjs` export `FEATURES_CSS`, `FEATURES_JS`; carousel = track absolute, class `is-prev/is-active/is-next` đổi theo index.

## Related Code Files
- Create: `scripts/lib/home/layout-v2/section-features.mjs`
- Modify: `scripts/lib/home/layout-v2/layout-v2.mjs`

## Implementation Steps
1. Mở `/dac-sac` trên Chrome MSI, xác nhận 5 ảnh nào đang hiển thị (bộ lớn vs nhỏ) + natural size.
2. Viết section, nối, scp, import-check.
3. Commit `feat(home): features carousel`; restart; curl.
4. Verify Chrome MSI: autoplay, prev/next, click → `/dac-sac`; console sạch.
5. Báo user → DỪNG.

## Success Criteria
- [ ] 5 slide chạy vòng, nút điều hướng hoạt động.
- [ ] Click → `/dac-sac`; `/dac-sac` không đổi.
- [ ] Console sạch.

## Risk Assessment
- 5 PNG × ~440KB = ~2.2MB → lazy-load: chỉ tải khi section vào viewport (IntersectionObserver).
- Ảnh có chữ Trung (đúng yêu cầu giữ ảnh) — ghi nhận, không xử lý.
