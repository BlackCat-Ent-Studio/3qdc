# Deploy trang chủ HMTG bản v3 C (Hoàn Mỹ Cổ Điển) - ĐÃ CHẠY 12/11 ~02:10 (nền DarkRadiance)

ĐÃ CHẠY THỰC TẾ: bộ file mới 35 file (không còn keyart-*; có assets/v3-c/nen-dau-trang-2560.webp và -900.webp), index sha256 a59fba2d...; gói tgz gửi bằng scp, giải /tmp/hmtg-v3c, backup /srv/_backup/hmtg-v3c-261112 (41 file), rsync --delete -> 35 file, 0 sai quyền. Các số "37 file" và danh sách keyart ở dưới là của bản cũ; khi lùi thì 41 file. LIVE OK (xem HANDOFF).

Đã chép sẵn: `/tmp/hmtg-v3c/` trên VPS .40 (37 file, 2,8 MB; `index.html` sha256 `78cc2fb0...91ba8`) và gói `/tmp/hmtg-v3c.tgz`.
Chỉ chép trang tĩnh + ảnh. KHÔNG sửa Caddy, KHÔNG restart (API sự kiện/BXH giữ nguyên, đường /api/* và /tin-tuc-anh/* Caddy đã proxy).
Nguồn dựng: `mockups-v2/v3-huong-c.html` qua `scripts/build_site_live.py` -> `site-live/`.

## 0. Trước khi chạy
- Không cần kiểm log /quan-tri (không restart, không ai bị đăng xuất).
- Kiểm gói còn nguyên: `ssh vps40 'cd /tmp/hmtg-v3c && find . -type f | wc -l && sha256sum index.html'` (37 file; sha256 như trên).

## 1. Sao lưu cả thư mục hiện tại
```
ssh vps40 'set -e; mkdir -p /srv/_backup; test ! -e /srv/_backup/hmtg-v3c-261112 && cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-261112 && ls /srv/_backup/hmtg-v3c-261112 && find /srv/_backup/hmtg-v3c-261112 -type f | wc -l'
```
(bản cũ có 40 ảnh + index.html = 41 file)

## 2. Cài file mới (chủ web3q:web3q, file 644, thư mục 755; --delete để bỏ ảnh bản cũ không còn dùng, đã có bản sao lưu)
```
ssh vps40 'set -e; rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644 /tmp/hmtg-v3c/ /srv/hmtg/site/ && find /srv/hmtg/site -type f | wc -l && find /srv/hmtg/site \( -type d ! -perm 755 -o -type f ! -perm 644 -o ! -user web3q -o ! -group web3q \) | wc -l'
```
Mong đợi: 37 file, 0 mục sai quyền/chủ.

## 3. Kiểm LIVE
```
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" https://hoanmythegioi.wanmeivn.com/            # 200
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "mau-du-lieu"                                      # 0
curl -sI https://hoanmythegioi.wanmeivn.com/ | grep -i x-robots-tag                                      # noindex
for f in assets/logo-hmtg.png assets/keyart-thich-khach.jpg assets/keyart-elysium.jpg assets/keyart-arigora.jpg assets/keyart-den-tim.jpg assets/bxh-cung-thu.webp assets/nv-blademaster.webp assets/v3-c/giay-da.webp assets/v3-c/khung-dong.svg assets/v3-c/guong-dong.svg assets/favicon-64.png; do curl -s -o /dev/null -w "%{http_code} $f\n" https://hoanmythegioi.wanmeivn.com/$f; done   # toàn 200
curl -s "https://hoanmythegioi.wanmeivn.com/api/tin-tuc?muc=su-kien&limit=50&noi-dung=1" | head -c 200   # JSON (mảng)
curl -s https://hoanmythegioi.wanmeivn.com/api/bang-xep-hang | head -c 200                               # JSON {capNhat,mayChu,bang}
for h in 3qdc.wanmeivn.com skystory.wanmeivn.com 3qdaichien.wanmeivn.com; do curl -s -o /dev/null -w "%{http_code} $h\n" https://$h/; done   # 200
```
Rồi Playwright (1 trình duyệt mỗi lần) trên https://hoanmythegioi.wanmeivn.com/ ở 1920x889, 1366x650, iPhone 390x844: 0 tràn ngang, 0 ảnh vỡ, 0 lỗi JS, 0 phản hồi >=400, bảng sự kiện + BXH hiện đúng (hiện tại cả hai trống: "Sự kiện sẽ sớm được công bố", "Bảng xếp hạng sẽ cập nhật khi mở máy chủ"), 4 mục menu nhảy đúng neo, nút nền động góc trái dưới bật/tắt được. Script mẫu: `scratchpad/pw/live-c.cjs` (đổi BASE sang tên miền thật, bỏ các chế độ ?mau=).

## 4. Lùi (trả bản cũ nguyên vẹn)
```
ssh vps40 'set -e; rsync -rl --delete --checksum /srv/_backup/hmtg-v3c-261112/ /srv/hmtg/site/ && chown -R web3q:web3q /srv/hmtg/site && find /srv/hmtg/site -type f | wc -l'   # 41
```
Rồi curl trang chủ 200. Không đụng Caddy/restart nên lùi chỉ là trả file.

## 5. Dọn sau khi ổn
`ssh vps40 'rm -rf /tmp/hmtg-v3c /tmp/hmtg-v3c.tgz'` (giữ `/srv/_backup/hmtg-v3c-261112`).

---

# Phần "slide": hero trình chiếu 3 ảnh PWI (CHƯA DEPLOY, chờ "deploy đi")

Thứ tự: DarkRadiance -> 10021257473997085 (pháo đài giông) -> FlameEmpire (thành lửa), 7 giây/ảnh, mờ dần 2 giây, dừng khi tab ẩn, giảm chuyển động = chỉ ảnh đầu. Ảnh 2, 3 tạo bằng JS khi tới lượt.
Đã chép sẵn: `/tmp/hmtg-v3c-slide/` trên VPS .40 (39 file; `index.html` sha256 `2e29b2ed...e3bb4`), gói `/tmp/hmtg-v3c-slide.tgz`. Bản LIVE hiện tại 35 file. Không sửa Caddy, không restart (không ai bị đăng xuất, không cần quét log /quan-tri). Không đụng /srv/hmtg/site cho tới khi deploy.
File mới: `assets/v3-c/nen-dau-trang-2-2560.webp`, `-2-900.webp`, `-3-2560.webp`, `-3-900.webp`.

## S1. Sao lưu
```
ssh vps40 'set -e; test ! -e /srv/_backup/hmtg-v3c-slide-261112 && cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-slide-261112 && find /srv/_backup/hmtg-v3c-slide-261112 -type f | wc -l'   # 35
```
## S2. Cài
```
ssh vps40 'set -e; cd /tmp/hmtg-v3c-slide && find . -type f | wc -l && sha256sum index.html; rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644 /tmp/hmtg-v3c-slide/ /srv/hmtg/site/ && find /srv/hmtg/site -type f | wc -l && find /srv/hmtg/site \( -type d ! -perm 755 -o -type f ! -perm 644 -o ! -user web3q -o ! -group web3q \) | wc -l'
```
Mong đợi: 39 file, sha256 như trên, 0 mục sai quyền/chủ.
## S3. Kiểm LIVE
```
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/    # 200
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "mau-du-lieu"             # 0
for f in assets/v3-c/nen-dau-trang-2560.webp assets/v3-c/nen-dau-trang-900.webp assets/v3-c/nen-dau-trang-2-2560.webp assets/v3-c/nen-dau-trang-2-900.webp assets/v3-c/nen-dau-trang-3-2560.webp assets/v3-c/nen-dau-trang-3-900.webp; do curl -s -o /dev/null -w "%{http_code} $f\n" https://hoanmythegioi.wanmeivn.com/$f; done   # toàn 200
for h in 3qdc.wanmeivn.com skystory.wanmeivn.com 3qdaichien.wanmeivn.com; do curl -s -o /dev/null -w "%{http_code} $h\n" https://$h/; done
```
Rồi Playwright (1 trình duyệt mỗi lần) 1920x889, 1366x650, iPhone 390x844: đợi `.hero-art picture.s2.on` rồi `.s3.on` (khoảng 7s, 14s), 0 tràn, 0 ảnh vỡ, 0 lỗi JS, 0 phản hồi >=400. Script mẫu `scratchpad/pw/slide.cjs` (đổi địa chỉ sang tên miền thật, bỏ route /api).
## S4. Lùi
```
ssh vps40 'set -e; rsync -rl --delete --checksum /srv/_backup/hmtg-v3c-slide-261112/ /srv/hmtg/site/ && chown -R web3q:web3q /srv/hmtg/site && find /srv/hmtg/site -type f | wc -l'   # 35
```
## S5. Dọn
`ssh vps40 'rm -rf /tmp/hmtg-v3c-slide /tmp/hmtg-v3c-slide.tgz'` (giữ bản sao lưu).

---

# Phần "final": slide 3 ảnh + Nút 1 Ấn son + Khung 2 Sơn then + đèn lồng dời xuống dưới thanh menu (CHƯA DEPLOY, chờ "deploy đi")

Gộp mọi thứ trong "slide" ở trên (đã thay thế phần slide: dùng bộ này, không dùng /tmp/hmtg-v3c-slide). Nguồn `mockups-v2/v3-huong-c.html` (bak `…bak-261112-truoc-nut1-khung2.html`) -> `scripts/build_site_live.py` -> `site-live/` (43 file, 2,6 MB; `index.html` sha256 `cbfa85ab...df53ec`).
Đã chép sẵn: `/tmp/hmtg-v3c-final/` trên VPS .40 và gói `/tmp/hmtg-v3c-final.tgz`. `/srv/hmtg/site` chưa đụng. Không sửa Caddy, không restart (không ai bị đăng xuất, không cần quét log /quan-tri).
Khác bản live (35 file): +4 ảnh nền slide, +5 SVG `assets/v3-c/khung-su-kien/khung-2-*.svg`, -`khung-dong.svg` không còn dùng. Ảnh bìa sự kiện và ảnh trong cửa sổ đọc nay hiện đúng tỉ lệ gốc (không cắt).

## F0. Kiểm gói
`ssh vps40 'cd /tmp/hmtg-v3c-final && find . -type f | wc -l && sha256sum index.html'`  # 43, cbfa85ab...

## F1. Sao lưu
```
ssh vps40 'set -e; test ! -e /srv/_backup/hmtg-v3c-final-261112 && cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-final-261112 && find /srv/_backup/hmtg-v3c-final-261112 -type f | wc -l'   # 35
```
## F2. Cài
```
ssh vps40 'set -e; rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644 /tmp/hmtg-v3c-final/ /srv/hmtg/site/ && find /srv/hmtg/site -type f | wc -l && find /srv/hmtg/site \( -type d ! -perm 755 -o -type f ! -perm 644 -o ! -user web3q -o ! -group web3q \) | wc -l'
```
Mong đợi: 43 file, 0 mục sai quyền/chủ.
## F3. Kiểm LIVE
```
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/    # 200
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "mau-du-lieu\|keyart-\|khung-dong\|Đăng ký"   # 0
for f in assets/v3-c/khung-su-kien/khung-2-ray.svg assets/v3-c/khung-su-kien/khung-2-goc-tl.svg assets/v3-c/khung-su-kien/khung-2-goc-br.svg assets/v3-c/nen-dau-trang-2560.webp assets/v3-c/nen-dau-trang-3-900.webp assets/v3-c/giay-da.webp; do curl -s -o /dev/null -w "%{http_code} $f\n" https://hoanmythegioi.wanmeivn.com/$f; done   # toàn 200
for h in 3qdc.wanmeivn.com skystory.wanmeivn.com 3qdaichien.wanmeivn.com; do curl -s -o /dev/null -w "%{http_code} $h\n" https://$h/; done
```
Rồi Playwright (1 trình duyệt mỗi lần) trên tên miền thật ở 1920x889, 1366x650, iPhone 390x844 (script mẫu `scratchpad/pw/final.cjs site`, đổi địa chỉ sang tên miền thật, bỏ route /api): 0 tràn, 0 ảnh vỡ, 0 lỗi JS, 0 phản hồi >=400; nút "Tải game PC" kiểu Ấn son, dải lối vào hình thang, không khung đồng; đèn lồng không đè nút "Đăng nhập"; slide chuyển ảnh sau ~7 s. Khi có sự kiện thật: thẻ khung sơn then, cửa sổ đọc + cửa sổ BXH có khung đủ 4 cạnh.
## F4. Lùi
```
ssh vps40 'set -e; rsync -rl --delete --checksum /srv/_backup/hmtg-v3c-final-261112/ /srv/hmtg/site/ && chown -R web3q:web3q /srv/hmtg/site && find /srv/hmtg/site -type f | wc -l'   # 35
```
## F5. Dọn
`ssh vps40 'rm -rf /tmp/hmtg-v3c-final /tmp/hmtg-v3c-final.tgz /tmp/hmtg-v3c-slide /tmp/hmtg-v3c-slide.tgz'` (giữ bản sao lưu).


---

# Phần "bxh": nền tranh Đại quân (PWI NeverfallBattle, phương án 6) cho khối Bảng xếp hạng (CHƯA DEPLOY, chờ "deploy đi")

Nguồn `mockups-v2/v3-huong-c.html` (bak `…bak-261112-truoc-nen-bxh-6.html`; chỉ đổi CSS nền `.arena`/`.arena::before` + khối ≤720px) -> `scripts/build_site_live.py` (nay chỉ chép ảnh `nen-bxh/` mà trang dùng) -> `site-live/` (45 file; `index.html` sha256 `c0f926ce...19ea69bcf`).
Khác bản live (43 file): +`assets/v3-c/nen-bxh/bxh-6-1920.webp` (1920x924, 111 KB), +`assets/v3-c/nen-bxh/bxh-6-900.webp` (770x963, 49 KB). Ứng viên 7/9/10 không chép.
Đã chép sẵn: `/tmp/hmtg-v3c-bxh/` trên VPS .40 + gói `/tmp/hmtg-v3c-bxh.tgz`. `/srv/hmtg/site` chưa đụng. Không sửa Caddy, không restart.

## X0. Kiểm gói
`ssh vps40 'cd /tmp/hmtg-v3c-bxh && find . -type f | wc -l && sha256sum index.html'`  # 45, c0f926ce...
## X1. Sao lưu
```
ssh vps40 'set -e; test ! -e /srv/_backup/hmtg-v3c-bxh-261112 && cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-bxh-261112 && find /srv/_backup/hmtg-v3c-bxh-261112 -type f | wc -l'   # 43
```
## X2. Cài
```
ssh vps40 'set -e; rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644 /tmp/hmtg-v3c-bxh/ /srv/hmtg/site/ && find /srv/hmtg/site -type f | wc -l && sha256sum /srv/hmtg/site/index.html && find /srv/hmtg/site \( -type d ! -perm 755 -o -type f ! -perm 644 -o ! -user web3q -o ! -group web3q \) | wc -l'
```
Mong đợi: 45 file, sha c0f926ce..., 0 mục sai quyền/chủ.
## X3. Kiểm LIVE
```
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/    # 200
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "mau-du-lieu"             # 0
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "nen-bxh/bxh-6"           # 1+
for f in assets/v3-c/nen-bxh/bxh-6-1920.webp assets/v3-c/nen-bxh/bxh-6-900.webp assets/bxh-cung-thu.webp; do curl -s -o /dev/null -w "%{http_code} $f\n" https://hoanmythegioi.wanmeivn.com/$f; done   # toàn 200
for h in 3qdc.wanmeivn.com skystory.wanmeivn.com 3qdaichien.wanmeivn.com; do curl -s -o /dev/null -w "%{http_code} $h\n" https://$h/; done
```
Rồi Playwright (1 trình duyệt mỗi lần) 1920x889, 1366x650, iPhone 390x844 trên tên miền thật (script mẫu `scratchpad/pw/bxh6.cjs`, đổi địa chỉ sang tên miền thật, bỏ route /api): 0 tràn, 0 ảnh vỡ, 0 lỗi JS, 0 phản hồi >=400; `.arena` có nền `bxh-6-1920` (máy tính) / `bxh-6-900` (điện thoại); mép trên/dưới khối không có vệt cắt.
## X4. Lùi
```
ssh vps40 'set -e; rsync -rl --delete --checksum /srv/_backup/hmtg-v3c-bxh-261112/ /srv/hmtg/site/ && chown -R web3q:web3q /srv/hmtg/site && find /srv/hmtg/site -type f | wc -l'   # 43
```
## X5. Dọn
`ssh vps40 'rm -rf /tmp/hmtg-v3c-bxh /tmp/hmtg-v3c-bxh.tgz'` (giữ bản sao lưu).

---

# Phần "nv": tranh 10 lớp to đều trong gương đồng + bỏ câu "Máy chủ Nguyệt Ảnh…" ở hero (CHƯA DEPLOY, chờ "deploy đi")

Nguồn `mockups-v2/v3-huong-c.html` (bak `…bak-261112-truoc-nv-to.html`) -> `scripts/build_site_live.py` (nay bỏ `assets/nv-*` cũ, kiểm `assets/v3-c/nv/<lớp>.webp`) -> `site-live/` (45 file, 3,1 MB; `index.html` sha256 `50cd0848...0ed6`).
Tranh mới: `scripts/xuat_nv.py` (cắt sát lề trong suốt, cao tối đa 1100px, webp giữ alpha) từ ảnh gốc PWI wiki trong `pwi-nv/`.
Khác bản live (45 file, sha c0f926ce): -10 `assets/nv-*.webp`, +10 `assets/v3-c/nv/*.webp`, `index.html` đổi. Không còn file nào khác khác (đã so `cmp` trên VPS).
Đã chép sẵn: `/tmp/hmtg-v3c-nv/` trên VPS .40 + gói `/tmp/hmtg-v3c-nv.tgz`. `/srv/hmtg/site` chưa đụng. Không sửa Caddy, không restart (không ai bị đăng xuất, không cần quét log /quan-tri).

## N0. Kiểm gói
`ssh vps40 'cd /tmp/hmtg-v3c-nv && find . -type f | wc -l && sha256sum index.html'`  # 45, 50cd0848...
## N1. Sao lưu
```
ssh vps40 'set -e; test ! -e /srv/_backup/hmtg-v3c-nv-261112 && cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-nv-261112 && find /srv/_backup/hmtg-v3c-nv-261112 -type f | wc -l'   # 45
```
## N2. Cài
```
ssh vps40 'set -e; rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644 /tmp/hmtg-v3c-nv/ /srv/hmtg/site/ && find /srv/hmtg/site -type f | wc -l && sha256sum /srv/hmtg/site/index.html && find /srv/hmtg/site \( -type d ! -perm 755 -o -type f ! -perm 644 -o ! -user web3q -o ! -group web3q \) | wc -l'
```
Mong đợi: 45 file, sha 50cd0848..., 0 mục sai quyền/chủ.
## N3. Kiểm LIVE
```
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/                         # 200
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "mau-du-lieu\|Nguyệt Ảnh\|Bạch Lang\|assets/nv-"   # 0
for k in blademaster wizard psychic venomancer barbarian assassin archer cleric seeker mystic; do curl -s -o /dev/null -w "%{http_code} $k\n" https://hoanmythegioi.wanmeivn.com/assets/v3-c/nv/$k.webp; done   # toàn 200
for h in 3qdc.wanmeivn.com skystory.wanmeivn.com 3qdaichien.wanmeivn.com; do curl -s -o /dev/null -w "%{http_code} $h\n" https://$h/; done
```
Rồi Playwright (1 trình duyệt mỗi lần) trên tên miền thật: `node scratchpad/pw/nv-site.cjs https://hoanmythegioi.wanmeivn.com/` (1920/1366/iPhone: 0 tràn, 0 ảnh vỡ, 0 lỗi JS, 0 phản hồi >=400; bấm 10 lớp: tranh cao 540px ở 1920/1366, 330px ở iPhone (Vũ Linh 321), hệ số phóng ≤1,13) và `node scratchpad/pw/hero.cjs https://hoanmythegioi.wanmeivn.com/` (3 slide hero, không còn câu Nguyệt Ảnh).
## N4. Lùi
```
ssh vps40 'set -e; rsync -rl --delete --checksum /srv/_backup/hmtg-v3c-nv-261112/ /srv/hmtg/site/ && chown -R web3q:web3q /srv/hmtg/site && find /srv/hmtg/site -type f | wc -l'   # 45
```
## N5. Dọn
`ssh vps40 'rm -rf /tmp/hmtg-v3c-nv /tmp/hmtg-v3c-nv.tgz'` (giữ bản sao lưu).

---

# Phần "font": Font 5 "Huyền thoại" (Philosopher + Arsenal) + chữ to hơn (CHƯA DEPLOY, chờ "deploy đi")

Khách chê Grenze/Spectral SC/Be Vietnam Pro "trông AI", muốn chữ to hơn; chọn Font 5 trong `mockups-v2/xem-font-moi.html` (ghi chú `font-moi/ghi-chu.md`).
Nguồn `mockups-v2/v3-huong-c.html` (bak `…bak-261112-truoc-font-5.html`): link Google Fonts = `Philosopher:wght@400;700` + `Arsenal:wght@400;700` (đều có subset vietnamese); `--f-display`/`--f-sc` = Philosopher, `--f-body` = Arsenal; body 17px + `lining-nums`; tiêu đề ~+20–25% (hero h1 clamp(2.9rem,min(5.3vw,8.4vh),5.35rem), .h2 clamp(2.45rem,4.1vw,3.65rem), thẻ sự kiện 1.65rem + text-wrap:balance, tên lớp clamp(3.06rem,6.12vw,5.5rem) vừa 1 dòng "Thích Khách" trong cột 502px, nút "Tải game PC" 28px), menu 16px, chữ giao diện +1px.
-> `scripts/build_site_live.py` -> `site-live/` (45 file, `index.html` sha256 `db630975...8150`). Khác bản live (45 file, sha 50cd0848): chỉ `index.html` (đã so `cmp` trên VPS).
Kiểm (proxy API thật + `?mau=1`, 1920×889 / 1366×650 / iPhone 390×844): hero 2 dòng, CTA vừa nút, menu 1 hàng (cách nút Đăng nhập 24px), 10 tên lớp 1 dòng, 0 tràn, 0 ảnh vỡ, 0 lỗi JS, `document.fonts.check` tiếng Việt true. Ảnh `shots-v3/font5-final-*.png`.
Đã chép sẵn: `/tmp/hmtg-v3c-font/` trên VPS .40 + gói `/tmp/hmtg-v3c-font.tgz`. `/srv/hmtg/site` chưa đụng. Không sửa Caddy, không restart.

## F0. Kiểm gói
`ssh vps40 'cd /tmp/hmtg-v3c-font && find . -type f | wc -l && sha256sum index.html'`  # 45, db630975...
## F1. Sao lưu
```
ssh vps40 'set -e; test ! -e /srv/_backup/hmtg-v3c-font-261112 && cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-font-261112 && find /srv/_backup/hmtg-v3c-font-261112 -type f | wc -l'   # 45
```
## F2. Cài
```
ssh vps40 'set -e; rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644 /tmp/hmtg-v3c-font/ /srv/hmtg/site/ && find /srv/hmtg/site -type f | wc -l && sha256sum /srv/hmtg/site/index.html && find /srv/hmtg/site \( -type d ! -perm 755 -o -type f ! -perm 644 -o ! -user web3q -o ! -group web3q \) | wc -l'
```
Mong đợi: 45 file, sha db630975..., 0 mục sai quyền/chủ.
## F3. Kiểm LIVE
```
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/                                   # 200
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "Grenze\|Be+Vietnam\|mau-du-lieu"                        # 0
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "family=Philosopher:wght@400;700&family=Arsenal"           # 1
for h in 3qdc.wanmeivn.com skystory.wanmeivn.com 3qdaichien.wanmeivn.com; do curl -s -o /dev/null -w "%{http_code} $h\n" https://$h/; done
```
Rồi Playwright (1 trình duyệt mỗi lần) trên tên miền thật: sửa MODES trong `scratchpad/pw/font5-final.cjs` thành `{ live: 'https://hoanmythegioi.wanmeivn.com/' }` và chạy (3 cỡ: 0 tràn, 0 ảnh vỡ, 0 lỗi JS, fonts true, hero 2 dòng, menu 1 hàng, tên lớp 1 dòng).
## F4. Lùi
```
ssh vps40 'set -e; rsync -rl --delete --checksum /srv/_backup/hmtg-v3c-font-261112/ /srv/hmtg/site/ && chown -R web3q:web3q /srv/hmtg/site && find /srv/hmtg/site -type f | wc -l'   # 45
```
## F5. Dọn
`ssh vps40 'rm -rf /tmp/hmtg-v3c-font /tmp/hmtg-v3c-font.tgz'` (giữ bản sao lưu).

---
# ĐỔI TÊN "Hoàn Mỹ Thế Giới" -> "Tiên Ma Vô Giới" (12/11, CHƯA DEPLOY)
Id kỹ thuật `hoanmythegioi`, tên miền, Caddy, `/srv/hmtg/site` giữ nguyên. Tên miền không hiện ở đâu trong trang (title, meta, alt, aria, chữ, logo).

## ten. Trang chủ (gói tĩnh)
Nguồn `mockups-v2/v3-huong-c.html` (bak `…bak-261112-truoc-doi-ten.html`) + logo mới `assets/logo-tmvg.png` (959×820, dựng bằng `grok-logo/xuat-logo-2dong-tmvg.cjs` từ `mockups-v2/logo-moi/ghep-chu-2dong-tmvg.html`; logo chữ cũ `logo-hmtg.png` không còn chép; huy hiệu `logo-hmtg-huy-hieu.png` không có chữ nên dùng lại). `scripts/build_site_live.py` có thêm kiểm: build lỗi nếu trang còn "Hoàn Mỹ"/"HOÀN MỸ"/"hoanmythegioi"/"wanmeivn".
Gói: `site-live/` 45 file, `index.html` sha256 `2a387e20…`. So với LIVE (sha db630975): chỉ khác `index.html`, thêm `assets/logo-tmvg.png`, bỏ `assets/logo-hmtg.png`.
Đã chép sẵn: `/tmp/hmtg-v3c-ten/` + `/tmp/hmtg-v3c-ten.tgz` trên VPS .40. `/srv/hmtg/site` chưa đụng. Không sửa Caddy, không restart.

### T0. Kiểm gói
`ssh vps40 'cd /tmp/hmtg-v3c-ten && find . -type f | wc -l && sha256sum index.html | cut -c1-8 && grep -c "Hoàn Mỹ" index.html'`  # 45, 2a387e20, 0
### T1. Sao lưu
```
ssh vps40 'set -e; test ! -e /srv/_backup/hmtg-v3c-ten-261112 && cp -a /srv/hmtg/site /srv/_backup/hmtg-v3c-ten-261112 && find /srv/_backup/hmtg-v3c-ten-261112 -type f | wc -l'   # 45
```
### T2. Cài
```
ssh vps40 'set -e; rsync -rl --delete --checksum --chown=web3q:web3q --chmod=D755,F644 /tmp/hmtg-v3c-ten/ /srv/hmtg/site/ && find /srv/hmtg/site -type f | wc -l && sha256sum /srv/hmtg/site/index.html | cut -c1-8 && find /srv/hmtg/site \( -type d ! -perm 755 -o -type f ! -perm 644 -o ! -user web3q -o ! -group web3q \) | wc -l'
```
Mong đợi: 45, 2a387e20, 0.
### T3. Kiểm LIVE
```
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/                  # 200
curl -s https://hoanmythegioi.wanmeivn.com/ | grep -c "Hoàn Mỹ\|HOÀN MỸ\|hoanmythegioi\|wanmeivn"   # 0
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/assets/logo-tmvg.png      # 200
curl -s -o /dev/null -w "%{http_code}\n" https://hoanmythegioi.wanmeivn.com/assets/logo-hmtg.png      # 404
for h in 3qdc.wanmeivn.com skystory.wanmeivn.com 3qdaichien.wanmeivn.com; do curl -s -o /dev/null -w "%{http_code} $h\n" https://$h/; done
```
Rồi Playwright (1 trình duyệt mỗi lần) `scratchpad/pw/doi-ten.cjs` đổi URL thành tên miền thật: 3 cỡ 0 tràn, 0 ảnh vỡ, 0 lỗi JS, logo "Tiên Ma Vô Giới". Ảnh thử local `shots-v3/doi-ten-{1920,1366,iphone}.png`.
Lưu ý: Facebook/Zalo giữ bản xem trước (cache) của link cũ; tiêu đề mới hiện sau khi quét lại.
### T4. Lùi
```
ssh vps40 'set -e; rsync -rl --delete --checksum /srv/_backup/hmtg-v3c-ten-261112/ /srv/hmtg/site/ && chown -R web3q:web3q /srv/hmtg/site && find /srv/hmtg/site -type f | wc -l'   # 45
```
### T5. Dọn
`ssh vps40 'rm -rf /tmp/hmtg-v3c-ten /tmp/hmtg-v3c-ten.tgz'` (giữ bản sao lưu).

## ten-quan-tri. Tên hiển thị trong /quan-tri + MCP (script chuẩn bị, CHƯA CHẠY)
Script `deploy/doi_ten_quan_tri.py` (chạy trên VPS; mặc định chạy thử, `--apply` mới ghi; sửa theo byte, giữ CRLF/LF từng file, `assert` đúng số lần khớp, sai 1 file là không ghi file nào). Đã chạy thử không ghi qua `ssh vps40 'python3 -' < deploy/doi_ten_quan_tri.py`: 5 file khớp đủ.
Chuỗi người dùng thấy sẽ đổi (đã đọc bằng `ssh vps40 grep -rn "Hoàn Mỹ" /srv/3qdc-unified/scripts`):
- `scripts/lib/admin/games.mjs` (CRLF): `name: 'Hoàn Mỹ Thế Giới'` -> `'Tiên Ma Vô Giới'`; `hint` tab Trang chủ "hoanmythegioi.wanmeivn.com — bảng Sự kiện, Bảng xếp hạng" -> "Trang chủ Tiên Ma Vô Giới — …" (bỏ tên miền; `id` và `hosts` giữ nguyên).
- `scripts/lib/admin/mcp/bang-xep-hang.mjs`: 2 mô tả công cụ (xem_bxh, cap_nhat_bxh) + comment đầu file.
- `scripts/lib/admin/mcp/index.mjs`: lời chào MCP "Bảng xếp hạng Hoàn Mỹ Thế Giới: chỉ gửi số…".
- `skills/bang-xep-hang-hmtg/SKILL.md`: 4 chỗ tên + bỏ tên miền (dòng 3 và 8).
- `verify/quan-tri/check-bang-xep-hang.mjs`: assert câu chào MCP (phải đổi cùng lúc).
Không đổi (kỹ thuật/comment): comment ở `news-routes.mjs`, `bxh-routes.mjs`, `bxh-store.mjs`; `HOSTS` trong bài kiểm; tên thư mục skill.
Các bước:
1. Quét log Caddy tìm người đang ở /quan-tri (kể cả .gz), vì restart làm mọi người đăng xuất: `ssh vps40 'sudo zgrep -h "/quan-tri" /var/log/caddy/*.log* | tail'` (đường log theo Caddyfile). Có người đang soạn bài hoặc phiên tin tức song song đang chạy thì hỏi/chờ.
2. Mốc lùi: `ssh vps40 'cd /srv/3qdc-unified && git status --short && git tag pre-doi-ten'`.
3. Chạy thử: `ssh vps40 'python3 -' < deploy/doi_ten_quan_tri.py`; ghi: `scp deploy/doi_ten_quan_tri.py vps40:/tmp/ && ssh vps40 'python3 /tmp/doi_ten_quan_tri.py --apply'`. Kiểm `git diff --stat` = 5 file; `games.mjs` vẫn 82 dòng CRLF.
4. Kiểm cú pháp + bài kiểm: `node --check` 3 file .mjs; chạy `verify/quan-tri/check-bang-xep-hang.mjs` theo cách repo đang chạy.
5. Commit: `git commit -am "chore(admin): đổi tên hiển thị game thành Tiên Ma Vô Giới"`.
6. Restart dịch vụ 3qdc (đúng tên unit systemd như các lần trước).
7. Kiểm: /quan-tri chọn game hiện "Tiên Ma Vô Giới", tab "Trang chủ" không còn tên miền; `grep -c "Hoàn Mỹ"` ở 3 file chính = 0; MCP `xem_bxh` mô tả mới; 3qdc/skystory/3qdaichien/hoanmythegioi đều 200.
8. Lùi: `ssh vps40 'cd /srv/3qdc-unified && git reset --hard pre-doi-ten'` (chỉ khi cây làm việc sạch ở bước 2; `data/games/skystory/` đang untracked nên reset --hard không đụng) rồi restart lại.
