# Dựng lại hệ thống 3Q trên VPS .40 từ đầu

Viết 15/10/2026 trước khi VPS .40 (160.191.3.40, Windows) bị cài lại. Mọi thứ của dự án 3Q đã nằm trong 2 repo GitHub private + 1 gói bí mật do chủ dự án giữ + bản `mirror/` trên laptop.

## 0. Nguồn để dựng lại

| Thứ | Ở đâu | Đặt lại vào |
|---|---|---|
| Trang chính 3qdc (code, ảnh, nhạc, bài tin) | GitHub `BlackCat-Ent-Studio/3qdc` nhánh `main` | `C:\web\web1\3qdc-unified` |
| Bản sao web gốc `mirror/` (8,1 GB, 2533 file, không có trong git) | Laptop `D:\workspace\3qdc\web1\3qdc-unified\mirror` (đã so khớp 15/10: đủ 2533 file, đúng dung lượng) | `C:\web\web1\3qdc-unified\mirror` |
| Trang phụ 3qdaichien | GitHub `BlackCat-Ent-Studio/3qdaichien` | `C:\app\3qdaichien` |
| Hỏi-đáp Mun Vạn Sự Thông, wiki, trang duyệt | GitHub `BlackCat-Ent-Studio/3q-hoi-dap` (thư mục `hoi-dap/`, `wiki/`, `duyet/`) | `C:\app\3q-hoi-dap`, `C:\app\3q-wiki\current`, `C:\app\3q-duyet` |
| Cấu hình Caddy | `van-hanh-vps40/Caddyfile.redacted` trong repo `3qdc` | `C:\caddy\Caddyfile` (điền lại 2 dòng `basic_auth` từ gói bí mật) |
| Bí mật + dữ liệu người dùng | Gói zip có mật khẩu do chủ dự án giữ (xem mục 5) | xem mục 5 |

## 1. Cài phần mềm (PowerShell Administrator)

Phiên bản đang chạy lúc sao lưu: xem `van-hanh-vps40/phien-ban.txt`.

