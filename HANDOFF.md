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

## 7c. Re-capture chi tiết tướng (2026-06-25)
Bug "thanh tướng không chuyển được": bấm đổi tướng → app fetch chi tiết tướng đó, nhưng mirror chỉ chụp 1 phần → tướng chưa chụp trả **fallback rỗng** (`endpoint.json` ~790-808B) → màn hình giữ tướng cũ. (Avatar là `<img>`, nav-sync vô can.)
- Fix: `scripts/recap-person.mjs` — crawl LIVE `sgzhx.lingxigames.com/#/main/person`, **force-click từng avatar** (4 phe × ~13 tướng) để mỗi `getQueryDataInfoByPriId` (main `tbId…4595` ~8KB + skill `tbId…4147`) snapshot body-keyed vào `mirror/galaxias-api.lingxigames.com/ds/ajax/`. Whitelist host (galaxias-api + cloud) → KHÔNG đè asset đã VN hoá. Chờ 1500ms/tướng cho cascade skill.
- Kết quả: snapshot 403→559; coverage test 0 fallback; verify đổi sang "Tôn Thượng Hương" OK.
- **Re-run khi TQ thêm tướng mới** (vd dịp 6 năm): `cd 3qdc-unified` (cần playwright) hoặc chạy từ zgshx (có node_modules) với MIRROR trỏ unified → `node scripts/recap-person.mjs`. Mirror gitignore → data nằm trên đĩa, server đọc trực tiếp (không cần restart).
- **Audit toàn bộ section (2026-06-25):** dò response trùng chữ ký fallback (`endpoint.json` sha1 `16b7eb1a`). Kết quả: wiki/kho-báu/kế-hoạch/đặc-sắc = 0 thiếu; **Tin tức thiếu chi tiết bài** (`getInfoDetail`).
- **Fix news:** `scripts/recap-news.mjs` (direct-API, không cần browser): lấy id mọi bài (4 tab × phân trang) → fetch `getInfoDetail` từng bài → lưu body-keyed. Đã chụp 132 bài (+174 snapshot, 559→733). Re-run khi có tin mới. Sau fix: tất cả section 0 fallback.
- Tool dò lại: `zgshx/scripts/audit-detail2.mjs` (đếm fallback-miss mỗi section).

## 7d. Việt hoá mục Tướng — Phase 1 (2026-06-25)
Audit person: ~635 run chữ Hán còn sót (chủ yếu là prose kỹ năng/tiểu sử). Làm theo PHASE:
- **Phase 1 (XONG):** thêm ~200 token NGẮN vào `scripts/lib/main/i18n-codex-dict.mjs` (skill type 普攻/怒攻/被动/觉醒, phân loại, tên tướng+CV còn thiếu, **tên kỹ năng + tên duyên Hán-Việt**, tiêu đề guide). Dịch qua **DOM overlay** (KHÔNG sửa data nguồn — vì `priKey` là khoá tra cứu, sửa sẽ vỡ app). Verify: 10/10 token mẫu hết Hán.
- **Phase 2 (XONG 2026-06-26):** mô tả kỹ năng + tiểu sử. Làm bằng **overlay** (không sửa data nguồn) gồm 2 phần:
  - **Glossary thuật ngữ** (~250 mục, 8 pass) trong `i18n-codex-dict.mjs`: thuật ngữ kỹ năng/duyên + tên kỹ năng Hán-Việt + hư từ/liên từ + dấu câu TQ→spacing. Engine sort longest-first nên cụm dài thay trước, hư từ dọn mảnh sau.
  - **Tiểu sử full** (`i18n-person-bios.mjs`, 36 bios) — dịch tay narrative, key = chuỗi Hán y nguyên; import + `Object.assign(DICT, BIOS_DICT)` trong `i18n-overlay.mjs`.
  - **KẾT QUẢ: quét person = 0 chữ Hán** (mọi tướng/phe). Quy trình lặp: thêm glossary → restart → `scan-person-cjk.mjs` → thêm token sót → lặp tới 0.
- Tool: `scan-person-cjk.mjs` (quét residual), `extract-hero-prose.mjs`/`extract-hero-buckets.mjs`/`gen-bios.mjs` (trích+sinh bios).
- ⚠️ Glossary là DOM-overlay (không đụng `priKey` data) → an toàn. Tướng mới thêm sau: chạy lại scan, bổ sung token vào codex.

## 8. Phong cách user
Thay/sửa → verify (screenshot/headless) → DỪNG chờ lệnh; brutal honest; nhắc Ctrl+Shift+R.
