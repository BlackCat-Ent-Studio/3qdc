# HANDOFF — Phiếu Bé Ngoan (cập nhật 15/10/2026 ~01:00 — ✅ ĐÃ LIVE)

## 0. ✅ ĐÃ LIVE 15/10/2026 (~00:50)
- `https://phieubengoan.3qdc.wanmeivn.com/` 200, HTTPS hợp lệ, nút "Đăng nhập bằng Google" thật, `/api/phieu/toi` → `"thu":false` (đăng nhập thử TẮT), 0 lỗi console. `/quan-tri` trên Host phiếu 404.
- Trang chính `/`, `/tin-tuc`, `/dang-ky-som`, `/privacy`, `/quan-tri` + `3qdaichien` + xiyu/tieu3q/markline/webtask/yh/ghrl vẫn chạy sau restart + Caddy reload.
- Trước restart: SHA1 LIVE = baseline; log `/quan-tri` 2h chỉ IP laptop 42.112.174.81.
- Tag `pre-phieu-be-ngoan` (= 48a0ea1), backup `C:\web\web1\_backup\3qdc-unified-261015-phieu-be-ngoan\` (+ `nssm-env.txt`), Caddy backup `C:\caddy\Caddyfile.bak-261015-phieu-be-ngoan`.
- Env dịch vụ: `PORT=3399` + `PHIEU_GOOGLE_CLIENT_ID=…` (nssm AppEnvironmentExtra). Không có `PHIEU_DEV_LOGIN`.
- Commit `f8fe81f` (15 file, `server.mjs` chỉ +4 dòng của mình; hunk `/hoi-dap/` của phiên khác vẫn CHƯA commit, giữ nguyên). GitHub `main` = `f8fe81f` + tag `pre-phieu-be-ngoan`.
- Script dùng: `nhap/deploy-phieu.ps1`, `nhap/caddy-phieu.ps1` (user tự chạy bằng `!` vì bộ phân loại chặn), `nhap/commit-phieu.ps1`.
- Đã dọn: nháp 13398 (`-Stop`), `C:\Temp\phieu-upload`, đường hầm laptop.
- **15/10 ~01:30 responsive LIVE `39d3555`** (chỉ `phieu-page.html`; tag `pre-phieu-responsive`; backup `C:\web\web1\_backup\3qdc-unified-261015-phieu-responsive\`): bản B user chọn — ≤860px tướng làm nền mờ, ẩn câu thoại; GIS `color-scheme: light` + width `min(360, khung)`; `100dvh`. Kiểm 7 cỡ màn LIVE (`plans\reports\phieu-be-ngoan-261014\responsive-261015\chup-hien-trang.cjs`, thêm tham số file HTML để xem trước bản sửa trên trang LIVE). Phương án A (tướng ở trên) còn mẫu trong `ban-mau\` nếu user đổi ý.
- **15/10 ~01:30 form + tab LIVE `61cf13d`** (tag `pre-phieu-form-tab`, backup `C:\web\web1\_backup\3qdc-unified-261015-phieu-form-tab\`): 4 file `phieu-page.html` (form 1 khung `.form/.fld/.inp`, tab `#tab-gui/#tab-ls` phím ←/→, kiểm tên tài khoản phía trang), `phieu-config.mjs` (`SERVERS` name `S1 Trương Liêu` + `serverName()`), `phieu-store.mjs` (`listPhieu` trả BẢN SAO có `serverTen`, CSV dùng tên), `admin-app.mjs` (`t.serverTen || t.server`). Kiểm 7 cỡ màn LIVE: `plans\reports\phieu-be-ngoan-261014\responsive-261015\kiem-form-tab.cjs` (`-` = trang LIVE; hoặc đường dẫn file HTML để xem trước). Bản mẫu Artifact form: https://claude.ai/artifact/QPZkuHHa1nH95VJ3c55iCF (nguồn `scratchpad` phiên 15/10 — dựng lại từ trang LIVE nếu mất).
- **Chưa làm / chờ user:** user tự thử đăng nhập Google thật + gửi 1 phiếu trên LIVE rồi xem ở `/quan-tri` → mục Phiếu Bé Ngoan (Claude không tạo phiếu thật).

