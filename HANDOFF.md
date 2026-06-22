# HANDOFF — zgshx → 3Q Đại Chiến (offline mirror + VN localization)

Bàn giao cho phiên Claude mới. Đọc file này trước khi làm gì.

## 1. Dự án là gì
Mirror offline **1:1** của `https://sgzhx.lingxigames.com/#/fab` (game UmiJS 3.5.43, React SPA, **không có sourcemap**), đang được **Việt hoá** và **đổi thương hiệu thành "3Q Đại Chiến"**.

- **Live:** https://3qdc.wanmeivn.com
- **Chạy bằng:** NSSM service `3qdc-mirror` → Node `server.mjs` trên **port 3300** (reverse_proxy qua Caddy). Đang `Running`.
- **Thư mục:** `C:\web\web1\zgshx` (mirror/ + server.mjs + scripts/)
- **GitHub:** `BlackCat-Ent-Studio/3qdc` (PRIVATE). ⚠️ **79 file chưa commit** (toàn bộ phần localization) — chưa push.

## 2. Kiến trúc (đọc kỹ — quan trọng)
- `mirror/` = bản clone tĩnh (HTML/JS/CSS/ảnh) theo cây host gốc. Đây là nguồn phục vụ.
- `server.mjs` = static server. Route đặc biệt:
  - `/` → **shell.html** (iframe đổi PC↔mobile theo bề rộng, breakpoint 768px)
  - `/__internal/pc/` → `mirror/index.html` + inject overlay
  - `/__internal/m/` → `mirror/index.html` + inject overlay + **UA-spoof shim** (ép app vào route mobile `#/m/fab` vì app hard-route theo UA)
  - `/api/ages/fetch*` → snapshot JSON; `/r.png`,`/beacon` → 204 (tracker)
  - asset: `Cache-Control: no-store` (đang giai đoạn sửa ảnh — F5 thấy ngay)
- **3 overlay inject (additive, KHÔNG sửa bundle gốc)** ở `scripts/lib/`, nối vào HTML khi serve:
  - `ua-spoof-shim.mjs` — giả navigator để mobile route hoạt động
  - `i18n-overlay.mjs` — dịch text DOM zh→vi (từ điển) + override `.mainTitle___qtaOT` = "3Q Đại Chiến - Huyền Thoại Tam Quốc" + đổi tên game `三国志幻想大陆`→"3Q Đại Chiến" toàn trang
  - `hide-overlay.mjs` — ẩn (display:none) các phần không muốn (QR/social, logo, badge 12+, footer pháp lý PC+mobile, subtitle, icon 5周年)
- **server.mjs nạp vào RAM** → sửa `server.mjs` hoặc 3 overlay phải **`nssm restart 3qdc-mirror`** mới có hiệu lực. Sửa file trong `mirror/` thì KHÔNG cần restart (server đọc đĩa mỗi request).

## 3. Quy trình thay ảnh (cách user làm việc)
User bỏ ảnh Việt vào `new site-image/` (giữ ĐÚNG tên file gốc), rồi bảo "thêm/thay vào". Có **3 cơ chế** tuỳ ảnh nằm đâu:

| Ảnh nằm ở | Cách thay | Script tham khảo |
|---|---|---|
| File trong `mirror/` (PC + mobile bars/banners/hero/nút) | convert jpg→png (System.Drawing) **ghi đè đúng file .png** (giữ tên) | `apply-mobile-banners.mjs`, các lệnh inline |
| **base64 trong CSS** (3 nút nav PC: store/exchange/index) | encode base64 → thay data-URI trong chunk CSS | `embed-nav-buttons.mjs` |
| **base64 trong JS** (mobile: title 版本内容 + 3 nút nav) | encode base64 → thay data-URI trong `p__web_m__Fab__Fab.8e33ff58.async.js` | `embed-mobile-b64.mjs`, `embed-mobile-nav2.mjs` |

**Luôn:** backup vào `image-backup/<nhóm>/` trước khi ghi đè, rồi chụp Playwright verify.

### ⚠️ GOTCHAS bắt buộc nhớ
1. **JPEG xoá nền trong suốt** → ảnh NỔI trên nền khác (nút tròn, logo, tiêu đề có vạch) phải là **PNG nền trong suốt** (color-type 6). JPG cho mấy cái này = **ô trắng**. Ảnh LẤP ĐẦY khung (hero/banner/bar) thì JPG OK.
2. **cdn.aligames "*.png" thực ra là webp bytes** → đọc header PNG ra rác. Đừng tin dim-parser, cứ convert qua System.Drawing.
3. **Cache trình duyệt:** server đã `no-store` nhưng bản cũ đã cache thì user phải **Ctrl+Shift+R** một lần (hoặc cửa sổ ẩn danh). F5 thường KHÔNG xoá cache cũ.
4. **CJK/UTF-8:** TUYỆT ĐỐI không dùng PowerShell `Set-Content`/`Out-File` lên HTML/JS có chữ Hán/Việt (mojibake + BOM). Dùng Edit/Write hoặc Node string ops / .NET UTF8-no-BOM.
5. **Mobile dùng FILE/ELEMENT KHÁC PC** cho cùng nội dung (bars, title, nav) → thay PC xong vẫn phải tìm + thay riêng cho mobile.

