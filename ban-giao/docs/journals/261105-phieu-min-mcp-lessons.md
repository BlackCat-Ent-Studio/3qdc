# Journal 22/10 → 05/11/2026 — khoá SSH mới, Phiếu Bé Ngoan (dùng lại quà, S2), linh vật Min, vai trò Duyệt phiếu + MCP cho Claude

Đọc mục 3 (quy trình) và mục 4 (bẫy) trước khi làm việc tiếp trên .40.

## 1. Việc đã làm (đều LIVE trừ khi ghi khác; chi tiết commit/tag ở HANDOFF đầu file)

| Ngày | Việc | Commit |
|---|---|---|
| 22/10 | Chủ máy thu hồi khoá SSH cũ → cài gói khoá mới `id_ed25519_3q_hieu` (passphrase, nạp ssh-agent Windows) | — |
| 22/10 | Rà malware ổ C, ổ D bằng tay (không bật Defender theo lời user) — sạch; báo các công cụ crack chưa từng chạy | — (báo cáo `plans\reports\malware-check-261022-*`) |
| 22/10 | Phiếu: "↺ Dùng lại quà hôm trước" + "↺ Dùng lại quà này" trong Lịch sử | `deab3d1`, `89c819a` |
| 24/10 | Ẩn S2 (`an: true`, server từ chối phiếu mới S2, phiếu cũ giữ tên) | `468e001` |
| 27/10 | Mở lại S2 | `5e5b756` |
| 27/10 | Linh vật **Min** (mèo đen Cubism 4) thay bé gái Tia, 9 biểu cảm gắn theo câu nói | `5b63ca6` |
| 27/10 | Min chỉ phản ứng khi chạm trúng thân (thử điểm trong tam giác mesh), chỗ trống bấm xuyên | `17ca7c3` |
| 27/10 | Tắt khung hỏi đáp Mun Vạn Sự Thông trên web (`MUN_WIDGET_ON=false`) | `50d31ea` |
| 27/10 | Góp ý khách: thân bớt quay theo đầu (`bodyTurn 0.3`), mặt giận bớt đen (`angrY 0.45`) | `6be5633` |
| 27/10 | Min to thêm 30% | `6c098aa` |
| 27/10 | Viền sáng vàng ấm "mịn vừa" cho Min trên nền tối | `b352177` |
| 28/10 | Vai trò **Duyệt phiếu** + link mời + mã cho Claude + `POST /mcp` + skill | `56ea76e` |
| 28/10 | Người nhận link mời phải chờ Quản lý duyệt; `.gitignore` 2 file bí mật mới | `7287e01` |
| 04/11 | `ssh vps40` timeout cổng 22 (web 443 vẫn 200) — chưa rõ lý do, chờ chủ máy | — |

## 2. Lỗi thật → nguyên nhân → cách sửa

