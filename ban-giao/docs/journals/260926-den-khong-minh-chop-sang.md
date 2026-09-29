---
date: 2026-09-26
session: den-khong-minh-chop-sang
---

# Journal: 2026-09-26 — Đèn Khổng Minh, chớp theo khung

## Context

Đã có `den-khong-minh.png` (1024, nền trong, chưa gắn web). User muốn animation dạng frame để đèn chớp sáng.

## What Happened

- Ba hướng: 8 khung từ cùng một tấm, vẽ lại từng khung, hoặc CSS. Chốt hướng một vì vẽ lại làm hình đèn trôi.
- User chọn WebP động cộng PNG từng khung, không GIF.
- `build.py` nhân sáng pixel ấm dưới 55% hộp alpha. Tám hệ số `0.82 … 0.96`. Alpha chép nguyên.
- Đo lại độc lập: chênh sáng vùng dưới 28.28, vùng trên 0. WebP 8 khung × 125 ms, loop 0. Tấm gốc không đổi.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Chỉ nhân sáng vùng lửa và giấy dưới | Alpha và thân đứng yên | Vòng lặp không giật hình |
| WebP, không GIF | GIF làm bẩn mép trong suốt | File xem được, viền sạch |
| Chưa gắn trang | Chưa có chỗ trên web chờ đèn | Không sửa mjs/css |

## Next Steps

- File nằm ở `3qdc-home-assets/trang-chu-chỉnh sửa/den-khong-minh-frames/`. Chưa gắn trang.
- Gắn web chỉ khi có chỗ đặt đèn.
