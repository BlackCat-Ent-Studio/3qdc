---
phase: 2
title: "Tin Tức Sự Kiện"
status: pending
priority: P2
dependencies: [1]
---

# Phase 2: Tin Tức Sự Kiện

## Overview
Render khối tin trong `#hv2-news`: tiêu đề CSS "Tin Tức Sự Kiện", slider ảnh trái (banner/poster tĩnh có sẵn), 4 tab + danh sách 4 bài phải, nút "Xem thêm".

## Requirements
- Functional:
  - Tabs: Mới nhất (`endpoint.json__bdcb232458b058963`), Tin tức (`__bd960fb58dcc82779`), Thông báo (`__b5a051b4db5a8cbca`), Sự kiện (`__b586100e43cbf4eaf`); đổi tab tức thì (fetch 1 lần/tab, cache).
  - Mỗi dòng: ngày `dd/MM` từ `onlineTime` + `title` (1 dòng, ellipsis); click dòng → `/tin-tuc` (trang tin hiện có).
  - Slider trái: dùng ảnh tĩnh sẵn trong mirror `/cdn-cn.lingxigames.com/wukongbuild/star-gw/1.0.0/prod/views/static/banner*.jpg` + `poster*.jpg` (xác nhận tên file thật khi làm), autoplay 4s + chấm điều hướng. Data tin KHÔNG có `introImgPath` → không dùng ảnh bìa theo bài.
  - "Xem thêm +" → `/tin-tuc`.
- Non-functional: tiêu đề Hán render ra DOM để overlay i18n (home/main/codex) dịch; nếu fetch lỗi → hiện "Chưa có dữ liệu", không vỡ trang.

## Architecture
`section-news.mjs` export `NEWS_CSS`, `NEWS_JS`; `NEWS_JS` gọi `__hv2.onMount(renderNews)`; `layout-v2.mjs` nối CSS/JS.

## Related Code Files
- Create: `scripts/lib/home/layout-v2/section-news.mjs`
- Modify: `scripts/lib/home/layout-v2/layout-v2.mjs` (import + nối)

## Implementation Steps
1. Liệt kê ảnh banner/poster tĩnh thực có trong `views/static/` (tên + kích thước) để chọn 3–5 ảnh slider.
2. Viết `section-news.mjs` (CSS khối 2 cột ~1200px, tab active, slider fade).
3. Nối vào `layout-v2.mjs`; scp; import-check.
4. Commit `feat(home): news section with tabs and banner slider`; restart; curl.
5. Verify Chrome MSI: đổi 4 tab, tiêu đề đã sang tiếng Việt (hoặc ghi rõ tiêu đề nào còn Hán do dict thiếu), click → `/tin-tuc`; console sạch.
6. Báo user → DỪNG.

## Success Criteria
- [ ] 4 tab × 4 bài hiển thị, đổi tab không reload.
- [ ] Slider chạy bằng ảnh có sẵn.
- [ ] Click bài / Xem thêm → `/tin-tuc`.
- [ ] Không console error; `/tin-tuc` không đổi.

## Risk Assessment
- Tiêu đề tin mới có thể chưa có trong dict i18n → còn chữ Hán: báo user danh sách, KHÔNG tự dịch ngoài phạm vi (hoặc hỏi).
- i18n sweep chạy ~12s rồi dừng: section render muộn phải nằm trong MutationObserver của overlay i18n (có sẵn) — kiểm tra thực tế.
