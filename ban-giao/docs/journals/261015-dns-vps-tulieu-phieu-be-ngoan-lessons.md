# Journal 29/09 → 15/10/2026 (bổ sung 15/10 ~01:00: deploy Phiếu Bé Ngoan, lỗi #21–26) — DNS sập, VPS .40 mất kết nối, tư liệu Hán→Việt, Phiếu Bé Ngoan

Phiên dài nhiều việc nhỏ + 1 việc lớn (Phiếu Bé Ngoan). Đọc mục 3 (quy trình) trước khi làm web mini kiểu này lần sau.

## 1. Việc đã làm
| Việc | Kết quả |
|---|---|
| "Web chết queo" 29/09 | Không phải VPS: **DNS Mắt Bão** (ns1/ns2.matbao.com) không trả lời cho `wanmeivn.com` từ ~14:10. VPS, Caddy, Node vẫn 200 khi gọi thẳng IP. |
| "Dự án có làm tràn RAM sập DNS không" | Không thể: DNS nằm ở Mắt Bão (4 IP khác), VPS còn 7,9 GB RAM trống, node 3qdc 71 MB, 0 sự kiện hết RAM. Phát hiện ~8 tiến trình `claude` cũ trên VPS (~3,5–4 GB) — chưa dọn, chờ user. |
| Tư liệu sưu tầm: đổi tên Hán→Việt | `01-tuong` 52 thư mục (tên lấy từ `hero-roster-data.mjs` = đúng tên trên web), `02-hinh-nen` 112 ảnh, `03-sticker` 21, `05-video/dong-nhan` 2, `06-cong-dong/tranh-dong-nhan` 19. Mỗi thư mục có file `doi-ten-*.tsv` (Hán cũ ↔ Việt mới). |
| Ảnh 4 trang web mình làm (không khung UI) | `D:\Doc\Tư liệu sưu tầm\09-anh-web-3qdc\` 135 ảnh (trang chủ + 52 tướng, tin tức, đăng ký sớm, 3qdaichien) + `nguon-anh.tsv`. User lỡ xoá → tạo lại từ bản tải VPS trong máy. |
| Skill UI/UX | User đổi ý giữa chừng; liệt kê skill trong `D:\skill` (impeccable, taste-skill, responsive-toolkit) — chưa cài gì. |
| VPS không vào được 12/10 | Tailscale VPS kẹt `NoState` từ lần khởi động lại 05/10 → `tailscale set --unattended=true`. Đẩy 3 commit `/privacy` (phiên khác làm 05/10) lên GitHub (`af2c21c..48a0ea1`). |
| VPS .40 sập hẳn 14/10 ~19:50 | Mọi cổng + ARP từ .23 đều chết ⇒ máy/ảo hoá, không phải web. Chạy lại 22:24 (user xử lý). Chưa đọc event log tìm nguyên nhân. |
| Snipping Tool không lưu ảnh vào ổ C | Windows Defender **Controlled folder access** chặn `SnippingTool.exe` + `PickerHost.exe` → thêm 2 app vào danh sách cho phép (UAC). |
| **Phiếu Bé Ngoan** | Brainstorm → bản mẫu Artifact v1–v3 → plan 5 phase → phase 1–4 xong trên nháp VPS 13398, chờ user duyệt + DNS + Google Client ID. Bàn giao: `plans\261014-2335-phieu-be-ngoan\HANDOFF-phieu-be-ngoan.md`. |

## 2. Lỗi thật → nguyên nhân → cách sửa
| # | Lỗi | Nguyên nhân | Cách sửa / phòng |
|---|---|---|---|
| 1 | Trình duyệt `ERR_NAME_NOT_RESOLVED`, tưởng web sập | DNS nhà cung cấp tên miền chết | Chẩn đoán 3 bước: `curl --resolve host:443:IP` (web còn sống?) → `dns.google/resolve` + `cloudflare-dns.com` (DNS công khai thấy gì? `EDE 22 No Reachable Authority`) → hỏi thẳng máy NS từ VPS (`Resolve-DnsName -Server`) so với 8.8.8.8. Mạng nội bộ laptop chặn UDP 53 ra ngoài ⇒ dùng DoH. |
| 2 | `ssh company-vps` timeout 6 ngày | Tailscale Windows chạy chế độ người dùng: chỉ chạy khi có phiên đăng nhập; reboot mất phiên RDP ⇒ `NoState` (log: "client disconnected … disconnecting Tailscale") | `tailscale set --unattended=true` (prefs `ForceDaemon: True`). Đường dự phòng: `ssh -i ~/.ssh/id_ed25519_vps Administrator@160.191.3.40`. Nếu khoá cổng 22/3389 ra Internet, **phải giữ 1 đường vào dự phòng**. |
| 3 | Tưởng "đã push hết" nhưng GitHub thiếu 3 commit | Phiên khác commit trên VPS, không ai đẩy | Sau mỗi lần làm việc với VPS: `git log af2c21c..HEAD` so với `gh api …/commits/main`. Đẩy bằng bundle (VPS không có remote). |
| 4 | Ghi nhầm vào `TulieuSuuTam` đã đổi tên | `sed` thay đường dẫn có `\\` không khớp ⇒ script chạy với DST cũ, tạo lại thư mục user đã xoá | In `DST` ra trước khi chạy; script dừng nếu thư mục đích tồn tại; xem `ls` thư mục cha trước khi ghi (user hay đổi tên/xoá tay). |
| 5 | Crawl Playwright thiếu ảnh (tướng, hình 4/5) | Lazy-load chỉ tải khi cuộn | Lấy thẳng thư mục ảnh trên VPS (`overrides\…`, `data\news\uploads`), phân loại bằng mắt qua contact sheet. |
| 6 | `/quan-tri` nháp + trang phiếu cùng cổng | Trang phiếu bắt mọi địa chỉ trên Host của nó | Nháp dùng 2 Host cho 1 cổng: `127.0.0.1:13398` = trang phiếu (`PHIEU_EXTRA_HOSTS`), `localhost:13398` = 3qdc + `/quan-tri`; đường hầm `-L localhost:13398:127.0.0.1:13398`. |
| 7 | Nháp cần ảnh mới trong `overrides\` nhưng `overrides` nháp là junction tới LIVE | Ghi vào junction = ghi LIVE | `overrides` nháp là thư mục THẬT chứa junction từng thư mục con LIVE + thư mục mới riêng; `-Stop` gỡ từng junction bằng `cmd /c rmdir`, kiểm không còn ReparsePoint trước `Remove-Item`. |
| 8 | Edit tool đổi 2 dòng `/hoi-dap/` (của phiên khác) trong `server.mjs` | File LIVE lẫn LF (2 dòng mới) + CRLF; Edit chuẩn hoá xuống dòng | Chèn dòng của mình bằng Python thao tác byte, giữ kiểu xuống dòng của dòng lân cận; kiểm `diff` chỉ còn dòng `+` của mình. |
| 9 | `sed -i` (Git Bash) đổi cả `admin-api.mjs` sang LF; `grep -c $'\r$'` báo sai là vẫn CRLF | sed Git Bash ghi lại LF; grep Git Bash nuốt `\r` | Đếm bằng Python (`b.count(b'\r\n')`); so `diff` có/không `--strip-trailing-cr` — hai số phải bằng nhau. Sửa xong chuyển lại CRLF. |
| 10 | Bài kiểm trượt 2 lần nhưng code đúng | Kỳ vọng đếm sai (phiếu 23:59 cùng ngày; dữ liệu lần chạy trước còn trong bản sao) | Khi bài kiểm trượt: kiểm giả định của bài kiểm trước khi sửa code; dữ liệu nháp reset bằng `-Stop` rồi chạy lại. |
| 11 | Đăng nhập thử bị chặn giữa chừng | Giới hạn 20 lần/10 phút/IP; mọi kiểm qua 1 IP đường hầm | Lộ rủi ro thật (4G CGNAT chung IP) ⇒ nâng 120/10 phút. Restart nháp xoá bộ đếm. |
| 12 | Nút "Gửi phiếu" có khung đen (bản mẫu cũng vậy) | `mix-blend-mode: screen` trong phần tử có `isolation: isolate` chỉ hoà với nền trong suốt của nút | Xử lý ảnh: "unscreen" (alpha = độ sáng, chia màu lại) ra WebP trong suốt; bỏ blend. |
| 13 | Bản mẫu xem cục bộ hiện cả màn đăng nhập ở tab Quản trị | Trang xem cục bộ thiếu `[hidden]{display:none!important}` của skeleton Artifact (lặp lại bài học 24/09) | Luôn tự khai báo `[hidden]` trong CSS trang. |
| 14 | Lỗi bắt buộc vẫn hiện sau khi gõ | Chỉ xoá lỗi khi gửi lại | Xoá lỗi + class `.err` ngay trên `input` như Google Form. |
| 15 | Review: phiếu ở lại bộ nhớ khi ghi file lỗi | Đẩy vào mảng trước `writeJsonAtomic` | Lỗi ghi ⇒ `loading = null` (đọc lại file lần sau) rồi throw. |
| 16 | Review: `'constructor' in STATES` = true | `in` tính cả khoá kế thừa | `Object.hasOwn(STATES, x)`. |
| 17 | Đăng nhập thử có thể lọt lên LIVE nếu lỡ đặt biến | Chỉ 1 công tắc | `DEV_LOGIN` cần thêm `NEWS_INSECURE_COOKIE=1` (LIVE HTTPS không bao giờ có). |
| 18 | Lệnh PowerShell qua ssh mất `"…"` / `$` | Quoting Git Bash ↔ PowerShell | Luôn viết `.ps1` → scp → `powershell -File` (tiếng Việt ⇒ thêm BOM). |
| 19 | Controlled folder access chặn chụp màn hình | Defender bảo vệ thư mục C | `Add-MpPreference -ControlledFolderAccessAllowedApplications` qua `Start-Process -Verb RunAs` (UAC), ghi kết quả ra file để đọc lại; cập nhật Store đổi đường dẫn ⇒ thêm lại. |
| 20 | Đường dẫn trong HANDOFF hỏng thành `plans±014…` | Chuỗi Python thường: `±` là mã bát phân ⇒ ký tự `±` | Viết đường dẫn Windows trong Python bằng chuỗi raw `r'…'` hoặc dùng `/`; đọc lại dòng vừa sửa sau mỗi lần ghi HANDOFF. |
| 21 | Quét log `/quan-tri` báo "không có ai" nhưng thật ra bỏ sót file đang ghi | File log Caddy đang ghi không cập nhật `LastWriteTime` trên Windows (vẫn ghi 16:41 dù đã 00:40) + bị Caddy khoá (`ReadAllLines` lỗi) | Luôn đọc `3qdc-wanmeivn-access.log` bằng `FileStream(... FileShare.ReadWrite)` + file `.gz` mới nhất theo **tên**; không lọc theo ngày sửa. |
| 22 | Script commit một phần `server.mjs` dừng ở "anchor not unique" | Repo VPS `core.autocrlf=true`: index lưu LF, thư mục làm việc CRLF; mốc tìm có `\r\n` | Dựng nội dung index bằng LF (`git ls-files --eol` để xem `i/lf w/crlf`); script dừng trước khi stage nên không hỏng gì. |
| 23 | Lại hỏng đường dẫn trong HANDOFF (`plans±014…`, `_backup\x03qdc`) | Lặp lỗi #20: chuỗi Python thường với `\261`, `\3` | Python sửa tài liệu: **luôn** `r'…'` hoặc viết script ra file rồi kiểm ký tự điều khiển + `±` lạ ngay sau khi ghi. |
| 24 | Bộ phân loại chặn 2 bước: "Confirm" đưa app Google lên In production, và chạy script nối khối Caddy | Đổi cấu hình tài khoản / cấu hình máy chủ dùng chung | Làm hết phần còn lại, dừng, đưa user lệnh `! …` để tự chạy (user chạy ngay, ổn). Script phải tự backup + validate + tự trả lại khi lỗi để user chạy yên tâm. |
| 25 | `curl -H "Host: …"` qua `ssh "…"` trả 400 missing Host | Quoting Git Bash → PowerShell nuốt dấu `"` | Như #18: đưa lệnh vào `.ps1`; trong PS 5.1 dùng `curl.exe -H` (Invoke-WebRequest không cho đặt Host). |
| 26 | Google Cloud: nút "Publish app" bị khoá | Trang Branding thiếu trang chủ + chính sách bảo mật | Điền home = tên miền phiếu, privacy = `https://3qdc.wanmeivn.com/privacy`, domain `wanmeivn.com`; **không** tải logo (có logo ⇒ phải xin Google duyệt). Ô checkbox điều khoản không bấm được bằng toạ độ ⇒ `input.click()` qua JS (tìm trong shadow DOM). |
| 27 | Script deploy vẫn chạy dù 4 lệnh `scp` báo lỗi (tạo tag + backup rồi mới dừng ở bước chép) | Tạo thư mục đích bằng `ssh \"powershell -Command \\\"New-Item ...\\\"\"` hỏng dấu nháy; lệnh nối bằng `;` nên bước sau vẫn chạy | Tạo thư mục bằng `.ps1`; chạy với `set -e`; **so SHA1 file đã tải lên trước khi gọi deploy**; deploy script có `ErrorActionPreference=Stop` nên dừng trước khi chép/restart — kiểm lại SHA1 LIVE + giờ khởi động service, xoá tag/backup dở rồi chạy lại. |
| 28 | Xem trước bản sửa trang phiếu mà không dựng nháp 13398 | Trang chỉ là 1 file HTML server đọc lúc khởi động | Playwright `page.route(BASE)` trả file HTML trên laptop + giả lập `/api/phieu/toi`, `/api/phieu/gui` trong trình duyệt → kiểm cả lượt gửi mà không tạo phiếu thật; nháp VPS chỉ cần khi đổi code server. |

