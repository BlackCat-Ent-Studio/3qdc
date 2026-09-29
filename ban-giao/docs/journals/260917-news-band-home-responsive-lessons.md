# Phiên 16–17/09 tối: ảnh đầu trang tin (mờ dần, tắt phủ) + trang chủ cho điện thoại/tablet — kinh nghiệm, bài học, lỗi & cách sửa

HANDOFF dòng 49 (`484e08e`), 50 (`2b4707c`), 54 (`387fd54`) · plan `plans\260916-2300-trang-chu-responsive-dien-thoai\` · đọc cùng `260916-news-article-preview-header-lessons.md` và `260914-home-layout-v2-lessons.md`.

## 1. Diễn biến ngắn
1. **Mép ảnh đầu `/tin-tuc` (dòng 49):** user khoanh "lớp phủ không bao hết" + khách "viền này dùng blur phía sau như header" → đo: phủ chỉ ngang (.94 → .35), mép cắt thẳng + viền 1px → mock A/B/C → user "tùy bạn" → C (4 lớp blur lật ngược + màu nền, band tràn 88px dưới hàng tab, phủ đều .62) → nháp laptop → "deploy thử" → LIVE.
2. **Tắt lớp phủ (dòng 50):** user "phủ tối quá, làm sáng hoặc tắt" → mock D/E/F/G + **đo tương phản chữ** → Claude đề xuất G (khung kính sau chữ), nói thẳng F chữ khó đọc → user "tắt bà đi" = F → LIVE.
3. **"Trang tin responsive rồi à?"** → đo 390/768 bằng Chrome: trang tin + quản trị ổn; báo "trang chủ chưa có bản điện thoại".
4. **Trang chủ responsive (dòng 54):** khảo sát lại bằng **descriptor thiết bị** → phát hiện **mọi điện thoại + iPad đang thấy trang trắng** (lỗi nghiêm trọng, có từ `83f7d27`) → brainstorm (cách b vá file wrapper khi gửi, khối tướng tự dựng, ảnh nền cắt từ ảnh có sẵn) → plan 5 phase → user "bắt đầu hết đi, nào test kêu tôi" → làm liền 5 phase, tự chọn kiểu, server nháp VPS 3398, code review, sửa → "deploy đi" → LIVE 263 PASSED.

## 2. Kinh nghiệm làm tốt (dùng lại)
- **Kiểm responsive bằng descriptor thiết bị thật** (`devices['iPhone 13']` … bỏ `defaultBrowserType`, `hasTouch`, UA di động). Thu nhỏ viewport với UA desktop che mất mọi logic theo UA của bundle (ở đây: chuyển `/m/` → trang trắng).
- **Tìm nguồn chuyển hướng trong bundle minified:** grep `"/m/index"` trong `umi.*.js` → route có `wrappers:[…n.bind(null,"auzN")]` → grep `auzN:function` trong `views/*.js` → đọc đoạn quanh `navigator.userAgent`. Bảng tên chunk (`29:"wrappers"` + hash `29:"ff230cb3"`) cho biết **cả build A và B dùng chung file wrapper** → vá phải giữ nhánh `/fab` cho `/__internal/m`.
- **Vá bundle mà không sửa `mirror/`:** server đọc file, `split(OLD)` phải ra đúng 2 phần mới thay, cache theo mtime, không khớp → gửi gốc + log. Cùng hàm vá dùng lại trong công cụ xem trước (`page.route`) → xem trước và LIVE chạy cùng một đoạn code.
- **Công cụ xem trước cho thiết bị** (`tools\preview-mobile-playwright.cjs`): hook `browser.newContext()` (không chỉ `newPage`) để dùng descriptor, thay `LAYOUT_V2_HTML` + vá wrapper, thoát mã 2 nếu không thay/không vá được → không bao giờ "đạt" nhầm trên code LIVE.
- **Server nháp trên VPS cổng 3398** cho thay đổi `server.mjs`: copy `scripts\` + `server.mjs`, junction `mirror`/`overrides`/`node_modules`, copy `data\news`, node tạo bằng WMI; `-Clean` gỡ junction bằng `rmdir` trước `Remove-Item`. Tunnel `ssh -L 3398` để chạy verify từ laptop.
- **Deploy nhiều file bằng MANIFEST** (`path|sha1 LIVE hoặc NEW|sha1 upload`, sinh bằng `make-manifest.mjs` từ `draft\baseline`) → script từ chối nếu LIVE đổi / file NEW đã có / upload khác nháp / git bẩn; tự thêm file mới vào `C:\Temp\check-import.mjs`.
- **Chạy script cũ trên LIVE chưa sửa khi nó FAIL ở xem trước** → `check-news` + `check-features` FAIL y hệt → lỗi sẵn có, không phải do code mới (không mất thời gian sửa nhầm).
- **Đo "đường nối" bằng pixel** (`check-news-band-fade`): chụp 7 hàng quanh mép band, so màu trung bình từng cột 16px hàng trên/dưới → LIVE cũ chênh 86–238, nháp 0. Ẩn nội dung đè lên mép (`#news-app`) trước khi chụp.
- **Đo tương phản chữ trên ảnh** trước khi đề xuất tắt lớp phủ: ẩn chữ, chụp vùng chữ, lấy độ sáng phân vị 90% → tỉ lệ với màu chữ; kèm "độ sáng nửa phải ảnh" → user thấy đánh đổi bằng số.
- **Vuốt thật trong headless:** CDP `Input.dispatchTouchEvent` (touchStart → 8 touchMove → touchEnd) sinh pointer events `pointerType:'touch'` và tôn trọng `touch-action`.
- **Dữ liệu tướng có sẵn cho điện thoại:** list theo phe có `新官网移动立绘` (750×1624 nền trong suốt, ~128KB) + `新官网Icon`/`hoverIcon`; overlay i18n của trang chủ **tự dịch** tên tướng tiếng Trung chèn vào DOM → tra `HERO_SKILLS` bằng `MutationObserver` trên phần tử tên (như khung desktop), không cần bảng tên riêng.
- **Code reviewer chỉ đọc, giao đúng phạm vi + ràng buộc** ("desktop phải y nguyên", "chuỗi JS trong template literal", "iOS Safari") → bắt 4 lỗi thật (M1 `#/m/` phải xử lý trong `RF` trước umi, M2 `/__internal/m`, M3 iOS không gửi click → `pointerdown`, M4 `touch-action:pan-y` chặn pinch-zoom).

## 3. Lỗi đã gặp → nguyên nhân → cách sửa
| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| E1 | Báo user "trang chủ chưa responsive" trong khi thật ra **trang trắng** trên mọi điện thoại | Thử bằng Chrome UA desktop thu nhỏ viewport | Luôn kiểm bằng descriptor thiết bị; báo lại user mức độ đúng |
| E2 | Mock dải mờ lần 1: mép phải band còn vệt sáng cứng | Gradient màu đặt **dưới** 4 lớp blur (blur lấy mẫu mép) | Lớp màu `b` đặt **trên** lớp blur, đặc từ 84% |
| E3 | Script check-news-band-fade đo "đường nối" FAIL trên nháp | Hàng pixel dưới mép có thẻ bài/khung (nội dung, không phải mép) | Ẩn `#news-app` trong lúc chụp so pixel |
| E4 | `ssh company-vps '… $g = "C:\…\git.exe"; & $g …'` không chạy gì | Windows bỏ dấu `"` trong lệnh ssh → `$g` = output của `git` trống | Ghi đường dẫn exe đầy đủ mỗi lệnh / dùng `.ps1` (đã ghi memory) |
| E5 | `Invoke-WebRequest` qua ssh: "Access is denied reading the console output buffer" | Thanh tiến trình PS 5.1 trong phiên ssh không console | Kiểm từ laptop bằng `curl` qua tunnel (hoặc `$ProgressPreference='SilentlyContinue'`) |
| E6 | Tunnel `ssh -L 3398` "exit 255" nhưng curl vẫn tới cổng | Tunnel cũ của phiên khác còn giữ cổng | Kiểm `Get-NetTCPConnection` 2 máy, dùng cổng riêng khi có phiên song song |
| E7 | Node heredoc bash: regex `/\/views\/…/` thành `//views/…` (comment) | Heredoc + chuỗi JS mất `\` (đã có memory) | Sửa bằng Edit tool; script sinh nội dung có `\` thì viết bằng Write tool (dùng `String.fromCharCode(92)`) |
| E8 | PowerShell deploy script sinh bằng heredoc: `"$live\scripts\lib\news\$f"` thành `…news\"` | `\$` trong heredoc không quote bị bash nuốt | Viết `.ps1` bằng Write tool, tránh `$var` sau `\` |
| E9 | iPad ngang (1024–1194) bản desktop: khung `/tuong` trống, thanh MXH đè, bố cục lệch | Breakpoint chỉ theo bề rộng ≤1023 | `COMPACT_MQ` thêm `(pointer:coarse) and (max-width:1366px)` |
| E10 | `@media ${COMPACT_MQ} and (prefers-reduced-motion)` sai khi MQ có dấu phẩy | `A, B and C` = `A` hoặc `(B and C)` | Tách: `@media (prefers-reduced-motion:reduce){…}` riêng |
| E11 | Ảnh tướng khi điện thoại xoay ngang còn một dải hẹp | `aspect-ratio` + `max-height:70vh` không co bề rộng | `width:min(100%,max(320px,calc(70vh*.75)))` |
| E12 | Bấm "Đặc sắc" trong menu: khối dừng dưới header 80–300px | **Khối cuối không đủ cao để cuộn tới** (compact đặt `min-height:0`), không phải do dịch layout | Khối cuối `min-height:calc(100vh − 56px − 76px)` như desktop; thêm `keepLanding()` cho dịch layout thật |
| E13 | `check-home-mobile` báo "1 /m/ chunk" trên mọi thiết bị | Tên chunk vendor dùng chung chứa chữ `p__web_m__` | Lọc `/\/views\/p__web_m__(?!Fab)/` |
| E14 | "sections start below panel" FAIL | So với `#home-v2` (padding-top đẩy nội dung, phần tử không dịch) | So với khối đầu tiên `#hv2-news` |
| E15 | Vuốt ở điện thoại ngang không đổi slide, rồi `page.tap` timeout | Toạ độ vuốt nằm ngoài màn (342px cao) | `scrollIntoView({block:'center'})` phần tử trước mỗi vuốt/chạm |
| E16 | iPad Mini ngang: "swipe left 1 → 0" | Autoplay chuyển slide giữa lúc đọc chấm và vuốt | Vuốt 1 lần trước (vuốt giữ autoplay 4,5s) rồi mới đo |
| E17 | Nút tải 2×2 ở iPhone SE cao 39px | 320px − lề − padding không đủ cho tỉ lệ ảnh 197:60 | ≤359px: lề/padding 8 → ~42px (chấp nhận 41+) |
| E18 | Chạm ra ngoài menu trên iOS không đóng (review) | iOS không phát `click` khi chạm nội dung thường | `pointerdown` capture trên document |
| E19 | Mở thẳng `/#/m/index` vẫn trắng (review) | `sync()` chạy ở DOMContentLoaded, sau khi umi đọc hash | Thêm `#/m/` vào `RF` (script đầu `<head>`) |
| E20 | `/__internal/m` (fab mobile cũ) sẽ hỏng (review) | Build A dùng chung wrapper, cần chuyển `/fab` → `/m/fab` | Vá giữ redirect khi `o === "/fab"` |
| E21 | Chụp `fullPage` iPad ngang ra bố cục desktop | Chụp cả trang đổi kích thước giả lập → mất `pointer:coarse` | Tin ảnh viewport / đo `getComputedStyle` trước khi chụp |

## 4. Sự thật kỹ thuật
- `views/wrappers.ff230cb3.async.js` module `auzN`: `r()` = regex UA di động (hoặc iframe host "pre" + innerWidth<500); `o = route.path` (`/main*` → `/index`); `return !0!==r()||o.includes("/m/") ? (!1===r()&&o.includes("/m/") ? Redirect(bỏ /m/) : children) : Redirect("/m"+o)`. Dùng chung umi `62525e29` (build B) và `ca75703e` (build A).
- Mirror chỉ có chunk mobile `p__web_m__Fab__Fab`; `p__web_m__Index__index` 404.
- Build B viewport meta: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`; root font-size co theo bề rộng (52px @390).
- Trang chủ trên điện thoại (sau bản vá): `.star-site-index` + `.star-site-imgBg` absolute cao 100vh, `decorate__bottom` rộng hơn màn (gây tràn 4px @320) → ẩn trong bố cục gọn.
- Dữ liệu tướng: `getQueryDataInfoListByCategory` tbId `452555206502894595`, categoryIds Ngụy `454680400827016705`, Thục `…706`, Ngô `…707`, Quần `…708`, `size:50` (13/phe); body phải **byte-giống** request của `/tuong` (snapshot khoá theo sha1 body).
- Trang tin `/tin-tuc`: `.band` là ảnh nền đầu trang danh sách (chỉ trang danh sách), header 88px cố định; header dùng 4 lớp blur mask 100→124/76→108/48→88/20→64.
- Playwright: `page.route` với glob có `?` không khớp query → dùng RegExp.

## 5. Còn mở (HANDOFF mục G)
Thử máy thật (Safari iOS, Android); viewport `user-scalable=no`; iOS ≤14 `aspect-ratio`; `check-features` lazy banner FAIL sẵn có; `check-news`/`check-news-page` giả định 0 bài; nền header tối lộ rõ trên ảnh đầu trang tin sáng (user chưa trả lời).
