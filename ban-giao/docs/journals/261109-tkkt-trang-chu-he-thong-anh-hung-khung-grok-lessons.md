# Journal 09/11/2026: trang chủ Thiên Không Kỳ Truyện (bản mẫu A): hệ thống anh hùng, tin tức, tính năng, khung viền Grok

Chỉ bản mẫu, chưa có code thật, chưa lên web. Đọc mục 3 (quy trình) và 4 (bẫy) trước khi chỉnh tiếp.

## 0. Chỗ làm việc

- File chính: `plans/261106-2120-tkkt-trang-chu/mockups/huong-a.html` (bản A, là bản đang chỉnh). B, C giữ nguyên.
- Ảnh/tài sản: `mockups/assets/` (thêm `tinh-nang/`, `khung-tinh-nang/`, `khung-tin/`).
- Mỗi bước sửa đều có bản lưu `huong-a.truoc-*.bak` cùng thư mục (lùi = chép .bak đè `huong-a.html`).
- Xem nhanh trên máy: `python -m http.server 18765 --bind 127.0.0.1` ở thư mục `mockups` → `http://127.0.0.1:18765/huong-a.html#<id>` (`#tin-tuc`, `#anh-hung`, `#tinh-nang`). Cổng 8765 đã có app khác chiếm.
- **Artifact (tài khoản canhan1): https://claude.ai/artifact/AKdpuu2pB8BebPZbLtKQtF** (slug `4b7c54a6-e290-4f45-9b5d-39c241cee838`, bản cuối `1794241203-f24b`). Link cũ `CrZVux…` thuộc tài khoản khác, không sửa được.

## 1. Việc đã làm (theo thứ tự user yêu cầu)

| # | Yêu cầu user | Kết quả |
|---|---|---|
| 1 | Gộp "Năm tộc" + "Anh hùng" thành 1 phần như 3Q (user phác hình) | Phần **Hệ thống anh hùng** `#anh-hung`: trái vòng cung dọc 5 tộc xoay; giữa lihui Spine; phải icon chiêu (bấm xem mô tả) + 4 icon anh hùng của tộc. Điện thoại: vòng tộc nằm ngang trên |
| 2 | Lấy bố cục tin tức của bản B + thêm ảnh trượt | Trái băng chuyền ảnh trong khung `ui-gg_frame_gonggao`, phải danh sách 5 tin |
| 3 | Thanh nút ra ngoài khung, trong khung chỉ khung + hình | Bỏ chữ "Tin nổi bật", nút/chấm ra dưới khung |
| 4 | Thông báo/Sự kiện/Cẩm nang để trên đầu cột phải | Hàng tab lọc `Mới nhất/Thông báo/Sự kiện/Cẩm nang`, bỏ nhãn ở từng dòng |
| 5 | Bỏ chữ dưới ảnh trượt "giống 3Q" | Chỉ còn khung + ảnh + nút |
| 6 | Ảnh to ra hai bên, không cắt | Làm xong → user **"revert lại như trước"** → trả lại (giữ 2 sửa tràn điện thoại) |
| 7 | "Ảnh trong game" → "Tính năng đặc sắc" có slide | 5 ảnh thật trong hồ sơ phát hành (S04-01, S04-02, S08-04, S10-31, S08-10) → `assets/tinh-nang/` |
| 8 | Bỏ khối "Hẹn gặp trên đảo bay" + chân trang | Đã bỏ (nhắc: trang thật cần dòng cảnh báo 18+/180 phút) |
| 9 | Bố cục tính năng giống 3Q, không chữ dưới | Coverflow: nút tròn ở mép ảnh giữa, chỉ hàng chấm |
| 10 | Ảnh "xát lại" như 3Q | Đo 3Q tại 1920: ảnh giữa 570–1350 → mình 569–1351; ảnh bên nấp sau |
| 11 | Khung viền rỗng ruột bằng Grok CLI | 3 kiểu SVG → chọn **kiểu 3 "Mây và pha lê"** cho Tính năng, **kiểu 2 "Cánh thiên sứ"** cho Hệ thống anh hùng |
| 12 | Khung cho cột danh sách tin bằng Grok CLI | 3 kiểu → chọn **"Cánh vàng"** |
| 13 | Hoa văn giữa cạnh trên khung tin bị dẹp | Tách hoa văn thành mảnh riêng (`khung-tin-2-giua.png`), khung chính dùng bản đã xoá hoa văn (`khung-tin-2-tron.png`) |

