# Giao diện sáng/tối trang tin + quản trị — kinh nghiệm, bài học, lỗi & cách sửa (2026-09-16)

Commit VPS `ebceab8` (tag trước `pre-theme-toggle` = `3ba6d30`; phiên trang chủ chen `908703e`) · HANDOFF dòng 42 · báo cáo `plans\reports\brainstorm-260916-1824-giao-dien-sang-toi-trang-tin-quan-tri-report.md` · nháp `plans\260916-0254-trang-tin-tuc-quan-tri\draft-theme\`.

## 1. Diễn biến ngắn
1. User: "dark mode + light mode cho hai trang" → scout CSS (token 1 chỗ `news-theme.mjs`, ~60 màu ghi thẳng, CSP nonce `/quan-tri`) → 6 câu hỏi → user: chỉ 2 trang, mặc định tối, 2 trạng thái, kiểu A giấy ngà.
2. Ảnh mẫu trên **server nháp chạy trên laptop** (code VPS + 12 bài mẫu) → user "duyệt, làm đi".
3. Nháp bằng script thay-đúng-1-lần → 211 local check → script theme mới 93→96 ok → so màu tối baseline/nháp → reviewer (0 chặn, 3 thấp đã sửa) → deploy → LIVE → commit.

## 2. Kinh nghiệm làm tốt (dùng lại)
- **Server nháp trên laptop cho thay đổi chỉ-giao-diện của trang tin:** `scratchpad\theme-mock\mock-server.mjs` import `news-routes.mjs` (tar từ VPS), `NEWS_DATA_DIR` dữ liệu mẫu, route `/3qdc-vi/` proxy LIVE; `APP_DIR`/`PORT` để chạy baseline (3397) + nháp (3396) song song. Không cần server 3398 VPS, không restart gì.
- **Chứng minh "giao diện cũ không đổi"** bằng so `getComputedStyle` (color/background/border/shadow/outline) của mọi phần tử theo thứ tự trên 2 server — chính xác hơn so ảnh pixel (không nhiễu font/ảnh). Loại phần tử mới (`[data-theme-toggle]`) trước khi so.
- **Không chớp khi tải lại:** kiểm bằng `addInitScript` → `requestAnimationFrame` ghi `data-theme` ở khung đầu (trước first paint).
- **Tương phản tự động**: tìm nền đặc gần nhất (bỏ qua nền ảnh/gradient), WCAG ≥4,5; giao diện mới phải đạt, giao diện cũ chỉ ghi số (lỗi có sẵn không chặn deploy, báo user).
- **Script áp thay đổi `apply-theme.mjs`**: mỗi cặp thay phải khớp đúng 1 lần, đọc từ baseline ghi ra nháp → chạy lại được sau khi sửa theo reviewer.
- **Markup dùng chung cho app serialise (`adminApp.toString()`)**: truyền qua JSON `adm-data` thay vì chép tay.
- **Deploy tự vệ 2 chiều sha1**: file LIVE = baseline VÀ file tải lên = bản nháp đã kiểm → `deploy-news-theme.ps1`.

## 3. Lỗi đã gặp → nguyên nhân → cách sửa
| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| T1 | Ảnh mẫu quản trị có 2 nút theme | Đổi `#hash` trong app SPA không tải lại trang → chèn nút lần 2 vào cùng tài liệu | Xoá `.theme-btn` cũ trước khi chèn + `page.reload()` sau `goto` |
| T2 | Script theme FAIL tương phản 3,2–3,6 | `--faint #6f6a5c` của giao diện **tối đang chạy** (footer, đường dẫn bài) | Tối = chỉ ghi số (`strict=false`); hỏi user có đậm lên không |
| T3 | `node -` heredoc thay chuỗi báo "match 0" | Chuỗi có `\n` / backtick lồng trong heredoc → không khớp nguyên văn (giống A2 journal phase 2) | Dùng Edit trên file script |
| T4 | Reviewer: Back về trang cũ / tab khác vẫn giao diện cũ | bfcache giữ DOM cũ; tab khác không đọc lại localStorage | `pageshow` (persisted) + `storage` → đọc lại khoá; thêm kiểm tra tab khác + Back |
| T5 | `tee` log vào thư mục chưa tạo → mất log lượt đầu | Script tự `mkdir` thư mục ảnh nhưng log ghi trước đó | `mkdir -p` trước khi chuyển hướng log |
| T6 | Phiên khác commit `908703e` sau khi gắn tag | Hai phiên cùng VPS | Kiểm git sạch + sha1 file của mình ngay lúc deploy; rollback bằng `git revert`, không reset về tag |

## 4. Sự thật kỹ thuật
- Cookie phân theo host, **không theo cổng** (`127.0.0.1:3396` và `:3397` dùng chung cookie `3qdc_qt`); localStorage theo origin (có cổng) → dùng context riêng cho mỗi server.
- `html[data-theme="light"]` (0,1,1) thắng `:root` (0,1,0) → không cần `!important`. Token dẫn xuất kiểu `--toast-bg:var(--gold-hi)` tính ở phần tử khai báo — phải khai lại trong khối sáng nếu muốn khác.
- Trang xem trước `/quan-tri/xem-truoc/<id>` tự thêm nonce cho mọi `<script` của `pageShell` → script mới trong `pageShell` không cần sửa gì thêm.
- `check-news-admin-live.cjs` không có `LINK` → luôn 1 FAIL "LINK not given" (cố ý bỏ tài khoản tạm) — phần còn lại đạt là đủ cho thay đổi không đụng API.

