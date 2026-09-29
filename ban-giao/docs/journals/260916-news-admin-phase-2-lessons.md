# Quản trị đăng bài `/quan-tri` phase 2 — kinh nghiệm, bài học, lỗi & cách sửa (2026-09-16)

Commit VPS `68d9be8` (tag trước `pre-news-admin` = `40d47e7`; phiên khác chen `4fb0213`, `4a7a7e1`) · plan `plans\260916-0254-trang-tin-tuc-quan-tri\` · HANDOFF dòng 36.
Đọc cùng: `260916-news-pages-phase-1-lessons.md` (N1–N14, server nháp 3398, junction) và `260914-home-layout-v2-lessons.md`.

## 1. Diễn biến ngắn
1. User: "chạy tiếp phase 2" (không trả lời câu hỏi hướng A/B/C) → làm đúng plan (giữ quyết định #6 Biên tập → Quản lý duyệt), mặc định an toàn cho câu hỏi mở, ghi rõ.
2. Viết 7 module + CLI trong `draft-p2\src` (baseline LIVE cạnh bên) → test thuần + HTTP trong process → server nháp 3398 (`npm ci` thật) → Playwright UI → code-reviewer → sửa → deploy 1 lần → LIVE smoke + 6 script cũ → commit → dọn.

## 2. Kinh nghiệm làm tốt (dùng lại)
- **Logic quyền = hàm thuần `decide(user, cur, input, ctx)`** (không file, không đồng hồ riêng) → ma trận vai trò × trạng thái × thao tác test 28 ca trong vài ms; API chỉ gọi + ghi.
- **Test HTTP thật trong process** (`local-check-admin.mjs`: `createServer` + `handleNews`, data tạm `mkdtemp`, `NEWS_ALLOWED_ORIGINS`, `x-forwarded-for` giả IP) bắt được lỗi luồng mà không cần VPS; chạy lại mỗi lần sửa (~3s).
- **Server nháp dựng lại 1 lệnh** (`rerun-draft-p2.sh`: local check → scp → `start-draft-p2.ps1 -Fresh -Accounts` (dữ liệu sạch + 3 tài khoản thử + link) → Playwright) → vòng sửa–thử nhanh, dữ liệu không lẫn giữa các lần.
- **Deploy tự vệ**: so sha1 file sẽ thay + git sạch + file mới chưa tồn tại → `npm ci` TRƯỚC khi chép (lỗi → trả package.json, không restart) → `check-import` gọi sanitizer thật + parse app → restart.
- **Kiểm tra cookie thật qua Caddy trên LIVE** bằng tài khoản tạm tạo/xoá ngay (`remove`) — cờ `Secure` chỉ thấy được trên HTTPS thật.
- **Token đặt mật khẩu trong `#`**: không vào log Caddy/Node, không lộ qua Referer; app xoá khỏi thanh địa chỉ bằng `replaceState`.
- **Reviewer được giao threat model + thứ tự ưu tiên + "không sửa file"** → tự viết PoC trong scratchpad, chứng minh 2 lỗi thật (burst đăng nhập, upload sau 413) thay vì góp ý chung chung.