## 2. Lỗi thật → nguyên nhân → cách sửa

| # | Lỗi | Nguyên nhân | Cách sửa / phòng |
|---|---|---|---|
| 1 | Grok CLI chạy hết giờ, không ra gì | Grok chờ đọc stdin | Luôn thêm `< /dev/null`; thử nhanh `grok -p "Trả lời đúng một chữ: OK" --tools "" … < /dev/null` |
| 2 | Grok lần 2 vẫn quá 580 giây | Đề dài 3 SVG, Grok mất ~10–15 phút | Chạy nền (`run_in_background`) với `timeout 1500`, không chạy tiền cảnh |
| 3 | Không cập nhật được Artifact cũ | Artifact thuộc tài khoản Claude khác | Tạo Artifact mới, ghi link mới vào HANDOFF |
| 4 | Publish Artifact từ chối `lh.skel` | Artifact không phục vụ đuôi `.skel` | Bỏ `.skel`; dữ liệu Spine đã nằm trong `lh.pack.js` |
| 5 | Ô báo lỗi đỏ rỗng vẫn hiện | `.alert{display:flex}` đè thuộc tính `hidden` | Thêm `[hidden]{display:none}` cho class tự đặt display |
| 6 | Điện thoại: cột tin + khung tràn phải ~30px, bị cắt | Lưới `grid-template-columns:1fr` = minmax(auto,1fr), con có min-content rộng | Dùng `minmax(0,1fr)`; đo bounding từng khối con, không chỉ `scrollWidth` (body `overflow-x:clip` che lỗi) |
| 7 | Xoá CSS bằng regex theo dòng để lại dòng mồ côi | Luật CSS viết nhiều dòng | Xoá theo khối giữa 2 tiêu đề comment, hoặc khôi phục .bak rồi xoá lại chính xác |
| 8 | Python in tiếng Việt lỗi `cp1252` (script dừng TRƯỚC khi ghi) | Console Windows | `PYTHONIOENCODING=utf-8` |
| 9 | Chuỗi Python có `\w`, `\r` trong đường dẫn Windows làm hỏng file | Ký tự thoát | Dùng `/` trong đường dẫn hoặc r-string |
| 10 | Hoa văn giữa cạnh khung bị dẹp | border-image 9-slice kéo giãn cả cạnh (ngang ~0.9×, dọc 0.325×) | Hoa văn chỉ được ở GÓC; hoa văn giữa cạnh phải tách thành `::before` riêng đúng tỉ lệ |
| 11 | Khung Grok SVG nhìn quá mảnh, mờ trên nền sáng | Grok CLI chỉ trả chữ → vẽ vector nét mảnh | Dặn "nét đủ đậm trên nền #e7f2fb" (lần 2 rõ hơn); khung chạm trổ thật cần Grok tạo HÌNH (`grok-khung/prompt-anh-khung-cho-grok.txt`) |
| 12 | Vạch tiến độ ở chấm bị lệch | `::after` định vị tuyệt đối lệch với `::before` | Vẽ tiến độ ngay trên `::before` bằng gradient `--p`; JS nghe `animationend` theo tên nên đổi phần tử giả không ảnh hưởng |
| 13 | Ảnh bị cắt (object-fit:cover, 16:10) | Ảnh game ~2.16:1 | `contain` + nền mờ chính ảnh; hoặc khung đúng tỉ lệ ảnh. User từng chê "ảnh to" → giữ cỡ cũ |
| 14 | Agent 06b (quản trị) dừng giữa chừng khi đổi phiên | Phiên kết thúc | Phiên sau đã làm xong và deploy; luôn kiểm VPS/HANDOFF trước khi "làm tiếp" |
| 15 | Hai việc cùng sửa 1 file | Agent đang sửa huong-a.html khi user giao việc mới | Chờ agent xong rồi mới sửa; báo user đang chờ |

