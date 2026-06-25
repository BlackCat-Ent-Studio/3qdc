# HANDOFF — 3qdc-unified (gộp 4 clone về 1 domain duy nhất)

Bàn giao phiên Claude mới. Đọc trước khi sửa.

## 1. Là gì
Gộp các clone offline (fab + home + main) về **1 domain duy nhất `https://3qdc.wanmeivn.com`**,
điều hướng nội bộ — thay vì 4 subdomain riêng. **ĐANG LIVE** (cắt sang 2026-06-25).
- Thư mục: `C:\web\web1\3qdc-unified` · Port **3399** · NSSM service **`3qdc-unified`** (auto-start).
- Caddy: block `3qdc.wanmeivn.com` đã đổi `reverse_proxy localhost:3300 → 3399`
  (backup `C:\caddy\Caddyfile.bak-pre-unify-2026-06-25-1900`). Rollback = đổi lại 1 dòng → reload.

## 2. Kiến trúc v2 (QUAN TRỌNG — đọc kỹ)
**Vì sao không phải 1 SPA hash-route thuần:** 3 mirror gốc capture ở **2 build khác nhau**:
- **Build A** `umi.ca75703e.js` = fab (zgshx). Tham chiếu chunk fab (`8e33ff58`) + main, KHÔNG có index.
- **Build B** `umi.62525e29.js` = home(index) + main (sgzhx, sgzhx-main). Có index+main, KHÔNG có fab.
→ Không 1 umi.js nào biết đủ cả 3 route-chunk mình đang có → ép 1 umi = 404 chunk.

**Giải pháp:** trộn TẤT CẢ chunk vào 1 cây `mirror/` (coexist vì content-hash khác nhau),
rồi **server chọn entry umi.js đúng theo PATH thật**. Asset path tuyệt đối (`/cdn-cn.../...`)
luôn resolve về root chung → không vỡ dù entry ở path nào.

| Path | Build | Entry HTML | Overlay | Ghi chú |
|---|---|---|---|---|
| `/` | A (fab) | shell dual-view → `/__internal/pc\|m/` | ua-spoof(m)+i18n+hide+neuter+navfx | giống hệt zgshx standalone |
| `/__internal/pc` | A | `_fab-index.html` | (như trên, PC) | |
| `/__internal/m` | A | `_fab-index.html` | +ua-spoof | route #/m/fab |
| `/home`,`/home/` | B | `index.html` | RF #/index + bbs + home-i18n + main-i18n + home-hide + main-neuter | |
| `/main`,`/main/` | B | `index.html` | RF #/main + (như trên) | |
| `/wiki`,`/wiki/` | C `cd0e3129` | `_wiki-index.html` | RF #/main + wiki-i18n + wiki-neuter | ✅ build 2.0.4, views ở `/wukongbuild/ss/` (KHÔNG đụng star-gw build A/B) |

- **index ↔ main đi tức thì** (cùng Build B, native umi hash nav — chunk main có sẵn trong cây gộp).
  fab ↔ home = reload 1 nhịp (khác build). Đã verify nav `/home#/index → #/main/news` 0 lỗi.
- 2 entry HTML: `mirror/index.html` = Build B; `mirror/_fab-index.html` = Build A.

## 3. server.mjs (port 3399)
- Path entries (mục 2) + static từ `mirror/` (CÓ **Range/206** cho video/audio) + tracker→204 + OPTIONS→204.
- **API one-door** `findApiSnapshot`: galaxias `POST endpoint.json` → key `sha1(body)` → `__b<hash16>`;
  + game-ages + bbs; thử body-key → query-suffix → path. Hosts: galaxias-api, game-ages-fx, p10488-bbs.