## 1. Mục tiêu & trạng thái
Web gửi phiếu nhận quà 3Q Đại Chiến `phieubengoan.3qdc.wanmeivn.com` (Google login, 1 phiếu/email/ngày VN, lịch sử) + mục **Phiếu Bé Ngoan** trong `/quan-tri` có sẵn. Chạy **trong** `3qdc-unified` trên VPS .40 (cổng 3399), phân biệt bằng Host (khuôn `signup/` + trang phụ `3qdaichien`).

| Phase | Trạng thái |
|---|---|
| 1 Kho phiếu + Google token | ✅ xong, `test-phieu-core.mjs` 21/21 |
| 2 Trang người chơi + Host | ✅ xong |
| 3 Mục `/quan-tri` (chỉ **Quản lý**, như Đăng ký sớm — menu `/quan-tri` vốn chỉ hiện cho Quản lý) | ✅ xong |
| 4 Nháp VPS cổng 13398 + kiểm | ✅ xong (15/10 user duyệt): `kiem-host.mjs` 48/48 + `kiem-phieu.cjs` (PC/Pixel 5/giảm chuyển động/quản trị) ALL PASS; code-reviewer xong, **đã sửa** 2 mục must-fix + chặn đăng nhập thử trên LIVE, chạy lại 2 bộ kiểm ALL PASS (15/10 00:05) → **đang chờ user duyệt nháp** |
| 5 Deploy LIVE | ✅ LIVE 15/10, commit `f8fe81f` (mục 0) |

Plan: `plans/261014-2335-phieu-be-ngoan/plan.md` (+ phase-01…05). Brainstorm: `plans/reports/brainstorm-261014-2330-phieu-be-ngoan-report.md`. Bản mẫu Artifact v3: https://claude.ai/artifact/XHW7TnawGX7ypo4dua4pUp (nguồn `plans/reports/phieu-be-ngoan-261014/ban-mau/`).

## 2. Quyết định đã chốt
- Web riêng tên miền `phieubengoan.3qdc.wanmeivn.com`, giao diện 3qdc (xanh đêm + vàng), bố cục Google Form; màn đăng nhập chia đôi kiểu EaseMize auth-ui + **Điêu Thuyền** trôi + câu tự gõ (3 câu).
- Đăng nhập người chơi = **Google** (khách muốn "giống gg form"); ô: Tên tài khoản game (bắt buộc), Server (S1), Quà ≤10 dòng không số lượng, Ghi chú.
- **Một trang quản trị chung** = `/quan-tri` 3qdc. Admin email ban đầu: tronghieu05072003@gmail.com (user) — thực tế dùng tài khoản `/quan-tri`.
- Đặt trên **.40** (không .23). HTML/CSS/JS thuần, không React. Giới hạn IP 120/10 phút (4G chung IP).
- Google Client ID (tạo 15/10 00:17, Claude qua Chrome laptop, tài khoản blackcat.ent.studio, project GCP `phieu-be-ngoan-3qdc`, app "Phiếu Bé Ngoan 3Q Đại Chiến", External): `471200100967-jfc0nobf8v755q7nbirbf0koar43s1st.apps.googleusercontent.com` — origin `https://phieubengoan.3qdc.wanmeivn.com` + `http://127.0.0.1:13398`. Client secret KHÔNG cần (chỉ kiểm ID token), không lưu. Trạng thái app: **In production** (user tự bấm Confirm 15/10), Branding: home `https://phieubengoan.3qdc.wanmeivn.com`, privacy `https://3qdc.wanmeivn.com/privacy`, domain `wanmeivn.com`, không logo (có logo ⇒ phải xin duyệt).

## 3. Bước tiếp theo (theo thứ tự)
1. ✅ ĐÃ LÀM (15/10 00:05) — sửa theo review (file trong `nhap/src/scripts/lib/phieu/` và `nhap/src/scripts/lib/news/admin-api.mjs`):
   - **must** `phieu-store.mjs` `exclusive()`: try/catch quanh `writeJsonAtomic`, lỗi ⇒ `loading = null` rồi throw (bỏ thay đổi chưa lưu trong bộ nhớ).
   - **must** thay `x in STATES` bằng `Object.hasOwn(STATES, x)` ở 3 chỗ (admin-api POST + lọc `st`, `phieu-store.mjs` listPhieu).
   - **nên** `phieu-config.mjs`: `DEV_LOGIN = env==='1' && !SECURE_COOKIE`.
   - (tuỳ chọn, ghi lại) giữ khoá Google cũ khi tải JWKS lỗi; cookie `__Host-pbn_s` khi Secure; phân trang "Mọi ngày"; OPTIONS/tracker trên Host phiếu.
