# Trang tin tối 16/09 — bài đầu tiên, xem trước cùng tab, header kiểu trang chủ, sửa ảnh hover — kinh nghiệm, bài học, lỗi & cách sửa

HANDOFF dòng 44–47 · commit VPS `198b45a` (xem trước cùng tab), `13f6d75` (header), `8a3783c` (sửa hover) · bài số 4 "Tương khắc giữa các nghề Võ tướng" (dữ liệu, user đã đăng) · đọc cùng `260916-news-theme-switch-lessons.md` (sáng/tối + slider, mục 5).

## 1. Diễn biến ngắn
1. **Bài đầu tiên (dòng 44):** user đưa `d:\Doc\Cam_nang_Tuong_khac_nghe_Vo_tuong chỉnh sửa.docx` → Claude đọc docx (unzip XML + media), dựng bản xem trước trên server laptop → user nói rõ "viết **trên quản trị**, tôi kiểm tra rồi mới đăng" → Chrome MSI (user tự đăng nhập) → tải 2 ảnh + lưu **Nháp** bằng API của chính trang quản trị → user xem trước + đăng.
2. **Xem trước cùng tab (dòng 45):** user hỏi "xem trước là trang riêng à" → liệt kê mọi trang riêng / nút mở tab mới → user "cho cùng tab" → sửa `admin-app.mjs`, bài đã đăng có thay đổi chưa lưu thì báo lưu trước.
3. **Header trang tin = header trang chủ (dòng 46):** khách (qua ảnh chat) muốn dùng ảnh chữ menu trang chủ + nền mờ dần → mock cỡ nhỏ A/B/C → user "cỡ giống trang chủ cho đồng bộ" → mock D1/D2 cỡ thật → user "D2, còn lại theo đề xuất" → nền đậm hơn trang chủ, header tối cả 2 chế độ.
4. **Sửa hover (dòng 47):** user khoanh "Trang chủ" khi rê chuột "bị lỗi" → đo so với trang chủ → ảnh hover bị bóp ngang bởi `img{max-width:100%}` → `max-width:none`.

## 2. Kinh nghiệm làm tốt (dùng lại)
- **Đăng bài hộ mà không giữ mật khẩu:** user tự đăng nhập Chrome của họ → Claude chạy `fetch` trong tab (cookie phiên của user) gọi đúng API quản trị (`POST /quan-tri/api/anh` body ảnh thô, `POST /quan-tri/api/bai` action `luu`) → bài đi qua bộ lọc HTML + lịch sử như soạn tay; **luôn lưu Nháp, không bấm Đăng**. Ảnh đưa vào trình duyệt bằng `input[type=file]` tạm tạo bằng JS + `file_upload` (file phải nằm trong thư mục dự án), đọc `input.files` rồi POST, gỡ input sau.
- **Đọc .docx không cần thư viện:** `unzip` → `word/document.xml` (đoạn, style Heading/Title, `numPr` danh sách, `w:tbl`, `r:embed` ảnh + `wp:extent` kích thước) + `word/_rels/document.xml.rels` → `media/imageN.png` (`scratchpad\bai-cam-nang\dump-docx.mjs`). Giữ lời văn tác giả, chỉ trình bày lại bằng đúng các thẻ bộ lọc cho phép (`h2` → mục lục, `div.tbl`, `div.note`, `figure`).
- **Kiểm tra nội dung trước khi lưu:** chạy chính `cleanContent()` của trang tin trên HTML định lưu, so bằng chuẩn hoá (`/>` → `>`, khoảng trắng) → biết chắc không mất thẻ nào.
- **Server nháp trên laptop dùng lại cho mọi thay đổi giao diện trang tin** (`theme-mock\mock-server.mjs` + `APP_DIR/DATA_DIR/SITE_ORIGIN/PORT`); dữ liệu có bài thật (`bai-cam-nang\data`) để thấy hiệu ứng khi cuộn; `news-seed` + `news-user add --origin` cho kiểm tra có đăng nhập (`check-news-admin`, `check-news-uploads`, `check-news-theme` USER_NAME/PW).
- **Mock đúng cỡ trước khi hỏi "to hay nhỏ":** "nhỏ lại cho đồng bộ" của khách thực ra là "cỡ như trang chủ"; mock A/B/C cỡ nhỏ tốn một vòng. Với yêu cầu "giống trang X", **mock bản y hệt X trước**, rồi mới đưa biến thể.
- **Kiểm tra đối chiếu trang gốc LIVE:** `check-news-header.cjs` đo logo/ảnh menu trên header trang chủ LIVE rồi so với trang tin ±1–2px ở 1920/1366 — bắt đúng "đồng bộ" thay vì hằng số tự đặt.
- **Chạy script mới trên LIVE cũ trước khi sửa** → phải FAIL đúng chỗ (hover bóp ngang FAIL đủ 6 cỡ) → mới tin script.
- **Hỏi trước mỗi lần deploy trang tin:** restart = mọi người đăng xuất + mất phần đang sửa chưa lưu; user trả lời "deploy đi" nhanh, không phiền.