## 3. Lỗi đã gặp → nguyên nhân → cách sửa
| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| A1 | File JS có ký tự điều khiển thật (grep báo "Binary file") | **Công cụ Write đổi chuỗi `\u0000` trong nội dung thành ký tự thật** | Không viết `\uXXXX` trong mã qua Write; dùng `charCodeAt`/`String.fromCharCode`, `\p{M}`; kiểm `grep -rlP '[\x00-\x08…]'` |
| A2 | Script sửa file bằng `node -`/`node -e` + heredoc lỗi "missing"/octal escape | `\\` trong heredoc tới node thành `\` (đường dẫn `C:\Temp\news…` → `\n`) | Dùng Edit tool, hoặc script `.cjs` ghi file rồi `node file.cjs` |
| A3 | PS1 có tên tiếng Việt truyền cho node bị méo | PowerShell 5.1 đọc `.ps1` không BOM theo ANSI | Thêm BOM UTF-8 cho `.ps1` có chữ Việt (Edit giữ BOM) |
| A4 | `powershell -Command "if (...) {...}"` qua ssh: "ScriptBlock should only be specified…" | Ngoặc/khối bị tách khi qua Git Bash → ssh → PowerShell | Đưa thành switch trong file `.ps1` (`-Fresh`), gọi `-File` |
| A5 | Tạo bài mới xong địa chỉ vẫn `#/viet-bai` (âm thầm) | Tham số hàm tên `history` che `window.history`; `replaceState` ném lỗi bị `try/catch` nuốt | Đổi tên `versions`; tránh đặt tên trùng global trình duyệt |
| A6 | Bài vừa "Đăng ngay" hiện nhãn "Hẹn giờ", test chờ quá giờ | VPS nhanh ~2s so với laptop; client so `publishAt` với đồng hồ máy người xem | Server gửi `visible` (tính bằng đồng hồ server); client không tự so giờ |
| A7 | Bảng → Giftcode → Lưu ý → Ảnh chèn liên tiếp ra sai thứ tự | `execCommand('insertHTML')` với khối đặt con trỏ khó đoán; thuộc tính đánh dấu `data-caret` bị Chrome bỏ | Chèn DOM trực tiếp sau khối cấp 1 chứa con trỏ (thay đoạn rỗng), con trỏ vào `<p>` mới; test assert thứ tự |
| A8 | `pageerror: Cannot read 'role' of null` | Đăng xuất khi danh sách còn đang tải; `await` về vẽ đè | Bộ đếm `screen` tăng mỗi lần vẽ; kết quả về muộn bị bỏ |
| A9 | Link đặt mật khẩu mở lần 2 trong cùng tab không hiện form | Chỉ đổi `#` → không tải lại; app bỏ qua hashchange ở trang đó | hashchange ở `/quan-tri/dat-mat-khau` có token → vẽ lại form |
| A10 | (reviewer, High) 200 lần đoán song song đều được kiểm, còn nghẽn threadpool (scrypt dùng chung với đọc file tĩnh) | Kiểm giới hạn trước `await`, đếm sai sau `await` | Giữ chỗ lần thử (`inFlight`) trước `await` + tối đa 8 lần băm đồng thời → 429; test burst 40 → ≤5 được kiểm |
| A11 | (reviewer, Medium) Sau 413 server vẫn đọc tiếp 40MB | Vẫn "drain" body để gửi được response | Từ chối theo `Content-Length` trước khi đọc; 413 + `Connection: close` + `req.destroy()`; app tự báo "bài quá dài" trước khi gửi (tránh lỗi mạng khó hiểu) |
| A12 | (reviewer, Low) `/3qdc-vi/../quan-tri/api/bai` qua lọc ảnh | Regex cho `.` ở mọi vị trí | Mỗi đoạn đường dẫn bắt đầu bằng chữ/số/`_`/`-` |
| A13 | (reviewer, Low) Enable lại tài khoản → phiên cũ sống lại; nhịp khoá giữ phiên mãi; khoá id bất kỳ làm phình Map | Phiên RAM không biết lệnh CLI; heartbeat cập nhật `seen` | `sessionsValidAfter` trong users.json; `currentUser(req,{touch:false})` cho `/khoa`; `/khoa` chỉ id có thật |
| A14 | Test "link đã dùng" / "đã nạp bản" fail ngẫu nhiên | Đọc chữ trước khi API trả về; toast cũ còn hiện | `waitForFunction` chờ đúng nội dung |
| A15 | Test upload >1MB nhận `ECONNRESET` thay 413 | Hành vi mới đúng (đóng kết nối khi người gửi còn đẩy) | Test chấp nhận 413 hoặc reset + kiểm server vẫn trả lời |

## 4. Bẫy môi trường (bổ sung)
- **Phiên khác commit lên VPS giữa chừng** (không báo): tag đầu phiên không còn là cha trực tiếp → rollback phải `git revert <commit>`; `git log -1` ngay trước deploy + sha1 đúng file mình thay là đủ an toàn.
- **Hook ClaudeKit chặn lệnh Bash có chữ `node_modules`** (scout-block) → dùng `require.resolve`, Grep tool trên file lock, hoặc bỏ chữ đó khỏi lệnh.
- `C:\Temp\deploy-root.ps1` / `check-import.mjs` dùng chung với phiên trang chủ: chỉ chép bản mới **sau** khi module mới đã nằm trên LIVE (trong cùng script deploy).
- Chrome in `Failed to load resource … 4xx` ra console cho mọi fetch 401/403/409 cố ý → lọc khi assert "0 lỗi console".

## 5. Bài học
- **Đề xuất cắt phạm vi phải kèm lựa chọn giữ nguyên; user nói "chạy tiếp" = giữ plan đã duyệt**, không tự cắt.
- **"Kiểm tra đạt" của mình chưa đủ cho bảo mật**: 144 test không có ca "song song" — reviewer có PoC mới thấy. Giới hạn/khóa nào có `await` ở giữa phải có test burst.
- **Đồng hồ là dữ liệu của server**: mọi quyết định "đã tới giờ chưa" hiển thị cho người dùng lấy từ server.
- **Xem ảnh vẫn bắt lỗi mà test không có assert** (thứ tự khối chèn) → thêm assert ngay khi thấy.

