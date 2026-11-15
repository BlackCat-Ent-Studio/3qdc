# Journal 11/11 chiều → 12/11 tối: Bảng xếp hạng (dongvu), làm lại giao diện HMTG → "Tiên Ma Vô Giới", fanpage, bàn nhạc nhiều game

Journal trước: `261111-hmtg-live-su-kien-nut-tai-3q-lessons.md`. Handoff: `plans/261109-tghm-web/HANDOFF-tghm.md` (mục 3f → cuối file) + `HANDOFF.md` đầu file.

## 0. Tình trạng cuối (12/11 23:00)

| Phần | Trạng thái |
|---|---|
| Server 3Q `/srv/3qdc-unified` | `cd8271b` = GitHub main (restart 22:4x). Tag lùi mới: `pre-bang-xep-hang`, `pre-ban-nhac` |
| Trang "Tiên Ma Vô Giới" (vẫn ở `hoanmythegioi.wanmeivn.com`, id nội bộ `hoanmythegioi`) | LIVE bản C: slide 3 ảnh PWI, nút Ấn son, khung Sự kiện "Sơn then", nền BXH Đại quân, 10 lớp nhân vật to đều, font Philosopher + Arsenal, logo "TIÊN MA / VÔ GIỚI", bàn nhạc (ẩn vì 0 bài) |
| `/quan-tri` | Game này có Tin tức (Sự kiện) + **Bảng xếp hạng** + **Nhạc nền**; tên hiển thị "Tiên Ma Vô Giới"; dongvu có quyền BXH cập nhật + tin tức viết/duyệt |
| Thiên Không Kỳ Truyện (skystory) | Bàn nhạc LIVE, 3 bài nhạc nền từ file game |
| Fanpage | Bìa 1 + avatar nâu đen xuất ra Desktop `Fanpage Tien Ma Vo Gioi/` |
| Sao lưu trang tĩnh HMTG/TMVG | `/srv/_backup/hmtg-v3c-*-261112/` (mỗi lần deploy một thư mục: v3c, final, bxh, nv, font, ten) + `/srv/_backup/ban-nhac-261112/` |

## 1. Việc đã làm (theo thứ tự)

| Lúc | Yêu cầu | Kết quả |
|---|---|---|
| 11/11 14:00 | BXH HMTG cho Claude bên dongvu đọc DB rồi gửi lên | Thiết kế mở (≤10 bảng/200 dòng, Lịch sử 50 bản, 12 lần/giờ, /mcp 256 KB) → plan → nháp → LIVE 15:39; mã cũ dongvu tự thấy `xem_bxh`/`cap_nhat_bxh` sau khi user tick quyền |
| 12/11 00:10 | "HMTG đơn giản, AI quá" + 3 skill taste/ux-ui/impeccable, nền động, font mới | 3 mẫu A Thiên Giới / B Dạ Chiến 2 / C Hoàn Mỹ Cổ Điển (3 agent song song, không mở trình duyệt; controller chụp sau) → chọn **C** |
| 00:45–01:30 | Hệ phái cong (mẫu B), font của B cho C, ảnh nền mới từ wiki (không lấy thư mục user) | 14 ảnh PWI mới, chọn số 2 (sát thủ) → LIVE |
| 01:40 | "sao chỉ 1 hình" | Phục hồi slide 3 ảnh (2→1→3) |
| 01:45–02:30 | Bỏ khung đồng, nút + khung Sự kiện làm với Grok, bỏ "Windows 2,4 GB", bỏ "Đăng ký" | Nút 1 Ấn son + Khung 2 Sơn then → LIVE |
| 02:30–03:00 | Nền BXH trống, nhân vật Kiếm Linh nhỏ, bỏ câu "Máy chủ Nguyệt Ảnh…" | Nền Đại quân; 5 lớp thay ảnh gốc PWI lớn; LIVE |
| 03:05–03:25 | Khách: font "AI quá", chữ to hơn | 6 bộ font → Font 5 Philosopher + Arsenal, tiêu đề +20%, thân 17px → LIVE |
| 21:15 | Avatar + cover fanpage | 2 avatar × 3 bìa + trang giả lập FB → chọn bìa 1 + avatar nâu đen |
| 21:40 | Đổi tên → "Tiên Ma Vô Giới", không ghi tên miền | Logo mới, web LIVE, fanpage xuất lại; tên /quan-tri gộp vào lần restart nhạc |
| 22:10 | Bàn nhạc cho TKKT + TMVG (Cách A: quản lý trong /quan-tri) | Kho nhạc theo game, API theo Host, MCP theo game, bàn nhạc 2 trang → LIVE 22:4x |

