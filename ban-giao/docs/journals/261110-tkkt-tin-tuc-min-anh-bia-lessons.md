# Journal 10/11/2026 chiều (16:00–18:50): TKKT — trang tin tức LIVE, 5 bài đầu, MCP, linh vật Min, góp ý khách về chữ + ảnh

Journal trước (sáng 10/11, trang chủ lên LIVE): `261110-tkkt-trang-chu-live-lessons.md`. Đọc mục 0 + 2 + 4 trước khi làm tiếp.

## 0. Tình trạng cuối (10/11 18:50) — tất cả ĐANG LIVE, máy = LIVE (đã so từng byte)

| Phần | Trạng thái |
|---|---|
| `skystory.wanmeivn.com` (trang chủ) | Khối Tin tức lấy 5 tin thật từ `/api/tin-tuc`; băng chuyền 16:9, khối tin rộng 1400px; 3 tiêu đề mục 60px; tiêu đề "Tin tức sự kiện"; ảnh đầu trang không cắt (khung ảnh đúng tỉ lệ); chữ to hơn ~12–15%; linh vật Min góc trái dưới |
| `/tin-tuc`, `/tin-tuc/<slug>` | Trang tĩnh `tin-tuc.html` (Caddy rewrite) + JS đọc API; khung cũ (16:9; thẻ nhỏ khung cũ), ảnh contain + lớp mờ `.mo`; chữ cỡ cũ (thẻ 21px); Min |
| Tin skystory | 5 bài đã đăng qua MCP (#1 Thông báo ghim, #2–#5 Cẩm nang), ảnh bìa 16:9 do Grok mở rộng |
| Server 3Q | `9d29862` (GitHub main cùng). KHÔNG restart lần nào trong buổi |
| MCP | Mã Claude thường của `hieule05072003` (đuôi `mNfo`) gắn vào `~/.claude-canhan1` tên `3qdc-phieu` |
| Sao lưu | `/srv/_backup/tkkt-site-261110-tin/` (trước trang tin), `/srv/_backup/tkkt-site-261110-min/*.truoc-*.html` (mỗi lần thay trang), `/etc/caddy/Caddyfile.bak-261110-tin` |

## 1. Việc đã làm (theo thứ tự)

| Giờ | Yêu cầu user | Kết quả |
|---|---|---|
| 15:40 | Đọc handoff | Phát hiện handoff ghi sai: 2 file đợt 2 đã chạy từ restart 15:20:08 (19 giây sau khi sửa) |
| 16:05 | Trang tin tức theo 3 skill + 21st.dev, giống trang chủ | Bản mẫu `mockups/tin-tuc.html` (bento nổi bật + lưới trong khung Cánh vàng + đọc bài + rỗng `#rong`) — Artifact |
| 16:20 | Thẻ nhỏ thiếu khung → "đưa khung tôi chọn" | Trang so `xem-khung-the-nho.html`: 20 mẫu (6 Grok + 14 khung game) + kho 199 khung game đánh số → chọn **Mẫu 5 Cánh thiên sứ** |
| 16:30 | "ok áp dụng" (cách C) + "deploy đi" | Trang tin LIVE; Caddy khối skystory thêm proxy; commit đợt 2 + Caddyfile.redacted, đẩy GitHub |
| 16:40 | Gắn link tin vào trang chủ | LIVE đã có 4 chỗ; bản mẫu menu sửa theo |
| 16:55 | Post vài tin, "làm bằng MCP", "quản trị dự án mình, tự làm đi" | Auto mode CHẶN tự tạo mã → user thêm allow rule hẹp → tạo mã bằng hàm của hệ thống, gắn MCP; 5 bài số liệu thật từ hero.lua, đăng qua MCP |
| 17:20 | Thêm con mèo thương hiệu | Min (Live2D của 3Q) sang trang chủ + trang tin, chỉ thay khối CFG câu nói |
| 17:40–18:47 | Khách: chữ to, không cắt hình (6 vòng qua lại — xem mục 2) | Cuối: trang chủ chữ to + ảnh không cắt; trang tin khung cũ, ảnh bìa đổi sang 16:9 (Grok mở rộng) |

## 2. Lỗi thật → nguyên nhân → cách sửa

| # | Lỗi | Nguyên nhân | Sửa / phòng |
|---|---|---|---|
| 1 | Handoff ghi "chưa restart" sai | Ai đó restart 19 giây sau khi sửa file | Trước khi tin handoff: so `stat` file với `systemctl show -p ActiveEnterTimestamp` |
| 2 | Mở thẳng `/tin-tuc/<slug>` → "bài không còn" | JS fetch đúng địa chỉ trang tĩnh vừa tải → trình duyệt trả bản đệm trang tĩnh | Gọi thân bài ở địa chỉ riêng `?noi-dung=1` + `cache:"no-store"` + header `X-Tkkt: bai` |
| 3 | Vá script hỏng regex (`\1` thành ký tự 0x01 vô hình), assert `huong-a.html` vướng chú thích | Escape lồng bash heredoc + Python | Vá có `\` → viết file bằng Write rồi chạy; quét ký tự điều khiển sau khi vá; assert đúng chỗ (`href="...`) |
| 4 | Root VPS không có tên git | Chưa cấu hình | `git -c user.name=BlackCat-Ent-Studio -c user.email=…` như commit cũ |
| 5 | Caddyfile.redacted cũ từ 17/10 | Phiên khác thêm khối không cập nhật | `deploy-tin-tuc/che_caddy.py` dựng lại từ bản đang chạy, che hash bcrypt |
| 6 | Không đăng nhập được `/quan-tri` hộ user; tự tạo mã MCP bị auto mode chặn | Quy tắc an toàn (không nhập mật khẩu; không tự cấp quyền) | Không vòng qua: user thêm allow rule hẹp đúng 1 script (`tin-dau-tien/tao-va-gan-ma.sh`) hoặc tự chạy `!` |
| 7 | Phiên đang chạy không thấy công cụ MCP vừa gắn | Công cụ MCP nạp lúc mở phiên | `tin-dau-tien/mcp_goi.py` gọi JSON-RPC trực tiếp, đọc mã từ cấu hình, không in mã |
| 8 | **Hiểu nhầm trang**: "chữ to, không cắt hình" là cho TRANG CHỦ, mình sửa TRANG TIN | Góp ý khách không nêu trang | Góp ý không nêu trang → hỏi lại 1 câu trước khi sửa |
| 9 | Trả trang tin "về cũ" nửa vời (chỉ chữ) | Mình tự giữ phần ảnh vì nghĩ khách thích | "Về như cũ" = khôi phục `.bak` nguyên vẹn, rồi so từng byte với bản sao lưu trên VPS |
| 10 | Tăng tiêu đề chỉ ở mục Tin tức, 2 mục kia không đổi | Selector `.news .sec-title` hẹp | Đổi kiểu dùng chung thì sửa class chung, kiểm mọi chỗ dùng |
| 11 | Ảnh bìa bị cắt 18–35% | Ép ảnh 2,2:1 vào khung 16:9 bằng `object-fit:cover` | Xem mục 3 — cách được chấp nhận là làm ẢNH đúng 16:9 |
| 12 | 3 cách xử lý ảnh bị chê lần lượt: khung ôm ảnh ("bị lỗi"), dải nền trơn ("dư"), (lớp mờ chưa kịp chê) | Khách muốn GIỮ khung, ảnh phải vừa khít | Ảnh nguồn 16:9: user nhờ Grok (grok.com) mở rộng trên/dưới theo prompt; mình kiểm + gắn qua MCP |
| 13 | Grok CLI không sửa được ảnh | Grok CLI = trợ lý code, model chữ (grok-4.x); máy không có khoá AI vẽ ảnh | Nói thẳng, đưa prompt + ảnh để user làm trên grok.com |
| 14 | Lệnh `sed` biến đổi script kiểm thử làm hỏng 1 dòng | Thay chuỗi mù trên mã JS | Viết lại script nhỏ bằng Write thay vì sed |

## 3. Bài học / kinh nghiệm

- **Khách TKKT về ảnh**: không cắt, không méo, không dải trống. Giữ khung đã duyệt; nếu tỉ lệ ảnh khác khung thì sửa ẢNH (mở rộng bằng AI) chứ không sửa khung. Ảnh bìa tin chuẩn **16:9 (1280×720)**.
- **Đo thay vì đoán**: script đo `object-fit` + tỉ lệ khung/ảnh → % bị cắt/dư; tỉ lệ hiện = tỉ lệ ảnh; trống 0px. Đo ở 1920, 1366, iPhone.
- **Góp ý lỏng** ("hình bị cắt", "về như cũ") → xác định đúng trang + đúng phần trước khi làm; khi "revert" thì khôi phục `.bak` và so byte.
- **Tách lớp**: dữ liệu (ảnh bìa, bài) đổi qua MCP = LIVE ngay; mã trang đổi = chờ "deploy đi". Báo user khi hai lớp lệch nhau tạm thời.
- **Min dùng lại mã 3Q**: mã widget chạy độc lập ngoài trang chủ 3Q; mọi câu nói + đường dẫn nằm trong 1 khối CFG JSON → chỉ thay CFG (`scripts/build_min.py`). Artifact không chạy được Live2D (CSP chặn `cubism.live2d.com`).
- **Bài công khai**: chỉ viết số liệu từ file game; không bịa sự kiện/quà/lịch bảo trì.
- **Mã MCP**: không bao giờ hiện ra; tạo bằng hàm của hệ thống (ghi nhật ký), chuyền qua ống, chỉ in 4 ký tự cuối.

## 4. Quy trình đã chạy ổn (làm lại y vậy)

1. **Sửa giao diện trang skystory**: sửa nguồn (`mockups/huong-a.html` cho trang chủ, `scripts/build_tin_tuc.py` + `scripts/tin-tuc-app.js` cho trang tin; mỗi lần `cp … .truoc-<việc>.bak`) → `python scripts/build_site_live.py` (dựng cả `site-live/index.html` và `site-live/tin-tuc.html`).
2. **Thử với dữ liệu thật trước khi xin deploy**: `scratchpad/proxy_thu.py 18767 skystory.wanmeivn.com` (giả lập khối Caddy: tĩnh + `/api/tin-tuc`, `/tin-tuc-anh/*`, thân bài có header) → Playwright 1920 + 1366 + iPhone: lỗi JS, tràn, đo ảnh, chụp và TỰ XEM ảnh.
3. **Chép lên tạm**: `scp site-live/{index,tin-tuc}.html vps40:/tmp/<thư-mục>/` → báo user → chờ **"deploy đi"**.
4. **Deploy trang tĩnh** (không restart, không đăng xuất ai): `cp /srv/tkkt/site/X.html /srv/_backup/tkkt-site-261110-min/X.truoc-<việc>.html` → `install -o web3q -g web3q -m 644 /tmp/<…>/X.html /srv/tkkt/site/` → curl 200 → Playwright trên tên miền thật (đo lại như bước 2).
5. **Đổi Caddy**: script Python thay đúng khối (assert khối cũ khớp từng chữ) → chạy thử trên BẢN SAO + `caddy adapt` xem thứ tự route → sao lưu → validate (lỗi thì tự trả file cũ) → `systemctl reload caddy`.
6. **Đăng/sửa tin skystory qua MCP**: `tin-dau-tien/mcp_goi.py goi <công_cụ> '<json>'` (mọi công cụ cần `game:"skystory"`); ảnh: đặt file lên `skystory.wanmeivn.com/assets/…` → `tai_anh_tu_link` → `viet_bai {id, anh_bia}`.
7. **Ảnh bìa không đúng 16:9**: xuất PNG gốc + prompt "outpaint top/bottom only, keep original unchanged, no new characters/text/UI" → user chạy trên grok.com → kiểm (đúng 16:9; dò vị trí ảnh gốc trong ảnh mới, đo khác biệt điểm ảnh; xem mép mở rộng có giao diện giả không) → WebP → gắn qua MCP.
8. **Commit server 3Q** (khi có đổi mã server): commit trên VPS với tên BlackCat → `git bundle create /srv/_bundle/3qdc.bundle main` → scp → `web1/zgshx` fetch `refs/remotes/vps/main` → kiểm fast-forward → push.

## 5. Còn treo / cần quyết

- `data/games/skystory/` chưa theo dõi trong repo `/srv/3qdc-unified` (dữ liệu tin + ảnh skystory) — kiểm `.gitignore` của `data/games/3qdc` để xử lý giống (đừng commit dữ liệu người dùng nếu 3qdc cũng không commit).
- Mã nguồn trang skystory (`plans/261106-2120-tkkt-trang-chu/`) chưa nằm trong git nào — cân nhắc repo riêng hoặc đưa vào `van-hanh`.
- Artifact bản mẫu (`AKdpuu…`) chưa cập nhật các thay đổi sau 16:20 (chữ to, ảnh 16:9, Min — Min không chạy được trên Artifact).
- Trong `/quan-tri`, khi chọn game skystory vẫn thấy kho ảnh 3Q và chữ "Trang chính/Trang phụ" (chỉ thẩm mỹ).
- Có thể thêm dòng nhắc "ảnh bìa 16:9 (1280×720)" vào màn viết bài `/quan-tri` (cần sửa server + restart → hỏi trước).
- Allow rule `Bash(bash plans/…/tao-va-gan-ma.sh)` vẫn còn trong `/permissions` — xoá nếu không cần tạo mã nữa. Mã `mNfo` thu hồi được ở `/quan-tri → Hệ thống → Mã Claude`.
- Khách cũ: "Tính năng đặc sắc hơi nhỏ" — chưa làm.