## 4. Đã xong (Việt hoá)
- **Text DOM:** 0 chữ Hán (i18n overlay), tên game → "3Q Đại Chiến" toàn trang, mainTitle rebrand, subtitle ẩn.
- **PC:** hero, 5 thanh accordion (tím+đỏ), tiêu đề 版本内容, 4 banner, 3 nút nav (base64 CSS), nút 进入官网/下载. Đã ẩn: QR/social, logo, badge 12+, footer pháp lý.
- **Mobile:** hero, tiêu đề, 5 thanh accordion, 5 banner expansion, 3 nút nav + tải (base64 JS). Đã ẩn: footer, logo game, badge 12+, icon 5周年, subtitle.

## 5. Còn lại (TODO — chữ trong ẢNH, cần user đưa ảnh Việt)
- **Bar 1 mobile lệch chữ:** bản đỏ `ml4u58x` = "THẦN UY THIÊN TUNG" vs bản tím `ml4u56z2` = "THẦN UY THIÊN TÀI" → cần đồng bộ (gợi ý đúng Hán-Việt: "THIÊN TÚNG").
- Mảng **"App Store 精选推荐 / TapTap 热门榜第"** dưới hero mobile — vẫn tiếng Trung.
- Rà các state đỏ/tím còn lại của bar 2/3/4/5 mobile xem khớp chữ chưa.
- (Tuỳ chọn) commit + push 79 file lên GitHub.

## 6. Lệnh hay dùng
```powershell
# restart service sau khi sửa server.mjs / scripts/lib/*
nssm restart 3qdc-mirror
# kiểm tra port
Get-NetTCPConnection -LocalPort 3300 -State Listen
# verify nhanh (context sạch, không cache)
node scripts/shot-full.mjs        # chụp PC + mobile → verify-out/full-*.png
```
Mẫu thay 1 ảnh file (jpg→png, ghi đè giữ tên):
```powershell
Add-Type -AssemblyName System.Drawing
$old = Get-ChildItem -Recurse mirror -File -Filter "<TÊN>.png" | Select-Object -First 1
Copy-Item $old.FullName "image-backup\<nhom>\<TÊN>.png"   # backup
$i=[System.Drawing.Image]::FromFile((Resolve-Path "new site-image\<TÊN>.jpg")); $b=New-Object System.Drawing.Bitmap $i; $i.Dispose()
$b.Save($old.FullName,[System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose()
```

## 7. Phong cách làm việc với user (QUAN TRỌNG)
- User đưa ảnh/DOM, mình thay → **verify (MD5/screenshot)** → **DỪNG, chờ lệnh tiếp**. KHÔNG tự chạy chuỗi nhiều bước.
- Brutal honest: nếu chữ trong ảnh user vẽ bị sai/lệch (vd typo, 2 state khác chữ) → nói thẳng nhưng vẫn áp theo yêu cầu.
- Báo cáo ngắn gọn + nhắc Ctrl+F5.

## 8. Tham chiếu
- Plan: `plans/260523-1637-...` (PC clone), `plans/260523-1754-...` (dual-view)
- Skill nguồn: `skills/dual-view-mirror/`, `subdomain-deploy/`
- Chỉ mục ảnh: `site-images/IMAGES-INDEX.md`
- Backup ảnh: `image-backup/{accordion-bars-pre-vi, batch2-pre-vi, batch3-png-transparent, css-nav-pre-vi, mobile-banners-pre-vi, mobile-bars-fix, mobile-js-pre-vi}`

---

## Session 2 (2026-06-03) — Việt hoá + rebrand "3Q Đại Chiến"

**Đã xong:**
- Text DOM 100% VN qua i18n overlay; tên game `三国志幻想大陆` → "3Q Đại Chiến" toàn trang; mainTitle = "3Q Đại Chiến - Huyền Thoại Tam Quốc"; tab title + favicon (badge) đổi (cả shell.html lẫn entry).
- Ảnh VN (convert jpg→png ghi đè mirror): hero, 5 thanh accordion (tím+đỏ) + 5 banner — CẢ PC lẫn mobile (mobile dùng file/element khác).
- Nút nav (store/exchange/index): PC = base64 trong CSS; mobile + tiêu đề版本内容 = base64 trong JS chunk `p__web_m__Fab__Fab.*`. Cả normal + hover đều VN.

**Overlay (scripts/lib/, inject runtime trong server.mjs — không sửa bundle):**
- `ua-spoof-shim.mjs` — ép route mobile.
- `i18n-overlay.mjs` — dict zh→vi + override `.mainTitle___qtaOT` + `TAB_TITLE`.
- `hide-overlay.mjs` — ẩn: QR/social, logo (PC+mobile), badge 12+, footer pháp lý (PC `.container___1rGy1` + mobile `.FooterWrapper___1nkDt`), subtitle, icon 5周年.
- `neuter-links.mjs` — mọi link ngoài + `#/index` → `#` (chặn click); nút "Truy cập website" (div onclick `.kv-book__click` / `.book___2GKN9`) → điều hướng `DEST = https://3qdc.wanmeivn.com/` (sửa DEST để đổi đích).
- `nav-hover-fx.mjs` — hover 3 nút sáng lên (filter brightness).

**Còn lại (TODO):**
- Bar 1 mobile lệch chữ: đỏ `ml4u58x`="THẦN UY THIÊN TUNG" vs tím `ml4u56z2`="THẦN UY THIÊN TÀI" → đồng bộ.
- Mảng "App Store 精选推荐 / TapTap 热门榜第" dưới hero mobile còn tiếng Trung.

**Docs:** `docs/site-links.md` (22 link gốc), `docs/journals/` (journal).