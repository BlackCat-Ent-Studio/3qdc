---
title: "Re-layout /home#/index kiểu omg3q (giữ nguyên ảnh)"
description: "Overlay layout-v2 cho trang chủ build B: header ngang, KV + thanh tải, 4 khối cuộn (tin, tướng, tính năng, kho báu), sidebar."
status: pending
priority: P2
effort: 5 phase, mỗi phase dừng chờ duyệt
branch: main
tags: [3qdc, home, layout, overlay]
created: 2026-09-14
blockedBy: []
blocks: []
project: C:\web\web1\3qdc-unified (VPS .40)
---

# Re-layout /home#/index kiểu omg3q

Brainstorm (đã duyệt): `plans/reports/brainstorm-260914-1903-home-layout-omg3q-style-report.md`

## Bối cảnh ngắn
- Trang chủ = build B entry `mirror/index.html` (DÙNG CHUNG với /main, /tin-tuc, /tuong…), route `#/index`, 1 màn 1920×945 cố định (`.star-site-index` overflow:hidden, con absolute).
- Làm bằng **overlay additive** inject trong `server.mjs` → `buildBEntry`. KHÔNG sửa bundle, KHÔNG sửa `mirror/`.
- Layout chỉ bật khi hash là `#/index` (hoặc rỗng); rời sang `#/main/*` phải tắt sạch.
- Ảnh/link giữ nguyên. Chữ Hán trong data → overlay i18n hiện có tự dịch. Tiêu đề khối = chữ CSS tiếng Việt tạm.
- Desktop only lượt này.

## Quy trình mỗi phase (bắt buộc)
1. Soạn file trong scratchpad laptop → `scp` lên VPS (KHÔNG ghi vào bản copy dự án trên laptop).
2. VPS: `node --input-type=module -e "import('file:///C:/web/web1/3qdc-unified/scripts/lib/home/layout-v2/layout-v2.mjs').then(m=>console.log(m.LAYOUT_V2_HTML.length))"` (bắt lỗi cú pháp trước restart).
3. `git add` + commit (conventional) trên VPS.
4. `nssm restart 3qdc-unified` → `curl -s http://localhost:3399/home` 200 + có marker `data-home-v2`.
5. Chrome laptop MSI (deviceId `5aa70949-d4ba-4ae8-a625-de0ad51f7aad`): screenshot `/home#/index` + `/tin-tuc` (hoặc `#/main/news`) — không console error mới, không request mới tới `image.aligames.com`.
6. **DỪNG, báo user, chờ duyệt** trước phase sau.

## Phases
| # | Phase | Status | File |
|---|---|---|---|
| 1 | Skeleton + gate hash + header ngang + KV/thanh tải + sidebar | pending | [phase-01](phase-01-skeleton-header-kv-sidebar.md) |
| 2 | Tin Tức Sự Kiện | pending | [phase-02](phase-02-news-section.md) |
| 3 | Hệ Thống Tướng | pending | [phase-03](phase-03-heroes-section.md) |
| 4 | Tính Năng Đặc Sắc | pending | [phase-04](phase-04-features-carousel.md) |
| 5 | Kho Báu + footer | pending | [phase-05](phase-05-treasure-and-footer.md) |

Phụ thuộc: 2–5 cần 1 (khung + gate + container). 2–5 độc lập nhau nhưng làm tuần tự vì cùng file lắp ráp + mỗi phase chờ duyệt.

## Cấu trúc code (đích)
```
scripts/lib/home/layout-v2/
  layout-v2.mjs          # export LAYOUT_V2_HTML: gate hash, CSS khung, header/KV/sidebar, mount container, import 4 section
  section-news.mjs       # export NEWS_CSS, NEWS_JS
  section-heroes.mjs     # export HEROES_CSS, HEROES_JS
  section-features.mjs   # export FEATURES_CSS, FEATURES_JS
  section-treasure.mjs   # export TREASURE_CSS, TREASURE_JS (+ footer)
server.mjs               # import { LAYOUT_V2_HTML } … buildBEntry inject += LAYOUT_V2_HTML
```
Shared helpers (trong layout-v2.mjs, lộ ra `window.__hv2`): `snap(file)` GET `/galaxias-api.lingxigames.com/ds/ajax/<file>`; `local(url)` chuẩn hoá URL tuyệt đối/`/host/..` → same-origin `/host/path`; `el(tag, attrs, children)`; `lightbox(node)`.

## Hợp đồng dữ liệu (đã verify tồn tại 2026-09-14)
| Dùng cho | File snapshot | Field |
|---|---|---|
| Tin Mới nhất / Tin tức / Thông báo / Sự kiện | `__bdcb232458b058963` / `__bd960fb58dcc82779` / `__b5a051b4db5a8cbca` / `__b586100e43cbf4eaf` | `result.list[]`: `id,title,onlineTime,infoTypeName` (KHÔNG có `introImgPath`) |
| Tướng Thục / Ngụy / Quần / Ngô | `__b0f7c9532ef86b683` / `__b2412ba824b4fd564` / `__bd6ddfa18119474ba` / `__beff936f54393802f` | `result.items[]`: `priVal` (tên), `details[{key,val}]` key `新官网PC立绘`,`新官网Icon`,`新官网hoverIcon` |
| Hình nền | `__bb22b1de7cb6b4ece` | `result.list[]`: `name,url,width,height` |
| CG | `__b05e570235888dacc` | `result.list[]`: `name,url,ldUrl,poster` |
(tiền tố file: `endpoint.json`)

## Tiêu chí nghiệm thu tổng
- 1920×~900: header ngang cố định + KV + thanh tải; cuộn: Tin → Tướng → Tính năng → Kho báu → footer; sidebar luôn hiện.
- Tương tác: tab tin, tab phe + chọn tướng, carousel, lightbox ảnh/video chạy.
- `/`, `/main`, `/tin-tuc`, `/tuong`, `/kho-bau`, `/huong-dan` không đổi; `#/index` ↔ `#/main/*` không để lại layout v2.
- 0 console error mới; 0 request mới tới CDN TQ; i18n vẫn dịch tên tướng/tiêu đề.

## Rollback
- Nhanh: bỏ `+ LAYOUT_V2_HTML` trong `server.mjs` → `nssm restart 3qdc-unified`.
- Git: `git revert <commit>` hoặc so với tag `pre-home-redesign`.
- Toàn bộ: copy lại từ `C:\web\web1\_backup\3qdc-unified-260914-pre-home-redesign\`.

## Ngoài phạm vi
Mobile · Việt hoá ảnh/logo/slogan · đổi link/nút · sửa bundle/mirror · đồng bộ laptop/GitHub.

## Câu hỏi mở
- Nội dung VN logo/slogan/dòng sự kiện (sau).
- Có commit-sync VPS → laptop/GitHub sau khi xong không.
