# Dựng lại hệ thống 3Q trên VPS .40 (Ubuntu)

Viết lại 17/10/2026 theo đúng cách đã dựng thật ngày 15/10/2026, khi nhà cung cấp cài lại VPS .40 (160.191.3.40) từ Windows Server sang **Ubuntu 22.04**. Bản hướng dẫn cho Windows (NSSM, `C:\...`) đã bỏ, xem lịch sử git trước commit này nếu cần.

## 0. Nguồn để dựng lại

| Thứ | Ở đâu | Đặt vào |
|---|---|---|
| Trang chính 3qdc (code, ảnh, nhạc, bài tin) | GitHub `BlackCat-Ent-Studio/3qdc` nhánh `main` | `/srv/3qdc-unified` |
| Bản sao web gốc `mirror/` (8,5 GB, 2533 file, không có trong git) | Laptop `D:\workspace\3qdc\web1\3qdc-unified\mirror` + ổ E + Google Drive | `/srv/3qdc-unified/mirror` |
| Trang phụ 3qdaichien | GitHub `BlackCat-Ent-Studio/3qdaichien` | `/srv/3qdaichien` |
| Hỏi-đáp Mun Vạn Sự Thông, wiki, trang duyệt | GitHub `BlackCat-Ent-Studio/3q-hoi-dap` | `/srv/3q-hoi-dap` (giữ nguyên cấu trúc repo: `hoi-dap/`, `wiki/current`, `duyet/`) |
| Cấu hình Caddy | `van-hanh-vps40/Caddyfile.redacted` (bản Ubuntu đang chạy, đã che hash `basic_auth`) | `/etc/caddy/Caddyfile` |
| Bí mật + dữ liệu người dùng | Gói `bi-mat-vps40-261015.7z` (AES-256, mật khẩu chỉ chủ dự án giữ) — laptop `D:\workspace\3qdc`, ổ E, Google Drive | mục 5 |

## 1. Vào máy + quy tắc của chủ máy

- `ssh vps40` = root@160.191.3.40, **chỉ bằng khoá** (`~/.ssh/id_ed25519_vps40`, chủ máy cấp). Đăng nhập mật khẩu đã tắt; mật khẩu root chỉ dùng qua Console/VNC của nhà cung cấp.
- fail2ban: sai 5 lần/10 phút → chặn IP 1 giờ. `MaxAuthTries 3`.
- **Báo chủ máy trước** khi mở/đóng cổng hoặc sửa cấu hình SSH. **Không** sửa `/etc/ssh/sshd_config.d/00-key-only.conf`, **không** xoá dòng khoá có sẵn trong `/root/.ssh/authorized_keys`.
- Cho người khác vào: họ tự `ssh-keygen -t ed25519`, gửi file `.pub`, thêm 1 dòng vào `authorized_keys` (báo chủ máy). Không gửi khoá riêng cho ai.
- Tường lửa ufw: chỉ 22, 80, 443. Cổng nội bộ 3399/8787/8788 không mở ra ngoài.

## 2. Cài phần mềm

```bash
apt update && apt install -y git curl p7zip-full
# Node 24 (nodesource) — service chạy .ts trực tiếp bằng node, không build
curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt install -y nodejs
# Caddy (repo chính thức cloudsmith) — làm theo https://caddyserver.com/docs/install#debian-ubuntu-raspbian
ufw allow 80,443/tcp        # (đã được chủ máy đồng ý 15/10)
useradd -r -m -d /home/web3q -s /usr/sbin/nologin web3q
```

Phiên bản đang chạy 17/10: node v24.22.0, Caddy v2.11.7.

## 3. Code + dữ liệu