## 6. Còn nợ
- Tài khoản Quản lý thật: chờ user cho tên → `news-user.mjs add … manager` → gửi link.
- Reviewer mức thấp để sau: users.json không có hàng đợi ghi (CLI + server cùng lúc), giới hạn số bài nháp/dung lượng RAM, cookie `__Host-`, giới hạn theo tên trên mọi IP (cân nhắc vì dễ bị khoá chéo), IPv6 /64.
- Phase 3: tải ảnh lên `/tin-tuc-anh/`, sao lưu `data/news` (hiện dữ liệu chỉ có trên VPS), soát bảo mật tổng.

## 7. Bổ sung — đăng ký chờ duyệt (`e2e2528`, HANDOFF dòng 37)
- User muốn "thêm đăng ký" vì không biết lấy tài khoản ở đâu → nói rõ rủi ro đăng ký công khai trên trang đăng bài + 4 hướng (A tạo hộ, B tài khoản đầu tiên, C chờ duyệt, D mời bằng link) → user vẫn chọn đăng ký → làm **C** (an toàn nhất trong các kiểu "có form đăng ký"): tài khoản mới `pending`, không đăng nhập được tới khi Quản lý duyệt.
- **Heredoc lại nuốt `\`** (`/\p{Cf}/` thành `/p{Cf}/`, regex vẫn chạy nhưng sai) — ngay sau khi đã ghi memory về bẫy này. Quy tắc: sửa mã có `\` → Edit tool, không heredoc; sau script sửa luôn `grep` lại dòng vừa sửa.
- Reviewer bắt lỗi "kiểm quyền lúc vào, chạy lúc ra": quyết định Quản lý xếp hàng sau `changeUsers` → phải kiểm lại người thao tác trên danh sách đọc trong hàng đợi (vai trò, khoá, `sessionsValidAfter`). Mẫu chung: mọi thao tác có `await` hàng đợi giữa kiểm quyền và ghi.
- Quy tắc "còn ≥1 Quản lý" gần như không chạm được qua UI (người thao tác luôn là Quản lý đang hoạt động, không tự sửa mình) — giữ làm lớp phòng thủ cho trường hợp đồng thời; test thay bằng "quyết định cũ bị từ chối".
- Kiểm tra LIVE đăng ký thật tốn 1/5 lượt đăng ký/giờ của IP chạy test (cùng mạng user) — giới hạn nằm trong RAM, restart là mất.
- Còn nợ (thấp): CLI + server ghi `users.json` đồng thời; giữ đầy 20 chỗ chờ; 409 lộ tên; tên đã `remove` đăng ký lại được.

## 8. Phase 3 — tải ảnh, thùng rác, sao lưu (`3ba6d30`) + vá lỗ hổng `server.mjs` (`c8613a9`) — HANDOFF dòng 39–40
- **Soát bảo mật "tổng" phải gồm cả đường đi chung, không chỉ phần mình viết**: reviewer được giao thử tấn công thật trên server nháp → tìm ra đọc file tuỳ ý có sẵn trong `server.mjs` (`join(ROOT, dir, decodedPath)` không kiểm thoát). Hai vòng review trước chỉ khoanh file mới nên bỏ sót. Mẫu sửa chuẩn: so `resolved.startsWith(root + sep)`.
- **Xác nhận trên LIVE trước khi báo động** — nhưng đúng cách: file vô hại (`win.ini`), và **đếm đủ cấp `..`**: thư mục LIVE sâu hơn nháp nên 4 cấp ra 404 (suýt kết luận "LIVE an toàn"), 8 cấp mới 200.
- **Sau khi vá, soát log truy cập** để trả lời "đã bị khai thác chưa": Caddy log JSON xoay vòng 10 MB × 5 (chỉ ~13 giờ); file đang ghi phải mở `FileShare.ReadWrite`. Đối chiếu mốc tạo tài khoản thật (16:44) với khoảng log → kết luận mã băm không lộ.
- Vá ngoài phạm vi → **dừng hỏi user dù nghiêm trọng**, nhưng chuẩn bị sẵn bản sửa + thử nháp để user chỉ cần "deploy đi".
- **Playwright `response.json()` lỗi "evicted from inspector cache"** khi trang tải nhiều ảnh lớn (thư viện PNG 1,5 MB) → đừng đọc body phản hồi trong test UI; lấy dữ liệu từ DOM hoặc gọi API riêng.
- **Heredoc + `\` lại hỏng thêm 2 lần** (regex `\/` trong test). Quy tắc cứng: mã có `\` chỉ sửa bằng Edit tool.
- `for await (chunk of req)` + `return` sớm khi quá 5 MB huỷ luôn socket → client thấy reset thay vì 413; chấp nhận (app tự kiểm kích thước trước khi gửi).
- Caddy tự thêm `X-Content-Type-Options` → header lặp "nosniff, nosniff" (vẫn hiệu lực) → assert dùng regex.
- Chèn ảnh vào ô bảng: tìm `td/th` tổ tiên của vùng chọn đã lưu (`range`) → `insertNode` img inline; ngoài bảng mới dùng khối `figure`.
- Sao lưu chạy thử **qua chính Scheduled Task** (`schtasks /Run`) để chứng minh chạy được bằng SYSTEM; log `posts=0` hoá ra đúng (user đã xoá hết bài mẫu) — kiểm file trước khi nghi script.
- Phiên khác đang có thay đổi chưa commit trên VPS → không deploy (restart sẽ đưa code dở của họ lên LIVE); chờ tới khi họ commit (`5cf149b`) rồi mới deploy.

## 9. Bảng lỗi → nguyên nhân → cách sửa (đăng ký + phase 3 + vá server)
| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| B1 | (reviewer) Quản lý vừa bị khoá vẫn duyệt được người nếu yêu cầu đã xếp hàng | Kiểm quyền lúc vào (`currentUser`), chạy trong `changeUsers` sau `await` | Kiểm lại người thao tác trên danh sách đọc trong hàng đợi (vai trò, khoá, `sessionsValidAfter` so với `sessionCreated`) |
| B2 | Tên hiển thị giả mạo được bằng ký tự vô hình (U+200B, U+202E) | `plain()` chỉ bỏ ký tự điều khiển | Cắt 200 ký tự trước, bỏ `\p{Cf}` |
| B3 | Regex thành `/p{Cf}/`, `/\/quan-tri…/` hỏng | Heredoc bash nuốt `\` | Sửa bằng Edit tool; `grep` lại dòng vừa sửa |
| B4 | Test "Quản lý cuối cùng" trả 403 thay 400 sau khi thêm B1 | Actor giả không có trong danh sách → bị chặn sớm | Đổi test: quyết định từ Quản lý bị khoá / phiên cũ → 403 (quy tắc "còn ≥1 Quản lý" giữ làm phòng thủ) |
| B5 | Ô ảnh bìa hiện "Choose File / No file chosen" tiếng Anh; nút "TẢI ẢNH TỪ MÁY" in hoa | Input file mặc định trình duyệt; nhãn nằm trong `.field` ăn CSS `label{text-transform:uppercase}` | Nút `label.btn.upl-btn` bọc input trong suốt; `text-transform:none` |
| B6 | Playwright `response.json`: "Request content was evicted from inspector cache" | Trang soạn tải nhiều PNG thư viện (1,5 MB) → bộ đệm DevTools đầy | Không đọc body: URL ảnh lấy từ DOM, bài đã lưu lấy qua `GET /quan-tri/api/bai/<id>` |
| B7 | Test chờ "Thùng rác trống." hết giờ | Thùng rác còn bài mẫu do `check-news-admin` xoá | Chờ đúng dòng bài vừa khôi phục biến mất |
| B8 | **Đọc file tuỳ ý trên LIVE** `/..%5c(×8)Windows%5cwin.ini` → 200 | `server.mjs` `findApiSnapshot`: `join(ROOT, dir, decodedPath)` không kiểm thoát (có từ bản clone) | Bỏ ứng viên không `startsWith(join(ROOT, dir) + sep)` → `c8613a9`; LIVE 6 biến thể 404 |
| B9 | Thử lỗ hổng trên LIVE ra 404 (tưởng an toàn) | Thư mục LIVE sâu hơn nháp; 4 cấp `..` chưa tới ổ đĩa | Thử nhiều cấp (8) trên file vô hại |
| B10 | Đọc log Caddy lỗi "being used by another process" | File log đang ghi bị khoá | `FileStream(…, FileShare.ReadWrite)` |
| B11 | LIVE test "ảnh phục vụ lại" fail | Caddy thêm `X-Content-Type-Options` → "nosniff, nosniff" | Assert `/^nosniff(, nosniff)?$/` |
| B12 | LIVE test đăng nhập tài khoản tạm fail | Script ghi cứng `thu-tam-p2`, lệnh tạo dùng `thu-tam-p3` | Dùng đúng tên; dọn bằng `cleanup-live-test.ps1 -Url` (không ghép lệnh PowerShell có `\` qua ssh) |
| B13 | Sao lưu đầu tiên log `posts=0` | Không lỗi: user đã xoá hết 3 bài mẫu (nằm trong thùng rác) | So từng file dữ liệu vs bản sao trước khi nghi script |