| # | Lỗi | Nguyên nhân | Cách sửa / phòng |
|---|---|---|---|
| 1 | `ssh vps40` "Permission denied (publickey)" (22/10) | Chủ máy thu hồi mọi khoá | Cài gói khoá mới; `IdentityFile` + `UserKnownHostsFile` riêng trong `~/.ssh/config` |
| 2 | `ssh-add` báo "Could not open a connection to your authentication agent" | Lệnh `!` chạy trong Git Bash ⇒ lấy `ssh-add` của Git, không thấy agent Windows | Gọi đủ đường dẫn `C:\Windows\System32\OpenSSH\ssh-add.exe` |
| 3 | `ssh vps40` timeout cổng 22 (04/11), web vẫn chạy | Chưa rõ (đổi cổng/chặn tường lửa phía chủ máy?) | `Test-NetConnection IP -Port 22` vs `-Port 443` để tách SSH với web; hỏi chủ máy, không tự đoán |
| 4 | Biểu cảm/miệng lúc chào không chạy | Bộ chạy Cubism trả về trước khi texture tải xong; model chưa `CompleteSetup` thì `update()` bỏ qua | Chờ `md._textureCount >= md._modelSetting.getTextureCount()` rồi mới chào |
| 5 | Nước mắt chỉ chảy 1 lần | Bộ chạy bỏ cờ `Loop` của file motion | `startMotion(...)._motion.setLoop(true)` + `setLoopFadeIn(false)` |
| 6 | Chuột ở trên, đầu Min lại cúi | Người rig làm ngược `ParamAngleY` (mắt thì đúng) | Đảo dấu `ParamAngleY` ngay trước `model.update()` (bộ chạy nạp lại tham số mỗi khung nên không cộng dồn) |
| 7 | Min lúc nào cũng liếc hết cỡ | Bộ chạy tính hướng nhìn theo canvas nhỏ, chuột đâu cũng "rất xa" | Thay `app.onMouseMove` **trước** `initialize()` (bind lúc init), chuẩn hoá theo cả cửa sổ, gốc ở mặt Min |
| 8 | Bấm chỗ trống quanh Min vẫn "nhột" | Canvas vuông bắt mọi chạm | Thử điểm trong tam giác các drawable đang hiện (cửa sổ → canvas px → view → model); chỗ trống đặt `pointer-events:none` theo `mousemove` |
| 9 | Mặt "Vui" không đổi gì | Người làm model không rig EyeSmile/MouthForm/Cheek | Thử từng tham số bằng ép giá trị + chụp phóng to trước khi hứa biểu cảm |
| 10 | Khách: Min "lắm mồm", phản ứng chậm | Miệng mấp máy suốt bong bóng; câu tự nói chặn phản ứng | Miệng ≤1,5 s; bong bóng theo độ dài chữ; ưu tiên `PRIO` hành động > rê chuột > tự nói |
| 11 | Ảnh chụp "biểu cảm" sai (mắt nhắm tưởng là cười) | Câu tự nói khi để yên 20 s đổi mặt giữa bài thử | Bài thử phải "rung chuột" giữ trạng thái hoạt động |
| 12 | `git` trên VPS "dubious ownership" khi commit worktree | Worktree của `web3q`, chạy git bằng root; `-c safe.directory` không được nhận từ dòng lệnh | `git config --global --add safe.directory <W>` trước, gỡ sau khi dọn |
| 13 | Deploy dừng: "main checkout not clean: data/news/invites.json" | File dữ liệu mới chưa có trong `.gitignore` | Mọi file dữ liệu/bí mật mới phải vào `.gitignore` cùng commit tạo ra nó |
| 14 | Bash tool hỏng mọi lệnh ("line 205: syntax error") | Shell snapshot hỏng | Dùng PowerShell + `D:\New folder\git\Git\cmd\git.exe` (memory `laptop-git-path`) |
| 15 | Lệnh ssh lồng nháy trong PowerShell vỡ (`$`, backtick, `(`) | PowerShell + bash + nháy kép lồng nhau | Viết script `.sh`/`.py`/`.mjs` bằng Write → `scp` → chạy; không nhồi lệnh dài vào `ssh "..."` |
| 16 | Thử `mcp-remote` bị chặn | Phân loại an toàn chặn `npx` tải gói ngoài | Không lách; ghi "chưa thử được" và báo user |
| 17 | Deploy định dừng vì "có người ở /quan-tri" — hoá ra chính user | Kiểm log chỉ đếm, không xem ai | `ai-dang-vao.py`: in giờ + 6 số cuối IP; so với IP laptop (`api.ipify.org`) |

## 3. Quy trình đã chạy ổn (làm lại y vậy)