```bash
git clone https://github.com/BlackCat-Ent-Studio/3qdc /srv/3qdc-unified
git clone https://github.com/BlackCat-Ent-Studio/3qdaichien /srv/3qdaichien
git clone https://github.com/BlackCat-Ent-Studio/3q-hoi-dap /srv/3q-hoi-dap
cd /srv/3qdc-unified && npm ci
cd /srv/3q-hoi-dap/hoi-dap/app && npm ci     # package.json đã khai báo yaml (commit b08c119)
# mirror/ từ laptop (8,5 GB): rsync/scp vào /srv/3qdc-unified/mirror
mkdir -p /srv/3q-hoi-dap/hoi-dap/nhat-ky /srv/3q-hoi-dap/duyet/du-lieu
chown -R web3q:web3q /srv/3qdc-unified /srv/3qdaichien /srv/3q-hoi-dap
```

Dữ liệu nằm trong `/srv/3qdc-unified/data/` (gốc dữ liệu = biến môi trường `DATA_ROOT`, mặc định thư mục `data/` cạnh `server.mjs`; từ 06/11/2026 tách theo game):
- `games/<game>/tin-tuc/{posts,revisions,uploads,trash}`: bài tin của từng game, **có trong git** (hiện chỉ `games/3qdc/tin-tuc`).
- `games/3qdc/phieu-be-ngoan/`, `games/3qdc/dang-ky-som/`: phiếu và đăng ký sớm (ngoài git, lấy từ gói bí mật).
- `he-thong/`: `users.json`, `invites.json`, `mcp-tokens.json`, `nhat-ky-quyen.jsonl` (ngoài git; có hash mật khẩu và hash mã Claude).

Mọi đường dẫn đi qua `scripts/lib/admin/paths.mjs`. Các biến cũ `NEWS_DATA_DIR`, `PHIEU_DATA_DIR`, `SIGNUP_DATA_DIR` bị cấm: server không khởi động nếu còn đặt biến đó, còn dữ liệu ở đường cũ (`data/news/users.json`, `data/phieu-be-ngoan/`, `data/dang-ky-som/`) hoặc `users.json` còn vai trò cũ (manager/editor/phieu); thông báo lỗi nêu đúng lệnh cần chạy.

## 4. Dịch vụ systemd + Caddy

Ba unit trong `/etc/systemd/system/`, cùng khuôn (User/Group `web3q`, `Restart=always`, `RestartSec=5`, `NoNewPrivileges=true`, `ProtectSystem=full`, `PrivateTmp=true`, `After=network-online.target`):

| Unit | WorkingDirectory | ExecStart | Cổng | EnvironmentFile |
|---|---|---|---|---|
| `3qdc-unified` | `/srv/3qdc-unified` | `/usr/bin/node server.mjs` | 3399 | `/etc/3q/3qdc-unified.env` |
| `3q-hoi-dap` | `/srv/3q-hoi-dap/hoi-dap/app` | `/usr/bin/node --max-old-space-size=512 tro-ly/chay.ts` | 8787 | `/etc/3q/3q-hoi-dap.env` |
| `3q-duyet` | `/srv/3q-hoi-dap/duyet/app` | `/usr/bin/node --max-old-space-size=128 may-chu.ts` | 8788 | `/etc/3q/3q-duyet.env` |

File env (root, quyền 600):
- `3qdc-unified.env`: `PORT=3399`, `PHIEU_GOOGLE_CLIENT_ID=…`. **Không bao giờ** đặt `PHIEU_DEV_LOGIN` hay `NEWS_INSECURE_COOKIE` trên LIVE.
- `3q-hoi-dap.env`: `BOT_MOI_TRUONG=production`, `BOT_ENGINE=grok-cli`, `BOT_GROK_BIN=/home/web3q/.grok/bin/grok`, `BOT_KHO=/srv/3q-hoi-dap/hoi-dap/kho/public.jsonl`, `BOT_NHAT_KY=/srv/3q-hoi-dap/hoi-dap/nhat-ky`, `BOT_PORT=8787`, `BOT_COOKIE_SECURE=1`, `HOME=/home/web3q`, + `BOT_MUOI_BAM`, `TYPESAFE_API_KEY` (gói bí mật).
- `3q-duyet.env`: `DUYET_PORT=8788`, `DUYET_DU_LIEU=/srv/3q-hoi-dap/duyet/du-lieu`.

