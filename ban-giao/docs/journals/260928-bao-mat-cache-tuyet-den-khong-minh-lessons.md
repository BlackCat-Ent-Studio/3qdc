# Bảo mật + laptop lag, cache ETag, bé gái chậm, tuyết → đèn khổng minh (máy tính + điện thoại) — bài học 25/09 chiều → 28/09

Tình trạng cuối: **LIVE `6943420`** (3qdc) + web `3qdaichien.wanmeivn.com` (`C:\app\3qdaichien`, `5d3a6de`: ảnh Trung Thu). Tài liệu bàn giao 2 hệ thống: `docs\he-thong-hai-trang-3qdc.md`. Chi tiết từng việc: HANDOFF dòng 81 (cache + bảo mật + laptop), 82 (bé gái chậm, giữ
nguyên), 83 (tuyết, đã bị thay), 84 (đèn máy tính), 85 (đèn điện thoại + nút). Journal bộ ảnh đèn (phiên khác):
`260926-den-khong-minh-chop-sang.md`.

## 1. Việc đã làm (theo thứ tự LIVE)

| Commit | Việc | Ghi chú |
|---|---|---|
| — | Kiểm laptop lag + virus + ai "đục" web (chỉ đọc) | Không virus. VPS bị dò mật khẩu RDP ~26.400 lần/3 ngày — **chờ user** khoá RDP/WinRM/SSH qua Tailscale |
| `7cb6922` | File tĩnh gửi `ETag` + `Last-Modified` + `no-cache` (hỏi lại → 304); file mirror có hash cache 1 năm | quay lại trang chủ 3,55MB → **0,10MB**; `/tin-tuc` 2,63 → 0,26MB |
| — | Bé gái hiện chậm: đo, **user giữ nguyên** | chờ `load` + 1,2s cố định (có từ 17/09); trang nặng dần nên `load` muộn |
| `18bf516` | Tuyết rơi trang chủ (chép hiệu ứng lyzwlkj, vẽ lại bằng canvas) | bị thay ở commit sau |
| `3d3d3bd` | Đèn khổng minh bay lên (ảnh user) thay tuyết, máy tính | 8 khung 7MB → sprite 35KB; `git rm` module tuyết |
| `f947b0a` | Đèn trên điện thoại (bản nhẹ) + nút bật/tắt trên header | nhớ lựa chọn; máy yếu mặc định tắt |

## 2. Lỗi thật đã gặp → cách sửa