## 2. Lỗi thật → nguyên nhân → cách sửa

| # | Lỗi | Nguyên nhân | Sửa / phòng |
|---|---|---|---|
| 1 | Thay nền đầu trang bằng ảnh số 2 thì mất luôn slide chuyển cảnh, user hỏi "sao chỉ 1 hình" | Đề agent ghi "single hero background" | Đổi ảnh ≠ đổi hành vi: giữ nguyên tính năng đang có (slide, hiệu ứng) trừ khi user bảo bỏ |
| 2 | Cửa sổ đọc sự kiện: khung đè mép ảnh + chữ (máy tính), ảnh tràn sát mép (iPhone) | Gộp CSS từ trang xem trước bỏ `border:22px solid transparent`, còn `border-width` không có `border-style` → viền 0px nhưng border-image vẫn vẽ | Dùng `border:var(--b) solid transparent`; sau khi gộp CSS từ trang preview phải đo lại `getComputedStyle` borderWidth |
| 3 | Ảnh bìa sự kiện bị cắt ~9% hai bên | `.shot` ép 16:9 + `object-fit:cover` | Ảnh theo tỉ lệ gốc (`height:auto`) — luật khách "không cắt ảnh" |
| 4 | Đèn lồng đè nút "Đăng nhập" ở 1366 | Đèn `position:fixed; top:0` | Treo dưới header `top:calc(var(--hdr) - 4px)`; đo chồng lấn với mọi nút header ở 1366/1440/1920 |
| 5 | Kiếm Linh nhỏ trong gương | Ảnh 323×1096 phần lớn là thanh kiếm; khung giới hạn theo cỡ gốc (`--h`) | Lấy ảnh gốc PWI lớn (`*OriginalArt.png`), cắt lề trong suốt, khung cố định 540px, phóng tối đa 1,15× |
| 6 | Chữ dọc "Hệ phái" bị cắt chữ H | Neo đáy khối, khối cao hơn màn | Neo đầu khối |
| 7 | User chọn "Font 5" lúc agent chưa xong; trang xem trước dựng bằng JS nên controller không đọc được font 5 là gì | Danh sách phương án chỉ nằm trong JS | Chuyển lựa chọn cho chính agent đang làm (SendMessage); lần sau ghi danh sách phương án ra file tĩnh sớm |
| 8 | Hai agent cùng sửa `v3-huong-c.html` | Việc mới tới khi agent cũ chưa xong | Gửi yêu cầu mới cho agent đang giữ file (SendMessage), hoặc agent xem trước chỉ "bơm CSS vào iframe", không sửa file gốc |
| 9 | Cổng xem thử bị chiếm (5181 máy chủ khác, 5193 máy chủ tĩnh) | Nhiều agent tự bật server | Kiểm cổng trước khi dùng; ghi cổng nào đang chạy gì vào handoff |
| 10 | Agent lỡ commit symlink node_modules vào nhánh nháp | `git add -A` | `git status` trước commit; đã viết lại 3 commit |
| 11 | `MANIFEST.sha256` có dòng của chính nó → `sha256sum -c` 1 FAILED | Tạo manifest sau khi file đã nằm trong thư mục | Loại manifest khỏi danh sách |
| 12 | Bộ kiểm cũ hỏng sẵn (`check-api-403`, `check-invite-mcp`, registry, mcp-tools) | Giả định "chỉ 3Q có X" | Luôn chạy bộ kiểm trên main trước để biết lỗi có sẵn; sửa giả định theo sổ game |
| 13 | Lệnh xuất fanpage bị user dừng giữa chừng vẫn để lại 2 thư mục tạm trên Desktop | Lệnh đã chạy một phần | Lệnh bị dừng ≠ không chạy: kiểm và dọn phần dở |
| 14 | Số đo cover Facebook mâu thuẫn (Help Center 16:9 vs đo thật 2,7:1) | Facebook đổi bố cục | Thiết kế theo vùng an toàn chung; kiểm trên fanpage thật sau khi đăng |
| 15 | Caddy cache `/assets/*` 1 ngày | Khối Caddy TKKT | Sửa `ban-nhac.js/css` lần sau → đổi tên file hoặc thêm `?v=` |

## 3. Bài học / kinh nghiệm