```bash
systemctl daemon-reload && systemctl enable --now 3qdc-unified 3q-hoi-dap 3q-duyet
journalctl -u 3qdc-unified -n 50      # xem log
```

Grok CLI: cài theo hướng dẫn chính thức dưới user `web3q` → `/home/web3q/.grok/bin/grok`; tài khoản Grok từ gói bí mật → `/home/web3q/.grok/auth.json`.

**Caddy** `/etc/caddy/Caddyfile` (bản gốc Ubuntu giữ ở `Caddyfile.goc-ubuntu`), 3 khối 3Q:
- `3qdc.wanmeivn.com`: `handle_path /wiki/*` → `root /srv/3q-hoi-dap/wiki/current` + `file_server`; `handle /hoi-dap/*` → `127.0.0.1:8787`; `handle_path /duyet/*` → `basic_auth` (giá trị trong gói bí mật) + `127.0.0.1:8788`; còn lại → `localhost:3399`.
- `3qdaichien.wanmeivn.com`: API/tin (`@main`) → `localhost:3399`; còn lại `root /srv/3qdaichien/site` + `file_server`.
- `phieubengoan.3qdc.wanmeivn.com` → `localhost:3399`.
- Log `/var/log/caddy/<site>-access.log`. **Bẫy:** chạy `caddy validate` bằng root sẽ tạo file log chủ root → Caddy không khởi động được. Sau validate: `chown -R caddy:caddy /var/log/caddy`, rồi `systemctl reload caddy`.
- Caddyfile còn khối `hotro.wanmeivn.com` (`/srv/hotro`) do người khác thêm 16/10 — không thuộc 3Q, **đừng xoá**.

**DNS (Mắt Bão):** nếu IP khác `160.191.3.40` thì sửa bản ghi A của `3qdc`, `3qdaichien`, `phieubengoan.3qdc`.

## 5. Gói bí mật

Giải nén ở thư mục tạm, chép vào chỗ dưới, **xoá bản giải nén** ngay sau đó (laptop + VPS).

| File trong gói | Đặt vào |
|---|---|
| `users.json` | `/srv/3qdc-unified/data/he-thong/users.json` (tài khoản `/quan-tri`) |
| `dang-ky.jsonl` | `/srv/3qdc-unified/data/games/3qdc/dang-ky-som/` |
| `phieu.json` | `/srv/3qdc-unified/data/games/3qdc/phieu-be-ngoan/` |
| `env-*` | các dòng tương ứng trong `/etc/3q/*.env` |
| `grok-acc` | `/home/web3q/.grok/auth.json` |
| `Caddyfile-basic-auth.txt` | dòng `basic_auth` khối `/duyet` |

Gói bí mật ngày 15/10 có tài khoản **dạng cũ** (manager/phieu) và `invites.json`/`mcp-tokens.json` (nếu có) cũng dạng cũ. Sau khi chép: dừng dịch vụ, rồi `node scripts/migrate-users-grants.mjs --owner <tên chủ> --dry-run` (xem bảng "ai thành quyền gì") → `--apply`. (Nếu chép vào đường cũ `data/news/…`, `data/dang-ky-som/`, `data/phieu-be-ngoan/` thì chạy `node scripts/migrate-games-data.mjs --apply` trước.) Cả hai script so đếm trước/sau, tự trả lại như cũ khi lệch, và có `--undo`. Chưa có `users.json` thì tạo chủ bằng `node scripts/news-user.mjs` (vai `owner`). Nhớ `chown -R web3q:web3q /srv/3qdc-unified/data`.

## 6. Sửa code và đưa lên LIVE (cách đang dùng)

