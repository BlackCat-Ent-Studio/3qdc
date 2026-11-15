# Journal 10/11 tối → 11/11 trưa: Hoàn Mỹ Thế Giới lên LIVE + bảng sự kiện, nút tải + MXH trang chủ 3Q

Journal trước: `261110-tkkt-tin-tuc-min-anh-bia-lessons.md`. Handoff: `HANDOFF.md` (đầu file) + `plans/261109-tghm-web/HANDOFF-tghm.md` (mục 3, 3b, 3c, 3d, 3e).

## 0. Tình trạng cuối (11/11 13:35)

| Phần | Trạng thái |
|---|---|
| Server 3Q `/srv/3qdc-unified` | `9ddbef3` = GitHub main (restart cuối 13:15:37). Tag lùi: `pre-su-kien`, `pre-mxh-link`, `pre-nut-tai`, `pre-hmtg` |
| `hoanmythegioi.wanmeivn.com` | LIVE (DNS Mắt Bão → .40, `/srv/hmtg/site`, khối Caddy riêng, noindex). Logo mới, bảng sự kiện (đang trống) |
| `/quan-tri` | Game `hoanmythegioi` có phần Tin tức chỉ mục Sự kiện + ô ngày/loại/giờ |
| Trang chủ 3Q | Nút Chơi Nhanh, App Store/Google Play xám, cửa sổ APK 3 link; Zalo/Facebook/Discord có link |
| Ảnh cạnh BXH HMTG | Cung thủ Vũ tộc — LIVE 13:58 |
| **Còn treo** | Discord `PRRrJhWBj` hết hạn **14/11 16:40**; điện thoại: mèo linh vật che icon Zalo/Facebook ở cuối trang 3Q |

## 1. Việc đã làm (theo thứ tự)

| Giờ | Yêu cầu | Kết quả |
|---|---|---|
| 10/11 19:10 | Icon trang TKKT ra Desktop | `icon-game.svg` + `icon-game-64.png` |
| 21:55 | Logo TGHM → "Hoàn Mỹ Thế Giới" bằng Grok CLI | 3 mẫu SVG bị chê xấu → user vẽ huy hiệu trên grok.com (nền trong suốt) → mình làm sạch viền + ghép chữ Playfair Display SC 2 dòng → LIVE trang B, Desktop |
| 23:10 | Đổi tiêu đề/meta sang tên mới; logo to ×1,3 | `clamp(190px,34vh,330px)` |
| 23:25 | Thêm vào quản trị + deploy live | `games.mjs` game `hoanmythegioi`; trang tĩnh `/srv/hmtg/site`; chờ DNS (Mắt Bão, không phải dnspro) → Caddy → LIVE 23:28 |
| 23:40 | 3Q: Đăng ký nhanh → Chơi nhanh, xám App Store/GP, APK mở 3 link | Nháp worktree → kiểm 3 cỡ → "deploy đi" → `0ab2dba` |
| 00:00 | Link Zalo/Facebook/Discord | Discord lần 1 hết hạn, lần 2 thiếu 1 ký tự, lần 3 dùng được (hết hạn 14/11) → `fd6a369` |
| 12:08 | Bảng sự kiện đăng từ quản trị, xem ngay trên trang chủ | Mẫu nhầm cho 3Q → làm lại cho HMTG → chọn B → nháp → "deploy đi" → `9dcf8cc` + `9ddbef3` |
| 13:20 | Khách chê ảnh cạnh BXH | 6 ảnh wiki PWI so trên trang thật → chọn Cung thủ Vũ tộc → chờ deploy |

## 2. Lỗi thật → nguyên nhân → cách sửa