- **Khách chê "AI"** → đổi CHẤT LIỆU (khung, hoa văn, ảnh thật của game, nhịp bố cục khác nhau từng khối), không chỉ đổi font. 3 mẫu song song trên trang chuyển `xem-*.html` (iframe cùng gốc + bơm CSS) cho user chọn số là cách nhanh nhất.
- **Grok CLI** hợp làm ý tưởng nút/khung (dáng vát, chỉ vàng, ke góc); agent phải chọn lọc + vẽ lại (Grok vẽ thô/hoạt hình). Khung = rỗng giữa, chỉ góc/cạnh. Chữ luôn là font thật.
- **Ảnh wiki PWI**: quét `list=allimages` (lọc ≥1600px ngang), xem thumbnail, tải `&format=original`; ảnh `*OriginalArt.png` = tranh lớp tách nền chất lượng tốt. Logo bên thứ ba góc ảnh → cắt.
- **"deploy đi" trước khi xong** → ghi nhận, deploy khi bộ kiểm đạt + controller xem ảnh; có điều kiện dừng rõ ràng.
- **Đổi tên game**: đổi chữ người xem thấy (logo, title, meta, alt, /quan-tri, MCP, SKILL), giữ id nội bộ + tên miền tới khi có tên miền mới; build script nên tự báo lỗi nếu còn tên cũ.
- **Phần dùng chung nhiều game** (tin tức, BXH, nhạc): 3Q giữ nguyên đường dẫn cũ, game mới vào `data/games/<game>/<phần>/`; công cụ MCP của mã người dùng phải giữ nguyên tên/tham số (so `tools/list` từng byte trước/sau).
- **Fanpage**: avatar chỉ huy hiệu (đọc được ở 40px); cover đặt chữ trong vùng an toàn, avatar che góc trái dưới; xuất PNG khi có chữ.

## 4. Quy trình đã chạy ổn (làm lại y vậy)

1. **Sửa trang tĩnh TMVG** (`plans/261109-tghm-web/mockups-v2/v3-huong-c.html`, nguồn duy nhất): sao lưu `v3-huong-c.bak-<ngày>-truoc-<việc>.html` → sửa → `python -I scripts/build_site_live.py` → thử qua proxy API thật (`kiem/proxy_thu.py` mẫu) 1920/1366/iPhone, 1 trình duyệt mỗi lần, XEM ảnh → tar `site-live` lên `/tmp/<việc>/` → "deploy đi" → `cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-<việc>-<ngày>` → `rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644` → curl + Playwright LIVE → dọn /tmp → ghi handoff. Không restart.
2. **Trang tĩnh TKKT**: chép TỪNG file bằng `install` (site-live local khác LIVE, KHÔNG rsync --delete).
3. **Sửa server 3Q** (BXH, nhạc): plan → nháp worktree `/srv/_nhap-<việc>` cổng 13399 + dữ liệu riêng → bộ kiểm trên main trước, rồi nháp → baseline 3399 vs 13399 → Playwright → bộ deploy (Caddy thử trên bản sao + validate; trang tĩnh staged) → "deploy đi" → log /quan-tri (cả .gz) → tag `pre-<việc>` → ff → restart → Caddy reload → trang tĩnh → kiểm LIVE → dọn nháp → `che_caddy.py` + commit → bundle → GitHub.
4. **Chọn kiểu dáng**: agent làm trang `xem-<thứ>.html` (thanh dưới Hiện tại/1/2/3, phím số, `?x=N`) bơm CSS vào iframe trang gốc, KHÔNG sửa trang gốc; user chọn số → agent khác gộp vào trang gốc.
5. **Agent**: đề ghi rõ file được ghi, cổng, Playwright 1 trình duyệt, "LOOK at screenshots", dừng trước deploy; controller luôn tự xem ảnh trước khi báo user.

## 5. Còn treo

- Mở `/quan-tri` thật xem tên "Tiên Ma Vô Giới" (agent chưa đăng nhập được để nhìn).
- TMVG chưa có bài nhạc (user tải trong /quan-tri → Tiên Ma Vô Giới → Nhạc nền).
- Thanh âm lượng bàn nhạc TMVG hơi sát nút ♫; trang bài `/tin-tuc/<slug>` TKKT chưa có bàn nhạc (cần sửa `news-theme.mjs` + restart).
- Tên miền mới cho TMVG (khi có: DNS, Caddy, đổi id `hoanmythegioi` nếu muốn, quét lại xem trước link Facebook/Zalo).
- Mã MCP chủ: 3 tool nhạc giờ cần tham số `game`.
- Từ journal trước: **Discord `PRRrJhWBj` hết hạn 14/11 16:40**; mèo/nút nhạc che icon MXH cuối trang 3Q trên điện thoại; TikTok/YouTube 3Q chưa link.
- TMVG vẫn noindex; thiếu dòng 18+/180 phút; Tải game/Đăng nhập chưa có đích.
