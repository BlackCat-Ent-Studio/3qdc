---
date: 2026-09-17
scope: 3qdc trang chủ + trang tin — 6 khung ảnh 9-slice của user
commits: d547a9c aa7b82a 5f7f8a8 a950ae9 3e94da6 fff9708 (VPS C:\web\web1\3qdc-unified)
---

# Khung ảnh 9-slice (17/09) — kinh nghiệm, bài học, lỗi & cách sửa

Bối cảnh: user làm khung trang trí (tự làm / Grok / phiên Claude khác) và nhờ gắn vào 6 chỗ: thanh MXH trái, thanh tải phải,
panel tải ngang (trang chủ, `layout-v2.mjs`), khối Tin Tức Sự Kiện + nút "Xem thêm" (`section-news.mjs`), thẻ bài nổi bật
`/tin-tuc` (`news-theme.mjs`). HANDOFF dòng 58–63.

## 1. Quy trình đã chạy tốt (dùng lại)

1. **Lưu bản gốc trước:** chép nguyên byte vào `3qdc-home-assets\trang-chu-chỉnh sửa\` hoặc `trang-tin-chỉnh sửa\`, tên `*-goc-WxH.png`.
2. **Đo ảnh bằng canvas trong Playwright** (script `measure-*.cjs` / `prep-*.cjs` trong `reports\<việc>\`):
   - hộp alpha > 8 (vùng thật của khung, để cắt sát);
   - số điểm "xanh lá" (G > R+30 và G > B+30) — nền chroma `#00FF00` hay sót viền;
   - hàng pixel giữa cạnh → độ dày viền vàng, vị trí nét trong, màu nền trong (`#121526` / trong suốt);
   - "hoa văn góc chạm tới đâu": quét điểm vàng (R > 110, R−B > 40) trong 1/4 ảnh, bỏ dải viền ngoài;
   - bo góc ngoài: với mỗi hàng y ở trên cùng, x đầu tiên có alpha > 128;
   - dải hoa văn lặp: tự tương quan độ sáng một hàng trong dải → chu kỳ (nút Xem thêm: 34px, sai số 0).
3. **Cắt sát + xoá điểm xanh (alpha = 0)** → xuất PNG và WEBP q0.92 bằng `canvas.toDataURL` trong Chrome; chọn file nhỏ hơn
   (khung hoa văn nhỏ: PNG 30KB < WEBP 38KB).
4. **Chọn slice** = vùng góc (hoa văn + bo) + vài px dư; chọn **tỉ lệ hiển thị** theo cỡ phần tử (0.275 thanh bên, 0.5 khối
   lớn, 0.6 thẻ, 0.3–0.4 điện thoại); padding nội dung ≥ tầm với hoa văn × tỉ lệ.
5. **Xem trước trên LIVE không deploy:** `verify\tools\preview-layout-playwright.cjs` (trang chủ) /
   `preview-news-css-playwright.cjs` (trang tin) + **`PREVIEW_ASSET_DIR`** (mới 17/09) phục vụ ảnh chưa upload từ thư mục local.
6. **Script verify riêng cho khung**, chạy trên LIVE cũ trước để chắc nó FAIL đúng chỗ, rồi mới chạy bản nháp:
   `check-news-frame.cjs`, `check-news-card-frame.cjs`, thêm assert trong `check-social-bar` / `check-download-panel` /
   `check-home-mobile`. Kiểm: đúng file + slice, ảnh tải đủ `naturalWidth`, nội dung né hoa văn góc ở cả 4 góc
   (`[[top,left],[top,right],[bottom,left],[bottom,right]].every(([v,h]) => v >= reach || h >= reach)`), không tràn.
7. **Luôn xem ảnh** (1920×889, 1366×768, iPhone 13/SE; phóng 4–5× vùng góc bằng `crop.cjs`) — đo pixel hàng nghi ngờ.
8. **Deploy bằng script PowerShell** trên VPS: so sha1 file LIVE = baseline nháp, `git status` sạch, sha1 file upload = nháp,
   tag `pre-…`, chép, `C:\Temp\deploy-root.ps1` → LIVE verify → commit ngay.

## 2. Bài học

- **9-slice không cần "xoay" ảnh:** khung dọc dùng cho panel ngang được, vì chỉ 4 góc giữ nguyên, cạnh tự kéo.
- **Khung có hoa văn giữa cạnh thì không kéo được** → yêu cầu (prompt Grok) chỉ trang trí 4 góc, cạnh thẳng; hoặc hoa văn
  lặp đều thì dùng `round` và cắt slice sao cho đoạn giữa = số nguyên chu kỳ.