## 3. Lỗi đã gặp → nguyên nhân → cách sửa
| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| E1 | Hiểu sai "viết bài tôi duyệt": Claude dựng bản xem trước laptop + đề xuất tài khoản Biên tập riêng | Không hỏi thẳng "viết ở đâu" | User: "viết trên quản trị, tôi kiểm tra rồi đăng" → dùng Chrome + tài khoản user (user tự đăng nhập) |
| E2 | `list_connected_browsers` chỉ thấy 1 trình duyệt macOS `59f551ee…`, không thấy MSI | Danh sách không đầy đủ lúc gọi | `select_browser 5aa70949…` vẫn chọn được; kiểm UA trong tab (`Win32`, cửa sổ 1920) để chắc đúng máy |
| E3 | Bản xem trước laptop 404 bài mẫu | `publishAt` 20:00 > giờ hiện tại (19:45) → hẹn giờ, chưa hiện | Đặt `publishAt` quá khứ; nhớ bài "hẹn giờ" không hiện |
| E4 | Ảnh bìa trùng ảnh trong thân bài | Ảnh 16:9 duy nhất là ảnh màn Đội hình, cũng nằm trong bài | Ảnh đó chỉ làm bìa, thân bài thay bằng câu "Ở ảnh đầu bài…" (báo user trước) |
| E5 | Ảnh mẫu kiểu A 40px chữ "Home/News" gần như không đọc được | Ảnh menu vẽ cho cỡ ~94px, thu nhỏ quá mất nét chữ phụ | Không đề xuất dưới ~52px; khách chọn cỡ trang chủ |
| E6 | Giao diện sáng + ảnh chữ menu vàng nhạt: nền ngà thì chữ chìm, viền nâu thì lem | Ảnh vẽ cho nền tối | Header luôn tối ở cả 2 chế độ, nút ☾ đổi màu `#f3dfa6` |
| E7 | Nền trong như trang chủ → chữ bài lộ dưới "Home/News" khi cuộn | Trang chủ nằm trên ảnh, trang tin nằm trên chữ | Nền đậm hơn (`.78→.5`) — giữ nguyên dải mờ + 4 lớp blur |
| E8 | Check hover FAIL "bị cắt đỉnh" ở 1920 | Ảnh hover có lề trong suốt, tràn trên y hệt trang chủ | Đo phần nét vẽ (hàng 17–69/79) như `check-header-nav` trang chủ |
| E9 | **Ảnh hover "Trang chủ" bị bóp ngang** (177 vs 325px) — user phát hiện | `img{max-width:100%}` toàn cục giới hạn ảnh absolute theo bề rộng link; script chỉ đo **chiều cao** | `.nav img{max-width:none}`; check thêm tỉ lệ rộng/cao = tỉ lệ gốc |
| E10 | `check-news-page` / `check-news` LIVE FAIL sau khi user đăng bài | Hai script giả định LIVE "0 bài" | Không phải lỗi code; cần đổi assert sang đếm theo `/api/tin-tuc` (ghi HANDOFF mục G) |

## 4. Sự thật kỹ thuật
- Header trang chủ: thanh 88px, nền 124px, 4 lớp blur 1.5/4/8/16px mask 100→124 / 76→108 / 48→88 / 20→64; ảnh chữ `clamp(66.5px,4.9vw,94.5px)`, hover `clamp(108.5px,8.015vw,154px)` dịch `NAV_H×−0.8815`; logo `clamp(56px,4vw,76px)` left 24 tâm y44; nav `left clamp(170px,13.5vw,260px) right clamp(200px,15.6vw,300px)`.
- Header cố định che nội dung: `body.has-site-h{padding-top:88px}` chỉ trong `pageShell` (quản trị dùng `NEWS_CSS` nhưng không có class → không bị đẩy); ảnh đầu trang danh sách `margin-top:-88px` để nằm dưới header; `scroll-margin-top` + `.aside` sticky phải lớn hơn thanh.
- Hàng menu cao 124px phủ lên nội dung: `nav{pointer-events:none}` + `a{pointer-events:auto}` để chỉ link chặn click.
- Trang xem trước dùng `pageShell` nên tự nhận header mới; `/quan-tri` (app) giữ header riêng `.adm-h`.
- Bài có `publishAt` tương lai = "Hẹn giờ": không hiện ở `/tin-tuc`, `/api/tin-tuc`, trang đọc 404.
- `window.open('', '_blank')` → tab mới; bỏ để xem trước cùng tab thì phải xử lý thay đổi chưa lưu (rời trang = mất).
