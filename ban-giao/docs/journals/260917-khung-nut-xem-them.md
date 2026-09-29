---
date: 2026-09-17
session: khung-nut-xem-them-trien
---

# Journal: 2026-09-17 — Viền triện nút Xem thêm +

## Context
User gửi ảnh `.hv2-more` (viền CSS 1px), muốn viền mới: hoa văn chạy cạnh, không góc. Brainstorm khóa C (triện/ruyi), chỉ file ảnh. User: “làm luôn”.

## What Happened
- Scout: nút 44–50px, 9-slice `stretch` sẽ méo họa tiết cạnh.
- Khóa: PNG `khung-nut-xem-them-9slice.png` 1024×192, góc mối vàng, triện lặp 4 cạnh, `#121526` / `#00FF00`.
- Ghép PIL từ dải ruyi (không `image_gen` cả tấm). Không sửa `section-news.mjs`.

## Reflection
Cạnh ngắn của nút không “chạy” được mây lớn — đúng như brainstorm. Ở cỡ nút thật họa tiết thành dải vàng có vân; đó là giới hạn hình học, không phải cắt họa tiết.

## Decisions Made
| Decision | Rationale | Impact |
|----------|-----------|--------|
| Triện cạnh, góc trơn | Khác khung mây góc khối tin | File mới, không đè khung tin |
| Chỉ ảnh | Cùng quy trình khung mây | Chưa live |
| `round` khi gắn sau | Tránh méo `stretch` | Ghi trong báo cáo |

## Next Steps
- User đổi hướng: bỏ triện chạy viền, 4 góc rồng Lý kiểu khung-tin-tuc. Đã ghi đè `khung-nut-xem-them-9slice.png`. Chưa gắn nút.
