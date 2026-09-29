---
date: 2026-09-24
scope: 3qdc trang /dang-ky-som (kiểu quannhica) + mục quản trị "Đăng ký sớm" + sao lưu
commits: 8ff0d53 a47ea98 5ea2854 87e0308 (VPS C:\web\web1\3qdc-unified)
tags lùi: pre-dang-ky-som · pre-dang-ky-som-v2 · pre-dang-ky-som-nut-anh · pre-dang-ky-som-nut-moi
---

# Trang đăng ký sớm (23–24/09) — kinh nghiệm, bài học, lỗi & cách sửa

Bối cảnh: user muốn "đục tính năng" trang `quannhica.zalogames.me` về web mình. Đợt 1 (`8ff0d53`) làm trang đăng ký SĐT +
mốc + quản trị/CSV theo thiết kế đã chốt → user chê "khá xấu, thiếu nhiều" → dựng bản mẫu Artifact theo đúng bố cục
quannhica (9 phiên bản, góp ý bằng ảnh khoanh đỏ) → đưa lên (`a47ea98`) → thay nút bằng ảnh của user (`5ea2854`, `87e0308`).
HANDOFF mục 4.9–4.11. Plan: `plans\260923-2224-trang-dang-ky-som\`.

## 1. Quy trình đã chạy tốt (dùng lại)

1. **Đo trang gốc bằng Playwright trước khi dựng** (DOM + ảnh chụp từng khối ở 1920): lấy số thật (khối 1081px, cột 211px,
   ảnh 835×525, khoảng cách 7px) rồi so bảng "gốc / bản cũ / bản mới" — user "chỉnh lại đúng bản gốc" là chỉnh theo số đo.
2. **Bản mẫu Artifact trước, LIVE sau.** Artifact chặn ảnh ngoài ⇒ nhúng ảnh data URI (cắt nền trong suốt + nén WebP qua
   canvas trong Playwright, ~1,4MB cả trang). Mỗi góp ý: sửa `template.html` → ghép ảnh → đo 1920/1366/393 → đăng lại cùng
   đường dẫn (giữ URL) → mở lại tab Chrome của user. Nguồn bản mẫu lưu ở `reports\ban-mau-artifact\` (thư mục tạm phiên sẽ mất).
3. **Nháp 13396 → "deploy đi" → LIVE**, script dựng sẵn trong `tools\`: `start-draft-dang-ky-som.ps1` (junction `mirror`,
   `overrides`, deps; `-Clean` gỡ junction bằng `cmd /c rmdir` trước), `deploy-dang-ky-som.ps1` (robocopy → kiểm import →
   restart → gọi 15 đường), `check-import-signup.mjs`, `verify-dang-ky-som.cjs` (4 cỡ màn, `READ_ONLY=1` cho LIVE),
   `verify-quan-tri-dang-ky.cjs`, `test-signup-store.mjs`.
4. **Trước mỗi restart:** quét log Caddy tìm `/quan-tri` gần nhất (người đang sửa sẽ bị đăng xuất), `git status`, đặt thẻ lùi,
   chép file cũ vào `C:\web\web1\_backup\3qdc-unified-260924-dang-ky-som\`. So hash file LIVE với bản đang sửa để chắc không
   có phiên khác chen vào.
5. **Kiểm LIVE chỉ-đọc**, không ghi số giả; kiểm quản trị bằng tài khoản tạm rồi `news-user.mjs remove` ngay.

## 2. Lỗi thật đã gặp → cách sửa

| # | Lỗi | Nguyên nhân | Cách sửa / phòng |
|---|---|---|---|
| 1 | **Hiểu sai "làm nút đăng ký ở giữa"** → xoá 2 nút store, thay bằng 1 nút. User: "sai rồi… tổng là 3 nút" | Đọc câu như "thay", thật ra là "thêm" | "Thêm nút X ở giữa" = THÊM, giữ nguyên thứ đã khoanh. Chỉ bỏ khi user nói bỏ/xoá/thay (đã ghi bộ nhớ) |
| 2 | **Tướng, logo bị dẹp** | `<img width height>` + `max-width:100%` nhưng thiếu `height:auto` → bề ngang co, bề cao giữ | `img{max-width:100%;height:auto}` toàn trang; đo `(rộng/cao hiển thị)/(rộng/cao gốc)` phải = 1,000 |
| 3 | Nút trên KV **che dải chữ vẽ sẵn trong ảnh** ("Tinh Hà [nút] Anh Tài") | Nút đặt `bottom:5%` trong ảnh | Cho hàng nút vắt qua mép dưới KV (`bottom:0; translateY(50%)`) |
| 4 | Hàng nút bị **mép màn 1920×889 cắt nửa**; ở 1366 slogan trong ảnh bị cắt 2 đầu | KV khoá cao 816px (thuộc tính `height`) + `object-fit:cover` | `height:auto; max-height:max(420px,min(816px,calc(100vh - 130px))); object-position:50% 100%` — chỉ cắt trời, không cắt dải chữ đáy |
| 5 | **Toàn bộ CSS điện thoại tắt** (trang rộng 552px ở màn 393) sau khi tách CSS từ bản mẫu | Lọc bỏ rule `.mock-tag` theo dòng — rule đó 2 dòng, dòng 2 còn `}` mồ côi đóng nhầm | Không lọc CSS theo dòng. `check-import-signup.mjs` giờ **kiểm cân ngoặc** trước restart. Bộ kiểm có `isMobile:true` mới lộ lỗi này (không có `isMobile` vẫn báo 393) |
| 6 | **Nút ☰ điện thoại rớt xuống đè KV** (có trên LIVE từ `a47ea98`) | Grid tự xếp: nút ☰ đứng sau "Đăng Nhập" trong HTML mà gán `grid-column:2` → nhảy sang hàng mới | `.hd .wrap>*{grid-row:1}` |
| 7 | Chữ "Đăng Ký Sớm Google Play" **tràn khỏi thân thanh vàng** | Cỡ chữ theo `vw`, nút theo `clamp()` — hai thang khác nhau | `container-type:inline-size` trên nút + chữ `3.7cqw` (nút ngắn chữ `6cqw`) → chữ co giãn cùng nút; kiểm `scrollWidth<=clientWidth` |
| 8 | Cột tính năng **cách xa ảnh + thấp** so với gốc | Căn giữa theo chiều dọc, gap 28px | Grid `align-items:stretch`, cột `margin-top:-(mái)` cho mái nhô lên, `gap:0` |
| 9 | Cho cột `margin-right` âm để sát ảnh → **cột nở 269px thay vì 250** | Trong grid, margin âm làm ô tự giãn chứ không kéo ô bên cạnh | Ghim `width:250px` cho cột, cho **ảnh** `margin-left` âm |
| 10 | Bản mẫu mở ra **hiện sẵn hộp thoại** | Xem trước cục bộ thiếu `[hidden]{display:none!important}` (skeleton Artifact có, file mình không) | Tự khai báo `[hidden]` trong CSS trang |
| 11 | Chạy lại bộ kiểm trên nháp: "số 0987654321 đăng ký lại được" FAIL | Dữ liệu nháp giữ số từ lần chạy trước | Không phải lỗi — reset fixture hoặc đọc kết quả lần chạy đầu |
| 12 | Đường hầm ssh báo lỗi 255 | Đường hầm cũ vẫn giữ cổng 13396 | Giết `ssh.exe` có `13396` trong dòng lệnh rồi mở lại |
| 13 | Heredoc làm mất `\` trong `split('\\')` | Bash heredoc | Dùng `pathToFileURL(path.resolve(...))`, không viết `\` trong heredoc |

## 3. Bài học về nội dung (bản mẫu ≠ web thật)

- Bản mẫu có **số lượng quà tự bịa** (500 Nguyên bảo…), tên máy chủ bịa ("S1 Xích Bích"), ô `[Tên công ty…]`. Đưa lên LIVE
  = hứa với người chơi thật ⇒ LIVE chỉ hiện **icon quà, không số**, bỏ tên máy chủ, dùng chân trang thật. Nói rõ với user
  trước khi deploy.
- Nút chưa có chức năng thật (Nhận, Mời, Đăng Nhập, store, Fanpage/Group) → `data-soon` hiện thông báo "mở khi ra mắt", không
  giả vờ chạy. Đăng ký SĐT, số đếm, mốc là thật.
- Không OTP ⇒ số đếm bơm được bằng nhiều IP; giới hạn 10 lần/10 phút/IP (không phải 5: mạng di động VN dùng chung IP).

## 4. Kỹ thuật dùng lại được

- **Khung ảnh của user có mái/đế + thân trơn:** cắt riêng phần mái (ảnh), thân vẽ CSS theo màu/độ dày viền đo bằng canvas
  (khung mái ngói: 3 lớp viền `#f8e3b1` 2px / `#e4b058` 6px / `#ca9644` 2px, nền `#fdf6e3`). Thân giãn theo nội dung, mái không méo.