1. Nháp: `git worktree add /srv/_nhap-<x> -b <nhánh>`; `mount --bind /srv/3qdc-unified/mirror /srv/_nhap-<x>/mirror` (không dùng symlink — worktree đã có `mirror/` 68 file trong git); symlink `node_modules`; chép `data/` sang `/srv/_nhap-<x>-data`.
2. Chạy nháp: `systemd-run --unit=nhap-<x> --uid=web3q` với `PORT=13399`, `DATA_ROOT=<bản chép>`, `NEWS_INSECURE_COOKIE=1`, `NEWS_SITE_ORIGIN=http://127.0.0.1:13399` (thiếu dòng này mọi POST bị chặn). Laptop mở đường hầm `ssh -L 127.0.0.1:13399:127.0.0.1:13399 vps40`, kiểm bằng Playwright.
3. Deploy: xem log Caddy `/var/log/caddy/3qdc-wanmeivn-access.log` 15 phút gần nhất có ai đang ở `/quan-tri` không (restart sẽ đăng xuất họ) → sao lưu `data/` vào `/srv/_backup/3qdc-unified-<ngày>-<x>/` → `git tag pre-<x>` → `git merge --ff-only` → `systemctl restart 3qdc-unified` → kiểm LIVE. (Lần đổi sang nhiều game 06/11/2026 phải dừng dịch vụ trước merge, rồi sau merge chạy `migrate-games-data.mjs --apply` và `migrate-users-grants.mjs --owner <chủ> --apply` + `chown -R web3q:web3q data`; các lần sau không cần.)
4. Dọn: dừng unit nháp, `umount` rồi `git worktree remove`, đóng đường hầm.
5. Đẩy GitHub: `git bundle create` trên VPS → `scp` về laptop → `git fetch` vào clone laptop → `git push` (gh trên laptop đã đăng nhập).

## 7. Kiểm sau khi dựng

- `systemctl is-active 3qdc-unified 3q-hoi-dap 3q-duyet caddy` → 4 dòng `active`.
- `https://3qdc.wanmeivn.com/` (trang chủ, bé gái Live2D, nút "Mun Vạn Sự Thông", bàn nhạc), `/tin-tuc`, `/dang-ky-som`, `/privacy`, `/quan-tri` (đăng nhập được), `/wiki/`, `/hoi-dap/widget.js`, `/duyet/` (hỏi mật khẩu).
- `https://3qdaichien.wanmeivn.com/`, `https://phieubengoan.3qdc.wanmeivn.com/` (nút Google thật, không có ô "Đăng nhập thử").
- Bộ kiểm trên laptop: `plans\reports\dung-lai-vps40-261015\kiem-live-ubuntu.cjs`.

## 8. Thêm game, cấp quyền (từ 06/11/2026)

- **Thêm game:** sửa `scripts/lib/admin/games.mjs` (thêm 1 mục `{ id, name, sites, modules }`; id chữ thường/số/gạch ngang, không toàn số), rồi `systemctl restart 3qdc-unified` (mọi người bị đăng xuất). Không phải sửa file nào khác. Phần (`modules`) hiện có: `tin-tuc` (mọi game), `nhac`, `dang-ky-som`, `phieu-be-ngoan` (chỉ game `3qdc`). Server không khởi động nếu sổ game sai (trùng id, trùng host…).
- **Cấp quyền** chỉ chủ (`owner`) làm được: trang Phân quyền ở `/quan-tri`, link mời mang quyền (người nhận chờ chủ duyệt), hoặc mã Claude "mã chủ" (công cụ `ds_game`, `xem_quyen`, `cap_quyen`, `thu_quyen`, `tao_link_moi`; tối đa 20 lần ghi/giờ; không có công cụ nào lập chủ). Mọi thay đổi quyền ghi vào `data/he-thong/nhat-ky-quyen.jsonl`.
- **Lùi bản 06/11:** xem `HANDOFF.md` (tag `pre-nhieu-game`, sao lưu `/srv/_backup/3qdc-unified-261106-nhieu-game/`).
