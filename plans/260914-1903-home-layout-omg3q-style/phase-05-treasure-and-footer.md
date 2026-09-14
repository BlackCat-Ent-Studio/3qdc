---
phase: 5
title: "Kho Báu + footer"
status: pending
priority: P3
dependencies: [1]
---

# Phase 5: Kho Báu + footer

## Overview
Render `#hv2-treasure`: tiêu đề "Kho Báu", lưới 10 hình nền + 3 thẻ video CG (poster + nút play) mở lightbox; nút "Xem kho báu" → `/kho-bau`. Hoàn thiện footer gọn và kiểm tra tổng thể toàn trang.

## Requirements
- Functional:
  - Hình nền: `endpoint.json__bb22b1de7cb6b4ece` `result.list[]` (10 mục: `name,url,width,height`) → thumbnail (dùng `url`; KHÔNG dùng `highBigUrl/highSmallUrl/lowSmallUrl` — 404 chết theo HANDOFF) → click mở lightbox ảnh lớn.
  - CG: `endpoint.json__b05e570235888dacc` (3 mục: `name,url,ldUrl,poster`) → thẻ poster; click mở lightbox `<video controls autoplay>` src `local(ldUrl)` (fallback `url`); đóng lightbox → pause + remove.
  - Footer: nền tối, dòng thương hiệu "3Q Đại Chiến" + link nhanh tới các trang hiện có (Tin tức/Tướng/Đặc sắc/Kho báu/Cộng đồng/Hướng dẫn); không thêm link ngoài mới.
- Non-functional: lightbox dùng chung `__hv2.lightbox`, đóng bằng Esc/click nền; lazy-load ảnh.

## Architecture
`section-treasure.mjs` export `TREASURE_CSS`, `TREASURE_JS` (gồm footer). Server đã hỗ trợ Range 206 cho mp4.

## Related Code Files
- Create: `scripts/lib/home/layout-v2/section-treasure.mjs`
- Modify: `scripts/lib/home/layout-v2/layout-v2.mjs`
- Modify (sau khi xong toàn plan): `HANDOFF.md` mục mới "Home layout-v2" (kiến trúc, gate, file, rollback)

## Implementation Steps
1. Xác nhận `ldUrl`/`poster` của 3 CG có trong mirror (local path tồn tại) trên VPS.
2. Viết section + footer, nối, scp, import-check.
3. Commit `feat(home): treasure gallery with lightbox and footer`; restart; curl.
4. Verify tổng Chrome MSI: cuộn toàn trang; lightbox ảnh/video; `#/index` ↔ menu sang trang khác và quay lại; `/`, `/main`, `/tin-tuc`, `/tuong`, `/kho-bau`, `/huong-dan` không đổi; network không có request mới tới `image.aligames.com`; console sạch.
5. Cập nhật `HANDOFF.md` (commit `docs: handoff for home layout-v2`).
6. Báo user tổng kết → DỪNG.

## Success Criteria
- [ ] 10 hình nền + 3 CG hiển thị; lightbox ảnh & video (tua được) chạy.
- [ ] Footer hiện, link nội bộ đúng.
- [ ] Toàn bộ tiêu chí nghiệm thu tổng trong `plan.md` đạt.
- [ ] HANDOFF cập nhật.

## Risk Assessment
- Video lớn: dùng `ldUrl` (~9MB) thay bản gốc (~0.9GB) để mở nhanh.
- Lightbox che header/sidebar: z-index cao nhất, khoá cuộn body khi mở.