## 5. Cùng phiên — slider khối Tin Tức trang chủ theo ảnh bìa bài (`d770d17`, HANDOFF dòng 43)
| # | Lỗi / bài học | Nguyên nhân | Cách làm |
|---|---|---|---|
| S1 | Đề xuất "ảnh dự phòng = banner Tinh Hà Rực Sáng" nhưng file là "Thiên tài Võ Liệt" | Đặt tên theo trí nhớ; ảnh mẫu dùng `anh-nen-slogan-vi.webp` làm ảnh bìa giả nên lẫn | **Mở ảnh thật trước khi gọi tên nó cho user**; xem trước ảnh tab rỗng bắt được (16:9 cắt chữ) → đổi sang ảnh nền, báo user |
| S2 | Script: rê chuột không dừng tự chạy + bấm ảnh không mở bài (code đúng) | Trang có cuộn mượt → toạ độ đo ngay sau `scrollIntoView` còn đang trôi | Probe sự kiện thật (`debug-slider-events.cjs`) trước khi sửa code; dùng `page.hover/click(selector)` + `behavior:'instant'`; chờ trạng thái bằng `waitForFunction` thay vì chờ cố định (nhịp tự chạy 4,5s) |
| S3 | `check-treasure-hidden` FAIL con trỏ tay khung slider | Bản nháp bỏ `cursor:pointer` khung — trái quyết định cũ của user "nút không link vẫn trông bấm được" | Giữ nguyên luật cũ; test sẵn có bắt được |
| S4 | User nói "không" sau khi Claude đưa 5 câu hỏi | Nhiều câu hỏi làm lạc ý chính; user nhắc lại mục tiêu | Nhắc lại ý user bằng 1 câu, chỉ hỏi 1 lựa chọn thật sự khác nhau (theo tab / chung), còn lại nêu mặc định |

## Bổ sung 2026-09-16 23:50 — nền trắng tinh (`b765a75`)
- Đổi màu giao diện sáng chỉ cần 4 token nền (`--ink`, `--ink-2`, `--panel`, admin `--panel-2`) nhờ đợt token hoá trước; mọi thứ khác (dải mờ ảnh đầu trang) đi theo `var(--ink)`.
- Mẫu "đổi cả màu chữ sang xám đen" gần như không khác mẫu giữ chữ nâu → chỉ trình bày 1 phương án, nói rõ đã thử.
- **Cổng server nháp bị phiên khác chiếm:** VPS 3398 (`home-mobile-draft`), laptop 127.0.0.1:3396 (`mock-server.mjs`; tunnel ssh chỉ lấy được `::1` nên curl tới 127.0.0.1 vào nhầm server kia → lỗi "link không hợp lệ" giả). Trước khi dùng cổng: `Get-NetTCPConnection -LocalPort N -State Listen` trên **cả VPS và laptop**; dùng cổng lạ (13396) và `-L 127.0.0.1:N:127.0.0.1:N`.
- **Tên thư mục tạm dùng chung:** `C:\Temp\news-theme-upload` đã tồn tại (phiên trước) → `Copy-Item` lồng vào → luôn `Test-Path` trước và đặt tên riêng theo việc (`news-white-*`).
- **Lệnh deploy bị user bấm từ chối vẫn có thể đã chạy xong** → trước khi chạy lại, kiểm `git status` + sha1 + nội dung LIVE; ở đây đã deploy thật nên chỉ verify + commit.

## Bổ sung 2026-09-17 01:40 — nút Tải game bằng hình (`8ee5a4d`)
- **"Liên kết với Grok":** không có công cụ Grok/xAI trong phiên → cách thực tế: viết prompt chi tiết (tiếng Anh, màu hex của web, tỉ lệ, "no text", nền tối phẳng để xoá nền) để user tự tạo; dặn trước AI viết sai dấu tiếng Việt → chữ để CSS.
- **Hình AI có lề trong suốt lớn** (1408×704, nội dung 1168×389) → cắt theo alpha bbox (+2px) trước khi thu nhỏ, xuất 3× cỡ hiện; WEBP alpha nhẹ ~6× PNG (17KB vs 102KB).
- **Xem trước CSS trang tin không cần server nháp:** `verify\tools\preview-news-css-playwright.cjs` (route tài liệu `/tin-tuc|/quan-tri`, thay chuỗi `NEWS_CSS` của `news-theme.mjs` đang chạy bằng bản nháp; hình mới đặt trước vào `overrides` vì chưa được trang nào dùng).
- **Heredoc bash tạo `.ps1` có `$biến`:** thoát `\$` sai làm mất `$f` trong đường dẫn (`news\` thiếu tên file) → script PowerShell có biến viết bằng công cụ Write, không qua heredoc.

