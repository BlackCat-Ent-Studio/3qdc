---
date: 2026-11-12
session: icon bóng nước Bong Bóng Đại Chiến
---

# Journal: 2026-11-12 — icon Bong Bóng Đại Chiến

## Context

User gọi brainstorm để có icon quả bóng nước bom, hoạt hình, vui kiểu chibi. Repo không có asset này. Icon chiêu game là 80×80; sticker Q ở `3qdc-media/03-sticker/` chỉ là mốc mặt cười.

## What Happened

- Khóa spec: 1 PNG 1024×1024 nền trong suốt, chỉ xem. Bóng xanh trong, nút buộc, ngòi ngắn, má hồng. Ruy băng dưới ghi đúng `Bong Bóng Đại Chiến`.
- “Bom Nexon” hiểu là bóng nước Crazy Arcade, không copy nhân vật hay logo.
- Model vẽ quả bóng trên nền magenta, không chữ. Chữ ghép bằng Baloo 2 ExtraBold vì font bo tròn của Windows thiếu `ạ` và `ế`.
- Cắt nền, xóa viền hồng sót của JPEG. File `plans/reports/bong-bong-dai-chien-1024.png`. Báo cáo `plans/reports/brainstorm-261112-2313-bong-bong-dai-chien-report.md`.
- Không gắn trang, không đụng icon chiêu hay key art.

## Reflection

Một ảnh xem trước không cần plan. Chữ có dấu phải nằm ngoài model. Viền magenta của JPEG sống sót sau khi phóng to, phải xóa ở file cuối.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Bóng + ruy băng, không người | Đọc là vật phẩm | Không làm sticker nhân vật |
| Chữ bằng font | Model sai dấu Việt | Sửa chữ không phải vẽ lại bóng |
| Chưa gắn web | User chọn file xem | Chữ chết nếu thu xuống 64px |

## Next Steps

- Nếu dùng làm icon 64px: bỏ ruy băng, giữ mỗi quả bóng.
- Nếu sửa câu chữ: ghép lại ruy băng, không vẽ lại bóng.