**Sửa web .40 (mọi thay đổi có rủi ro):**
1. `dung-nhap*.sh`: worktree `/srv/_nhap-<x>` + nhánh, bind-mount `mirror/`, symlink `node_modules`, chép `data/` sang `/srv/_nhap-<x>-data`, `systemd-run` cổng 13399 với `NEWS_*_DIR`/`PHIEU_DATA_DIR` trỏ bản chép + `NEWS_SITE_ORIGIN=http://127.0.0.1:13399`.
2. Sửa file ở scratchpad (`moi\`), `scp` vào worktree, `node --check`, restart nháp.
3. Thử bằng thao tác thật (Playwright `channel:'chrome'`, 1920×889 + iPhone 14 Pro), qua đường hầm `ssh -N -L 13399:127.0.0.1:13399 vps40` (chạy nền, `TaskStop` khi xong).
4. Gửi user ảnh/đường dẫn nháp; chờ **"deploy đi"**.
5. `deploy-*.sh`: kiểm sạch → đếm `/quan-tri` 15 phút (xem ai bằng `ai-dang-vao.py`) → commit trong worktree → kiểm `merge-base` → sao lưu `data/` → tag `pre-<x>` → `merge --ff-only` → restart → kiểm LIVE (curl) → dọn nháp → `git bundle`.
6. Đẩy GitHub: `scp` bundle → `git fetch ../x.bundle main:refs/remotes/vps/main` → `git push origin refs/remotes/vps/main:refs/heads/main`.
7. Kiểm LIVE lần nữa bằng Playwright; ghi HANDOFF.

**Việc nhỏ một dòng cấu hình (ẩn/mở S2, tắt widget):** sửa thẳng trên LIVE bằng script python có `assert count==1`, commit, kiểm `/quan-tri` rồi restart — chỉ khi user nói rõ "làm luôn".

**Thay đổi giao diện theo góp ý khách:** thử nhiều phương án **bằng CSS chèn vào trình duyệt thử trên LIVE** (không đổi web) → bảng so sánh có nhận xét + gợi ý → user chọn → mới làm vào nháp.

## 4. Bẫy / kinh nghiệm

- Live2D (bộ chạy live2d-widgets `index2.js`): model ở `app._subdelegates.at(0).getLive2DManager()._models.at(0)`; core tham số `md._model._model.parameters`; muốn đổi tham số theo khung thì bọc `md._model.update`. Lip-sync lấy `_wavFileHandler.getRms()` — ghi đè hàm này để mấp máy giả.
- Thử tham số model: lộ `window.__app` bằng `page.route` sửa HTML trong trình duyệt thử (server không đổi).
- Ẩn chi tiết bản quyền/logo trong texture: làm alpha=0 trên **bản web**, giữ bản gốc ngoài thư mục phục vụ (`/srv/_backup/...`), không để bản gốc trong thư mục web.
- Texture 8192 → 2048 cho linh vật ≤400 px: 68 MB → ~4,5 MB, mắt thường không thấy khác.
- MCP từ xa cho người ngoài: không phiên, chỉ JSON, bearer chỉ lưu SHA-256, gắn quyền vào **tài khoản** (khoá tài khoản = mã chết), công cụ ghi chỉ đổi bản ghi đang ở trạng thái chờ, không trả dữ liệu cá nhân. Claude Code: `claude mcp add --transport http --scope user <tên> <url> --header "Authorization: Bearer …"`, mỗi `CLAUDE_CONFIG_DIR` một lần. Claude Desktop: `mcp-remote` + header qua biến `AUTH_HEADER` (Windows cắt dấu cách trong args).
- Thử Claude Code thật mà không đụng tài khoản user: `$env:CLAUDE_CONFIG_DIR` = thư mục tạm, xong xoá thư mục.
- User nói "bạn tự làm mã" / "tôi tự làm mã" — hỏi lại ai bấm nút nào trước khi thiết kế quyền.
- Giải thích cho user: câu ngắn, ví dụ cụ thể, số đo trước/sau; tránh thuật ngữ (user từng nói "khó hiểu quá").

## 5. Còn treo

1. `ssh vps40` cổng 22 timeout từ 04/11 — chờ chủ máy; web vẫn chạy.
2. HANDOFF/journal này chưa chép vào `ban-giao/` trong repo (cần SSH).
3. Đường Claude Desktop (`mcp-remote`) chưa thử thật.
4. Min mặt "Vui" chưa có (model thiếu rig cười) — chờ user chọn: mắt to / để thường / nhờ người làm model.
5. Logo GrowX trên Min đang ẩn; bật lại = chép `/srv/_backup/min-co-logo/texture_00-co-logo.png` đè `texture_00.png` + `LOGO_SHOWN=true`.
6. `passphrase.txt` + zip gói khoá trong `D:\skill\New folder` — user để xoá sau.
7. Công cụ crack trên ổ D (SecureCRT Activator, Navicat N11, …) — user chưa trả lời có xoá không.