| # | Lỗi | Nguyên nhân | Sửa / phòng |
|---|---|---|---|
| 1 | Grok CLI không trả chữ, tự ghi file `%TEMP%\hmtg-logos.html`, hết `--max-turns 3` | Bản grok 1.0.77: `--tools ""` không còn tắt công cụ | Lấy kết quả từ file Grok ghi / `tool_call.rawInput.content` trong jsonl |
| 2 | Logo SVG của Grok CLI xấu | Model chữ vẽ SVG không ra chất "game" | Logo đẹp = user vẽ trên grok.com (ảnh), mình chỉ làm sạch + ghép chữ bằng font thật (dấu tiếng Việt luôn đúng) |
| 3 | Viền hồng quanh huy hiệu Grok | Nền tách từ magenta, alpha 0/255 | Đổi điểm hồng sang xám cùng độ sáng + làm mềm alpha 0,6px (`grok-logo/lam_sach_emblem.py`) |
| 4 | Xoá vùng chữ để vẽ lại nút "Chơi Nhanh" lộ khung chữ nhật | Lấy màu nền từ 1 cột, nền có chuyển sắc ngang | Nội suy từng hàng giữa 2 cột nền sạch hai bên |
| 5 | Commit nút tải đổi CẢ file `layout-v2.mjs` sang CRLF | Python trên Windows `write_text` đổi `\n` → `\r\n` | Sửa file Linux: đọc/ghi **bytes** (hoặc `newline="\n"`), chạy script trên VPS; trước commit xem `git diff --stat` (sửa 3 dòng mà ra 899 dòng = sai kiểu xuống dòng). Đã trả về LF ở commit riêng `c1cc5e0` |
| 6 | Mẫu bảng sự kiện làm cho 3Q, user cần HMTG | Vừa làm 3Q trước đó, không hỏi "trang nào" | Yêu cầu không nêu trang/game → hỏi 1 câu (lỗi lặp lại từ journal 10/11 #8) |
| 7 | Lời mời Discord: hết hạn / sai mã | User chép thiếu ký tự, link 7 ngày | Kiểm bằng `https://discord.com/api/v9/invites/<mã>?with_expiration=true` (thử 1 mã công khai để chắc cách kiểm đúng) — báo cả ngày hết hạn |
| 8 | Trên điện thoại mèo linh vật che icon Zalo/Facebook ở cuối trang 3Q | Hàng icon tĩnh ở cuối trang, mèo `position:fixed` góc dưới | Phát hiện bằng `elementFromPoint` giữa từng icon (Playwright báo `isVisible` vẫn true). Đề xuất đệm ~150px dưới hàng icon (chưa làm) |
| 9 | 3 bộ kiểm `verify/quan-tri` (registry, grants, mcp-tools) hỏng sẵn | Bật tin cho skystory 10/11 không sửa giả định "skystory không bật phần nào" | Chạy bộ kiểm trên **main** để biết hỏng sẵn hay do mình; sửa giả định cho khớp sổ game |
| 10 | Đổi bài sự kiện qua MCP (gửi duyệt/đăng) có thể xoá mất ngày | `fieldsOf` (MCP) và `collect()` (trình viết) gửi lại toàn bộ trường; trường mới không có → `undefined` | Mọi chỗ gửi lại bài đều mang `event`; kiểm "lưu bằng nút → giữ ngày" |
| 11 | Lỗi CSS làm mất kiểu nhãn trạng thái | Lọc dòng `.mau-bar{` khỏi CSS mẫu nhưng sót dòng tiếp theo của cùng luật → `}` lạc | Sau khi cắt CSS: đếm `{` = `}`; xem ảnh chụp kỹ từng chi tiết nhỏ |
| 12 | Script kiểm báo sai (radio ẩn, trình viết giữ trang khi có thay đổi chưa lưu, xoá thiếu `baseUpdatedAt`, ảnh lazy chưa tải) | Lỗi của script, không phải trang | Bấm `label:has(input…)`; mở trang mới khi đổi game; gửi `baseUpdatedAt`; cuộn qua từng thẻ trước khi kiểm ảnh |
| 13 | Lệnh Bash bị "safety check rm" chặn dù không có rm | Heredoc + python lồng nhau làm bộ phân tích không chắc | Dùng Edit/Write thay vì heredoc sửa file |

## 3. Bài học / kinh nghiệm

- **Hỏi đúng đối tượng**: "bảng sự kiện", "logo", "trang chủ" — có 3 trang (3Q, TKKT, HMTG). Không rõ thì hỏi 1 câu.
- **Ảnh có chữ tiếng Việt**: AI vẽ hình, chữ ghép bằng font thật (đã có dấu).
- **Ảnh wiki PWI**: chỉ ~4 ảnh nhân vật tách nền chất lượng tốt (`SeekerOriginalArt`, `ArcherArtwork`, `BarbarianOriginalArt`, `Bg-class-lrgearthguardmale`); tranh concept 1920×1200 có logo bản Trung góc phải. Danh sách ảnh lớn: `plans/261109-tghm-web/pwi-allimages-lon.json`.
- **So ảnh trên trang thật**: chép trang LIVE + thanh nút 0..N đổi ảnh tại chỗ → chụp tờ so sánh → user chọn số.
- **Thêm trường vào bài viết**: dữ liệu đi qua 4 cửa (trình viết `collect`, API lưu `readFields`, MCP `fieldsOf`/`viet_bai`, kiểm hợp lệ `isValid`) — sửa đủ cả 4, kiểm "sửa thứ khác không mất trường mới".
- **Phần dùng chung nhiều game**: thứ chỉ của 3Q (Đăng lên trang chính/phụ, kho ảnh 3Q) phải ẩn ở game khác.
- **Restart an toàn**: đọc log Caddy (cả file) tìm `/quan-tri`, `/mcp` trong ~20 phút gần nhất; IP 127.0.0.1 là chính mình kiểm.
- **DNS wanmeivn.com ở Mắt Bão** (`ns1/ns2.matbao.com`) — hỏi thẳng máy chủ tên miền để biết bản ghi đã có chưa.

## 4. Quy trình đã chạy ổn (làm lại y vậy)

1. **Sửa server 3Q có rủi ro** (nút tải, bảng sự kiện):
   - Nháp: `dung-nhap-<viec>.sh` (worktree `/srv/_nhap-<viec>`, nhánh, bind `mirror/`, symlink node_modules, chép `data/` → `/srv/_nhap-<viec>-data`, `systemd-run` cổng 13399 với `DATA_ROOT`, `NEWS_INSECURE_COOKIE=1`, `NEWS_SITE_ORIGIN`). Mẫu: `plans/reports/nut-tai-choi-nhanh-261110/dung-nhap-nut-tai.sh`.
   - Sửa bằng script Python chạy **trên VPS**, đọc/ghi bytes, mỗi chỗ `assert count==1`; `node --check`; `git diff --stat` kiểm số dòng.
   - Kiểm: bộ `verify/quan-tri/*.mjs` (registry, grants, trash, data-split, mcp-tools), `check-behavior-baseline.mjs --compare --live` cho cả 3399 và 13399 rồi so; tài khoản thử `make-test-accounts.mjs` (thu-chu…); Playwright qua đường hầm `ssh -N -L 13399:…`.
   - Báo user + ảnh → chờ **"deploy đi"** → đọc log /quan-tri → commit trong worktree → tag `pre-<viec>` → sao lưu file → `merge --ff-only` → restart → curl 5 trang → Playwright LIVE → dọn worktree/dữ liệu nháp → bundle → push.
2. **Sửa nhỏ cấu hình** (link MXH): chỉ khi user nói "làm luôn"; sửa thẳng LIVE bằng script bytes, commit, restart, kiểm.
3. **Trang tĩnh HMTG**: sửa `plans/261109-tghm-web/mockups-v2/huong-b.html` (sao lưu `huong-b.bak-*`) → `python -I scripts/build_site_live.py` → thử local (`kiem/proxy_thu.py` giả Caddy) → scp `/tmp` → "deploy đi" → sao lưu `/srv/_backup/…` → `install -o web3q -g web3q -m 644`.
4. **Thêm site mới** (HMTG): DNS A → khối Caddy (tạo sẵn file log, sửa trên bản sao + `caddy validate`, tự trả nếu lỗi) → `reload` (không restart) → Caddyfile.redacted (`che_caddy.py`) → commit.
5. **Đăng sự kiện HMTG**: `/quan-tri` → Hoàn Mỹ Thế Giới → Tin tức → Viết bài (ảnh bìa tải từ máy, 16:9) → Đăng; hoặc MCP `viet_bai game=hoanmythegioi muc=su-kien su_kien_bat_dau=YYYY-MM-DD …`. Link chia sẻ `/#sk-<đường-dẫn>`.

## 5. Còn treo

- Discord vĩnh viễn (hết hạn 14/11 16:40) → thay trong bảng `SOCIAL` (`layout-v2.mjs`) + restart.
- Điện thoại trang 3Q: mèo/nút nhạc che icon MXH cuối trang (đề xuất đệm 150px).
- TikTok, YouTube 3Q chưa có link.
- HMTG: nút Tải game / Đăng nhập / Đăng ký chưa có đích; xếp hạng + ngày mở máy chủ là mẫu; thiếu dòng 18+/180 phút; vẫn noindex.
- Nút "Chơi Nhanh" là ảnh tự vẽ (Arial) — user có thể gửi ảnh 394×120 thay `overrides/home/nut-choi-nhanh.png`.