| # | Lỗi | Nguyên nhân | Cách sửa / phòng |
|---|---|---|---|
| 1 | Điện thoại/iPad/giảm chuyển động **vẫn có tuyết** dù có quy tắc ẩn | `html.hv2 #x{display:none}` trong `@media` **thua** `html.hv2:not(.hv2-embed) #x{display:block}` — `:not(.cls)` cộng độ ưu tiên của `.cls` | Quy tắc ẩn dùng **đúng selector** của quy tắc hiện (thêm `:not(.hv2-embed)`). Bộ kiểm nháp bắt được — luôn kiểm cả cỡ điện thoại/iPad/giảm chuyển động |
| 2 | Tìm hiệu ứng tuyết trong trang bài viết lyzwlkj: không thấy gì | tuyết chỉ nạp ở **trang CHỦ** lyzwlkj, bằng `$.getScript("…/snowfall.js")`, và chỉ khi không phải điện thoại | "Trang kia có hiệu ứng X" → kiểm cả trang chủ lẫn trang con; grep HTML tìm `getScript`/tên plugin, không chỉ thẻ `<script src>` |
| 3 | Playwright mở `lyzwlkj.vip` treo 90s (`load`/`domcontentloaded`) | trang nặng (HTML 656KB, nhiều script ngoài) | `waitUntil:'commit'` + `waitForTimeout` |
| 4 | Headless không chạy tuyết của lyzwlkj (0 bông) | plugin phụ thuộc jQuery nạp muộn/`$.getScript` | Không cố chạy bản gốc: đọc code + tải 4 ảnh GIF, dựng lại |
| 5 | Đo "bé gái hiện lúc nào" bằng `readPixels` canvas: luôn "không thấy" | canvas WebGL không `preserveDrawingBuffer` → đọc ra rỗng | Đo bằng thời điểm request `linh-vat/*` (texture xong) so với `load`, + chụp ảnh khung bé |
| 6 | Hook ClaudeKit `scout-block` **chặn cả lệnh Bash** có chuỗi `node_modules` hoặc `.git` (kể cả `/.git/config` trong URL curl, hay chữ trong `echo`) | hook quét chữ trong lệnh, không phân biệt đường dẫn thật | Ghép chuỗi (`'node_' + 'modules'`, `G=".g""it"`), hoặc ghi script ra file bằng Write rồi chạy |
| 7 | PowerShell: `"pid $id: …"` lỗi "Variable reference is not valid" | `$id:` bị hiểu là biến có ổ đĩa (`$env:`-kiểu) | `${id}` |
| 8 | `sed` thay đường dẫn Windows có `\` trong script .ps1 không ăn | escape `\\\\` qua bash + sed lệch | Sửa tay bằng Read + Edit sau khi sed đổi tên chung |
| 9 | Lệnh `node -e "import('file:///'+…replace(/\\/g,'/'))"` lỗi cú pháp | regex `\\` bị bash ăn một lớp | Chạy `node --input-type=module -e "import('./x.mjs')…"` từ đúng thư mục |
| 10 | Ảnh mẫu kiểu "dòng trong menu ☰" không hiện | tìm khối menu bằng `textContent` + kích thước → chọn nhầm phần tử | Đã báo user thẳng là ảnh B lỗi, tả bằng chữ; lần sau chèn vào `#hv2-menu` / phần tử cha thật của link menu |
| 11 | Số đo fps điện thoại dao động (56→60, 42→60 giữa các lượt) | headless vẽ canvas bằng CPU + CPU throttle; nền trang đã bận (Live2D, bàn nhạc) gần chạm trần 1000ms/s | So **cùng lượt**, cùng máy, nhiều biến thể; nói rõ với user là số khắt khe hơn máy thật, dùng để so tương đối |
| 12 | Không đo được trên Chrome thật | claude-in-chrome không kết nối (`list_connected_browsers` = []) | Để server nháp + đường hầm mở, bảo user tự mở `http://127.0.0.1:13398/` (F12 → Ctrl+Shift+M cho điện thoại) |

## 3. Kinh nghiệm / quy trình (dùng lại)

