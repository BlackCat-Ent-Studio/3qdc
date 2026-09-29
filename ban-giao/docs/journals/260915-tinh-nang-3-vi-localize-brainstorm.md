---
date: 2026-09-15
session: tinh-nang-3-vi-localize-brainstorm
---

# Journal: 2026-09-15 — Brainstorm Việt hoá banner Tính Năng #3

## Context

User gọi `/ck-brainstorm` trên `3qdc-home-assets/trang-chu/tinh-nang-3-hon-tuong-tuy-chon.webp`: giữ font/art, chỉ dịch Hán → Việt. Carousel Phase 4 vẫn 5/5 chữ Trung; KV đầu trang đã Việt (`ab4e396`).

## What Happened

- Scout: 1211×680 WEBP; CSV OCR sai (曹丕/愿梦); wiki glossary đúng (Tào Tháo, Thận Mộng, Lữ Bố).
- User chốt: dịch hết chữ; dải 6 năm → Trung Thu; chỉ #3, file local, chưa live.
- Dải: `Đêm trăng Trung Thu · Quà tặng giới hạn`. Logo: **xoá hẳn** (không dịch). Headline: `Tự chọn Hồn Tướng · Lên thẳng Full Đỏ`. 8 tên xếp dọc theo glossary.
- Không `/ck:plan` — spec đủ để vẽ lượt sau.
- Đã vẽ bản có 8 tên. User xem xong → khóa delta: **xoá hết khung tên**, ghi đè cùng file. Report: `brainstorm-260915-tinh-nang-3-bo-khung-ten-report.md`. Bỏ plan lần 2.

## Reflection

“Giữ nguyên font” không khả thi với dấu Việt; trần = slogan VI. Dịch 8 tấm tên dọc là điểm yếu đã báo trước. Copy Trung Thu dán lên art 6 năm — user chấp nhận, không vẽ thêm đèn lồng.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Chỉ file #3, chưa live | Giống slogan VI: duyệt ảnh trước | 1/5 carousel sẽ lệch nếu gắn sớm |
| Xoá logo | Ô nhỏ; brand đã ở header | Vá mây góc trái |
| Trung Thu thay 6 năm | User yêu cầu | Dải dài hơn gốc → thu font |
| Glossary wiki, không CSV | CSV OCR sai 2 tên | Lữ Bố / Thận Mộng / Tào Tháo |
| Bỏ plan | 1 vòng image_edit, không logic/test | Lượt sau vẽ thẳng |
| Bỏ 8 khung tên (delta) | Tấm dọc không đọc được Hán-Việt | Ghi đè file; nhận tướng bằng hình |

## Next Steps

- User duyệt bản không khung tên (2026-09-15). File: `3qdc-home-assets/trang-chu-chỉnh sửa/tinh-nang-3-hon-tuong-tuy-chon.png`.
- Chưa live. Còn lại nếu user muốn: gắn `overrides/` + path `section-features.mjs`, hoặc Việt hoá 4 banner kia.
