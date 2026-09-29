# Hệ thống hai trang của 3Q Đại Chiến — tài liệu bàn giao

> Cập nhật: 28/09/2026. Đọc file này trước tiên nếu bạn mới tiếp quản dự án.
> Nhật ký chi tiết từng thay đổi: `HANDOFF.md` (thư mục gốc, dòng 86–87 cho phần này). Bài học/bẫy: `docs\journals\`.

---

## 0. Tóm tắt trong 1 phút

Từ 28/09/2026, game 3Q Đại Chiến có **hai hệ thống trang web** chạy song song trên **cùng một máy chủ (VPS .40)**:

| | **Hệ thống 1 — Trang chính thức** | **Hệ thống 2 — Trang tạm cho đợt test game** |
|---|---|---|
| Địa chỉ | `https://3qdc.wanmeivn.com` | `https://3qdaichien.wanmeivn.com` |
| Là gì | Web đầy đủ: trang chủ, tin tức, đăng ký sớm, tướng, đặc sắc… | Web **một trang**: ảnh nền, tin tức, hình ảnh, tải game (APK), cộng đồng |
| Code ở đâu | `C:\web\web1\3qdc-unified` (Node.js, git riêng) | `C:\app\3qdaichien` (3 file HTML/CSS/JS tĩnh, git riêng) |
| Chạy bằng | Dịch vụ Windows `3qdc-unified` (cổng 3399) | Caddy phục vụ file tĩnh, **không có dịch vụ riêng** |
| Tin tức | Từ `/quan-tri`, bài chọn **"Trang chính"** | Từ **cùng** `/quan-tri`, bài chọn **"Trang phụ"** |
| Trang quản trị | `https://3qdc.wanmeivn.com/quan-tri` — **dùng chung cho cả hai** | (không có quản trị riêng; `/quan-tri` bị chặn ở địa chỉ này) |
| Tồn tại đến khi | Lâu dài | Hết đợt test game → gỡ (mục 7) |

⚠️ **Quy định của chủ dự án:** trên trang `3qdaichien` **không được có chữ "tạm"** hay bất kỳ dấu hiệu nào cho người chơi biết đây là trang tạm. Chữ "tạm" chỉ dùng trong tài liệu nội bộ như file này.

---

## 1. Sơ đồ tổng thể

```
                         Người chơi (máy tính / điện thoại)
                                    │  HTTPS
                                    ▼
                   ┌────────────────────────────────────┐
                   │  Caddy — VPS .40 (160.191.3.40)    │  C:\caddy\Caddyfile
                   │  tự cấp HTTPS (Let's Encrypt)      │
                   └───────┬──────────────────┬─────────┘
       3qdc.wanmeivn.com   │                  │   3qdaichien.wanmeivn.com
                           │                  │
                           ▼                  ├── /api/tin-tuc, /tin-tuc/*,
          ┌──────────────────────────────┐    │   /tin-tuc-anh/*, /3qdc-vi/*  ──┐
          │ Dịch vụ 3qdc-unified :3399   │◄───┼────────────────────────────────┘
          │ C:\web\web1\3qdc-unified     │    │   (chuyển tiếp sang dịch vụ 3qdc,
          │  - trang chủ, /tin-tuc, ...  │    │    giữ nguyên tên miền gốc)
          │  - /quan-tri (quản trị)      │    │
          │  - kho bài: data\news\posts  │    └── mọi đường khác ──► file tĩnh
          └──────────────────────────────┘        C:\app\3qdaichien\site\
                                                  (index.html, site.css, site.js, anh\)
```

Điểm mấu chốt: **chỉ có MỘT kho bài viết** (`C:\web\web1\3qdc-unified\data\news\posts\*.json`) và **MỘT trang quản trị**. Mỗi bài có trường `site` cho biết nó thuộc trang nào. Khi một yêu cầu tới, dịch vụ 3qdc nhìn **tên miền người chơi đang mở** để chỉ trả bài của trang đó.

---

## 2. Hệ thống 1 — Trang chính thức `3qdc.wanmeivn.com`

