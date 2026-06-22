# Danh sách link ngoài trong trang (3Q Đại Chiến mirror)

Quét từ DOM thực tế cả PC (`/__internal/pc/`) + mobile (`/__internal/m/`). **22 link unique.** Tất cả vẫn trỏ về hệ thống GỐC (lingxigames / aligames) — cân nhắc retarget sang hệ thống của bạn.

## 1. Nút chính (hiển thị trên trang)
| Nút | Link | Có ở |
|---|---|---|
| Store / Nạp tiền (官方充值中心) | `https://shop.lingxigames.com/mall/websgzhxdl?from_op=official_entry1` (PC) · `...entry5` (mobile) | PC + Mobile |
| Đổi mã kích hoạt (激活码兑换) | `https://r.lingxigames.com/p/r/63e6126617baea0aa6ecf937` | PC + Mobile |
| Vào trang chủ (进入官网) | `#/index` (route nội bộ SPA, không phải link ngoài) | PC + Mobile |
| Giới thiệu tính năng | `https://r.lingxigames.com/p/r/650305f355fd570a04f3a31e/index` | PC + Mobile |

## 2. Tải game
| Nguồn | Link |
|---|---|
| PC (file .zip) | `https://ali-star-dev-hotfix.ejoy.com/star_pc_resource/sgzhxdl_654.zip` |
| TapTap (.cn) | `https://l.taptap.cn/2WqnTYD6?channel=rep-rep_zphlw9yb9vv` |
| TapTap (.com) | `https://l.taptap.com/peEE5lyB` |

## 3. Mạng xã hội (hiện đang ẩn qua hide-overlay)
| Kênh | Link |
|---|---|
| Weibo | `https://weibo.com/p/1006067412381490/home?from=page_100606&mod=TAB#place` |
| Tieba (Baidu) | `https://tieba.baidu.com/f?kw=三国志幻想大陆&ie=utf-8` |
| Nhóm QQ | `https://jq.qq.com/?_wv=1027&k=i82ZQCT6` |

## 4. Tracking / quảng cáo (nên bỏ/retarget)
| | Link |
|---|---|
| cddp-link | `https://cddp-link.aligames.com/rlink/1066984?ch=DG_1` |
| cddp-track | `https://cddp-track.aligames.com/9gtrack?noredirect=false&linkid=...` |

## 5. Pháp lý / giấy phép TQ (hiện đang ẩn — footer)
| Mục | Link |
|---|---|
| Chính sách bảo mật | `https://agreement.lingxigames.com/lingxi/privacy-agreement/zh-hans/agreement.html` |
| Điều khoản dịch vụ | `https://agreement.lingxigames.com/lingxi/user-agreement/zh-hans/agreement.html` |
| Bảo vệ thông tin trẻ em | `https://agreement.lingxigames.com/lingxi/child-agreement/zh-hans/agreement.html` |
| Giải thích quyền hạn | `https://agreement.lingxigames.com/lingxi/app-permission/zh-hans/agreement.html` |
| Công ước chống nghiện game | `https://agreement.lingxigames.com/lingxi/self-discipline/zh-hans/agreement.html` |
| Giấy phép ICP Quảng Đông | `https://beian.miit.gov.cn/` |
| Đăng ký ANM công cộng Quảng Đông | `https://beian.mps.gov.cn/#/query/webSearch?code=44010502002415` |
| Giấy phép kinh doanh điện tử | `https://zzlz.gsxt.gov.cn/businessCheck/verifKey.do?...` |

## Ghi chú
- Nhóm 3 (social) + nhóm 5 (pháp lý) **đang bị ẩn** bằng `hide-overlay.mjs` → người dùng không bấm được, nhưng link vẫn nằm trong DOM.
- Muốn **đổi link** (vd nút Store/Tải/Đổi mã trỏ về hệ thống 3Q Đại Chiến của bạn): áp pattern retarget (`MIRROR_LINKS` của skill dual-view-mirror) — đánh dấu `data-lnk` + 1 script config, hoặc string-replace trong chunk JS. Báo tôi nếu muốn làm.