- **Khung giữa trong suốt phải là lớp phủ (`::after`, `pointer-events:none`, z-index trên nội dung):** `border-image` vẽ ở
  lớp viền, ảnh bìa (nội dung con) vẽ đè lên → khung bị che.
- **Phần tử thấp (panel 146px) → né mây bằng lề ngang**, không tăng lề dọc (giữ chiều cao, không đẩy khối dưới). Phần tử trên
  điện thoại → né bằng lề dọc (chiều cao rẻ, bề ngang quý).
- **Khung hoa văn lặp dày đặc thu nhỏ còn ~12px/chu kỳ trông rối ("xấu quá")** — ở cỡ nút (cao 52px) nên dùng viền trơn + 1–2 điểm nhấn góc (bản rồng thay trong 10 phút: cùng quy trình đo → slice không đều trên/dưới `64 … 18` để rồng nằm trọn ô góc). Script đo chung: `reports\news-more-button-frame\measure-frame-generic.cjs <ảnh>` (hộp, điểm xanh, độ dày viền, tầm hoa văn từng góc, bo góc).
- **Trình duyệt rút gọn giá trị `border-image-slice`** (`64 56 18 56` → `64 56 18`) — assert dùng regex cho cả hai dạng.
- **Cùng tỉ lệ cho các khung cùng họ** (0.275 cho thanh MXH, thanh tải, panel) → mây và nét vàng giống hệt nhau.
- **Kiểm một thứ trên web rồi đổi thiết kế có thể làm lộ lỗi bố cục cũ:** 2 mũi tên thu gọn luôn đè mép khối tin @1366,
  trước là viền 1px khó thấy, sau khung vàng mới lộ → báo user, không tự sửa.
- **User nói "được không" = hỏi**; "tùy bạn miễn chạy ok" / "làm xong deploy luôn" = giao quyền chọn + deploy (vẫn kiểm
  hoạt động quản trị trước).
- **Prompt cho Grok phải nói rõ đích:** lần đầu Claude đo nhầm thẻ `/tin-tuc` thay vì khối tin trang chủ; user phải gửi lại
  ảnh. Khi ảnh chụp mơ hồ, đo phần tử có viền giống ảnh nhất và nói tên phần tử + trang trong câu trả lời.

## 3. Lỗi gặp & cách sửa

| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| E1 | Vệt kẻ tối 1px ngang khung ở mép ghép slice (thấy khi đo hàng 520: 17,30,48 giữa nền 22,39,60) | Chrome vẽ từng ô 9-slice riêng, mép ô thu nhỏ lấy mẫu lẫn vùng trong suốt ngoài ô → nền trang tối lộ qua | Thêm nền cùng màu dưới khung: `background:#16273b` / `#121526` + `border-radius` **lớn hơn** bo góc khung (đo ~21px → dùng 24px) để nền không lòi ra ngoài nét vàng |
| E2 | Nền lót lòi ra ngoài góc vàng (bo 16px) | Bo góc khung thật ~21px (đo bằng x đầu tiên có alpha theo hàng) | Tăng lên 24px, zoom 4× kiểm lại |
| E3 | Thanh tải cao hơn (390→436) sẽ đè header ở cửa sổ 581–620px | Ngưỡng bản thu gọn `SIDEBAR_COMPACT_H` = 580 tính theo chiều cao cũ | Đổi 580→620 (= 436 + 2×88 + dư), thêm cỡ 1366×600 vào `check-download-panel` |
| E4 | Kết luận "không ai dùng quản trị" có thể sai | Log Caddy cuộn theo dung lượng (có file chỉ vài phút); lần đầu chỉ đọc file log hiện tại | `admin-activity.ps1` quét cả `.gz` 2 giờ gần nhất; `admin-activity-ua.ps1` tách `HeadlessChrome` (verify của Claude) khỏi người thật |
| E5 | Nói với user "deploy trang chủ không đăng xuất quản trị" — sai | Trang chủ + trang tin + quản trị chung 1 service; phiên đăng nhập trong RAM | Đính chính ngay với user; mọi restart = kiểm hoạt động quản trị trước (đã ghi memory) |
| E6 | Lệnh deploy bị bộ phân loại auto mode chặn ("Production Deploy"); script deploy tạo trong cùng lệnh **không được ghi** → lần sau `scp` báo exit 255 | Cả lệnh bash bị từ chối, kể cả phần `cat > deploy.ps1` | Báo user, chờ "deploy đi"; tách bước tạo file ra lệnh riêng, kiểm file tồn tại trước `scp`; chạy `scp` không nuốt stderr khi lỗi |
| E7 | Đoạn ghi HANDOFF bằng `node - <<'EOF'` bị hỏng chữ (`\n`ews → xuống dòng, `\r`eports → CR, `\260` → "°") | Chuỗi JS chứa đường dẫn Windows có `\`; heredoc + chuỗi JS diễn giải escape | Không nhúng đường dẫn `\` trong chuỗi JS; ghi nội dung ra file bằng Write rồi script đọc file và chèn theo neo dòng (`splice-handoff.cjs`); hoặc dùng Edit |
| E8 | Assert mới trong `check-news-frame.cjs` viết qua heredoc mất `\` trong regex → SyntaxError | Như E7 | Sửa bằng Edit tool; sau mỗi lần sửa script chạy nó trên LIVE cũ ngay (phải FAIL đúng chỗ, không lỗi cú pháp) |
| E9 | Ảnh chụp `fullPage` với `clip` lệch toạ độ | `getBoundingClientRect` theo viewport, clip `fullPage` theo trang | Cộng `scrollY` vào `y`, hoặc dùng `locator.screenshot()` |
| E10 | `check-home-mobile` FAIL 1 lần "iPad Pro 11 landscape: tapping a tab selects it" | Chập chờn (thời gian render/chạm) | Chạy lại riêng máy đó (`DEVICES=`) trên LIVE cũ + nháp: đều PASSED → không phải do thay đổi; ghi mục G |
| E11 | Chạy xem trước song song với deploy sẽ hỏng | Wrapper preview tìm baseline cũ trong HTML; sau deploy không còn → exit 2 | Chờ script nền xong (`until grep …`) rồi mới deploy |
| E12 | Lỗi bố cục có sẵn lộ ra: 2 mũi tên thu gọn đè viền khối tin @1366 | Khối tin lệch trái chừa thanh phải; mũi tên cố định giữa màn | Chưa sửa — hỏi user (thu hẹp khối ở ~1366 hay để nguyên) |

## 4. Số đo & giá trị đang chạy (tra nhanh)

| Chỗ | File ảnh (cắt) | Slice | Hiển thị | Ghi chú |
|---|---|---|---|---|
| Thanh MXH trái `#hv2-social` | `home/khung-mxh-may.webp` 320×937 | 122 124 122 fill | 33.5/34px, rộng 88, padding 36 0 | nền `#16273b` bo 24 |
| Thanh tải phải `#hv2-sidebar` | cùng ảnh | cùng | rộng 152, padding 36 12, cao ~436 / thu gọn 366 | `SIDEBAR_COMPACT_H` 620 |
| Panel tải `#hv2-dlpanel` | cùng ảnh | cùng | desktop padding dọc clamp(10–14) ngang clamp(38–46); điện thoại 36 12 | 526×146 @1920 |
| Khối tin `.hv2-news` | `home/khung-tin-tuc.webp` 2016×608 | 80 fill | 40px (0.5×), padding 40; điện thoại 24px, padding 26 14 | nền `#121526` bo 20/14; cao 427 |
| Nút `.hv2-more` (từ `b542483`) | `home/khung-nut-xem-them-rong.webp` 1008×176 | 64 56 18 56 fill, `stretch` | 25.6 / 22.4 / 7.2 / 22.4px, padding 10 28, cao ≥52 (điện thoại 48) | viền trơn 15px, rồng 2 góc trên 54×62; bản hoa văn lặp `fff9708` (26 30 26 26 `round`) user chê xấu → thay |
| Thẻ `/tin-tuc` `a.feat` | `news/khung-the-tin.webp` 2008×643 | 64 (giữa trong suốt) | `::after` 38.4px; ≤820px 25.6px | bo 20/14, bỏ `border` |

## 5. Còn mở

- Chờ user: mũi tên đè viền khối tin @1366 (E12); xem khung khối tin, thẻ `/tin-tuc`, nút Xem thêm.
- Chưa thử Safari/iPhone thật cho `border-image`.
- Phiên Claude khác trên laptop từng làm ảnh nút (journal `260917-khung-nut-xem-them.md`) — kiểm mtime/sha1 trước khi sửa cùng file.