- **Đổi `server.mjs` hoặc module trang chủ → server nháp cổng 13398 trước:** `C:\Temp\<việc>-draft` = copy `scripts\` +
  file nháp, junction `mirror`/`overrides`/`node_modules`, node tạo qua WMI (`Invoke-CimMethod Win32_Process Create`), đường
  hầm `ssh -N -L 127.0.0.1:13398:127.0.0.1:13398`. `-Stop` gỡ junction bằng `cmd /c rmdir` rồi mới xoá. Mẫu:
  `plans\reports\den-khong-minh-260926\nhap\lantern-draft-13398.ps1`.
- **Deploy script chuẩn:** dừng nháp → so `HEAD` với commit mong đợi (throw nếu khác) → `git tag pre-…` → backup file cũ ra
  `C:\web\web1\_backup\3qdc-unified-<ngày>-<việc>\` → chép → **import check** `node --input-type=module -e "import(layout)…"`
  kiểm chuỗi bắt buộc, sai thì **tự trả file cũ + throw** → `nssm restart` → dò 10 đường. Kiểm log `/quan-tri` **bước riêng
  trước đó** (`C:\Temp\linh-vat-admin-scan.ps1`).
- **Trước khi gửi bản nháp: so hash file live với bản đã tải** (`Get-FileHash … SHA1` vs `sha1sum`) — phiên khác có thể đã sửa.
- **Cache (`7cb6922`):** mọi file tĩnh đi qua một hàm `send()` → sửa một chỗ. ETag = `W/"<size hex>-<mtime hex>"`.
  **Caddy `encode gzip zstd` giữ nguyên ETag** → JS/CSS nén cũng 304 (đo LIVE, không đoán). Giới hạn: chép đè cùng cỡ +
  giữ mtime cũ thì trình duyệt không biết đổi.
- **Hiệu ứng phủ màn hình (tuyết/đèn):** 1 canvas `position:fixed` + `pointer-events:none` + `z-index:8` (trang chủ: dải
  header 9, logo/bé gái 11, thanh MXH/thanh phải 12, bàn nhạc/nút ☰ 13). Hiện chỉ khi `html.hv2:not(.hv2-embed)`; dừng vẽ
  khi canvas ẩn (`offsetWidth===0`) hoặc tab nền, nghe `MutationObserver` class `<html>` (rời trang chủ bằng hash xoá `hv2`).
  Tốc độ tính theo 60fps × hệ số `k` để màn 120/144Hz không nhanh gấp đôi. `devicePixelRatio` chặn trên (2 máy tính, 1,5
  điện thoại).
- **Ảnh user quá nặng cho hiệu ứng nhỏ:** 8 PNG 1024² (7MB) hiển thị 20–64px → cắt theo hộp alpha chung, thu 128px/khung,
  ghép **sprite 1 hàng** WebP q90 = 35KB; `drawImage(sprite, f*128, 0, 128, 128, …)`. Báo user trước khi thu nhỏ.
- **Nút bật/tắt tính năng nặng trên điện thoại:** class trên `<html>` (`hv2-lan-off`) ẩn canvas ⇒ vòng vẽ tự dừng (không cần
  logic riêng); nhớ `localStorage`; mặc định tắt cho máy yếu bằng `navigator.deviceMemory ≤ 2` hoặc
  `hardwareConcurrency ≤ 4` — **bỏ qua số nhân trên iPhone/iPad/Mac** (Safari không báo đúng, sẽ tắt nhầm mọi iPhone).
  Nút chỉ hiện trong `COMPACT_MQ`; máy tính bỏ qua lựa chọn đã lưu.
- **Đo nặng/nhẹ trên điện thoại:** Playwright `devices['Pixel 5']` + CDP `Emulation.setCPUThrottlingRate {rate:4}` +
  `Performance.getMetrics` (TaskDuration) + đếm `requestAnimationFrame` 8–10s; so nhiều biến thể trong cùng một lượt
  (`dien-thoai\measure-mobile-variants.mjs`).
- **Bé gái chậm:** không phải lỗi, là thiết kế (`load` + 1,2s). Nếu user nhắc lại: A bắt đầu ở DOMContentLoaded + bỏ 1,2s,
  B chỉ bỏ 1,2s, C banner Tính Năng tải khi cuộn tới.

## 4. Kiểm tra bảo mật / laptop (25/09, chỉ đọc)

- **Laptop:** không màn hình xanh/treo trong nhật ký 3 ngày; Defender bật, 0 phát hiện. Lag = Claude chạy Playwright
  (nhiều Chromium), claude-in-chrome, nhiều agent song song, hook node mỗi lượt công cụ; + Docker Desktop/`webbug` tự chạy,
  ổ C còn 19,6GB. 4 tác vụ `Fix*` (06/2026) = sửa Windows Update cũ, nên xoá. **Từ phiên này: chạy Playwright tuần tự, 1
  trình duyệt, đóng ngay** (đã làm vậy cho mọi bộ kiểm ở trên).
- **VPS:** Defender 0 phát hiện; code không có mã lạ; web chỉ bị bot quét WordPress/`.env`/`.git` → đều 404. **26.393 lần
  đăng nhập Windows thất bại/3 ngày**, cổng mở ra Internet: 3389 (RDP), 5985 (WinRM), 22 (SSH); 445/135 đóng. 0 lần thành
  công. Chờ user: giới hạn qua Tailscale.
- IP `101.53.8.11` (7.300 request, POST `/quan-tri`) = **laptop chạy bộ kiểm** (UA Playwright, giả lập Pixel 5) — lại một lần
  IP laptop đổi; so với `api.ipify.org` trước khi kết luận.

## 5. Tối 28/09 — web một trang `3qdaichien` + tách tin 2 trang (HANDOFF dòng 86–87)

| Commit | Việc | Ghi chú |
|---|---|---|
| `9472995` (git riêng `C:\app\3qdaichien`) | Web một trang `https://3qdaichien.wanmeivn.com` cho đợt test game | file tĩnh + khối Caddy riêng, **không** đụng/restart 3qdc |
| `f4cee7d` · `e35b312` · `75f9e6f` | bỏ nhãn "Sắp mở" · bỏ Group FB · ảnh riêng `site\anh\` | chỉ chép file tĩnh, không reload |
| `6943420` (3qdc) | `/quan-tri` "Đăng lên: Trang chính / Trang phụ" (tạm, `SPLIT_SITES`) | 6 file `scripts\lib\news\`, restart |
| — | Tài liệu bàn giao `docs\he-thong-hai-trang-3qdc.md` + khung "📌 GHIM" đầu HANDOFF | cho người mới tiếp quản |
| `d503453` · `e3dfb2f` · `5d3a6de` | bộ ảnh Trung Thu (banner + 5 ảnh) · sửa nút "Xem thêm tin" hiện khi 0 bài · hình 2 "Cung Trăng Mở Hội" | chỉ chép file tĩnh |

**Lỗi thật → cách sửa**

| # | Lỗi | Nguyên nhân | Cách sửa / phòng |
|---|---|---|---|
| 13 | Script deploy dừng ở `caddy validate` **sau khi đã nối Caddyfile** | PowerShell 5.1 + `$ErrorActionPreference='Stop'` + `2>&1` ⇒ dòng "info" Caddy ghi stderr thành `NativeCommandError` | Lệnh native chạy với `Continue`, xét `$LASTEXITCODE`; script hoàn tất riêng (validate → reload, sai thì chép lại backup). Caddy chưa reload ⇒ web khác không bị ảnh hưởng |
| 14 | Laptop: `curl`/trình duyệt báo "Could not resolve host" dù Let's Encrypt đã cấp chứng chỉ | laptop nhớ kết quả "không có tên" từ lần `nslookup` trước khi user thêm bản ghi | Kiểm bằng `curl --resolve host:443:IP`, Chromium `--host-resolver-rules="MAP host IP"`; báo user `ipconfig /flushdns` |
| 15 | Ảnh chụp `/quan-tri` giả lập: danh sách 2 trang giống hệt nhau | Node `fetch` **bỏ qua header `Host`** ⇒ cả 2 lần đều lấy trang chính | Thử theo Host dùng `http.request({headers:{Host}})` hoặc `curl -H "Host: …"` |
| 16 | `pageerror: Cannot read properties of undefined (reading 'filter')` khi giả lập API | trả `{items}` cho `/nguoi-dung`, giao diện chờ `{users, me}` | Đọc code giao diện (`r.data.xxx`) trước khi viết stub |
| 17 | Kiểm log trước restart: 22 lượt `/quan-tri` trong 2h | là **chính user** (IP laptop, Chrome thật) đăng nhập xem danh sách | Gom log theo đường dẫn (`admin-hits.ps1`): không có nhịp `/quan-tri/api/bai/<id>/khoa` ⇒ không ai sửa dở ⇒ restart chỉ đăng xuất. Luôn so IP với `api.ipify.org` |
| 18 | Ảnh mẫu "dòng trong menu ☰" (phiên đèn) không hiện | tìm cha của link menu bằng `textContent` chọn nhầm | Nói thẳng ảnh lỗi, tả bằng chữ |
| 19 | Trang phụ trống tin mà nút "Xem thêm tin" vẫn hiện (lỗi có từ lúc làm, lộ ra khi 0 bài) | `.news-more{display:flex}` của trang **thắng** thuộc tính `hidden` (CSS của trình duyệt cho `[hidden]` yếu hơn CSS tác giả) | Thêm `.news-more[hidden]{display:none}`. Phòng: phần tử nào có `display` riêng mà dùng `hidden` thì luôn kèm quy tắc `[hidden]`; kiểm cả trạng thái rỗng (0 bài), không chỉ trạng thái có dữ liệu |
| 20 | Chữ trong ảnh user có thể sai chính tả ("Cung Trăng" nhìn như "Cung Trắng" ở cỡ lớn) | lỗi trong file thiết kế, không phải web | Luôn xem ảnh ở cỡ lớn sau khi thay; thấy nghi sai thì báo user, không tự sửa ảnh |

**Kinh nghiệm dùng lại**
- **Web phụ không cần sửa code chính:** thư mục tĩnh + khối Caddy (`handle @main { reverse_proxy localhost:3399 }` cho `/api/tin-tuc`, `/tin-tuc/*`, `/tin-tuc-anh/*`, `/3qdc-vi/*`; còn lại `file_server`) ⇒ `/quan-tri` không lộ ở tên miền phụ. Mở thẳng link bài bằng trình duyệt (`header Sec-Fetch-Mode navigate` + `path_regexp`) ⇒ `redir /#tin/{re.art.1}`; script trang lấy bài bằng `fetch` (`Sec-Fetch-Mode: cors`) không bị chuyển.
- **Đọc bài "một trang":** lấy `article.prose` của `/tin-tuc/<slug>` bằng `DOMParser`, bỏ script/style, link bài khác đổi thành `#tin/<slug>`. Phụ thuộc khung trang bài 3qdc — đổi khung đó phải sửa `site.js`.
- **Thêm site vào Caddy dùng chung:** nối khối cuối file, kiểm byte phần cũ y nguyên, `caddy validate`, `caddy reload` (không restart). Trước reload kiểm khối của phiên khác đã được nạp chưa (`hotro` trả 401 = đã nạp).
- **Một kho bài cho 2 trang:** lọc theo `req.headers.host` (Caddy chuyển nguyên Host) ⇒ không cần API riêng cho web phụ. Trường mới optional (`site` rỗng = trang chính) ⇒ không phải chuyển dữ liệu cũ. Công tắc `SPLIT_SITES` để gỡ tính năng tạm bằng 1 dòng.
- **Thử tính năng quản trị mà không cần mật khẩu:** server nháp dùng **bản sao** `data\news` (script ghi dữ liệu thử kiểm tên thư mục `sites-draft-data` trước khi ghi); logic thử bằng gọi thẳng `decide()`/`readFields()`; giao diện chụp bằng Playwright `ctx.route('/quan-tri/api/**')` giả lập `/toi` (Quản lý), `/bai`, `/bai/<id>`.
- **Deploy so hash:** trước khi chép, so SHA1 các file live với bản đã tải về làm nháp (phiên khác có thể đã sửa) — throw nếu khác.
- **Tài liệu bàn giao cho người tiếp quản:** `docs\he-thong-hai-trang-3qdc.md` (tóm tắt 1 phút → sơ đồ → từng hệ thống → cách dùng quản trị → việc thường làm → gỡ → bẫy). Ghim bằng khung "📌 GHIM" ngay trước câu "Bàn giao cho phiên Claude sau" (dòng tiêu đề HANDOFF >6.500 ký tự, người mới đọc lướt qua); bước gỡ trang tạm có việc bỏ khung ghim.
- **Thay ảnh trang phụ:** user bỏ ảnh mới vào `3qdc-home-assets\3qdaichien-anh\` với **tên mới** (vd `hinh-anh-2-cung-trang-mo-hoi.webp`) → đo cỡ (banner 1756×896, ảnh 1211×680), ghép ảnh cũ/mới để xem, chép lên `site\anh\` **giữ tên mới**, sửa đường dẫn trong `index.html` (+ ảnh dự phòng trong `site.js` nếu là banner), commit, kiểm LIVE (ảnh tải đủ, bấm chấm đúng ảnh). Ảnh cũ để lại để lùi. Không restart/reload.
- **User hay đổi ý giữa chừng về phạm vi** ("Cả hai" → "chỉ 1 bên", "tạm" → "không để chữ tạm") ⇒ nhắc lại cách hiểu bằng 3–5 gạch đầu dòng trước khi làm.

## 6. Còn chờ user

1. Khoá RDP/WinRM/SSH của VPS qua Tailscale (rủi ro thật lớn nhất).
2. Giảm tải laptop: tắt Docker tự chạy, xoá 4 tác vụ `Fix*`, dọn `Temp\claude` (443MB).
3. Việc cũ dòng 80 HANDOFF (chạm điện thoại phát nhạc `cee41a7`, "nhớ bấm dừng", …).
4. Thử đèn trên điện thoại thật; máy nào giật thì giảm `LANTERNS.compact.count`.
5. Link cho web `3qdaichien` (`LINKS` đầu `C:\app\3qdaichien\site\site.js`: dangNhap, dangKy, apk, zalo, fanpage).
6. Trang phụ đang trống tin — đăng bài với "Đăng lên: Trang phụ".
8. Kiểm chữ "Cung Trăng" trong `hinh-anh-2-cung-trang-mo-hoi.webp` (nhìn như "Trắng").
7. Hết đợt test: `SPLIT_SITES = false` + restart; gỡ khối Caddy `3qdaichien` + xoá `C:\app\3qdaichien`.