## 3. Quy trình đã chạy ổn

1. Đọc ảnh user khoanh → nói lại 1–2 câu "mình hiểu…" → làm ngay (user hay hỏi "bạn hiểu không").
2. Trước mỗi sửa: `cp huong-a.html huong-a.truoc-<việc>.bak`.
3. Sửa bằng Python `sub(old,new)` có `assert count==1` (đổi đúng 1 chỗ).
4. "Giống 3Q": mở 3Q bằng Playwright, đo bounding box ở 1920, chỉnh tới khi số khớp; báo bảng số 3Q vs mình.
5. Kiểm: Playwright `channel:'chrome'`, MỘT trình duyệt; 1920×889, 1366×650, iPhone 14 Pro (devices); thử thao tác (bấm, vuốt, tự chuyển, vòng cuối→đầu); đo tràn; TỰ MỞ ảnh xem.
6. Publish Artifact chế độ patch chỉ file đổi (+ ảnh mới) → mở `http://127.0.0.1:18765/...#id` bằng `Start-Process` → ghi 1 dòng HANDOFF.
7. Khung viền bằng Grok CLI: viết đề `.md` (3 phương án, SVG viewBox cố định, hoa văn chỉ ở góc trong ô N px, ruột trống, màu cụ thể) → `grok --prompt-file f --tools "" --disable-web-search --no-subagents --no-plan --max-turns 3 --rules "…" < /dev/null` (chạy nền) → tách `<svg>` bằng regex → Playwright render PNG 2× nền trong suốt → gắn thử từng kiểu (CSS chèn qua Playwright, không sửa file) → trang so sánh `xem-khung*.html` → user chọn → gắn thật bằng `::after` + `border-image <slice> / <px> stretch`, `pointer-events:none`.
8. Agent con cho việc lớn (gộp phần, coverflow, chọn ảnh); việc nhỏ (CSS, khung) tự làm cho nhanh.

## 4. Bẫy / kinh nghiệm

- User ưu tiên: **giống 3Q** (đo số), **ít chữ**, ảnh không méo/không cắt, không thích ảnh to quá; khi không ưng nói "revert lại như trước" → trả đúng bản .bak, giữ sửa lỗi kỹ thuật và nói rõ đã giữ gì.
- Ảnh tính năng: lấy từ hồ sơ phát hành `D:\workspace\skystory\plans\20261002-ho-so-phat-hanh-tkkt\hồ sơ g1 thienkhongkytruyen\video-hinh an\Hình ảnh\` (187 ảnh Việt hoá, mục lục `images/MUC-LUC-ANH.md`). KHÔNG dùng: S15-07 (lộ tên người chơi), S10-34/S13-10/S15-13 (tên test TESTFOE/TestBot). Đấu trường + Công hội cần chụp lại tài khoản sạch.
- Ảnh game nào cũng có băng 18+/180 phút sẵn.
- Khung 9-slice: hoa văn chỉ ở 4 góc; cạnh phải là nét thẳng đồng nhất; hoa văn giữa cạnh tách riêng.
- Khung trên khối có `overflow:hidden` + bo góc lớn → giảm bo góc (8px) để thấy hoa văn góc.
- Khung che chữ ở góc → lề trong ≥ bề rộng khung hiển thị.

## 5. Còn treo (chờ user)

1. Chọn bản cuối (A đang được chỉnh, có nên bỏ B/C), tên miền `*.wanmeivn.com`.
2. Ảnh Đấu trường/Công hội sạch; banner tin tức riêng (ảnh nữ thần đang trùng đầu trang).
3. Khung chạm trổ đẹp hơn: user tạo bằng Grok hình theo `grok-khung/prompt-anh-khung-cho-grok.txt` (nền xanh lá để xoá).
4. 3 lihui hơi bó (Mãn Nguyệt, Max, Icarus); giấy phép Spine runtime trước khi lên web thật.
5. Dòng cảnh báo 18+/180 phút khi làm trang thật (đã bỏ chân trang theo user).
