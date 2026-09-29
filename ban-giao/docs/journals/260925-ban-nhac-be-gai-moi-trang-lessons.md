# Bàn nhạc + bé gái ra mọi trang, nút "Nhận", các lần lùi bản — bài học 24/09 tối → 25/09 trưa

Phiên dài, nhiều lần đổi ý. Tình trạng cuối: **LIVE `56b58f3`** (bàn nhạc + bé gái ở trang chủ, `/tin-tuc`, bài viết,
`/dang-ky-som`; một bàn nhạc mỗi trình duyệt). Chi tiết từng việc: HANDOFF mục 4.11 (đăng ký sớm), dòng 75–79c (bàn nhạc,
bé gái, các lần lùi). Nhánh lưu `luu-ban-nhac-250925` (`cee41a7` = sửa "chạm điện thoại phát nhạc", chưa deploy).

## 1. Việc đã làm (theo thứ tự LIVE)

| Commit | Việc | Ghi chú |
|---|---|---|
| `94a4510` → `e30a713` | 8 nút "Nhận" `/dang-ky-som` = ảnh user, cỡ đo từ quannhica (141/119 @1920, `vw`) | user sửa ảnh từ nút xiyu (`3qdc-home-assets\xiyu-*`) |
| `36bafef` | thẻ "Mời 1" thẳng hàng (tiêu đề chừa 2 dòng) | |
| `2883ead` | nút Nhận bấm được, không làm gì (user chọn "không phản hồi") | |
| `23ad96b` | thanh đầu `/dang-ky-som`: chữ về giữa, nền mờ nhoè, giãn logo | khách góp ý |
| `408094f` | bàn nhạc: bỏ tên bài/ca sĩ/album, đĩa 124px bên trái (mẫu B) | + đổi tên 4 file nhạc "Nhạc nền 1…4 - 3Q Đại Chiến" |
| `7a4eddf` | bàn nhạc ở trang tin + đăng ký sớm (không wiki), phát tiếp đúng giây | sửa 2 lỗi cũ (mục 2 #1, #2) |
| `efb6604` | bé gái ở trang tin + đăng ký sớm; `page-host.mjs` dùng chung | |
| `426a4fb` | bé gái giới thiệu từng khu trang phụ (máy tính) | |
| `bff6b98` | một bàn nhạc mỗi trình duyệt (chép y lyzwlkj/myhkw) | |
| `0b60b9b` → `bad9484` → `a0e3f47` → `56b58f3` | lùi bff6b98 → thử cả web về 23/09 → lấy lại → thêm lại bff6b98 | xem mục 3 |

## 2. Lỗi thật đã gặp → cách sửa

| # | Lỗi | Nguyên nhân | Cách sửa / phòng |
|---|---|---|---|
| 1 | Bàn nhạc **chưa bao giờ phát tiếp đúng giây** (mở lại luôn từ đầu bài) | `fill()` gọi `select()` (đặt `K.t=0`) rồi mới đọc `K.t` | Đọc `K.t` trước `select()`; biến `resumeAt` để `saveTime()` không ghi 0 khi bài chưa tải |
| 2 | Máy chặn tự phát: bấm ▶ lần đầu thì **bật rồi tắt ngay**, còn ghi "đã dừng" | cú `pointerdown` đầu vừa `go()` (play) vừa để `click` gọi `toggle()` (pause) | `once(e)` bỏ qua nếu `status.contains(e.target)` |
| 3 | Điện thoại: **chạm 1 cái không phát nhạc** (chỉ ở nhánh lưu, LIVE vẫn còn) | `touchstart`/`pointerdown` của ngón tay KHÔNG phải "user activation" — chỉ `pointerup`/`touchend`/`click`; code thử ở cú chạm xuống, bị từ chối, gỡ lắng nghe | Lắng nghe `pointerdown pointerup touchend click keydown`, chỉ gỡ khi `play()` resolve (`cee41a7`) |
| 4 | Máy user bấm đâu nhạc cũng không tự phát | `hv2-music-stopped=1` nhớ **vĩnh viễn** từ lần bấm ⏸ khi thử | Tạm: bấm ▶ 1 lần. Đề xuất (chưa chốt): nhớ theo lượt xem (`sessionStorage`) |
| 5 | Thẻ "Mời 1 Chúa Công" nhích lên | tiêu đề 1 dòng, 3 thẻ kia 2 dòng | `.inv-tiers .card h3{min-height:2.2em;display:grid;place-items:center}` + `.claim{margin:auto auto 0}` |
| 6 | Chữ menu `/dang-ky-som` lòi đáy thanh | huy hiệu 108px cao hơn thanh 64px, grid `align-items:center` căn chữ theo huy hiệu | `.hd nav{align-self:start;height:64px}` (≤860px trả về `center/auto`) |
| 7 | Bé gái trên `/dang-ky-som` nói câu "thẻ bài" khi rê nút Nhận | `.card` trùng tên giữa trang tin và thẻ mốc | Mọi selector câu thoại trang phụ có tiền tố `html.hv2-m-page`, câu trang tin thêm `.has-site-h` |
| 8 | Bàn nhạc/bé gái không chạy ngoài trang chủ | phụ thuộc `window.__hv2`, CSS `html.hv2`, observer "rời trang chủ thì dừng" | `page-host.mjs`: `pageHostJs(cls)` dựng host thay thế + `alsoOnPages(css, cls)`; cờ `PAGE` trong observer |
| 9 | Trang chủ sau `git revert`: `/tin-tuc`, `/dang-ky-som`, `/quan-tri` to thêm vài trăm byte | git VPS `core.autocrlf=true` → file CRLF; trang `readFileSync` giữ `\r` | Vô hại. Template literal JS tự chuẩn hoá nên trang chủ không đổi |
| 10 | Báo nhầm "IP lạ bị đăng xuất" | IP laptop đổi (118.69.102.12 → 27.64.141.193); bộ kiểm `cont.cjs` mở `/quan-tri` cuối mỗi lượt | So với `curl https://api.ipify.org` trước khi kết luận; kiểm log **một bước riêng**, đọc xong mới restart |

## 3. Lùi bản an toàn (dùng lại)

- **Lưu việc dở không đụng thư mục live:** `git worktree add -b <nhánh> C:\Temp\wt <commit>` → chép file → commit → `git worktree remove`.
- **Lùi 1 tính năng:** `git revert <commit>` (không `reset`), đặt thẻ `pre-…` trước.
- **Lùi cả web về 1 mốc:** `git revert --no-commit <mốc>..HEAD` + 1 commit; kiểm `git diff --quiet <mốc> HEAD`.
  Lấy lại: `git revert <commit lùi>`. Thêm lại 1 commit đã lùi: `git cherry-pick <commit gốc>`.
- `deploy-dang-ky-som.ps1` import module signup → khi mốc chưa có signup phải restart bằng script riêng (import `server.mjs`
  → `nssm restart` → gọi đường). Chỉ restart (không chép file): tạo `C:\Temp\dang-ky-som-upload` rỗng rồi chạy deploy.
- "Bản mới nhất" / "bản trước đó nữa" / "bản ngày 20" mơ hồ → **liệt kê commit + mỗi mốc mất gì** (ví dụ lùi về 20/09 mất nguyên
  `/dang-ky-som`) rồi hỏi 1 câu. `data/` bị git bỏ qua ⇒ lùi code không mất danh sách đăng ký, nhạc user tải lên cũng không.

## 4. Bẫy công cụ

- **Heredoc bash mất `\`** (lần này: `\\3` thành ký tự `\x03` trong HANDOFF, regex `'\\'` trong script giải nén) → viết script
  bằng Write tool; chèn văn bản vào HANDOFF bằng file + `node` splice.
- **Git Bash đổi biến môi trường bắt đầu bằng `/`** (`PATHS=/tin-tuc` → `D:/New folder/git/Git/tin-tuc`) → `MSYS_NO_PATHCONV=1`.
- `sed` với đường dẫn chứa `/` → dùng dấu `|`: `sed -i "s|a|b|"`.
- PowerShell 5.1: lỗi cú pháp ⇒ **cả file không chạy** (an toàn, nhưng kiểm lại HEAD); `Tee-Object` không có `-Encoding` → `Out-File`;
  `[IO.File]::ReadAllBytes` dùng thư mục của process, không theo `Set-Location` → dùng đường dẫn tuyệt đối.
- Playwright: `/dang-ky-som` có `scroll-behavior:smooth` → đặt `auto` trước `scrollIntoView` rồi mới hover (không thì chuột rơi khu khác);
  cuộn phần tử sát đầu thì huy hiệu logo treo đè lên → cuộn `block:'center'`; wiki `/huong-dan` không bao giờ `networkidle` → `load`;
  phần tử `position:fixed` có `offsetParent=null` → dùng `checkVisibility()`; `head -1` sau lệnh node gây `EPIPE` (vô hại).
- `--autoplay-policy=document-user-activation-required` mô phỏng Chrome thật; mặc định Playwright cho tự phát.
- Chữ trong ảnh (quannhica "Nhận") không có trong DOM → tìm phần tử có `background-image` + kích thước.
- Code nén `eval(function(p,a,c,k,e,r)…)`: chạy `new Function('eval', khối)(s => out.push(s))`; bảng chuỗi `_$_xxxx=[…]` tách bằng đếm
  ngoặc có tính dấu nháy (regex non-greedy vỡ vì chuỗi chứa `]`/`;`).

## 5. Bài học về làm việc với user

- "Giống trang X" = **đo X** (nút Nhận quannhica rộng theo `vw`, không phải px cố định) rồi khớp số.
- Có góp ý hình ảnh → **dựng mẫu 2–3 cách trên LIVE bằng `addStyleTag`** (không deploy), chụp, để user chọn; user chọn nhanh hơn đọc mô tả.
- Tính năng trình duyệt chặn (tự phát nhạc, cuộn/rê không tính tương tác) → nói thẳng + chứng minh bằng bảng thử; tìm hiểu trang mẫu làm
  gì thật (lyzwlkj: không có mẹo, chỉ WeChat) trước khi hứa.
- User đổi ý liên tục (A → huỷ → lùi → lấy lại) → mỗi bước commit/tag riêng, HANDOFF ghi LIVE đang là commit nào ở dòng đầu.
- Hỏi đúng 1 quyết định mỗi lần, dạng danh sách số trong câu trả lời (user không thích hộp thoại hỏi).
