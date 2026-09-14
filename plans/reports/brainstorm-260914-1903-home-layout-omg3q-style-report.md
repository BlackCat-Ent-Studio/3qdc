---
type: brainstorm-report
date: 2026-09-14
project: C:\web\web1\3qdc-unified (VPS .40, live https://3qdc.wanmeivn.com)
target: /home#/index (build B entry)
status: approved
modes: none (no --html / --wiki)
---

# Brainstorm — /home#/index re-layout kiểu omg3q (giữ nguyên ảnh)

## 1. Vấn đề
Trang chủ `/home#/index` hiện = 1 màn hình cố định (1920×945, `.star-site-index` overflow:hidden): KV + menu dọc trái 10 mục + slogan + hàng nút tải. Không cuộn, không có nội dung (tin, tướng, tính năng, kho báu) → nghèo so với trang chủ game VN kiểu omg3q.vnggames.com.

## 2. Yêu cầu chốt (user duyệt 2026-09-14)
- Bố cục kiểu omg3q (hướng C) — **ảnh giữ nguyên**, chỉ đổi bố cục.
- Khối cuộn: Tin Tức Sự Kiện, Hệ Thống Tướng, Tính Năng Đặc Sắc, Kho Báu (hình nền / CG).
- Menu 10 mục → **header ngang cố định**.
- **Desktop trước**; mobile để sau.
- Tiêu đề khối: **chữ CSS tiếng Việt tạm**.
- Link/nút giữ nguyên đích hiện tại (kể cả shop/store TQ).
- Logo/slogan/dòng sự kiện tiếng Việt: để sau.
- Sửa thẳng trên VPS; backup + commit trước (ĐÃ XONG, xem §8).

## 3. Tham chiếu omg3q (nghiên cứu)
jQuery 3.6.1 + Swiper, server-rendered. Home cao ~3507px: header ngang cố định (menu + dropdown + đăng nhập) · sidebar phải cố định (QR/nạp/store/social/top) · KV + thanh tải (QR, store, APK, nhập code, nạp) · Tin tức (slider banner + 4 tab list) · Hệ thống tướng (tab phe, vòng độ hiếm, lập hoạ lớn, dải avatar, fade) · Tính năng đặc sắc (coverflow 12 slide, loop, autoplay) · footer. Bài chi tiết = trang riêng. **Chỉ mượn bố cục, không lấy asset/brand VNG.**

## 4. Phương án đã cân nhắc
| | Cách | Ưu | Nhược | Kết luận |
|---|---|---|---|---|
| A | Giữ bố cục, vẽ lại ~20-30 ảnh chữ Việt | giống gốc | cần hoạ sĩ, base64 trong JS | không chọn (user giữ ảnh) |
| B | Re-skin text bằng HTML/CSS | nhanh, reversible | không đổi bố cục | không chọn |
| **C** | **Đổi bố cục kiểu omg3q bằng overlay, dữ liệu từ snapshot sẵn có** | đẹp/đầy đủ, không sửa bundle/mirror, reversible | khối lượng lớn hơn, phải gate theo hash | **CHỌN** |
| — | Dựng site mới (static/Astro/Next) | sạch | bỏ clone, tốn công | hoãn |

## 5. Thiết kế giải pháp
**Nguyên tắc:** additive overlay; KHÔNG sửa umi bundle, KHÔNG sửa `mirror/`.

**Touchpoints**
- MỚI `scripts/lib/home/layout-v2.mjs` → export `LAYOUT_V2_HTML` (`<style>` + `<script>` vanilla, không thư viện).
- SỬA `server.mjs`: import + chèn vào `buildBEntry` (sau overlay hiện có). Gate runtime: bật khi `location.hash` rỗng/`#/index*`; `hashchange` sang `#/main/*` → tắt (class `html.hv2` + ẩn container sections).
- Không đụng: `/` (fab), `/huong-dan` (wiki), `scripts/lib/main/*`, mirror.

**Khối**
0. Header ngang cố định: reposition `.star-site-index-logo` + `.star-site-index-navs` (10 ảnh menu) → fixed top, flex row, nền bar. Click giữ nguyên hành vi (nav-sync/neuter hiện có).
1. KV 100vh: `.star-site-index` + slogan giữ; `.star-site-index-download` + store/QR/nạp gom giữa đáy.
2. Tin Tức Sự Kiện: 4 tab, 4 bài/tab (title, ngày, `introImgPath` làm slider bìa) → link `/tin-tuc`.
3. Hệ Thống Tướng: 4 tab phe → lập hoạ lớn `新官网PC立绘` + dải 13 avatar `新官网Icon`/`新官网hoverIcon` + tên (`priVal`) → link `/tuong`.
4. Tính Năng Đặc Sắc: carousel 5 ảnh `static/01..05.*.png` (autoplay + prev/next) → `/dac-sac`.
5. Kho Báu: 10 hình nền (2158 page0) + 3 CG (2157, poster) → lightbox ảnh / `<video>` (server có Range 206) → `/kho-bau`.
6. Footer gọn + sidebar phải cố định: clone node QR + nút tải (ảnh cũ) + nút lên đầu trang.

Chữ Hán trong data render ra DOM → overlay i18n hiện có (home+main+codex dict) tự dịch (tên tướng Hán-Việt, tiêu đề tin). Chữ trong ảnh giữ nguyên.

**Hợp đồng dữ liệu** (GET tĩnh `/galaxias-api.lingxigames.com/ds/ajax/<file>`; đã verify tồn tại trên VPS-mirror 2026-09-14)
| Khối | File | Ghi chú |
|---|---|---|
| Tin — Mới nhất (322,323,324) | `endpoint.json__bdcb232458b058963` | 4 items, total 174 |
| Tin — Tin tức (322) | `endpoint.json__bd960fb58dcc82779` | 4 items |
| Tin — Thông báo (323) | `endpoint.json__b5a051b4db5a8cbca` | 4 items |
| Tin — Sự kiện (324) | `endpoint.json__b586100e43cbf4eaf` | 4 items |
| Tướng — Thục | `endpoint.json__b0f7c9532ef86b683` | 13 tướng |
| Tướng — Ngụy | `endpoint.json__b2412ba824b4fd564` | 13 tướng |
| Tướng — Quần Hùng | `endpoint.json__bd6ddfa18119474ba` | 13 tướng |
| Tướng — Ngô | `endpoint.json__beff936f54393802f` | 13 tướng |
| Kho báu — hình nền | `endpoint.json__bb22b1de7cb6b4ece` | folder 2158 page0, 10/129 |
| Kho báu — CG | `endpoint.json__b05e570235888dacc` | folder 2157, 3 video |
Ảnh tướng `新官网*` = `cloud.lingxigames.com` local 52/52; `PC立绘`/`移动*`/`首页Icon` = `image.aligames.com` phần lớn KHÔNG có trong mirror → không dùng. URL ảnh trong data dạng tuyệt đối/`/host/...` → chuẩn hoá về same-origin `/host/path`.

## 6. Tiêu chí nghiệm thu
1. 1920×~900: header ngang + KV + thanh tải; cuộn thấy lần lượt Tin → Tướng → Tính năng → Kho báu → footer; sidebar luôn hiện.
2. Đổi tab tin, đổi phe/tướng, carousel, lightbox hoạt động; mọi ảnh load từ mirror, **0 request mới tới CDN TQ**.
3. `/`, `/main`, `/tin-tuc`, `/tuong`, `/kho-bau`, `/huong-dan` không đổi; `#/index` ↔ `#/main/*` trong app không để lại layout v2.
4. 0 lỗi console mới; overlay i18n vẫn chạy (tên tướng/tiêu đề tin tiếng Việt).

## 7. Rủi ro
- `/home` & `/main` chung entry + hash nav → gate sai = vỡ main. Mitigate: gate theo hash + test chuyển qua lại.
- React re-render/animation (`star-site-slide-in-blurred-left`) đè CSS → dùng selector `html.hv2 …` + `!important` có chủ đích, MutationObserver nhẹ.
- `.star-site-index` overflow:hidden + kích thước tính bằng JS → có thể phải ép height/position.
- Restart `nssm restart 3qdc-unified` = site gián đoạn vài giây mỗi lần.
- Git VPS `core.autocrlf` → restore chính xác byte dùng `_backup`, không dựa `git checkout` cho mirror.
- Không có môi trường staging (user chọn sửa thẳng live) → mỗi bước nhỏ, verify ngay.

## 8. Backup / rollback (ĐÃ LÀM 2026-09-14)
- Commit `fb4fb3f` (track 68 file giao diện /home) + tag `pre-home-redesign` trên VPS.
- Full copy `C:\web\web1\_backup\3qdc-unified-260914-pre-home-redesign\` = 2823 file / 8,570,266,599 byte, MATCH (trừ 2 nssm log bị khoá).
- Rollback nhanh: gỡ import/inject `layout-v2` trong `server.mjs` → `nssm restart 3qdc-unified`; hoặc `git revert`; hoặc copy lại từ `_backup`.

## 9. Bước tiếp (5 phase, mỗi phase: commit VPS → restart → screenshot Chrome MSI → DỪNG chờ duyệt)
1. Skeleton + gate hash + header ngang + KV/thanh tải + sidebar.
2. Tin Tức Sự Kiện.
3. Hệ Thống Tướng.
4. Tính Năng Đặc Sắc.
5. Kho Báu + footer.

## Câu hỏi còn mở
- Nội dung tiếng Việt cho logo/slogan/dòng sự kiện (user: để sau).
- Mobile layout (lượt sau).
- Có muốn đồng bộ commit VPS → laptop/GitHub không (hiện chỉ lưu trên VPS theo yêu cầu).
