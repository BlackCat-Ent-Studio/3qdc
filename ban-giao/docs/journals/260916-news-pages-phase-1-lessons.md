# Trang tin tức `/tin-tuc` phase 1 — kinh nghiệm, bài học, lỗi & cách sửa (2026-09-16)

Commit VPS `40d47e7` (tag trước `pre-news-page` = `24bc7e1`) · **user tạm duyệt** · plan `plans\260916-0254-trang-tin-tuc-quan-tri\` · HANDOFF dòng 34.
Đọc cùng: `docs\journals\260914-home-layout-v2-lessons.md` (quy trình chung, bẫy công cụ #1–#64).

## 1. Diễn biến ngắn
1. User: "làm thêm 1 trang xem chi tiết tin tức sự kiện… để viết bài lên" → khảo sát mã: bundle gốc có trang `#/details/<id>` nhưng thân bài = 1 poster chữ Trung, ảnh 404 trong mirror → không Việt hoá được.
2. User gửi 4 trang tham khảo (btagency, omg3q ×2, mongchiton) "chỉ học" → probe headless 1920×889: btagency = Next.js + **Sanity CMS** (bài soạn trong trình quản trị riêng); omg3q/mongchiton bố cục cũ; thêm HoYoverse/Riot làm mẫu hiện đại.
3. User: game chưa phát hành, 2–3 người đăng, giữ 3 tab, "đơn giản nhưng đầy đủ, không giống omg3q/mongchiton" → **dựng bản mẫu bằng Artifact** (trang người chơi + trang quản trị, ảnh Việt 3qdc nhúng data URI) → user "uầy ok" → brainstorm chốt 6 quyết định → plan 3 phase.
4. User "triển khai xem" → phase 1: 6 module `scripts/lib/news/`, server nháp 3398 + 17 bài thử, reviewer, deploy 1 lần, 6 script LIVE đạt, commit.

## 2. Kinh nghiệm làm tốt (dùng lại)
- **Bản mẫu Artifact trước khi code**: user xem được giao diện chạy thật (bấm tab, soạn bài, đăng thử) → duyệt nhanh, không phải sửa giao diện sau deploy. Nhúng ảnh thật của dự án làm ảnh bìa cho mẫu đỡ "giả".
- **Hỏi quyết định bằng danh sách đánh số trong câu trả lời** (không popup AskUserQuestion): user trả lời gọn "đồng ý cái 1, cái 2 thì…".
- **Server nháp cạnh service thật (cổng 3398)**: thư mục bản sao `scripts\` + junction `mirror`/`overrides` + dữ liệu thử riêng (`NEWS_DATA_DIR`) → chạy nguyên bộ verify với `ORIGIN=http://127.0.0.1:3398` qua `ssh -N -L`, không đụng LIVE. Deploy chỉ 1 lần, LIVE đạt ngay.
- **Bộ dữ liệu thử có chủ đích** (bài ghim, Nháp, Chờ duyệt, hẹn giờ 2099, tiêu đề chèn mã, ngày sai định dạng, ảnh bìa `/\evil`, trùng slug, đủ bài để hiện "Xem thêm") → mỗi quy tắc hiển thị/an toàn có 1 bài bắt lỗi.
- **Biến `ORIGIN` / `MODE`** cho script verify → 1 script dùng cho cả nháp (có bài) và LIVE (trống).
- **Script deploy tự chặn**: so sha1 `server.mjs`/`section-news.mjs` LIVE với bản đã đọc + `git status` sạch trước khi chép (có phiên Claude khác làm song song).
- **Diff bản nháp với LIVE trước khi scp** → chắc chắn chỉ đổi đúng dòng dự định.
- **Trang đọc bài server-render** (không overlay JS) để Facebook đọc `og:*`; danh sách nhúng JSON (`<` → `\u003c`) + JS client.
- **code-reviewer vẫn bắt lỗi thật** dù local check + verify đã đạt (ngày, ảnh bìa, mục lục).