## 3. Quy trình làm web mini mới (đã chạy tốt với Phiếu Bé Ngoan)
1. **Hiểu yêu cầu + scout thật**: đọc tin nhắn khách; tìm trong hệ thống cái liên quan (vd. tài khoản game 3Q ở `auth.3qdc…:8443` trên .11/.41, Caddy .23 chỉ là cổng). Hỏi lại khi yêu cầu mâu thuẫn ("log gmail" vs tài khoản game).
2. **Bản mẫu Artifact trước**: 1 link, sửa đăng lại cùng link; ảnh nhúng data URI (nén WebP); thanh "BẢN MẪU vN"; tab chuyển Người chơi/Quản trị; kiểm 1920×889 + 393 rồi đăng. Mở cho user bằng claude-in-chrome (`select_browser 5aa70949…`).
3. **Tham khảo 21st.dev**: trang preview nhúng iframe `cdn.21st.dev/<tác giả>/<tên>/default/bundle…html` → chụp thẳng URL đó (máy tính + điện thoại). Lấy ý bố cục, không kéo React/shadcn vào dự án HTML thuần.
4. **Dùng chung hạ tầng**: tính năng nhỏ ⇒ module mới trong `3qdc-unified` theo khuôn `scripts/lib/signup/` + định tuyến theo Host (như `3qdaichien`) + mục mới trong `/quan-tri` (chỉ Quản lý).
5. **Brainstorm report → `ck plan create` → đọc hết stub → viết phase**.
6. **Soạn trong `plans/<plan>/nhap/src/`** (đường dẫn y repo), tải bản LIVE làm `baseline/` + `SHA1.txt`.
7. **Kiểm 3 lớp**: test Node thuần cho logic (thư mục tạm có tên kiểm tra) → test API qua `http.request` với Host khác nhau → Playwright (1 trình duyệt, máy tính/Pixel 5/giảm chuyển động/quản trị, đếm lỗi console, tràn ngang, ảnh tải/không tải).
8. **Tài khoản quản trị tạm chỉ trong bản sao dữ liệu** (`draft-user.ps1` kiểm đường dẫn chứa `phieu-draft-data`), xoá ngay sau kiểm.
9. **code-reviewer agent** trước khi đưa user; sửa must-fix; chạy lại toàn bộ.
10. **So SHA1 LIVE = baseline** (chứng minh chưa đụng LIVE) → báo user link đường hầm → DỪNG chờ duyệt → "deploy đi" mới làm phase deploy.
11. **Ngữ cảnh ~90%** ⇒ viết HANDOFF ngay (file riêng trong plan + 1 dòng trỏ ở đầu `HANDOFF.md`) trước khi làm tiếp.

## 4. Còn treo
- ~~Phiếu Bé Ngoan~~ ✅ LIVE 15/10 (`f8fe81f`); chỉ chờ user tự gửi thử 1 phiếu thật.
- Nguyên nhân VPS .40 sập 14/10 (đọc event log 41/6008/1074/1001/WHEA quanh 19:50).
- ~8 tiến trình `claude` cũ trên VPS; cổng 22/3389/5985 mở ra Internet.
- `D:\Doc\Tư liệu sưu tầm` thiếu `08-anh-khac`, `Planing` (còn trong Thùng rác như 01/10).