### 2.1 Gồm những gì
- **Trang chủ** `/`: bố cục kiểu omg3q (ảnh nền, khối Tin Tức Sự Kiện, Hệ Thống Tướng, Tính Năng Đặc Sắc), bàn nhạc, bé gái Live2D, đèn khổng minh (máy tính + điện thoại, có nút tắt/bật trên điện thoại).
- **Tin tức** `/tin-tuc` và trang từng bài `/tin-tuc/<đường-dẫn-bài>`.
- **Đăng ký sớm** `/dang-ky-som`.
- Các trang bản sao gốc: `/tuong`, `/dac-sac`, `/ke-hoach`… (trang `/huong-dan` không còn dùng).
- **Quản trị** `/quan-tri`: viết/duyệt/đăng bài, nhạc nền, danh sách đăng ký sớm, thùng rác, người dùng.

### 2.2 Code và cách chạy
- Thư mục: `C:\web\web1\3qdc-unified` trên VPS .40. **Code thật chỉ ở đây** — bản trên laptop (`D:\workspace\3qdc\web1\`) đã cũ, chỉ để tham khảo.
- File khởi động: `server.mjs`. Dịch vụ Windows (NSSM) tên `3qdc-unified`, cổng `3399`.
- Code tin tức + quản trị: `scripts\lib\news\`. Code trang chủ: `scripts\lib\home\layout-v2\`.
- Ảnh Việt hoá: `overrides\home\` (đường dẫn web `/3qdc-vi/home/...`).
- Dữ liệu (không nằm trong git): `data\news\` (bài viết, lịch sử sửa, thùng rác, ảnh tải lên), `data\dang-ky-som\`.

### 2.3 Sửa code và đưa lên (quy trình đã dùng ổn định)
1. Tải file cần sửa về máy, sửa bản sao.
2. Chạy **server nháp** cổng `13398` trên VPS (thư mục `C:\Temp\<việc>-draft`, liên kết tới `mirror`/`overrides` thật, dữ liệu là **bản sao**) → kiểm bằng trình duyệt tự động qua đường hầm `ssh -N -L 127.0.0.1:13398:127.0.0.1:13398 company-vps`. Mẫu script: `plans\reports\tach-tin-2-trang-260928\nhap\sites-draft-13398.ps1`.
3. **Trước khi restart:** xem log `C:\caddy\logs\3qdc-wanmeivn-access.log` xem có ai đang dùng `/quan-tri` không — **restart làm mọi người đang ở /quan-tri bị đăng xuất** (bài đang soạn chưa lưu sẽ mất). Có ai đang sửa bài thì chờ.
4. Tạo thẻ lùi `git tag pre-<việc>`, sao lưu file cũ vào `C:\web\web1\_backup\...`, chép file mới, restart: `C:\ProgramData\chocolatey\bin\nssm.exe restart 3qdc-unified`.
5. Kiểm lại trên web thật, rồi `git commit`.
6. Lùi khi có sự cố: `git revert <commit>` + restart.

---

## 3. Hệ thống 2 — Trang tạm `3qdaichien.wanmeivn.com`

### 3.1 Gồm những gì (một trang cuộn duy nhất)
1. Đầu trang: logo, menu (Trang chủ · Tin tức · Hình ảnh · Tải game · Cộng đồng — bấm là cuộn tới khối đó), nút **Đăng nhập / Đăng ký**.
2. Ảnh nền lớn + nút "Tải game (APK)" và "Tham gia cộng đồng".
3. **Tin tức & Sự kiện**: tab Tất cả / Thông báo / Sự kiện / Cẩm nang, mỗi lần 6 bài, nút "Xem thêm tin". **Bấm vào bài → mở ô đọc bài ngay trên trang** (không chuyển trang). Mỗi bài có địa chỉ riêng `https://3qdaichien.wanmeivn.com/#tin/<đường-dẫn-bài>` để chia sẻ.
4. Hình ảnh: 5 ảnh game (máy tính có mũi tên, điện thoại vuốt ngang).
5. Tải game: chỉ nút file APK.
6. Cộng đồng: Nhóm Zalo, Fanpage.
7. Chân trang.

Không có: nạp thẻ, App Store, Google Play, bàn nhạc, bé gái, đèn khổng minh.

### 3.2 File
| File | Nội dung |
|---|---|
| `C:\app\3qdaichien\site\index.html` | Bố cục trang |
| `C:\app\3qdaichien\site\site.css` | Giao diện (máy tính + điện thoại) |
| `C:\app\3qdaichien\site\site.js` | **Các link** (đầu file), tải tin, ô đọc bài, ảnh trượt |
| `C:\app\3qdaichien\site\anh\` | Ảnh riêng của trang. **Đang dùng (bộ Trung Thu, 29/09):** `banner-dau-trang-thu.webp`, `hinh-anh-1-thu.webp`, `hinh-anh-2-cung-trang-mo-hoi.webp`, `hinh-anh-3-trung-thu.webp`, `hinh-anh-4-trung-thu.webp`, `hinh-anh-5-trung-thu.webp`. Bộ cũ (`banner-dau-trang.webp`, `hinh-anh-1…5`) vẫn để trong thư mục. Tên ảnh đang dùng khai báo trong `index.html` (và ảnh dự phòng của thẻ tin trong `site.js`). |
| `C:\app\3qdaichien\3qdaichien.caddy` | Bản sao khối Caddy (bản đang chạy nằm cuối `C:\caddy\Caddyfile`) |

Bản ảnh trên laptop để sửa: `D:\workspace\3qdc\3qdc-home-assets\3qdaichien-anh\`. Logo và biểu tượng tab vẫn dùng chung của trang chính (`/3qdc-vi/home/logo-3qdc.webp`, `favicon-3qdc.png`).

### 3.3 Cách hoạt động
- Caddy trả **file tĩnh** trong `site\` cho mọi đường, **trừ** 4 nhóm chuyển sang dịch vụ 3qdc: `/api/tin-tuc` (danh sách bài), `/tin-tuc/*` (trang bài — script lấy phần nội dung `article.prose` để hiện trong ô đọc), `/tin-tuc-anh/*` (ảnh trong bài), `/3qdc-vi/*` (logo, ảnh chung).
- Người mở thẳng `3qdaichien.wanmeivn.com/tin-tuc/<bài>` trên trình duyệt được chuyển về `/#tin/<bài>` (ô đọc bài mở sẵn).
- `/quan-tri`, `/dang-ky-som` và mọi trang khác của hệ thống 1 **không mở được** ở địa chỉ này (404).
- Sửa file trong `site\` là trang đổi ngay — **không cần restart, không cần nạp lại Caddy**, không ai bị đăng xuất.

### 3.4 Việc thường làm
- **Gắn link** (hiện đang trống — bấm nút không làm gì): mở `site\site.js`, sửa khối ở đầu file:
  ```js
  var LINKS = {
    dangNhap: null,   // Đăng nhập
    dangKy: null,     // Đăng ký
    apk: null,        // file APK
    zalo: null,       // nhóm Zalo
    fanpage: null,    // Fanpage Facebook
  };
  ```
  Thay `null` bằng link trong nháy đơn, ví dụ `apk: 'https://.../3qdc.apk',`. Link `http(s)` tự mở tab mới. Lưu file → xong.
- **Đổi ảnh**: chép ảnh mới đè **đúng tên** vào `site\anh\` (banner 1756×896, 5 ảnh 1211×680; sai tỉ lệ sẽ bị cắt mép). Đổi đuôi file (vd `.png` → `.webp`) thì sửa thêm tên trong `index.html`.
- **Sau mỗi lần sửa**: `C:\PortableGit\cmd\git.exe -C C:\app\3qdaichien add -A` rồi `commit`.

---

## 4. Trang quản trị — đăng bài lên từng hệ thống

Quản trị duy nhất: **`https://3qdc.wanmeivn.com/quan-tri`** (đăng nhập bằng tài khoản quản trị; người mới đăng ký ở `/quan-tri/dang-ky` và chờ Quản lý duyệt).

### 4.1 Quy tắc chính
- Mỗi bài **chỉ thuộc MỘT trang**, chọn ở ô **"Đăng lên"** (cột phải, ngay trên ô "Mục"):
  - **Trang chính** → bài hiện ở `3qdc.wanmeivn.com`: khối tin trang chủ, `/tin-tuc`, trang bài viết.
  - **Trang phụ** → bài hiện **chỉ** ở `3qdaichien.wanmeivn.com`.
- **Không có "Cả hai".** Muốn một nội dung ở cả hai trang thì tạo 2 bài (2 đường dẫn khác nhau).
- Bài viết **trước 28/09** (7 bài) đều thuộc **Trang chính**. Trang phụ bắt đầu trống.

### 4.2 Viết bài mới
1. Bấm **"+ Viết bài mới"**.
2. Nhập Tiêu đề, (đường dẫn tự tạo), Tóm tắt, Nội dung, chọn Ảnh bìa.
3. **Chọn "Đăng lên": Trang chính hoặc Trang phụ** — bài mới **không chọn sẵn**; chưa chọn mà bấm Lưu sẽ báo *"Chọn trang đăng bài: Trang chính hoặc Trang phụ."* Dòng địa chỉ dưới tiêu đề đổi theo lựa chọn (`3qdc.wanmeivn.com/tin-tuc/…` hoặc `3qdaichien.wanmeivn.com/#tin/…`).
4. Chọn Mục (Thông báo / Sự kiện / Cẩm nang).
5. **Quản lý**: Lưu nháp / Đăng ngay / Hẹn giờ. **Biên tập**: Lưu nháp / Gửi duyệt (Quản lý đăng sau).

### 4.3 Chuyển một bài sang trang kia
Mở bài → đổi ô "Đăng lên" → Lưu. Bài **biến khỏi** trang cũ và hiện ở trang mới ngay (không cần làm gì thêm).

### 4.4 Danh sách bài
- Mỗi bài có nhãn trang dưới nhãn mục: **Trang chính** (vàng) / **Trang phụ** (xanh).
- Bộ lọc **"Mọi trang"** (góc phải, cạnh "Mọi mục") để chỉ xem bài của một trang.
- Dòng đường dẫn dưới tiêu đề: `/tin-tuc/...` (trang chính) hoặc `3qdaichien/#tin/...` (trang phụ).

### 4.5 Ghim, duyệt, hẹn giờ, lịch sử, thùng rác
- **Ghim**: mỗi trang ghim riêng — ghim 1 bài mục Cẩm nang ở Trang phụ không bỏ ghim bài Cẩm nang ở Trang chính.
- Duyệt bài, hẹn giờ, lịch sử sửa (khôi phục bản cũ cũng khôi phục lựa chọn trang), thùng rác: hoạt động như trước.
- **"Xem trước"** luôn dùng giao diện trang bài của trang chính (kể cả bài Trang phụ) — nội dung giống hệt, chỉ khác khung.

### 4.6 Bảng tra nhanh: bài hiện ở đâu?
| Bài chọn | Trang chủ 3qdc | `/tin-tuc` 3qdc | Trang 3qdaichien | Mở link bài ở trang kia |
|---|---|---|---|---|
| Trang chính | ✅ | ✅ | ❌ | 404 |
| Trang phụ | ❌ | ❌ | ✅ | 404 |
| Nháp / chờ duyệt / hẹn giờ chưa tới | ❌ | ❌ | ❌ | 404 |

---

## 5. Kỹ thuật tách tin (cho lập trình viên)

- Trường mới trong file bài: `"site": "chinh"` hoặc `"phu"`. Không có trường = `chinh` (không phải sửa dữ liệu cũ).
- `scripts\lib\news\news-config.mjs`:
  - `SPLIT_SITES = true` — công tắc của cả tính năng.
  - `SITES` — 2 lựa chọn hiện trong quản trị.
  - `siteOfHost(host)` — tên miền `3qdaichien.wanmeivn.com` ⇒ `phu`, còn lại ⇒ `chinh` (Caddy chuyển nguyên tên miền gốc sang dịch vụ).
  - `siteOf(post)`, `onSite(posts, site)`.
- `news-routes.mjs`: `/tin-tuc`, `/tin-tuc/<bài>`, `/api/tin-tuc` chỉ lấy bài của trang ứng với tên miền.
- `news-workflow.mjs`: bắt buộc chọn trang khi lưu; ghim theo mục **và** trang.
- `news-store.mjs`: kiểm giá trị `site` hợp lệ.
- `admin-page.mjs` + `admin-app.mjs`: ô "Đăng lên", nhãn, bộ lọc.
- Commit `6943420` trong `C:\web\web1\3qdc-unified` (thẻ trước đó: `pre-tach-tin-2-trang`).

---

## 6. Truy cập & công cụ

- VPS .40 (Windows): `ssh company-vps` (dòng lệnh là PowerShell). Git: `C:\PortableGit\cmd\git.exe`. NSSM: `C:\ProgramData\chocolatey\bin\nssm.exe`.
- Caddy: `C:\caddy\caddy.exe run --config C:\caddy\Caddyfile` (tác vụ Windows "Caddy"). Nạp lại cấu hình: `caddy.exe validate …` rồi `caddy.exe reload --config C:\caddy\Caddyfile --adapter caddyfile` — **không restart Caddy** (nhiều web khác dùng chung).
- DNS tên miền `wanmeivn.com`: Mắt Bão (`ns1/ns2.matbao.com`). Tên miền phụ cần bản ghi **A** riêng trỏ `160.191.3.40` (không có bản ghi "*").
- Log truy cập: `C:\caddy\logs\3qdc-wanmeivn-access.log`, `C:\caddy\logs\3qdaichien-wanmeivn-access.log`.

---

## 7. Kết thúc đợt test — gỡ trang tạm (theo thứ tự)

1. **Tin tức về một trang như cũ:** sửa `SPLIT_SITES = true` → `false` trong `C:\web\web1\3qdc-unified\scripts\lib\news\news-config.mjs`, kiểm log `/quan-tri`, restart `3qdc-unified`, commit. Ô "Đăng lên" biến mất; mọi bài (kể cả bài Trang phụ) hiện ở trang chính. Bài Trang phụ nào không muốn giữ thì gỡ/xoá trong quản trị **trước** bước này.
   (Hoặc gỡ hẳn code: `git revert 6943420` + restart.)
2. **Tắt web tạm:** mở `C:\caddy\Caddyfile`, xoá nguyên khối `3qdaichien.wanmeivn.com { … }` ở cuối file (sao lưu file trước), chạy `caddy validate`, rồi `caddy reload`.
3. Xoá thư mục `C:\app\3qdaichien` (nếu không cần giữ).
4. (Tuỳ chọn) Xoá bản ghi DNS `3qdaichien` ở Mắt Bão.
5. Ghi lại vào `HANDOFF.md` và **bỏ khung "📌 GHIM"** ở đầu HANDOFF (đoạn trỏ tới tài liệu này); cập nhật tài liệu này thành "đã gỡ".

---

## 8. Những điều dễ sai

- **Restart dịch vụ 3qdc = đăng xuất mọi người ở /quan-tri.** Luôn xem log trước; đừng restart khi có người đang soạn bài.
- **Không restart Caddy** — chỉ `reload`. Caddy phục vụ nhiều web khác trên cùng VPS.
- PowerShell 5.1: script có `$ErrorActionPreference = 'Stop'` sẽ **dừng giữa chừng** khi chạy `caddy.exe` (Caddy ghi thông báo ra kênh lỗi). Chạy lệnh ngoài với `Continue` và xét `$LASTEXITCODE`.
- Ô đọc bài của trang tạm lấy nội dung từ khung `<article class="prose">` của trang bài 3qdc — nếu đổi khung trang bài của 3qdc thì phải sửa `site.js` của trang tạm.
- Đặt đường dẫn bài **không trùng** giữa hai trang (đường dẫn là duy nhất toàn hệ thống).
- Trang tạm không được có chữ "tạm" trên giao diện.

---

## 9. Tài liệu liên quan

- `HANDOFF.md` — nhật ký thay đổi (dòng 86: trang tạm; dòng 87: tách tin; mục 3 "Bài học & bẫy").
- `docs\journals\260928-bao-mat-cache-tuyet-den-khong-minh-lessons.md` — mục 5: lỗi thật + cách sửa khi làm hai hệ thống.
- `plans\reports\trang-tam-test-game-260928\` — trang tham khảo, ảnh xem trước, script kiểm tra trang tạm.
- `plans\reports\tach-tin-2-trang-260928\` — ảnh giao diện quản trị, bản nháp + so sánh code tách tin.