1. **Node.js** cùng đời chính (v24 LTS) — `C:\Program Files\nodejs`. Service hỏi-đáp và duyệt chạy file `.ts` trực tiếp bằng node (không build).
2. **Git**: PortableGit vào `C:\PortableGit` (các script gọi `C:\PortableGit\cmd\git.exe`).
3. **NSSM** qua Chocolatey: `choco install nssm` (đường dẫn `C:\ProgramData\chocolatey\bin\nssm.exe`).
4. **Caddy**: `caddy.exe` vào `C:\caddy\`, chạy bằng Tác vụ Windows tên "Caddy": `C:\caddy\caddy.exe run --config C:\caddy\Caddyfile`, khởi động cùng máy.
5. **OpenSSH Server** + khoá công khai của laptop (`~/.ssh/id_ed25519_vps.pub`) vào `C:\ProgramData\ssh\administrators_authorized_keys`.
6. **Tailscale**, sau khi đăng nhập chạy `tailscale set --unattended=true` (không có dòng này, khởi động lại máy là mất kết nối — lỗi 05/10).
7. **Grok CLI** (cho hỏi-đáp) cài lại theo hướng dẫn chính thức vào `C:\Users\Administrator\.grok\bin\grok.exe`, rồi đăng nhập (xem mục 5).

## 2. Trang chính 3qdc

```powershell
git clone https://github.com/BlackCat-Ent-Studio/3qdc C:\web\web1\3qdc-unified
cd C:\web\web1\3qdc-unified; npm ci
# mirror/ từ laptop: scp -r hoặc robocopy qua Tailscale (8,1 GB)
# data/news (bài tin) có sẵn trong git; users.json + dang-ky-som + phieu-be-ngoan lấy từ gói bí mật
nssm install 3qdc-unified "C:\Program Files\nodejs\node.exe" server.mjs
nssm set 3qdc-unified AppDirectory C:\web\web1\3qdc-unified
nssm set 3qdc-unified AppEnvironmentExtra PORT=3399 PHIEU_GOOGLE_CLIENT_ID=<từ gói bí mật>
nssm set 3qdc-unified AppStdout C:\web\web1\3qdc-unified\verify-out\out.log
nssm set 3qdc-unified AppStderr C:\web\web1\3qdc-unified\verify-out\err.log
nssm start 3qdc-unified
```

Không bao giờ đặt `PHIEU_DEV_LOGIN` hay `NEWS_INSECURE_COOKIE` trên LIVE. Chưa có `users.json` thì tạo tài khoản quản trị bằng `node scripts/news-user.mjs`.

## 3. Hỏi-đáp, wiki, duyệt (repo `3q-hoi-dap`)

```powershell
git clone https://github.com/BlackCat-Ent-Studio/3q-hoi-dap C:\Temp\3q-hoi-dap-src
robocopy C:\Temp\3q-hoi-dap-src\hoi-dap C:\app\3q-hoi-dap /E
robocopy C:\Temp\3q-hoi-dap-src\wiki\current C:\app\3q-wiki\current /E
robocopy C:\Temp\3q-hoi-dap-src\duyet C:\app\3q-duyet /E
cd C:\app\3q-hoi-dap\app; npm install       # node_modules không có trong git
mkdir C:\app\3q-hoi-dap\log, C:\app\3q-hoi-dap\nhat-ky, C:\app\3q-duyet\log
```

Service (tham số giống lúc sao lưu, xem `van-hanh-vps40/dich-vu.txt`):
- `3q-hoi-dap`: node `--max-old-space-size=512 tro-ly\chay.ts`, thư mục `C:\app\3q-hoi-dap\app`, cổng 8787. Script gốc: `hoi-dap/van-hanh/cai-dich-vu-bot.ps1`. Biến môi trường (tên trong `dich-vu.txt`, giá trị trong gói bí mật).
- `3q-duyet`: node `--max-old-space-size=128 may-chu.ts`, thư mục `C:\app\3q-duyet\app`.
- Lịch kiểm sức khoẻ Grok: `hoi-dap/van-hanh/cai-lich-suc-khoe-grok.ps1`.

## 4. Trang phụ + Caddy

```powershell
git clone https://github.com/BlackCat-Ent-Studio/3qdaichien C:\app\3qdaichien
copy <repo 3qdc>\van-hanh-vps40\Caddyfile.redacted C:\caddy\Caddyfile
# điền 2 chỗ <bcrypt-hash ...> bằng giá trị trong gói bí mật (Caddyfile-basic-auth.txt)
C:\caddy\caddy.exe validate --config C:\caddy\Caddyfile --adapter caddyfile
```

Caddyfile còn khối của các web khác (không thuộc 3Q) — chủ dự án tự dựng lại; khối nào chưa có dịch vụ thì để đó cũng không sao, hoặc xoá đi. Chứng chỉ HTTPS Caddy tự xin lại.

**DNS (Mắt Bão):** nếu IP mới khác `160.191.3.40` thì sửa bản ghi A của: `3qdc`, `3qdaichien`, `phieubengoan.3qdc` (và các tên miền khác trong Caddyfile).

## 5. Gói bí mật (không có trong git)

| File trong gói | Đặt lại vào |
|---|---|
| `3qdc/users.json` | `C:\web\web1\3qdc-unified\data\news\users.json` (tài khoản `/quan-tri`) |
| `3qdc/dang-ky-som/dang-ky.jsonl` | `...\data\dang-ky-som\` (email người chơi) |
| `3qdc/phieu-be-ngoan/phieu.json` | `...\data\phieu-be-ngoan\` |
| `env-*.txt` | giá trị biến môi trường từng service (`nssm set <tên> AppEnvironmentExtra ...`) |
| `hoi-dap/grok-acc/` | `C:\app\3q-hoi-dap\grok-acc\` (tài khoản Grok; nếu không dùng được nữa thì đăng nhập Grok lại) |
| `Caddyfile-basic-auth.txt` | 2 dòng `basic_auth` trong Caddyfile |

Google Client ID của Phiếu Bé Ngoan cũng có trong `plans\261014-2335-phieu-be-ngoan\HANDOFF-phieu-be-ngoan.md` (không phải bí mật).

## 6. Kiểm sau khi dựng

- `https://3qdc.wanmeivn.com/` (trang chủ, bé gái Live2D, nút "Mun Vạn Sự Thông", bàn nhạc), `/tin-tuc`, `/dang-ky-som`, `/privacy`, `/quan-tri` (đăng nhập được), `/wiki/`, `/hoi-dap/widget.js`.
- `https://3qdaichien.wanmeivn.com/`, `https://phieubengoan.3qdc.wanmeivn.com/` (nút Google, form, tab lịch sử).
- Bộ kiểm có sẵn: `plans\reports\phieu-be-ngoan-261014\responsive-261015\kiem-form-tab.cjs -` và `chup-hien-trang.cjs` (laptop).
