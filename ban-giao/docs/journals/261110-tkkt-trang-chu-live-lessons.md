# Journal 09–10/11/2026: Thiên Không Kỳ Truyện — từ bản mẫu A lên LIVE `skystory.wanmeivn.com`

Đọc mục 0 (tình trạng) + 2 (lỗi) + 3 (quy trình) trước khi làm tiếp. Journal trước: `261109-tkkt-trang-chu-he-thong-anh-hung-khung-grok-lessons.md`.

## 0. Tình trạng cuối (10/11 15:25)

| Phần | Trạng thái |
|---|---|
| Trang chủ `https://skystory.wanmeivn.com` | **LIVE** (VPS .40, tĩnh `/srv/tkkt/site`, Caddy riêng, Let's Encrypt). Tin tức vẫn là tin MẪU |
| Game chơi web `https://web.skystory.wanmeivn.com` | VPS .23 (user tự đổi DNS). Code game không ghi cứng tên miền → chạy ngay |
| Đợt 2 — Tin tức skystory trong `/quan-tri` | **DỞ**: đã sửa 2 file trên VPS nhưng **CHƯA restart** `3qdc-unified` (user dừng lại vì trang chưa hiện trên máy họ — lỗi DNS máy, không phải lỗi web). Xem mục 4 |
| Nguồn bản mẫu | `plans/261106-2120-tkkt-trang-chu/mockups/huong-a.html` (+ `.bak` mỗi bước) |
| Đóng gói LIVE | `plans/261106-2120-tkkt-trang-chu/scripts/build_site_live.py` → `site-live/` |
| Artifact (acc canhan1) | https://claude.ai/artifact/AKdpuu2pB8BebPZbLtKQtF bản `1794250996-12d9` |

## 1. Việc đã làm (theo thứ tự user yêu cầu)

| # | Yêu cầu | Kết quả |
|---|---|---|
| 1 | Hệ tướng sai | Lấy `job` trong `skystory/server/bin/script/excel/ssecy/hero.lua` (1 Hộ Vệ, 2 Chiến Binh, 3 Pháp Sư, 4 Mục Sư; client `Utils.ts`, icon `cm_icon_ZhiYe*` — thứ tự `HeroConstant.heroJobArr`: ZhiYe1, 0, 2, 3) |
| 2 | Nút lên/xuống vòng phe | Trong suốt 25%, sáng khi hover/focus |
| 3 | Bỏ viền trắng icon chiêu | — |
| 4 | Đủ hero gốc + SSR/SR | 56 hero gốc (tên Hán trong hero.lua, grade 2–4) — `grade` 2 R / 3 SR / 4 SSR, tem `cm_tag_*2.png`. Script `build_heroes.py` (đối chiếu 20 cũ khớp 100%) |
| 5 | Nền chán → nền động (Grok) | Trang so Cũ/A/B/A+B → user chọn **B**: ảnh `HB_BG.png` + Spine màn đăng nhập (tia nắng, chim, bướm, bồ công anh) PIXI ≤30fps; nút ✦ tắt hiệu ứng chỉ trên điện thoại |
| 6 | Cỡ tướng không đều | Một tỉ lệ chung `REF_H=1250` |
| 7 | Tướng lệch hai bên | Căn theo xương gốc `bones[0].worldX`, không theo hộp bao |
| 8 | Vết cắt chân đầu trang | Mask mờ dần 240px cả `.hero`; bỏ hoa văn dưới "Tin mới" |
| 9 | Mây cứng → Grok vẽ mây mềm | SVG blur + gradient; phải chỉnh lại cho THẤY (mục 2) |
| 10 | Header trong suốt "giống 3Q" | Đo 3Q: 4 lớp backdrop-blur 1.5/4/8/16px có mặt nạ; giữ trong suốt cả khi cuộn |
| 11 | Font | Trang so 5 cặp có tiếng Việt → user chọn **E: Grenze + Lexend** |
| 12 | Nút + icon "bớt AI" | Nút: ảnh nút gốc game (`cm_btn_LvSe1` xanh ngọc, `cm_btn_huangse1_1` vàng) qua `border-image` 9 ô. Icon: Grok vẽ MỚI theo phong cách game (v2) → chọn icon 1 "Ấn mặt trời – kiếm" `assets/icon-game.svg` |
| 13 | Tên miền | Khách: `skystory.` = trang chủ, `web.skystory.` = game (Boom cũng vậy — của người khác) |
| 14 | Đưa trang chủ lên | LIVE 10/11 15:14, thêm nút "Chơi ngay" → web.skystory, dòng cảnh báo 18+/180 phút |

## 2. Lỗi thật → nguyên nhân → cách sửa

| # | Lỗi | Nguyên nhân | Sửa / phòng |
|---|---|---|---|
| 1 | Gán hệ tướng "Tank/Đấu sĩ/Cung thủ" | Lấy nhãn từ công cụ tự làm (`dautruong-heroes.json`), không từ game | Dữ liệu hiển thị cho khách phải tra từ file game (hero.lua / cn.json / client TS) |
| 2 | Dữ liệu chiêu có dòng thừa "› con", "Bị động 3" trùng | `ingame-skills.json` tách hiệu ứng phụ thành dòng riêng | Bỏ dòng `›`, dòng không tên, dòng trùng icon với chiêu trước |
| 3 | Nền B mất sau khi chốt | Luật `.news{background}` đứng SAU luật trong suốt | Tăng độ ưu tiên `body .news,…{background:transparent}` |
| 4 | Tướng nhỏ không đều | Co theo hộp bao trong khung 556px → tướng có cánh nhỏ lại | Tỉ lệ chung + nới khung vẽ sang hai bên |
| 5 | Tướng lệch | Hộp bao lệch ±330px vì cánh/áo choàng | Tâm = xương gốc (mọi lihui `bones[0].worldX = 0`) |
| 6 | "Không thấy mây" | Mây trắng + `mix-blend-mode:screen` + opacity thấp, trôi qua vùng sáng → tàng hình; mình chỉ chụp 1 khoảnh khắc | Bỏ blend, bóng đáy xanh, đường bay chỉ qua vùng trời xanh; **kiểm animation bằng tua `getAnimations().currentTime` ở nhiều thời điểm** |
| 7 | Hiểu nhầm "logo" | User nói logo = icon nhỏ góc menu, mình làm logo lớn | Khi user nói "logo/icon" hỏi lại hoặc khoanh đúng chỗ trong ảnh họ gửi |
| 8 | Icon/nút Grok bị chê "hoạt hình, xấu" | Đề quá chung → Grok vẽ khối phẳng | Đề phải mô tả ĐẶC TRƯNG UI game thật (mặt pha lê cắt khối, viền chỉ vàng 2 lớp, khung mũi sao) — v2 được chọn |
| 9 | User: "tham khảo game … đừng lấy trong game ra" | Lần 2 mình lấy thẳng asset game cho icon | "Tham khảo" ≠ "dùng": nút thì user chấp nhận asset game, icon phải vẽ mới |
| 10 | Nhãn "Sắp có" đè chữ trên nút cắt góc | Nút clip-path không cho nhãn tràn | Gom thành 1 dòng chú thích dưới hàng nút |
| 11 | Thay `</style>` báo lỗi | Trang có nhiều khối `<style>` | Chèn vào khối đầu tiên bằng `s.index('</style>')` |
| 12 | Grok text trống khi tách | Sự kiện stream có trường `data`, không phải `text` | Ghép `o['data']` của `type:"text"` |
| 13 | Playwright `setContent` lỗi trên trang SVG | Đang mở file .svg (không phải HTML) | Mở một trang HTML trước rồi `setContent` |
| 14 | Không xoá được `site-live/` | `python -m http.server` thử nghiệm đang giữ thư mục | Tắt server thử (theo cổng) trước khi dựng lại |
| 15 | **Caddy reload FAIL** khi thêm site | Caddy không tự tạo file log mới trong `/var/log/caddy` | Trước reload: `touch /var/log/caddy/<ten>-access.log; chown caddy:caddy; chmod 600`. Reload hỏng thì Caddy vẫn chạy cấu hình cũ (không sập) |
| 16 | Title còn "(bản mẫu hướng A…)" | Đóng gói không đổi title | `build_site_live.py` thay `<title>` |
| 17 | Icon ▶ nút menu bị ẩn | Luật cũ `.ng .nav-cta svg path{fill:none}` | Ghi đè `fill:#fff` |
| 18 | User: "web không hiện trên trình duyệt" | DNS cache Windows còn IP cũ .23 (TTL ~27 phút) dù 8.8.8.8/1.1.1.1 đã trả .40 | Hướng dẫn: PowerShell admin `ipconfig /flushdns` + Chrome `chrome://net-internals/#dns` Clear host cache, hoặc 4G. Mình kiểm bằng `curl --resolve` / Chromium `--host-resolver-rules` |
| 19 | Phát hiện: host chưa khai báo → lấy tin 3Q | `gameOfHost` không biết host → trả 3qdc → `skystory/api/tin-tuc` ra 7 tin 3Q | Đợt 2 thêm site cho skystory trong `games.mjs` |

## 3. Quy trình đã chạy ổn

1. Mỗi bước sửa bản mẫu: `cp huong-a.html huong-a.truoc-<việc>.bak` → sửa bằng Python `sub()` có `assert count==1` → Playwright chụp 1920 + iPhone 14 Pro + đo tràn → TỰ XEM ảnh → publish Artifact (patch, chỉ file đổi) → 1 dòng HANDOFF.
2. Lựa chọn thẩm mỹ (nền, font, icon, nút): dựng **trang so** (`xem-*.html`) có thanh chọn ngay trên trang thật + dải cỡ → user chọn → mới gắn vào trang chính.
3. Grok CLI (chỉ chữ): `grok --prompt-file f --effort low --tools "" --disable-web-search --no-subagents --no-plan --max-turns 3 --output-format streaming-json --rules "…" < /dev/null > out.jsonl` chạy NỀN; 3 phương án/lượt; đề phải nêu đặc trưng UI game.
4. Dữ liệu game: script sinh ra từ file game (`scripts/build_heroes.py`, `build_nen.py`, `build_icon_nut_game.py`), không gõ tay.
5. Lên LIVE trang tĩnh (không đụng server 3Q):
   `build_site_live.py` → tar → `scp` → giải nén `/srv/tkkt/site` (`chown web3q`) → sao lưu Caddyfile → tạo sẵn file log → nối khối → `caddy validate` → `systemctl reload caddy` → kiểm bằng `--resolve` + Chromium → 3Q vẫn 200.
   Sửa nhỏ: chỉ `scp index.html` + `install -o web3q -g web3q -m 644`.
6. Trước khi restart `3qdc-unified`: đếm `/quan-tri` trong log Caddy 2 giờ; lưu md5 `/api/tin-tuc` từng host để so sau.

## 4. ĐỢT 2 đang dở — đọc kỹ

Đã sửa trên VPS (`/srv/3qdc-unified`, CHƯA commit, CHƯA restart):
- `scripts/lib/admin/games.mjs` (CRLF): game `skystory` có `sites` [`chinh` = skystory.wanmeivn.com, module tin-tuc; `game` = web.skystory, không module] + `modules: {'tin-tuc': {imageLibrary: [], uploadUrl: '/tin-tuc-anh'}}`.
- `scripts/lib/news/news-routes.mjs`: bộ lọc Trang chính/phụ (`onSite`) chỉ áp cho 3qdc.
- `checkGames()` hợp lệ; import ổn. Tag lùi `pre-tkkt-tin` (= `3d5ebde`), sao lưu `/srv/_backup/3qdc-unified-261110-tkkt-tin/`.
- **Rủi ro: bất kỳ ai restart service sẽ bật 2 thay đổi này** (đã kiểm hợp lệ, không phá 3Q theo thiết kế, nhưng chưa chạy thật).
- Mốc so trước restart: 3qdc 7 tin (md5 `d2882e5feac4`), 3qdaichien 0 tin, skystory 7 (nhầm) → sau restart phải là 7 / 0 / **0**.

Còn phải làm sau restart: Caddy khối skystory thêm proxy `/api/tin-tuc /tin-tuc/* /tin-tuc-anh/*` → 3399 + redirect `/tin-tuc` → `/#tin-tuc`, `/tin-tuc/<slug>` (điều hướng) → `/#tin/<slug>`; trang TKKT đọc `/api/tin-tuc?limit=50`, lọc theo tab, mở bài trong khung đọc (lấy `article.prose` từ `/tin-tuc/<slug>` như 3qdaichien `site.js`); chép khối Caddy vào `van-hanh-vps40/Caddyfile.redacted`; commit + bundle GitHub.
Huỷ: `git checkout -- scripts/lib/admin/games.mjs scripts/lib/news/news-routes.mjs`.

Biết trước: editor `/quan-tri` khi chọn game skystory vẫn thấy kho ảnh 3Q và chữ "Đăng lên: Trang chính/Trang phụ" (cấu hình chung của 3Q) — chỉ thẩm mỹ; bài skystory hiện đủ.

## 5. Còn treo

- Khách: "Tính năng đặc sắc hơi nhỏ" — chưa làm.
- Boom (`boom.` / `web.boom.`) — của người khác, không đụng.
- File dư trong site (`assets/icon.webp`, `.skel`) — vô hại.

## 6. Trang tin tức LIVE (10/11 16:30)

- Bản mẫu `mockups/tin-tuc.html` → bản LIVE cùng mã (`scripts/tin-tuc-app.js`, `<html data-live="1">`), dựng bởi `build_site_live.py` → `build_tin_tuc.py --live`.
- Cách C: trang tĩnh + Caddy; không restart 3qdc-unified. Thân bài lấy `<article class="prose">` từ `/tin-tuc/<slug>?noi-dung=1` kèm header `X-Tkkt: bai`.

| # | Lỗi | Nguyên nhân | Sửa / phòng |
|---|---|---|---|
| 20 | Handoff ghi "chưa restart" nhưng 2 file đã chạy | Restart 15:20:08, 19 giây sau khi sửa file | Luôn so `stat` file với `ActiveEnterTimestamp` trước khi tin handoff |
| 21 | Mở thẳng link bài → "bài không còn" | `fetch` cùng địa chỉ với trang tĩnh vừa tải → trình duyệt trả bản đệm | Địa chỉ riêng `?noi-dung=1` + `cache:"no-store"` |
| 22 | Script vá bằng heredoc làm hỏng regex (`\1` thành ký tự điều khiển 0x01 vô hình) | Escape lồng bash + Python | Script vá có dấu \ thì viết bằng Write rồi chạy; quét ký tự điều khiển sau khi vá |
| 23 | Root VPS không có tên tác giả git | Chưa `git config` | `git -c user.name=BlackCat-Ent-Studio -c user.email=…` theo các commit trước |
| 24 | Caddyfile.redacted cũ từ 17/10 | Phiên khác thêm khối không cập nhật | `che_caddy.py` dựng lại từ bản đang chạy, che hash bcrypt |

Quy trình thử trước deploy: proxy giả Caddy ở máy (`proxy_thu.py`: tin thật 3Q / rỗng / lỗi) + Playwright 1920 & iPhone; chạy `sua_caddy.py` trên bản sao Caddyfile + `caddy adapt` xem thứ tự route.