2. `node --check`, `node test-phieu-core.mjs src`; scp file sửa lên `C:\Temp\phieu-upload\src\...`; `phieu-draft-13398.ps1 -Stop` rồi chạy lại (trang HTML đọc lúc khởi động); `node kiem-host.mjs` + `node kiem-phieu.cjs` (đường hầm phải mở: `ssh -N -L localhost:13398:127.0.0.1:13398 company-vps`).
3. Báo user: ảnh `nhap/anh/*.png`; tự mở nháp qua đường hầm: **trang phiếu `http://127.0.0.1:13398/`** (có ô "Đăng nhập thử" bằng email bất kỳ), **quản trị `http://localhost:13398/quan-tri`** (đăng nhập bằng tài khoản `/quan-tri` thật — dữ liệu là bản sao). DỪNG chờ duyệt.
4. Khi "deploy đi": làm phase 5 (`phase-05-…md`): DNS A `phieubengoan.3qdc` → 160.191.3.40; quét log `/quan-tri` (kể cả .gz) trước restart; so SHA1 LIVE với `nhap/baseline/SHA1.txt`; tag `pre-phieu-be-ngoan`; backup; chép `scripts/lib/phieu/*`, `overrides/phieu-be-ngoan/*`, `server.mjs` (đã vá), 3 file `news/admin-*`; `PHIEU_GOOGLE_CLIENT_ID` qua `nssm set 3qdc-unified AppEnvironmentExtra` (KHÔNG đặt `PHIEU_DEV_LOGIN`); khối Caddy (backup → nối → validate với ErrorAction Continue → reload); kiểm LIVE; commit **chỉ phần mình** (`server.mjs` bằng `git apply --cached nhap/server-phieu.diff`), đẩy GitHub bằng bundle.
5. Dọn nháp: `phieu-draft-13398.ps1 -Stop`, xoá `C:\Temp\phieu-upload`, đóng đường hầm.

## 4. Câu hỏi mở / chặn
- Google Client ID (user). DNS `phieubengoan.3qdc` (Mắt Bão, hiện chưa có bản ghi).
- Caddy khối mới phải giữ Host gốc, không có matcher `/hoi-dap/*` cho Host này.

## 5. Vị trí & lưu ý
- Code soạn: `plans/261014-2335-phieu-be-ngoan/nhap/src/` (cùng đường dẫn repo). Bản gốc LIVE + SHA1: `nhap/baseline/`. Diff server: `nhap/server-phieu.diff` (+3 dòng).
- Nháp VPS: `C:\Temp\phieu-draft` (cổng 13398, node qua WMI), dữ liệu sao `C:\Temp\phieu-draft-data`, upload `C:\Temp\phieu-upload` (có `draft-user.ps1` tạo/xoá Quản lý tạm `ktphieu` CHỈ trong bản sao). Host nháp: `127.0.0.1:13398` = trang phiếu, `localhost:13398` = 3qdc + `/quan-tri`.
- ⚠️ `server.mjs` LIVE có hunk **chưa commit của phiên khác** (widget Mun Vạn Sự Thông `/hoi-dap/`, 12/10) — giữ nguyên byte (dòng đó LF, phần còn lại CRLF; vá bằng script chèn byte, không dùng Edit). Không commit giùm, không hoàn tác.
- Ảnh nút vàng đã "unscreen" thành PNG/WebP trong suốt (không dùng mix-blend). PS1 có tiếng Việt cần BOM.
- VPS .40: Tailscale đã bật unattended (12/10); sập 14/10 ~19:50 → chạy lại 22:24 (chưa rõ nguyên nhân — đọc event log 41/6008/1074/WHEA nếu user hỏi).
