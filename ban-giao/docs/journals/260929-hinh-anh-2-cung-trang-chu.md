---
date: 2026-09-29
session: hinh-anh-2-cung-trang-chu
---

# Journal: 2026-09-29 — Đổi chữ ảnh cung trăng

## Context

`hinh-anh-2-cung-trang.webp` in cùng hai câu với ảnh 3. User muốn câu mới, giữ style, thống nhất chữ trước khi vẽ.

## What Happened

- Chốt dòng vàng `Cung Trăng Mở Hội · Ba Vị Quang Lâm`, dải `Đêm trăng Trung Thu · Trăng tỏ cung đài`.
- User bảo vẽ luôn, file mới, không đè file cũ.
- Xuất `3qdaichien-anh/hinh-anh-2-cung-trang-mo-hoi.webp` 1211×680. Hash file cũ giữ `872652bdfe64`.
- Dải ra gạch ngang `-`, cùng kiểu dải gốc. Hai lần sửa không thành chấm giữa.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Câu cảnh, không offer | Offer Full Đỏ ở lại ảnh 3 |
| File anh em | Trang test vẫn trỏ tên cũ |
| Nhận dải có gạch ngang | Chữ đúng. Đổi dấu dễ làm lệch dấu Việt |

## Next

Gắn tên mới vào `index.html` trang test chỉ khi user bảo. Đổi `-` thành `·` nếu user muốn đúng ký tự đã chốt.