## 3. Lỗi đã gặp → nguyên nhân → cách sửa
| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| N1 | Server nháp báo `serving at :3398` nhưng curl qua đường hầm `000`, cổng không còn ai nghe | `Start-Process node` trong lệnh ssh → OpenSSH Windows huỷ tiến trình con khi phiên đóng | Tạo tiến trình bằng `Invoke-CimMethod Win32_Process Create` (`cmd /c set PORT=3398&& … node server.mjs > log`) — `tools\start-draft-3398.ps1` |
| N2 | `ssh company-vps "powershell -NoProfile -Command -" <<'EOF'` không in gì, lệnh không chạy (2 lần: kiểm route, dọn file) | Đọc script từ stdin qua ssh không thực thi (không báo lỗi) | Ghi `.ps1` → `scp` → `powershell -File`; luôn kiểm lại trạng thái bằng lệnh 1 dòng (`Test-Path …`) |
| N3 | Lệnh ssh có `$_` / backtick hỏng (`unexpected EOF`) | Git Bash tách chuỗi trước khi tới PowerShell | Dùng file `.ps1` hoặc lệnh không có `$_`/backtick |
| N4 | `deploy-root.ps1` in `ERROR Operation is not valid…` cho `/home`, `/kho-bau` (server trả 302 đúng) | `Invoke-WebRequest -MaximumRedirection 0 -ErrorAction Stop` PS 5.1 ném lỗi với 302 | `HttpWebRequest` `AllowAutoRedirect=false`, đọc `WebException.Response` cho 3xx/4xx; kiểm lại bằng `curl` HTTPS |
| N5 | Kiểm tra local: số bài Thông báo 8 thay vì 9, API 11 thay vì 13 | Bài thử `publishAt` 08:00 hôm nay, lúc chạy mới 03:30 → code ẩn đúng (hẹn giờ) | Ngày bài thử để quá khứ rõ ràng; bài "tương lai" dùng 2099 |
| N6 | Test 404 `/tin-tuc/%2e%2e` không tới handler | `new URL()` chuẩn hoá `%2e%2e` thành `..` → path `/` | Bỏ ca này khỏi test (hành vi chuẩn của URL) |
| N7 | Trang đọc bài tràn ngang 38px ở 400px (chữ bị cắt) | Dưới 940px lưới `grid-template-columns:1fr` → cột nở theo bảng `min-width:420px` dù bảng nằm trong khung `overflow-x:auto` | `minmax(0,1fr)` |
| N8 | `check-treasure-hidden` LIVE fail "missing `#hv2-news .hv2-row`" (bản nháp có bài thì đạt) | Assert con trỏ tay giả định khối tin luôn có dòng bài | Bỏ qua dòng bài khi có `.hv2-empty` ("Chưa có bài viết") |
| N9 | (reviewer) `Date.parse("<b>>1 Jan 2020")` hợp lệ → HTML lọt vào ngày hiển thị; `…Z` hiện lệch ngày | `Date.parse` dễ dãi; `dmy()` cắt chuỗi giả định `+07:00` | Store chỉ nhận `publishAt` `YYYY-MM-DDTHH:mm(:ss)+07:00`; `dmy()` chỉ in số |
| N10 | (reviewer) Ảnh bìa `/\evil.com/a.png` qua được `^\/(?!\/)` → trình duyệt tải `https://evil.com` | Trình duyệt coi `\` như `/` | `^\/(?![/\\])[^\s\\"'<>]*$` |
| N11 | (reviewer) `<h2>x<img src=x onerror=… </h2>` → thẻ `img` sống lại trong mục lục | Bỏ thẻ bằng regex không bắt thẻ chưa đóng | Sau khi bỏ thẻ, mã hoá `<` `>`; nhận cả `<h2 …>` có thuộc tính |
| N12 | (reviewer) Bản nháp cũ trùng slug che mất bài Đã đăng (404) | Trùng slug → giữ id nhỏ bất kể trạng thái | Ưu tiên bài Đã đăng, sau đó id nhỏ |
| N13 | (reviewer) API trang chủ treo → khối tin không bao giờ hiện | `fetch` không timeout, `ready` chờ mãi | `AbortController` 8s → hiện trạng thái trống |
| N14 | `.gitignore` `data/` khớp mọi thư mục tên `data` | Mẫu không neo gốc | `/data/` |

## 4. Bẫy môi trường (bổ sung cho journal chung mục 3)
- **Xoá thư mục có junction** (bản nháp trỏ `mirror` thật): kiểm `ReparsePoint` → `cmd /c rmdir <link>` TRƯỚC `Remove-Item -Recurse` (PS 5.1 có thể xoá luôn nội dung đích). Script: `tools\cleanup-news-p1.ps1`.
- **Hai phiên Claude cùng sửa VPS / HANDOFF**: kiểm `git log` + `status` đầu và ngay trước deploy; Edit HANDOFF báo "file đã đổi trên đĩa" → Grep lại mốc trước khi sửa, kiểm trùng số dòng bảng B.
- **Đừng chép `check-import.mjs` / `deploy-root.ps1` mới lên `C:\Temp` trước khi module mới có trên VPS** — phiên khác deploy bằng file đó sẽ bị chặn (import check đòi file chưa có).
- **Working directory của phiên bị `cd` trong Bash kéo lệch** (hook tính đường dẫn plans/reports sai theo cwd) → luôn dùng đường dẫn tuyệt đối `D:\workspace\3qdc\plans\…`.
- **`ck plan create` cắt dấu tiếng Việt trong tên file phase** (`phase-01-trang-tin-ng-i-ch-i.md`) → giữ nguyên (plan.md do CLI trỏ đúng tên); lần sau đặt tên phase không dấu.

## 5. Bài học
- **Làm trang thì dễ, nội dung mới khó**: nói thẳng từ đầu (không có bài Việt → trang rỗng) giúp user chuyển sang đúng nhu cầu thật (công cụ đăng bài), không phí công dựng trang đọc poster chữ Trung.
- **Tính năng LIVE mà chưa có dữ liệu → khi báo xong phải đưa link + nói trước user sẽ thấy gì** (trang trống, trang đọc bài 404). User đã phải hỏi "cho xin link đi".
- **User nói "triển khai" khi còn câu hỏi mở** → chọn mặc định an toàn nhất, ghi rõ trong câu trả lời + HANDOFF + plan để user đổi sau, không dừng lại hỏi.
- **Assert viết cho dữ liệu thử dễ sai trên LIVE rỗng (và ngược lại)** → mỗi script news có 2 chế độ và chạy cả hai trước khi commit.
- **"Kiểm tra đạt" chưa phải "an toàn"**: quy tắc escape phải có bài thử cố tình phá (tiêu đề chèn mã, ngày rác, đường dẫn `/\`).
- **Chia phase theo ranh giới bảo mật** (trang người chơi → đăng nhập/lọc HTML → tải file) để mỗi lần deploy chỉ mở thêm 1 bề mặt tấn công.

## 6. Còn nợ (phase 2)
- `news-store` nhớ kết quả đọc lỗi tới khi restart → cần `reload()` sau mỗi lần lưu + không giữ lần đọc hỏng.
- Câu hỏi mở: bài mẫu Nháp? menu trang tin thêm Tướng/Đặc sắc? chia sẻ Zalo? tên đăng nhập + tên hiển thị Quản lý?
- `sanitize-html` + `npm ci` trong deploy; link đặt mật khẩu một lần (không gửi mật khẩu qua chat).