- **ROUTE_FORCE** chỉ cho Build B (ép #/index | #/main vì app default #/fab không có chunk ở build B).
- Sửa `server.mjs` hoặc `scripts/lib/**` → **`nssm restart 3qdc-unified`**. Sửa `mirror/` → không cần.

## 4. Overlay (scripts/lib/)
- Gốc fab (zgshx): `i18n-overlay, hide-overlay, neuter-links, ua-spoof-shim, nav-hover-fx`.
- `lib/home/` (từ sgzhx): i18n, hide, neuter — **chỉ dùng i18n+hide**; neuter home BỎ (nó rewrite #/main→subdomain, hại khi gộp).
- `lib/main/` (từ sgzhx-main): i18n(+codex), bbs-shim, neuter — **neuter main dùng cho cả /home lẫn /main** (chỉ xử lý WIKI + #/details, unified-safe).
- fab `neuter-links.mjs`: `HOME='/home'` (đổi từ subdomain → nội bộ), `SITE=https://3qdc.wanmeivn.com/`.

## 5. Trộn mirror (cách tái tạo)
```
robocopy sgzhx-main\mirror  3qdc-unified\mirror /E /MT:16          # base 7.5GB (đủ host folder nhất)
robocopy sgzhx\mirror       3qdc-unified\mirror /E /XF index.html  # +index chunks
robocopy zgshx\mirror       3qdc-unified\mirror /E /XF index.html  # +fab chunks + ảnh VN (last-wins)
copy zgshx\mirror\index.html  3qdc-unified\mirror\_fab-index.html  # giữ entry Build A
```
- `.gitignore` loại `mirror/` (8GB) — git chỉ track code. Robocopy exit 1/3 = OK (≥8 mới lỗi).

## 6. Trạng thái / TODO
- ✅ LIVE đủ 4 mục từ 1 server: fab(/) + home(/home) + main(/main) + **wiki(/wiki)** trên cùng `3qdc.wanmeivn.com`. Text 0 chữ Hán, video Range OK.
- ✅ Cross-link nội bộ hết: fab→/home, main↔wiki (`/wiki/`), wiki→/home. index↔main hash tức thì.
- ⚠️ **home ảnh còn tiếng Trung** (gap có sẵn từ sgzhx — chưa Việt hoá ảnh; không phải lỗi gộp).
- ⚠️ **mobile cho /home,/main,/wiki**: hiện desktop-only (sub-app gốc chưa dual-view). fab có mobile.
- 1 ảnh slogan home — minor.
- **Fallback:** `3qdc-mirror` (3300, fab) còn chạy để rollback. 3 service phụ (3401/3402/3403) ĐÃ TẮT (manual start) 2026-06-25 theo lệnh user — subdomain home/main/wiki giờ 502, không còn cần (đã gộp hết vào /home,/main,/wiki).

## 7. Lệnh
```powershell
nssm restart 3qdc-unified                       # sau khi sửa server/overlay
Get-NetTCPConnection -LocalPort 3399 -State Listen
node C:\web\web1\zgshx\scripts\poc-unified-live.mjs   # verify live (render + 0 CJK + screenshot)
# rollback: Caddyfile block 3qdc → localhost:3300 → caddy reload
```

## 7b. Sitemap path sạch + nav-sync (2026-06-25)
Khách muốn "mỗi path 1 trang" (kiểu sitemap). Đã thêm path sạch cho từng mục (server `BUILDB_PATHS`):
`/` (fab, landing) · `/home` · `/tin-tuc` · `/ke-hoach` · `/tuong` · `/dac-sac` · `/kho-bau` · `/cong-dong` · `/huong-dan` (wiki; alias `/wiki`).
- **nav-sync overlay** (`scripts/lib/nav-sync.mjs`, inject mọi entry): (1) set **tab title theo route** (bỏ ép-title trong 4 i18n để hết đá nhau — bug /home ra "Main" đã fix); (2) **đi dây menu**: click link menu (`a[href="#/main/news"]`…) → `location.assign('/tin-tuc')` → URL path sạch. Chỉ match EXACT menu href (link chi tiết `?rowId=`/`#/details` để app tự lo).
- **Bỏ iframe ở `/`**: serve fab trực tiếp theo **UA** (`isMobileUA`) → desktop `#/fab`, mobile `#/m/fab` (+spoof). Thanh địa chỉ hiện route, hết "dậm chân". SHELL_HTML + `/__internal/*` giữ làm fallback.
- Caveat: trang **chi tiết động** (1 bài/1 tướng) vẫn `#/...` (client hash-router, không source không bẻ).

## 8. Phong cách user
Thay/sửa → verify (screenshot/headless) → DỪNG chờ lệnh; brutal honest; nhắc Ctrl+Shift+R.