- **9-slice `border-image` giữ tỉ lệ:** `border-image: url() T R B L fill / calc(Tpx*var(--s)) …` với `--s = rộng hiển thị / rộng ảnh`,
  cột rộng cố định để `--s` đúng. Khung phẳng của user (`than-9slice.png`, lề 48) dùng 1:1 → viền luôn 10px.
- **Ảnh nút có chữ vẽ sẵn:** chữ trong thẻ để `sr-only` (trình đọc màn hình vẫn đọc).
- **Đo vùng có hình của ảnh PNG:** canvas `getImageData` → hộp alpha > 40, hàng/cột giữa để tìm thân thanh / ô nền.
- **Tìm phần tử gây tràn ngang:** lọc `getBoundingClientRect().right > innerWidth`, sắp giảm dần — ra ngay thủ phạm.
- **Dữ liệu đăng ký:** `jsonl` ghi nối đuôi + hàng đợi Promise (không ghi trùng khi gửi song song) + cờ `needNewline` (dòng cắt dở
  do mất điện không dính dòng mới). CSV: BOM + `="0912…"` giữ số 0 + tiền tố `'` chống chèn công thức.
- **Sao lưu:** `news-backup.ps1` chép thêm `data\dang-ky-som` sang `_backup\dang-ky-som\` (tách khỏi bản tin tức để restore tin
  không đụng danh sách). Thư mục chỉ có sau người đăng ký đầu tiên → log `signups=none` là bình thường.

## 5. Còn mở

- Quà thật (số lượng, mã) — user tự nghiên cứu, điền vào `STEP_GIFTS/TIER_GIFTS/INVITES` trong `signup-page.mjs`.
- Link store / Fanpage / Group; thông tin pháp lý chân trang.
- Thử trên điện thoại thật (mọi kiểm tra đều là Chromium giả lập).
- Chữ nút vàng "Google Play" ~11px ở 1366/360 — rút gọn "ĐK Sớm" nếu user muốn to hơn.
